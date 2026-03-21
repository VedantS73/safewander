"""
Gemini streaming + tools, emitting Vercel AI SDK UI Message Stream (SSE) chunks.

Uses `google-genai` automatic function calling (AFC). Some preview/thinking models
can return stream chunks with **no visible text** (thinking tokens only); we
disable thinking by default and fall back to non-streaming if the stream is empty.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from collections.abc import Iterator

from google import genai
from google.genai import types as genai_types

from app.services.agent_tools import SAFEWANDER_TOOLS

DEFAULT_GEMINI_MODEL = "gemini-2.5-pro"

logger = logging.getLogger(__name__)


def _extract_text_from_uimessage(msg: dict) -> str:
    parts = msg.get("parts") or []
    texts: list[str] = []
    for p in parts:
        if isinstance(p, dict) and p.get("type") == "text" and p.get("text"):
            texts.append(str(p["text"]))
    return "\n".join(texts).strip()


def _contents_from_messages(messages: list[dict]) -> list[dict]:
    """Convert UI messages into Google GenAI contents format."""
    contents: list[dict] = []
    for m in messages:
        role = m.get("role")
        text = _extract_text_from_uimessage(m)
        if not text:
            continue
        mapped_role = "user"
        if role == "user":
            mapped_role = "user"
        elif role == "assistant":
            mapped_role = "model"
        contents.append(
            {
                "role": mapped_role,
                "parts": [{"text": text}],
            }
        )
    return contents


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _chunk_text_for_ui(text: str, chunk_size: int = 48) -> Iterator[str]:
    if not text:
        return
    for i in range(0, len(text), chunk_size):
        yield text[i : i + chunk_size]


def _thinking_config_from_env() -> genai_types.ThinkingConfig | None:
    """
    Thinking-only models can stream chunks with no user-visible text.
    Default: thinking_budget=0 (disable). Set GOOGLE_GENAI_THINKING_BUDGET=-1 for auto.
    """
    raw = os.getenv("GOOGLE_GENAI_THINKING_BUDGET", "0")
    raw = raw.strip()
    if raw == "":
        return None
    try:
        budget = int(raw)
    except ValueError:
        return None
    return genai_types.ThinkingConfig(thinking_budget=budget)


def _build_generate_config(system_instruction: str) -> genai_types.GenerateContentConfig:
    return genai_types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=SAFEWANDER_TOOLS,
        automatic_function_calling=genai_types.AutomaticFunctionCallingConfig(
            ignore_call_history=True,
        ),
        thinking_config=_thinking_config_from_env(),
    )


def _response_text_safe(response: object) -> str:
    try:
        t = getattr(response, "text", None)
        return (t or "").strip() if t is not None else ""
    except (ValueError, AttributeError):
        return ""


def stream_chat_ui_messages(messages: list[dict]) -> Iterator[str]:
    """
    Yields SSE lines (including `data: [DONE]`) for @ai-sdk/react DefaultChatTransport.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        mid = str(uuid.uuid4())
        tid = "text-0"
        yield _sse({"type": "start", "messageId": mid})
        yield _sse({"type": "text-start", "id": tid})
        yield _sse(
            {
                "type": "text-delta",
                "id": tid,
                "delta": "GOOGLE_API_KEY is not set on the server. Add it to backend `.env`.",
            }
        )
        yield _sse({"type": "text-end", "id": tid})
        yield _sse({"type": "finish", "finishReason": "error"})
        yield "data: [DONE]\n\n"
        return

    raw_model_name = os.getenv("GOOGLE_GENAI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    model_name = raw_model_name.split(":", 1)[1] if raw_model_name.startswith("google:") else raw_model_name

    client = genai.Client(api_key=api_key)
    system_instruction = (
        "You are SafeWander, a travel safety assistant for solo travelers. "
        "You have tools: safety scores for coordinates, nearby police/hospitals/public spaces, "
        "SOS ping (demo), emergency checklists by situation, and demo emergency numbers by region. "
        "When the user asks for their safety score or nearby places without giving coordinates, "
        "call the tools anyway — they use sensible demo defaults. "
        "Be concise and actionable."
    )

    if not messages:
        mid = str(uuid.uuid4())
        tid = "text-0"
        yield _sse({"type": "start", "messageId": mid})
        yield _sse({"type": "text-start", "id": tid})
        yield _sse({"type": "text-delta", "id": tid, "delta": "Send a message to start."})
        yield _sse({"type": "text-end", "id": tid})
        yield _sse({"type": "finish", "finishReason": "stop"})
        yield "data: [DONE]\n\n"
        return

    last = messages[-1]
    last_text = _extract_text_from_uimessage(last)
    if not last_text:
        mid = str(uuid.uuid4())
        tid = "text-0"
        yield _sse({"type": "start", "messageId": mid})
        yield _sse({"type": "text-start", "id": tid})
        yield _sse({"type": "text-delta", "id": tid, "delta": "Empty message."})
        yield _sse({"type": "text-end", "id": tid})
        yield _sse({"type": "finish", "finishReason": "stop"})
        yield "data: [DONE]\n\n"
        return

    contents = _contents_from_messages(messages)
    assistant_msg_id = str(uuid.uuid4())
    text_part_id = "text-0"

    yield _sse({"type": "start", "messageId": assistant_msg_id})
    yield _sse({"type": "text-start", "id": text_part_id})

    gen_config = _build_generate_config(system_instruction)

    emitted_any = False

    def yield_text(s: str) -> Iterator[str]:
        nonlocal emitted_any
        if not s:
            return
        emitted_any = True
        for piece in _chunk_text_for_ui(s):
            yield _sse({"type": "text-delta", "id": text_part_id, "delta": piece})

    try:
        stream = client.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=gen_config,
        )
        for chunk in stream:
            t = getattr(chunk, "text", None) or ""
            if t:
                yield from yield_text(t)
            else:
                logger.debug("Empty chunk.text; parts=%s", getattr(chunk, "parts", None))

        if not emitted_any:
            logger.info(
                "Stream produced no visible text (often thinking-only / tool edge case). "
                "Retrying with generate_content (non-stream)."
            )
            fallback = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=gen_config,
            )
            fb = _response_text_safe(fallback)
            if fb:
                yield from yield_text(fb)
            else:
                yield from yield_text(
                    "I couldn't produce a visible answer for that request. "
                    "Try rephrasing, or ask for a safety score at specific latitude/longitude."
                )

    except Exception as exc:  # noqa: BLE001
        logger.exception("Gemini chat error: %s", exc)
        error_text = str(exc)
        if "429" in error_text or "quota" in error_text.lower():
            error_text = (
                "429 quota exceeded from Gemini API. "
                "Set billing on your Google AI project or switch GOOGLE_GENAI_MODEL. "
                f"Current model: {model_name}."
            )
        yield from yield_text(f"[Error] {error_text}")

    yield _sse({"type": "text-end", "id": text_part_id})
    yield _sse({"type": "finish", "finishReason": "stop"})
    yield "data: [DONE]\n\n"

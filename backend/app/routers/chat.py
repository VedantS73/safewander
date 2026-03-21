"""Chat endpoint compatible with Vercel AI SDK UI (`DefaultChatTransport`)."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from app.services.gemini_chat import stream_chat_ui_messages

router = APIRouter(tags=["chat"])


class ChatRequestBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    messages: list[dict] = Field(default_factory=list)
    trigger: str | None = None
    messageId: str | None = None


@router.post("/chat")
def chat(body: ChatRequestBody) -> StreamingResponse:
    return StreamingResponse(
        stream_chat_ui_messages(body.messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-accel-buffering": "no",
        },
    )

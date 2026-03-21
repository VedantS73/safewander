from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["assistant"])


class AssistantQuery(BaseModel):
    prompt: str


@router.post("/assistant/query")
def ask_assistant(payload: AssistantQuery) -> dict[str, str]:
    """Legacy JSON helper — prefer POST /api/chat with the Vercel AI SDK UI."""
    return {
        "reply": (
            f"Use the Assistant tab chat (POST /api/chat). Your prompt was: {payload.prompt}"
        )
    }


@router.post("/trip-briefing")
def trip_briefing() -> dict[str, list[str]]:
    return {
        "insights": [
            "Avoid low-lit streets after 10 PM in the market district.",
            "Use balanced route for safer ETA.",
            "Nearest safe havens are 2 police stations and 1 hospital.",
        ]
    }

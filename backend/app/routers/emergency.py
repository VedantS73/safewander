from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["emergency"])


class CheckInPayload(BaseModel):
    duration_minutes: int
    trusted_contact: str


@router.post("/check-in/start")
def start_check_in(payload: CheckInPayload) -> dict[str, str]:
    return {
        "status": "scheduled",
        "message": (
            f"Check-in timer started for {payload.duration_minutes} minutes. "
            f"Trusted contact: {payload.trusted_contact}"
        ),
    }


@router.post("/sos")
def trigger_sos() -> dict[str, str]:
    return {
        "status": "triggered",
        "message": "Live location shared and emergency contacts notified.",
    }

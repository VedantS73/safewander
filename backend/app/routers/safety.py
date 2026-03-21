from fastapi import APIRouter

from app.schemas.safety import SafetyScoreResponse

router = APIRouter(tags=["safety"])


@router.get("/safety-score", response_model=SafetyScoreResponse)
def get_safety_score(location: str = "Downtown") -> SafetyScoreResponse:
    # Placeholder data for wireframe/testing.
    return SafetyScoreResponse(
        location=location,
        safety_score=74,
        risk_level="moderate",
    )


@router.get("/live-alerts")
def get_live_alerts() -> dict[str, list[dict[str, str]]]:
    return {
        "alerts": [
            {
                "title": "High theft activity reported nearby",
                "source": "official city feed",
                "severity": "warning",
            },
            {
                "title": "Avoid 3rd Street after 10 PM",
                "source": "police update",
                "severity": "info",
            },
        ]
    }

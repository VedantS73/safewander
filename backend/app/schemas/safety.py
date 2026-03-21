from pydantic import BaseModel


class SafetyScoreResponse(BaseModel):
    location: str
    safety_score: int
    risk_level: str

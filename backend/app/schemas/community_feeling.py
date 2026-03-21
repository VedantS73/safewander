from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CommunityFeelingCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180, le=180, description="WGS84 longitude")
    feeling: int = Field(..., ge=1, le=5, description="1 = best (green), 5 = worst (red)")


class CommunityFeelingRead(BaseModel):
    id: int
    latitude: float
    longitude: float
    feeling: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CommunityFeelingsDeleteAllResponse(BaseModel):
    deleted: int


class CommunityFeelingsListResponse(BaseModel):
    feelings: list[CommunityFeelingRead]

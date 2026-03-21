from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, field_validator


class CrimeEventIn(BaseModel):
    """Payload row as sent by n8n (strings allowed for coordinates)."""

    latitude: float
    longitude: float
    original_title: str = Field(..., min_length=1)
    original_link: str = Field(..., min_length=1)
    date: str = Field(..., description='ISO date e.g. "2023-12-01"')
    time: str = Field(default="", description='Time string e.g. "16:00"')
    location: str = Field(..., min_length=1)
    crime_type: str = Field(..., min_length=1)

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def coerce_coords(cls, v: float | str) -> float:
        if isinstance(v, str):
            return float(v.strip())
        return float(v)

    def parsed_crime_date(self) -> date | None:
        s = (self.date or "").strip()
        if not s:
            return None
        try:
            return date.fromisoformat(s[:10])
        except ValueError:
            return None


class CrimeEventsBulkRequest(BaseModel):
    replace: bool = False
    events: list[CrimeEventIn] = Field(default_factory=list)


class CrimeEventsBulkResponse(BaseModel):
    inserted: int
    total_in_db: int
    replaced: bool


class CrimeEventsDeleteAllResponse(BaseModel):
    deleted: int


class N8nWebhookResponse(BaseModel):
    status: str
    inserted: int
    total_in_db: int


class CrimeEventRead(BaseModel):
    """Single crime/news row for map + clients."""

    id: int
    latitude: float
    longitude: float
    original_title: str
    original_link: str
    crime_date: date | None
    crime_time: str | None
    location: str
    crime_type: str
    distance_m: float = Field(description="Approximate distance from query point (m)")


class CrimeEventsNearbyResponse(BaseModel):
    events: list[CrimeEventRead]

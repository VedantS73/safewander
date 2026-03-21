from typing import Literal

from pydantic import BaseModel, Field

PlaceTypeLiteral = Literal["police_station", "camera", "hospital"]


class PlaceCreate(BaseModel):
    """Payload row for bulk insert (no `id` — DB assigns)."""

    type: PlaceTypeLiteral
    name: str = Field(..., min_length=1, max_length=255)
    x: float = Field(..., description="Longitude WGS84", ge=-180, le=180)
    y: float = Field(..., description="Latitude WGS84", ge=-90, le=90)


class PlacesBulkRequest(BaseModel):
    """
    Push safe-haven points. Set `replace: true` to delete all existing rows first,
    then insert `places` (full sync). If `replace: false`, rows are appended.
    """

    replace: bool = False
    places: list[PlaceCreate] = Field(default_factory=list)


class PlacesBulkResponse(BaseModel):
    inserted: int
    total_in_db: int
    replaced: bool = Field(description="True if all rows were cleared before insert")


class PlacesDeleteAllResponse(BaseModel):
    deleted: int


class PlaceRead(BaseModel):
    id: int
    type: str = Field(description="police_station | camera | hospital")
    name: str
    x: float = Field(description="Longitude WGS84")
    y: float = Field(description="Latitude WGS84")
    distance_m: float = Field(description="Approximate distance from query point")


class PlacesNearbyResponse(BaseModel):
    places: list[PlaceRead]

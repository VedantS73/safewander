from pydantic import BaseModel, Field


class PlaceRead(BaseModel):
    id: int
    type: str = Field(description="police_station | camera | hospital")
    name: str
    x: float = Field(description="Longitude WGS84")
    y: float = Field(description="Latitude WGS84")
    distance_m: float = Field(description="Approximate distance from query point")


class PlacesNearbyResponse(BaseModel):
    places: list[PlaceRead]

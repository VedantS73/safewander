"""Safe haven places near a coordinate."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud.places import list_places_near
from app.database import get_db
from app.schemas.place import PlaceRead, PlacesNearbyResponse

router = APIRouter(tags=["places"])


@router.get("/places/nearby", response_model=PlacesNearbyResponse)
def places_nearby(
    latitude: float = Query(..., ge=-90, le=90, description="WGS84 latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="WGS84 longitude"),
    radius_km: float = Query(10.0, ge=0.1, le=200, description="Search radius in km"),
    db: Session = Depends(get_db),
) -> PlacesNearbyResponse:
    """Return police_station, camera, and hospital rows near the user."""
    found = list_places_near(db, latitude=latitude, longitude=longitude, radius_km=radius_km)
    places = [
        PlaceRead(
            id=p.id,
            type=p.type,
            name=p.name,
            x=p.x,
            y=p.y,
            distance_m=round(d, 1),
        )
        for p, d in found
    ]
    return PlacesNearbyResponse(places=places)

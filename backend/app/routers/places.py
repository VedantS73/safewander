"""Safe haven places: nearby query, bulk load, delete all."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud.places import bulk_insert_places, delete_all, list_places_near
from app.database import get_db
from app.schemas.place import (
    PlaceRead,
    PlacesBulkRequest,
    PlacesBulkResponse,
    PlacesDeleteAllResponse,
    PlacesNearbyResponse,
)

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


@router.delete("/places", response_model=PlacesDeleteAllResponse)
def places_delete_all(db: Session = Depends(get_db)) -> PlacesDeleteAllResponse:
    """Remove every row in `safe_haven_places`."""
    deleted = delete_all(db)
    return PlacesDeleteAllResponse(deleted=deleted)


@router.post("/places/bulk", response_model=PlacesBulkResponse)
def places_bulk(body: PlacesBulkRequest, db: Session = Depends(get_db)) -> PlacesBulkResponse:
    """
    Insert many places from JSON.

    - `replace: true` — delete all existing rows, then insert `places` (full replace).
    - `replace: false` — append `places` to existing data.

    Example body:

    ```json
    {
      "replace": true,
      "places": [
        { "type": "police_station", "name": "Central", "x": 9.21, "y": 49.14 },
        { "type": "hospital", "name": "Main Clinic", "x": 9.22, "y": 49.15 },
        { "type": "camera", "name": "Junction A", "x": 9.20, "y": 49.13 }
      ]
    }
    ```
    """
    inserted, total_in_db = bulk_insert_places(db, body.places, replace=body.replace)
    return PlacesBulkResponse(inserted=inserted, total_in_db=total_in_db, replaced=body.replace)

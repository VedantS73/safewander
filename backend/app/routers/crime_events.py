"""Crime event ingestion (n8n) and bulk admin endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud.crime_events import bulk_insert_events, delete_all, list_crime_events_near
from app.database import get_db
from app.schemas.crime_event import (
    CrimeEventRead,
    CrimeEventsBulkRequest,
    CrimeEventsBulkResponse,
    CrimeEventsDeleteAllResponse,
    CrimeEventsNearbyResponse,
    CrimeEventIn,
    N8nWebhookResponse,
)

router = APIRouter(tags=["crime-events"])


@router.get("/crime-events/nearby", response_model=CrimeEventsNearbyResponse)
def crime_events_nearby(
    latitude: float = Query(..., ge=-90, le=90, description="WGS84 latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="WGS84 longitude"),
    radius_km: float = Query(25.0, ge=0.1, le=200, description="Search radius in km"),
    db: Session = Depends(get_db),
) -> CrimeEventsNearbyResponse:
    """Crime / press news events near the user (for Explore map)."""
    found = list_crime_events_near(db, latitude=latitude, longitude=longitude, radius_km=radius_km)
    events = [
        CrimeEventRead(
            id=ev.id,
            latitude=ev.latitude,
            longitude=ev.longitude,
            original_title=ev.original_title,
            original_link=ev.original_link,
            crime_date=ev.crime_date,
            crime_time=ev.crime_time,
            location=ev.location,
            crime_type=ev.crime_type,
            distance_m=round(d, 1),
        )
        for ev, d in found
    ]
    return CrimeEventsNearbyResponse(events=events)


@router.post("/n8n-webhook-crime-data", response_model=N8nWebhookResponse)
async def receive_n8n_webhook(
    payload: list[CrimeEventIn],
    db: Session = Depends(get_db),
) -> N8nWebhookResponse:
    """
    Webhook for n8n: JSON **array** of events. Replaces all existing rows with this payload
    (full sync). Same shape as `POST /api/crime-events/bulk` with `replace: true`.
    """
    inserted, total = bulk_insert_events(db, payload, replace=True)
    return N8nWebhookResponse(status="ok", inserted=inserted, total_in_db=total)


@router.delete("/crime-events", response_model=CrimeEventsDeleteAllResponse)
def crime_events_delete_all(db: Session = Depends(get_db)) -> CrimeEventsDeleteAllResponse:
    """Delete every row in `crime_events`."""
    deleted = delete_all(db)
    return CrimeEventsDeleteAllResponse(deleted=deleted)


@router.post("/crime-events/bulk", response_model=CrimeEventsBulkResponse)
def crime_events_bulk(body: CrimeEventsBulkRequest, db: Session = Depends(get_db)) -> CrimeEventsBulkResponse:
    """
    Insert many events.

    - `replace: true` — delete all existing rows, then insert `events`.
    - `replace: false` — append.

    Each event field matches n8n: `latitude`, `longitude`, `original_title`, `original_link`,
    `date`, `time`, `location`, `crime_type`.
    """
    inserted, total_in_db = bulk_insert_events(db, body.events, replace=body.replace)
    return CrimeEventsBulkResponse(inserted=inserted, total_in_db=total_in_db, replaced=body.replace)

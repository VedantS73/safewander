from __future__ import annotations

from math import cos, radians

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.geo_utils import haversine_m
from app.models.crime_event import CrimeEvent
from app.schemas.crime_event import CrimeEventIn


def count_all(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(CrimeEvent)) or 0)


def delete_all(db: Session) -> int:
    before = count_all(db)
    db.execute(delete(CrimeEvent))
    db.commit()
    return before


def _row_to_model(row: CrimeEventIn) -> CrimeEvent:
    return CrimeEvent(
        latitude=row.latitude,
        longitude=row.longitude,
        original_title=row.original_title.strip(),
        original_link=row.original_link.strip(),
        crime_date=row.parsed_crime_date(),
        crime_time=(row.time or "").strip() or None,
        location=row.location.strip(),
        crime_type=row.crime_type.strip(),
    )


def list_crime_events_near(
    db: Session,
    *,
    latitude: float,
    longitude: float,
    radius_km: float,
) -> list[tuple[CrimeEvent, float]]:
    """Crime/news rows within radius of (longitude, latitude), sorted by distance."""
    if radius_km <= 0 or radius_km > 200:
        radius_km = min(max(radius_km, 0.1), 200)

    lat_rad = radians(latitude)
    dlat = radius_km / 111.0
    dlng = radius_km / max(111.0 * cos(lat_rad), 0.01)

    min_lat = latitude - dlat
    max_lat = latitude + dlat
    min_lng = longitude - dlng
    max_lng = longitude + dlng

    stmt = select(CrimeEvent).where(
        CrimeEvent.latitude >= min_lat,
        CrimeEvent.latitude <= max_lat,
        CrimeEvent.longitude >= min_lng,
        CrimeEvent.longitude <= max_lng,
    )
    rows = db.execute(stmt).scalars().all()

    radius_m = radius_km * 1000.0
    out: list[tuple[CrimeEvent, float]] = []
    for ev in rows:
        d = haversine_m(longitude, latitude, ev.longitude, ev.latitude)
        if d <= radius_m:
            out.append((ev, d))

    out.sort(key=lambda t: t[1])
    return out


def bulk_insert_events(db: Session, items: list[CrimeEventIn], *, replace: bool) -> tuple[int, int]:
    """
    Insert crime events. If replace=True, delete existing rows first (one transaction).
    Returns (inserted_count, total_in_db_after).
    """
    if replace:
        db.execute(delete(CrimeEvent))
    inserted = 0
    for row in items:
        db.add(_row_to_model(row))
        inserted += 1
    db.commit()
    total = count_all(db)
    return inserted, total

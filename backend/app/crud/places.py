"""Nearby place queries."""

from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.place import SafeHavenPlace
from app.schemas.place import PlaceCreate

EARTH_RADIUS_M = 6_371_000


def _haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance in meters."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(min(1.0, max(0.0, a))))


def list_places_near(
    db: Session,
    *,
    latitude: float,
    longitude: float,
    radius_km: float,
) -> list[tuple[SafeHavenPlace, float]]:
    """
    Return places within radius_km of (longitude, latitude), sorted by distance.
    Uses a bounding-box prefilter then Haversine.
    """
    if radius_km <= 0 or radius_km > 200:
        radius_km = min(max(radius_km, 0.1), 200)

    lat_rad = radians(latitude)
    # ~111 km per degree latitude; longitude shrinks by cos(latitude)
    dlat = radius_km / 111.0
    dlng = radius_km / max(111.0 * cos(lat_rad), 0.01)

    min_lat = latitude - dlat
    max_lat = latitude + dlat
    min_lng = longitude - dlng
    max_lng = longitude + dlng

    stmt = (
        select(SafeHavenPlace)
        .where(
            SafeHavenPlace.y >= min_lat,
            SafeHavenPlace.y <= max_lat,
            SafeHavenPlace.x >= min_lng,
            SafeHavenPlace.x <= max_lng,
        )
    )
    rows = db.execute(stmt).scalars().all()

    radius_m = radius_km * 1000.0
    out: list[tuple[SafeHavenPlace, float]] = []
    for p in rows:
        d = _haversine_m(longitude, latitude, p.x, p.y)
        if d <= radius_m:
            out.append((p, d))

    out.sort(key=lambda t: t[1])
    return out


def count_all(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(SafeHavenPlace)) or 0)


def delete_all(db: Session) -> int:
    """Delete every row in `safe_haven_places`. Returns number of rows deleted."""
    before = count_all(db)
    db.execute(delete(SafeHavenPlace))
    db.commit()
    return before


def bulk_insert_places(db: Session, items: list[PlaceCreate], *, replace: bool) -> tuple[int, int]:
    """
    Insert rows. If `replace`, clear the table first (same transaction).
    Returns (inserted_count, total_in_db_after).
    """
    if replace:
        db.execute(delete(SafeHavenPlace))
    inserted = 0
    for row in items:
        db.add(
            SafeHavenPlace(
                type=row.type,
                name=row.name.strip(),
                x=row.x,
                y=row.y,
            )
        )
        inserted += 1
    db.commit()
    total = count_all(db)
    return inserted, total

from __future__ import annotations

from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session

from app.models.community_feeling import CommunityFeeling
from app.schemas.community_feeling import CommunityFeelingCreate


def count_all(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(CommunityFeeling)) or 0)


def list_all(db: Session, *, limit: int = 5000) -> list[CommunityFeeling]:
    """Most recent first (for map overlays / viz)."""
    q = (
        select(CommunityFeeling)
        .order_by(desc(CommunityFeeling.created_at))
        .limit(max(1, min(limit, 50_000)))
    )
    return list(db.scalars(q).all())


def delete_all(db: Session) -> int:
    """Remove every row in `community_feelings`. Returns number of rows deleted."""
    before = count_all(db)
    db.execute(delete(CommunityFeeling))
    db.commit()
    return before


def create_community_feeling(db: Session, body: CommunityFeelingCreate) -> CommunityFeeling:
    row = CommunityFeeling(
        latitude=body.latitude,
        longitude=body.longitude,
        feeling=body.feeling,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

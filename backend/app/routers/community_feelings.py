"""Community sentiment check-ins at locations."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.crud.community_feelings import create_community_feeling, delete_all, list_all
from app.database import get_db
from app.schemas.community_feeling import (
    CommunityFeelingCreate,
    CommunityFeelingRead,
    CommunityFeelingsDeleteAllResponse,
    CommunityFeelingsListResponse,
)

router = APIRouter(tags=["community"])


@router.get("/community-feelings", response_model=CommunityFeelingsListResponse)
def get_community_feelings(
    db: Session = Depends(get_db),
    limit: int = Query(5000, ge=1, le=50_000, description="Max rows to return (newest first)"),
) -> CommunityFeelingsListResponse:
    """List saved feeling check-ins for map overlays and analytics."""
    rows = list_all(db, limit=limit)
    return CommunityFeelingsListResponse(
        feelings=[CommunityFeelingRead.model_validate(r) for r in rows],
    )


@router.post(
    "/community-feelings",
    response_model=CommunityFeelingRead,
    status_code=status.HTTP_201_CREATED,
)
def post_community_feeling(
    body: CommunityFeelingCreate,
    db: Session = Depends(get_db),
) -> CommunityFeelingRead:
    """Record how someone felt at the given coordinates (for future data viz)."""
    row = create_community_feeling(db, body)
    return CommunityFeelingRead.model_validate(row)


@router.delete("/community-feelings", response_model=CommunityFeelingsDeleteAllResponse)
def delete_community_feelings(db: Session = Depends(get_db)) -> CommunityFeelingsDeleteAllResponse:
    """Remove all rows in `community_feelings`."""
    deleted = delete_all(db)
    return CommunityFeelingsDeleteAllResponse(deleted=deleted)

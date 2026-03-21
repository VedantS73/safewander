"""Anonymous community sentiment check-ins at a location (for future data viz)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CommunityFeeling(Base):
    __tablename__ = "community_feelings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # 1 = most positive (green) … 5 = most negative (red)
    feeling: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

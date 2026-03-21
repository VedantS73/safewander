"""Crime / incident events ingested from n8n (e.g. press police bulletins)."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CrimeEvent(Base):
    __tablename__ = "crime_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    original_title: Mapped[str] = mapped_column(Text, nullable=False)
    original_link: Mapped[str] = mapped_column(Text, nullable=False)

    # JSON uses "date" / "time"; avoid SQL reserved names in DB
    crime_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    crime_time: Mapped[str | None] = mapped_column(String(64), nullable=True)

    location: Mapped[str] = mapped_column(Text, nullable=False)
    crime_type: Mapped[str] = mapped_column(String(512), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

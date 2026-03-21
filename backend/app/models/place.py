"""Safe haven points: police, cameras, hospitals."""

from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SafeHavenPlace(Base):
    """
    x = longitude (WGS84), y = latitude (WGS84), matching common map axis naming.
    """

    __tablename__ = "safe_haven_places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        doc="One of: police_station, camera, hospital",
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False, doc="Longitude")
    y: Mapped[float] = mapped_column(Float, nullable=False, doc="Latitude")

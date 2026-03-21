"""Database: SQLite locally by default, or PostgreSQL via DATABASE_URL (e.g. Render.com)."""

from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parent.parent
_default_sqlite = BACKEND_ROOT / "data" / "safewander.db"

_RAW_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_default_sqlite.as_posix()}")


def normalize_database_url(url: str) -> str:
    """
    - SQLAlchemy expects `postgresql://`; Render sometimes provides `postgres://`.
    - Render-hosted Postgres external URLs typically need SSL; append sslmode=require if missing.
    """
    u = url.strip()
    if u.startswith("postgres://"):
        u = "postgresql://" + u[len("postgres://") :]

    parsed = urlparse(u)
    host = (parsed.hostname or "").lower()
    is_render_pg = "render.com" in host or host.endswith(".postgres.render.com")

    if u.startswith("postgresql") and is_render_pg and "sslmode" not in u:
        sep = "&" if "?" in u else "?"
        u = f"{u}{sep}sslmode=require"

    return u


DATABASE_URL = normalize_database_url(_RAW_DATABASE_URL)

_connect_args: dict = {}
_engine_kwargs: dict = {}

if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
else:
    # Cloud Postgres: drop stale connections, validate before checkout
    _engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
    }

engine: Engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    **_engine_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create tables if they do not exist."""
    from app.models import community_feeling, crime_event, place  # noqa: F401

    if DATABASE_URL.startswith("sqlite"):
        (BACKEND_ROOT / "data").mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

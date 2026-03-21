#!/usr/bin/env python3
"""
Seed `safe_haven_places` in the SQLite DB.

Usage (from `backend/` with venv activated):

  python scripts/seed_places.py
  python scripts/seed_places.py --clear

Edit SAMPLE_PLACES below with real coordinates (x = longitude, y = latitude in WGS84).
`type` must be exactly: police_station | camera | hospital
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import delete, func, select

# Project root: backend/
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import SessionLocal, init_db  # noqa: E402
from app.models.place import SafeHavenPlace  # noqa: E402

ALLOWED_TYPES = frozenset({"police_station", "camera", "hospital"})

# (type, name, x_longitude, y_latitude)
SAMPLE_PLACES: list[tuple[str, str, float, float]] = [
    # --- Heilbronn Police Stations ---
    ("police_station", "Polizeipräsidium Heilbronn", 9.20791, 49.1422),
    ("police_station", "Polizeiposten Heilbronn Innenstadt", 9.21867, 49.13887),

    # --- Nearby / District Police (approx coords for demo use) ---
    ("police_station", "Polizeirevier Böckingen", 9.1925, 49.1510),
    ("police_station", "Bundespolizeirevier Heilbronn", 9.2140, 49.1395),
    ("police_station", "Polizeipräsidium Heilbronn (Gewerbe/Umwelt)", 9.1810, 49.1355),

    ("police_station", "Polizeiposten Bad Friedrichshall", 9.2145, 49.2305),
    ("police_station", "Polizeiposten Bad Rappenau", 9.0990, 49.2400),
    ("police_station", "Polizeirevier Neckarsulm", 9.2255, 49.1895),
    ("police_station", "Autobahnpolizeirevier Weinsberg", 9.2870, 49.1515),
    ("police_station", "Polizeirevier Lauffen am Neckar", 9.1450, 49.0730),

    ("police_station", "Polizeiposten Untergruppenbach", 9.2700, 49.0900),
    ("police_station", "Polizeiposten Ilsfeld", 9.2450, 49.0560),
    ("police_station", "Polizeiposten Obersulm", 9.3820, 49.1100),
    ("police_station", "Polizeiposten Brackenheim", 9.0630, 49.0800),
    ("police_station", "Polizeiposten Güglingen", 9.0010, 49.0650),
    ("police_station", "Polizeiposten Neuenstadt am Kocher", 9.3320, 49.2340),

    # --- Hospitals (Heilbronn & nearby) ---
    ("hospital", "SLK-Klinikum am Gesundbrunnen Heilbronn", 9.2226, 49.1546),
    ("hospital", "SLK Klinikum am Plattenwald Bad Friedrichshall", 9.2148, 49.2338),
    ("hospital", "Klinikum am Weissenhof (Psychiatrie) Weinsberg", 9.2875, 49.1465),
    ("hospital", "DRK Krankenhaus Möckmühl", 9.3580, 49.3210),
    ("hospital", "Krankenhaus Bad Rappenau", 9.1015, 49.2408),

    # --- Cameras (Heilbronn & nearby) ---
    ("camera", "CCTV - Neckarsulmer Str & Paulinenstr", 9.2205, 49.1485),
    ("camera", "Traffic Cam - Kaiserstr & Allee", 9.2180, 49.1420),
    ("camera", "CCTV - Südstr & Oststr Junction", 9.2300, 49.1400),
    ("camera", "Traffic Cam - Karlsruher Str Crossing", 9.1905, 49.1375),
    ("camera", "CCTV - Böckinger Str & Ludwigsburger Str", 9.1950, 49.1505),
    ("camera", "Traffic Cam - Weinsberger Str Intersection", 9.2105, 49.1500),
    ("camera", "CCTV - Bahnhofsvorplatz (Main Station)", 9.2145, 49.1405),
    ("camera", "Traffic Cam - Hafenstr Industrial Area", 9.2255, 49.1555),
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed safe_haven_places")
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append rows without deleting existing ones (can duplicate runs).",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        if not args.append:
            db.execute(delete(SafeHavenPlace))
            db.commit()
            print("Cleared safe_haven_places (replaced with SAMPLE_PLACES).")

        for row in SAMPLE_PLACES:
            t, name, x, y = row
            if t not in ALLOWED_TYPES:
                raise SystemExit(f"Invalid type {t!r}; use one of {sorted(ALLOWED_TYPES)}")
            db.add(SafeHavenPlace(type=t, name=name, x=x, y=y))

        db.commit()
        n = db.scalar(select(func.count()).select_from(SafeHavenPlace))
        print(f"Seed complete. Total rows in safe_haven_places: {n}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

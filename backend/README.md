# SafeWander Backend (FastAPI)

## Run locally

```bash
cp .env.example .env
# Add GOOGLE_API_KEY for the Assistant chat (Gemini)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Database (SQLite)

Place data for the Explore “safe haven” map lives in **`safe_haven_places`** (SQLite file under `backend/data/safewander.db` by default). Tables are created on API startup.

- **Columns:** `type` (`police_station` \| `camera` \| `hospital`), `name`, `x` (longitude), `y` (latitude).
- **Optional env:** `DATABASE_URL` (default `sqlite:///…/backend/data/safewander.db`).

### Seed script

Edit `SAMPLE_PLACES` in `scripts/seed_places.py` (x = longitude, y = latitude), then from `backend/`:

```bash
source .venv/bin/activate
python scripts/seed_places.py          # replaces table with your sample rows
python scripts/seed_places.py --append # append without clearing
```

## Endpoints

- `GET /health`
- `GET /api/places/nearby?latitude=&longitude=&radius_km=` — safe haven points near the user (for Explore map layers).
- `DELETE /api/places` — delete **all** rows in `safe_haven_places`. Response: `{ "deleted": <n> }`.
- `POST /api/places/bulk` — JSON body to insert many rows (see below).

### Bulk JSON shape (`POST /api/places/bulk`)

```json
{
  "replace": true,
  "places": [
    { "type": "police_station", "name": "Example station", "x": 9.21, "y": 49.14 },
    { "type": "hospital", "name": "Example hospital", "x": 9.22, "y": 49.15 },
    { "type": "camera", "name": "Example camera", "x": 9.2, "y": 49.13 }
  ]
}
```

- `type` must be exactly: `police_station`, `camera`, or `hospital`.
- `x` = longitude, `y` = latitude (WGS84).
- `replace: true` — wipe the table, then insert `places` (full sync). `false` — append only.

Response: `{ "inserted": n, "total_in_db": m, "replaced": bool }`.
- `POST /api/chat` — **Vercel AI SDK UI** stream (use with `useChat` + `DefaultChatTransport` on the frontend). Uses **Gemini** with **tools** defined in `app/services/agent_tools.py` (registered in `gemini_chat.py`).
- `GET /api/safety-score`
- `GET /api/live-alerts`
- `POST /api/assistant/query` — legacy JSON (prefer `/api/chat`)
- `POST /api/trip-briefing`
- `POST /api/check-in/start`
- `POST /api/sos`

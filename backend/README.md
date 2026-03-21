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

## Endpoints

- `GET /health`
- `POST /api/chat` — **Vercel AI SDK UI** stream (use with `useChat` + `DefaultChatTransport` on the frontend). Uses **Gemini** with **tools** defined in `app/services/agent_tools.py` (registered in `gemini_chat.py`).
- `GET /api/safety-score`
- `GET /api/live-alerts`
- `POST /api/assistant/query` — legacy JSON (prefer `/api/chat`)
- `POST /api/trip-briefing`
- `POST /api/check-in/start`
- `POST /api/sos`

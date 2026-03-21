from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import assistant, chat, community_feelings, crime_events, emergency, places, safety

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SafeWander API",
    description="Backend API for SafeWander hackathon project",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(safety.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(emergency.router, prefix="/api")
app.include_router(places.router, prefix="/api")
app.include_router(crime_events.router, prefix="/api")
app.include_router(community_feelings.router, prefix="/api")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

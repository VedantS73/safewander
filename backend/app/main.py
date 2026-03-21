from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import assistant, chat, emergency, safety

load_dotenv()


app = FastAPI(
    title="SafeWander API",
    description="Backend API for SafeWander hackathon project",
    version="0.1.0",
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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

from __future__ import annotations

import asyncio
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import settings
from app import clock
from app.db import db
from app.llm import llm_client
from app.routes import chat, conductor, dream, evals, memory, sessions


app = FastAPI(title="Reverie API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    db.migrate()


@app.get("/api/health")
async def health():
    dashscope = await llm_client.health()
    with db.connection() as conn:
        offset = int(
            conn.execute(
                "SELECT value FROM app_state WHERE key = 'clock_offset_seconds'"
            ).fetchone()["value"]
        )
        simulated_date = clock.now(conn).date().isoformat() if offset else None
    return {
        "ok": True,
        "db": True,
        "dashscope_reachable": dashscope.get("reachable", False),
        "dashscope": dashscope,
        "model_ids": {
            "chat": settings.chat_model,
            "observer": settings.observer_model,
            "dream": settings.dream_model,
            "embed": settings.embed_model,
            "judge": settings.judge_model,
        },
        "mock": not settings.live_llm_enabled,
        "demo_mode": settings.demo_mode,
        "clock_offset_seconds": offset,
        "simulated_date": simulated_date,
    }


@app.get("/api/events/stream")
async def event_stream():
    queue = db.subscribe()

    async def generator():
        try:
            yield "retry: 1000\n\n"
            while True:
                message = await queue.get()
                yield f"data: {json.dumps(message)}\n\n"
        except asyncio.CancelledError:
            raise
        finally:
            db.unsubscribe(queue)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(dream.router)
app.include_router(evals.router)
app.include_router(conductor.router)

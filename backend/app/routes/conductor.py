from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.db import db
from app.memory.dream import run_dream
from app.models import ConductorClockRequest


router = APIRouter(prefix="/api/conductor", tags=["conductor"])


def require_demo() -> None:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Conductor is disabled")


@router.post("/reset")
async def reset():
    require_demo()
    db.reset_demo()
    return {"ok": True}


@router.post("/advance-clock")
async def advance_clock(payload: ConductorClockRequest):
    require_demo()
    offset = db.set_clock_offset(payload.days * 86400)
    return {"ok": True, "clock_offset_seconds": offset}


@router.get("/scripts/{name}")
async def script(name: str):
    require_demo()
    path = Path(__file__).resolve().parents[1] / "evals" / "scripts" / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Script not found")
    return json.loads(path.read_text())


@router.post("/dream-latest")
async def dream_latest():
    require_demo()
    session = db.latest_session()
    if not session:
        raise HTTPException(status_code=404, detail="No session available")
    return await run_dream(session["id"])

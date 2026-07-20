from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app import clock
from app.config import settings
from app.db import db
from app.memory.decay import DecayInput, compute_strength
from app.memory.dream import run_dream
from app.models import ConductorClockRequest
from app.subject import FILM_SESSION_SCRIPTS


router = APIRouter(prefix="/api/conductor", tags=["conductor"])


def require_demo() -> None:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Conductor is disabled")


async def decay_after_clock_advance(now: datetime) -> list[dict]:
    decayed: list[dict] = []
    for engram in db.active_engrams():
        updated = compute_strength(
            DecayInput(
                importance=float(engram["importance"]),
                access_count=int(engram["access_count"]),
                last_accessed_at=clock.parse_iso(engram["last_accessed_at"]),
                now=now,
            ),
            settings.lambda_base,
        )
        old = float(engram["strength"])
        if old - updated < 0.05:
            continue
        db.update_engram(engram["id"], strength=updated)
        decayed.append({"engram_id": engram["id"], "from": old, "to": updated})
        await db.append_event(
            "engram.decayed",
            engram["id"],
            {"from": old, "to": updated},
        )
    return decayed


@router.post("/reset")
async def reset():
    require_demo()
    db.reset_demo()
    return {"ok": True}


@router.post("/advance-clock")
async def advance_clock(payload: ConductorClockRequest):
    require_demo()
    offset = db.set_clock_offset(payload.days * 86400)
    now = datetime.now(timezone.utc) + timedelta(seconds=offset)
    decayed = await decay_after_clock_advance(now)
    return {"ok": True, "clock_offset_seconds": offset, "decayed": decayed}


@router.get("/scripts/{name}")
async def script(name: str):
    require_demo()
    if name in FILM_SESSION_SCRIPTS:
        return FILM_SESSION_SCRIPTS[name]
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

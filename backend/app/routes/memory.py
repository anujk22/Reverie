from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db


router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("/graph")
async def graph():
    return db.graph()


@router.get("/engrams/{engram_id}")
async def engram_detail(engram_id: str):
    detail = db.engram_detail(engram_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Engram not found")
    return detail


@router.get("/events")
async def events(after: str | None = None):
    return {"events": db.events_after(after)}

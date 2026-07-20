from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db
from app.llm import llm_client
from app.models import CorrectEngramRequest


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


@router.post("/engrams/{engram_id}/correct")
async def correct_engram(engram_id: str, payload: CorrectEngramRequest):
    detail = db.engram_detail(engram_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Engram not found")
    if detail["engram"]["status"] != "active":
        raise HTTPException(status_code=409, detail="Only an active memory can be corrected")
    if not db.session_exists(payload.session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    if detail["engram"]["content"].strip() == payload.content:
        raise HTTPException(status_code=409, detail="Correction must change the memory")

    source = db.insert_utterance(payload.session_id, "student", payload.content)
    embedding = await llm_client.embed(payload.content, session_id=payload.session_id)
    corrected = db.correct_engram(
        engram_id,
        payload.content,
        source["id"],
        embedding,
    )
    if not corrected:
        raise HTTPException(status_code=409, detail="Memory changed before correction completed")
    previous, successor = corrected
    await db.append_event(
        "engram.observed",
        successor["id"],
        {
            "reason": "explicit user correction",
            "corrected_from": previous["id"],
            "toast": "Corrected memory stored with direct provenance",
        },
        session_id=payload.session_id,
    )
    await db.append_event(
        "engram.superseded",
        previous["id"],
        {
            "reason": "explicit user correction",
            "superseded_by": successor["id"],
            "toast": "Earlier memory superseded",
        },
        session_id=payload.session_id,
    )
    return {"previous": previous, "engram": successor}


@router.delete("/engrams/{engram_id}")
async def delete_engram(engram_id: str, session_id: str | None = None):
    if session_id and not db.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    deleted = db.delete_engram(engram_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Engram not found")
    await db.append_event(
        "engram.deleted",
        None,
        {
            "deleted_engram_id": deleted["id"],
            "type": deleted["type"],
            "reason": "explicit user request",
            "toast": "Memory forgotten",
        },
        session_id=session_id,
    )
    return {"ok": True, "deleted_engram_id": deleted["id"]}


@router.get("/events")
async def events(after: str | None = None):
    return {"events": db.events_after(after)}

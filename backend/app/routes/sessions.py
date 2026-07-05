from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db
from app.memory.dream import run_dream
from app.memory.retrieval_service import assemble_memory_pack
from app.models import CreateSessionRequest


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("")
async def list_sessions():
    return {"sessions": db.list_sessions()}


@router.post("")
async def create_session(payload: CreateSessionRequest):
    session = db.create_session(payload.title)
    pack = await assemble_memory_pack(
        "session open: Maya's goals, last dream summary, and current calculus focus",
        session_id=session["id"],
        phase="session_open",
    )
    return {**session, "memory_pack": pack}


@router.get("/{session_id}/memory-pack")
async def memory_pack(session_id: str, phase: str = "session_open"):
    return await assemble_memory_pack(
        "session open: Maya's goals, last dream summary, and current calculus focus",
        session_id=session_id,
        phase=phase,
    )


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    db.end_session(session_id)
    report = await run_dream(session_id)
    return report

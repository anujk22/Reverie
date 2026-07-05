from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.db import db
from app.memory.dream import run_dream


router = APIRouter(prefix="/api/dream", tags=["dream"])


@router.post("/run")
async def manual_run(session_id: str | None = None):
    target = session_id or db.latest_session()
    if isinstance(target, dict):
        session_id = target["id"]
    if not session_id:
        raise HTTPException(status_code=404, detail="No session available")
    return await run_dream(session_id)


@router.get("/reports/{report_id}")
async def report(report_id: str):
    with db.connection() as conn:
        row = conn.execute(
            "SELECT * FROM dream_reports WHERE id = ?", (report_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dream report not found")
        item = dict(row)
        item["stats_json"] = json.loads(item["stats_json"] or "{}")
        return item

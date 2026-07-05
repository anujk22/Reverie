from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models import ChatRequest
from app.tutor import chat_stream


router = APIRouter(prefix="/api/sessions", tags=["chat"])


@router.post("/{session_id}/chat")
async def chat(session_id: str, payload: ChatRequest):
    return StreamingResponse(
        chat_stream(session_id, payload.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

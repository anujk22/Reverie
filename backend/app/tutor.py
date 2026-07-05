from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from .db import db
from .llm import llm_client
from .memory.observer import observe_exchange
from .memory.retrieval_service import assemble_memory_pack


def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def chat_stream(session_id: str, message: str) -> AsyncIterator[str]:
    student = db.insert_utterance(session_id, "student", message)
    pack = await assemble_memory_pack(message, session_id=session_id, phase="mid_session")
    yield sse({"kind": "memory_pack", **pack})

    reply_parts: list[str] = []
    async for token in llm_client.stream_tutor(message, pack["winners"], session_id):
        reply_parts.append(token)
        yield sse({"kind": "token", "token": token})
    reply = "".join(reply_parts).strip()
    tutor = db.insert_utterance(session_id, "tutor", reply)
    yield sse(
        {
            "kind": "done",
            "student_utterance_id": student["id"],
            "tutor_utterance_id": tutor["id"],
            "reply": reply,
        }
    )
    asyncio.create_task(observe_exchange(session_id))

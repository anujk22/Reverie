#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings  # noqa: E402
from app.db import db  # noqa: E402
from app.llm import llm_client  # noqa: E402


async def main() -> int:
    if not settings.live_llm_enabled:
        print("Refusing to re-embed in mock mode. Set DASHSCOPE_API_KEY and do not set MOCK_LLM=true.")
        return 1

    db.migrate()
    engrams = db.all_engrams()
    with db.connection() as conn:
        for engram in engrams:
            embedding = await llm_client.embed(engram["content"])
            conn.execute(
                """
                INSERT OR REPLACE INTO engram_vectors(engram_id, embedding_json)
                VALUES (?, ?)
                """,
                (engram["id"], json.dumps(embedding)),
            )
        conn.execute(
            """
            INSERT INTO app_state(key, value) VALUES ('embedding_dimension', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (str(len(await llm_client.embed("dimension probe"))),),
        )
        conn.execute(
            """
            INSERT INTO app_state(key, value) VALUES ('embedding_model', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (settings.embed_model,),
        )

    print(f"Re-embedded {len(engrams)} engrams with {settings.embed_model}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

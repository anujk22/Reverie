import asyncio
from types import SimpleNamespace

import app.routes.sessions as session_routes
from app.llm import LLMClient


def test_memory_pack_preview_explicitly_disables_reinforcement(monkeypatch) -> None:
    received = {}

    async def assemble(*args, **kwargs):
        received["args"] = args
        received["kwargs"] = kwargs
        return {"winners": []}

    monkeypatch.setattr(session_routes, "assemble_memory_pack", assemble)
    result = asyncio.run(session_routes.memory_pack("ses_preview"))

    assert result == {"winners": []}
    assert received["kwargs"]["reinforce"] is False


def test_live_health_probe_is_cached(monkeypatch) -> None:
    client = LLMClient()
    client.settings = SimpleNamespace(
        live_llm_enabled=True,
        chat_model="qwen-plus",
        observer_model="qwen-flash",
        dream_model="qwen-max",
        embed_model="text-embedding-v4",
        judge_model="qwen-max",
    )
    calls = 0

    async def complete(*_args, **_kwargs):
        nonlocal calls
        calls += 1
        return "Ok."

    monkeypatch.setattr(client, "complete_tutor", complete)

    first = asyncio.run(client.health())
    second = asyncio.run(client.health())

    assert first["reachable"] is True
    assert second["reachable"] is True
    assert second["cached"] is True
    assert calls == 1

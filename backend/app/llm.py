from __future__ import annotations

import asyncio
import hashlib
import json
import math
import time
from typing import Any, AsyncIterator, TypeVar

from . import clock
from .config import settings
from .db import db, new_id
from .models import (
    DistillVerdict,
    EvalJudgeVerdict,
    ObserverResult,
    PairJudgeVerdict,
    SessionLevelEngramResult,
)
from .subject import (
    MOCK_AFFECT_CONTENT,
    MOCK_AFFECT_MARKERS,
    MOCK_AFFECT_QUOTE_MARKERS,
    MOCK_AFFECT_TAGS,
    MOCK_DEFAULT_REPLY,
    MOCK_EXACT_STEPS_REPLY,
    MOCK_GOAL_CONTENT,
    MOCK_GOAL_TAGS,
    MOCK_LAUNCH_MARKERS,
    MOCK_LAUNCH_QUOTE_MARKERS,
    MOCK_MASTERY_CONTENT,
    MOCK_MASTERY_MARKERS,
    MOCK_MASTERY_QUOTE_MARKERS,
    MOCK_MASTERY_REPLY,
    MOCK_MASTERY_TAGS,
    MOCK_MISCONCEPTION_CONTENT,
    MOCK_MISCONCEPTION_QUOTE_MARKERS,
    MOCK_MISCONCEPTION_REPLY,
    MOCK_MISCONCEPTION_TAGS,
    MOCK_MISCONCEPTION_TRIGGERS,
    MOCK_PREFERENCE_CONTENT,
    MOCK_PREFERENCE_TAGS,
    MOCK_RECALL_MARKERS,
    MOCK_RECALL_REPLY,
    MOCK_RECALL_TRIGGERS,
    MOCK_STEP_QUOTE_MARKERS,
    MOCK_STEP_MARKERS,
    MOCK_STRATEGY_CONTENT,
    MOCK_STRATEGY_TAGS,
    OBSERVER_BAD_EXAMPLE,
    OBSERVER_GOOD_EXAMPLE,
    SUBJECT_TAG_VOCABULARY,
    build_tutor_system_prompt,
)


def _count_tokens(text: str) -> int:
    return max(1, int(len(text.split()) * 1.35))


T = TypeVar("T")
RETRY_DELAYS = (1, 2, 4)


class LLMClient:
    def __init__(self) -> None:
        self.settings = settings

    def _client(self):
        from openai import AsyncOpenAI

        return AsyncOpenAI(
            api_key=self.settings.dashscope_api_key,
            base_url=self.settings.dashscope_base_url,
            timeout=60,
        )

    async def _broadcast_degraded(
        self, purpose: str, error: Exception | str, session_id: str | None = None
    ) -> None:
        await db.broadcast(
            {
                "kind": "runtime_degraded",
                "purpose": purpose,
                "session_id": session_id,
                "error": str(error)[:240],
                "at": clock.iso_now(),
            }
        )

    async def _chat_text(
        self,
        *,
        purpose: str,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        session_id: str | None,
        response_format: dict[str, str] | None = None,
    ) -> str:
        prompt_estimate = _count_tokens(
            "\n".join(message["content"] for message in messages)
        )
        last_error: Exception | None = None
        last_latency = 0
        for attempt in range(len(RETRY_DELAYS) + 1):
            start = time.perf_counter()
            try:  # pragma: no cover - depends on network
                request: dict[str, Any] = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    request["response_format"] = response_format
                response = await self._client().chat.completions.create(**request)
                text = response.choices[0].message.content or ""
                usage = response.usage
                self._log_call(
                    purpose,
                    model,
                    usage.prompt_tokens if usage else prompt_estimate,
                    usage.completion_tokens if usage else _count_tokens(text),
                    int((time.perf_counter() - start) * 1000),
                    session_id,
                )
                return text
            except Exception as exc:
                last_error = exc
                last_latency = int((time.perf_counter() - start) * 1000)
                if attempt < len(RETRY_DELAYS):
                    await asyncio.sleep(RETRY_DELAYS[attempt])

        self._log_call(
            purpose,
            model,
            prompt_estimate,
            0,
            last_latency,
            session_id,
            error=str(last_error),
        )
        raise last_error or RuntimeError(f"{purpose} call failed")

    async def _chat_json(
        self,
        *,
        purpose: str,
        model: str,
        prompt: str,
        schema: type[T],
        temperature: float,
        session_id: str | None,
    ) -> T:
        messages = [{"role": "user", "content": prompt}]
        try:
            text = await self._chat_text(
                purpose=purpose,
                model=model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
                session_id=session_id,
            )
            return schema.model_validate_json(text)  # type: ignore[attr-defined]
        except Exception as validation_error:
            repair_prompt = (
                f"{prompt}\n\nThe previous response failed validation: {validation_error}. "
                "Return corrected STRICT JSON only."
            )
            repair_text = await self._chat_text(
                purpose=purpose,
                model=model,
                messages=[{"role": "user", "content": repair_prompt}],
                temperature=temperature,
                response_format={"type": "json_object"},
                session_id=session_id,
            )
            return schema.model_validate_json(repair_text)  # type: ignore[attr-defined]

    async def health(self) -> dict[str, Any]:
        if not self.settings.live_llm_enabled:
            return {
                "reachable": False,
                "mode": "mock",
                "reason": "DASHSCOPE_API_KEY missing or MOCK_LLM=true",
                "chat_model": self.settings.chat_model,
                "observer_model": self.settings.observer_model,
                "dream_model": self.settings.dream_model,
                "embed_model": self.settings.embed_model,
                "judge_model": self.settings.judge_model,
            }
        try:
            start = time.perf_counter()
            text = await self.complete_tutor(
                "Say ok.", [], session_id=None, purpose="health", max_words=1
            )
            return {
                "reachable": True,
                "latency_ms": int((time.perf_counter() - start) * 1000),
                "chat_model": self.settings.chat_model,
                "observer_model": self.settings.observer_model,
                "dream_model": self.settings.dream_model,
                "embed_model": self.settings.embed_model,
                "judge_model": self.settings.judge_model,
                "sample": text[:32],
            }
        except Exception as exc:  # pragma: no cover - depends on network
            return {
                "reachable": False,
                "mode": "live",
                "error": str(exc),
                "chat_model": self.settings.chat_model,
                "observer_model": self.settings.observer_model,
                "dream_model": self.settings.dream_model,
                "embed_model": self.settings.embed_model,
                "judge_model": self.settings.judge_model,
            }

    async def embed(self, text: str, session_id: str | None = None) -> list[float]:
        if not self.settings.live_llm_enabled:
            vector = mock_embedding(text, self.settings.embed_dim)
            self._log_call("embed", self.settings.embed_model, _count_tokens(text), 0, 1, session_id)
            return vector

        last_error: Exception | None = None
        last_latency = 0
        for attempt in range(len(RETRY_DELAYS) + 1):
            start = time.perf_counter()
            try:  # pragma: no cover - depends on network
                response = await self._client().embeddings.create(
                    model=self.settings.embed_model,
                    input=text,
                )
                latency = int((time.perf_counter() - start) * 1000)
                usage = getattr(response, "usage", None)
                self._log_call(
                    "embed",
                    self.settings.embed_model,
                    getattr(usage, "prompt_tokens", _count_tokens(text)),
                    0,
                    latency,
                    session_id,
                )
                return list(response.data[0].embedding)
            except Exception as exc:
                last_error = exc
                last_latency = int((time.perf_counter() - start) * 1000)
                if attempt < len(RETRY_DELAYS):
                    await asyncio.sleep(RETRY_DELAYS[attempt])

        self._log_call(
            "embed",
            self.settings.embed_model,
            _count_tokens(text),
            0,
            last_latency,
            session_id,
            error=str(last_error),
        )
        await self._broadcast_degraded("embed", last_error or "embedding failed", session_id)
        return mock_embedding(text, self.settings.embed_dim)

    async def complete_tutor(
        self,
        student_message: str,
        memory_pack: list[dict[str, Any]],
        session_id: str | None,
        purpose: str = "tutor",
        max_words: int = 120,
        temperature: float = 0.7,
    ) -> str:
        if not self.settings.live_llm_enabled:
            text = mock_tutor_reply(student_message, memory_pack, max_words)
            self._log_call(
                purpose,
                self.settings.chat_model,
                _count_tokens(student_message),
                _count_tokens(text),
                1,
                session_id,
            )
            return text

        prompt = build_tutor_prompt(student_message, memory_pack)
        try:  # pragma: no cover - depends on network
            return await self._chat_text(
                purpose=purpose,
                model=self.settings.chat_model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": student_message},
                ],
                temperature=temperature,
                session_id=session_id,
            )
        except Exception as exc:
            fallback = mock_tutor_reply(student_message, memory_pack, max_words)
            await self._broadcast_degraded(purpose, exc, session_id)
            return fallback

    async def stream_tutor(
        self, student_message: str, memory_pack: list[dict[str, Any]], session_id: str
    ) -> AsyncIterator[str]:
        if not self.settings.live_llm_enabled:
            text = await self.complete_tutor(student_message, memory_pack, session_id)
            words = text.split(" ")
            for index, word in enumerate(words):
                suffix = " " if index < len(words) - 1 else ""
                yield word + suffix
                await asyncio.sleep(0.015)
            return

        prompt = build_tutor_prompt(student_message, memory_pack)
        prompt_estimate = _count_tokens(prompt + "\n" + student_message)
        last_error: Exception | None = None
        text_parts: list[str] = []
        for attempt in range(len(RETRY_DELAYS) + 1):
            yielded = False
            final_usage: Any = None
            start = time.perf_counter()
            try:  # pragma: no cover - depends on network
                stream = await self._client().chat.completions.create(
                    model=self.settings.chat_model,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": student_message},
                    ],
                    temperature=0.7,
                    stream=True,
                    stream_options={"include_usage": True},
                )
                async for chunk in stream:
                    usage = getattr(chunk, "usage", None)
                    if usage:
                        final_usage = usage
                    if not getattr(chunk, "choices", None):
                        continue
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        yielded = True
                        text_parts.append(delta)
                        yield delta
                text = "".join(text_parts)
                self._log_call(
                    "tutor",
                    self.settings.chat_model,
                    final_usage.prompt_tokens if final_usage else prompt_estimate,
                    final_usage.completion_tokens if final_usage else _count_tokens(text),
                    int((time.perf_counter() - start) * 1000),
                    session_id,
                )
                return
            except Exception as exc:
                last_error = exc
                if yielded:
                    break
                if attempt < len(RETRY_DELAYS):
                    await asyncio.sleep(RETRY_DELAYS[attempt])

        self._log_call(
            "tutor",
            self.settings.chat_model,
            prompt_estimate,
            _count_tokens("".join(text_parts)),
            0,
            session_id,
            error=str(last_error),
        )
        await self._broadcast_degraded("tutor", last_error or "stream failed", session_id)
        fallback = mock_tutor_reply(student_message, memory_pack, 120)
        words = fallback.split(" ")
        for index, word in enumerate(words):
            suffix = " " if index < len(words) - 1 else ""
            yield word + suffix
            await asyncio.sleep(0.015)

    async def extract_engrams(
        self, transcript: str, session_id: str | None = None
    ) -> list[dict[str, Any]]:
        if not self.settings.live_llm_enabled:
            candidates = mock_extract(transcript)
            self._log_call(
                "observer",
                self.settings.observer_model,
                _count_tokens(transcript),
                _count_tokens(json.dumps(candidates)),
                1,
                session_id,
            )
            return candidates
        prompt = (
            "You watch a support exchange and extract durable observations about the PERSON.\n"
            "Return STRICT JSON: {\"engrams\":[{\"type\":\"...\",\"content\":\"...\","
            "\"subject_tags\":[\"..\"],\"confidence\":0.0,\"importance\":0.0,"
            "\"source_quotes\":[\"exact substring from transcript\", ...]}]}\n"
            "Rules:\n"
            "- 0 to 3 engrams. Return {\"engrams\":[]} if nothing durable was revealed. "
            "Most turns reveal nothing.\n"
            "- type must be one of: misconception, mastery, preference, affect, goal, fact, strategy_outcome.\n"
            "- content: one sentence, third person, specific and testable. Bad: "
            f"\"{OBSERVER_BAD_EXAMPLE}\". Good: \"{OBSERVER_GOOD_EXAMPLE}\"\n"
            "- The Bad/Good examples are format illustrations only. NEVER copy or paraphrase them into "
            "output; extract only claims grounded in the transcript below.\n"
            "- Only claims supported by the transcript. Every engram MUST include at least one exact source quote.\n"
            "- Type assignment must be supported by the quoted evidence, not by surrounding labels or assumptions.\n"
            "- A clearly expressed emotional state tied to a concrete trigger should be extracted as its own "
            "affect engram with its own quote; never fold emotion into another engram type's content.\n"
            "- Do not create a misconception merely because the student mentions a past error; only create one "
            "when the quoted evidence shows current incorrect reasoning.\n"
            "- Correct application of a skill is mastery evidence, never misconception evidence. Contrastive example: "
            "if a transcript says \"I used to mix up rule A, but now I apply rule B correctly,\" extract mastery "
            "for the current correct performance, not a misconception from the historical mention.\n"
            "- confidence: how sure the transcript supports this. importance: how much the assistant should care "
            "(misconceptions and goals high; incidental facts low).\n"
            f"- subject_tags: use tags from this vocabulary whenever one applies: {', '.join(SUBJECT_TAG_VOCABULARY)}. "
            "Only add a new snake_case tag if none of these fit.\n"
            "TRANSCRIPT (most recent exchange last):\n"
            f"{transcript}"
        )
        try:  # pragma: no cover - depends on network
            parsed = await self._chat_json(
                purpose="observer",
                model=self.settings.observer_model,
                prompt=prompt,
                schema=ObserverResult,
                temperature=0.1,
                session_id=session_id,
            )
            return [item.model_dump() for item in parsed.engrams[:3]]
        except Exception as exc:
            await self._broadcast_degraded("observer", exc, session_id)
            return []

    async def extract_session_level_engrams(
        self,
        transcript: str,
        existing_engrams: list[dict[str, Any]],
        session_id: str | None = None,
    ) -> list[dict[str, Any]]:
        if not self.settings.live_llm_enabled:
            candidates = mock_session_level_extract(transcript)
            self._log_call(
                "consolidate",
                self.settings.dream_model,
                _count_tokens(transcript),
                _count_tokens(json.dumps(candidates)),
                1,
                session_id,
            )
            return candidates

        prompt = (
            "You are consolidating a support session into durable long-term memory.\n"
            "Return STRICT JSON: {\"engrams\":[{\"type\":\"affect|strategy_outcome\","
            "\"content\":\"...\",\"subject_tags\":[\"..\"],\"confidence\":0.0,"
            "\"importance\":0.0,\"source_quotes\":[\"exact substring from transcript\", ...]}]}\n"
            "Rules:\n"
            "- Propose 0 to 2 memories, only if the full session arc supports them.\n"
            "- Only use type affect or strategy_outcome.\n"
            "- Every source quote must be an exact substring from the transcript.\n"
            "- Reject unsupported type assignments: the quotes must support both the content and the type.\n"
            "- If the session shows a clear emotional moment tied to a concrete trigger, propose it as an "
            "affect memory with its own quote.\n"
            "- Correct application of a skill is not a misconception. If a student corrects an earlier error, "
            "that may support strategy_outcome or mastery elsewhere, not a new misconception.\n"
            "- Do not duplicate an existing memory unless the transcript provides materially new evidence.\n"
            f"- subject_tags: use tags from this vocabulary whenever one applies: {', '.join(SUBJECT_TAG_VOCABULARY)}. "
            "Only add a new snake_case tag if none of these fit.\n"
            f"EXISTING MEMORIES: {json.dumps(existing_engrams, sort_keys=True)}\n"
            f"TRANSCRIPT:\n{transcript}"
        )
        try:  # pragma: no cover - depends on network
            parsed = await self._chat_json(
                purpose="consolidate",
                model=self.settings.dream_model,
                prompt=prompt,
                schema=SessionLevelEngramResult,
                temperature=0.1,
                session_id=session_id,
            )
            return [item.model_dump() for item in parsed.engrams[:2]]
        except Exception as exc:
            await self._broadcast_degraded("consolidate", exc, session_id)
            return []

    async def distill_engram(
        self,
        engram: dict[str, Any],
        quotes: list[str],
        session_id: str | None = None,
    ) -> dict[str, Any]:
        if not self.settings.live_llm_enabled:
            result = {
                "verdict": "confirm",
                "content": engram["content"],
                "confidence": engram["confidence"],
                "reason": "Mock mode confirms supported provisional memories.",
            }
            self._log_call(
                "consolidate",
                self.settings.dream_model,
                _count_tokens(json.dumps(engram) + json.dumps(quotes)),
                _count_tokens(json.dumps(result)),
                1,
                session_id,
            )
            return result

        prompt = (
            "You are consolidating a conversation session into long-term memory. Given a candidate memory\n"
            "and the exact transcript excerpts it came from, return STRICT JSON:\n"
            "{\"verdict\":\"confirm|revise|reject\",\"content\":\"(final one-sentence content if confirm/revise)\",\n"
            " \"confidence\":0.0,\"reason\":\"one short sentence\"}\n"
            "- reject if the excerpts do not actually support the claim.\n"
            "- revise to make content tighter/more precise; never broader than evidence.\n"
            "- never fold emotional state into a factual claim; affect belongs in separate affect memories, "
            "so keep factual claims tight and emotion-free.\n"
            f"CANDIDATE: {json.dumps(engram, sort_keys=True)}\n"
            f"EXCERPTS: {json.dumps(quotes, sort_keys=True)}"
        )
        try:  # pragma: no cover - depends on network
            verdict = await self._chat_json(
                purpose="consolidate",
                model=self.settings.dream_model,
                prompt=prompt,
                schema=DistillVerdict,
                temperature=0,
                session_id=session_id,
            )
            return verdict.model_dump()
        except Exception as exc:
            await self._broadcast_degraded("consolidate", exc, session_id)
            return {
                "verdict": "confirm",
                "content": engram["content"],
                "confidence": engram["confidence"],
                "reason": "Distillation unavailable; deterministic fallback kept threshold behavior.",
            }

    async def judge_pair(
        self,
        left: dict[str, Any],
        right: dict[str, Any],
        session_id: str | None = None,
        relation: str = "dedupe",
    ) -> dict[str, Any]:
        if not self.settings.live_llm_enabled:
            verdict = "contradiction" if relation == "reconcile" else "duplicate"
            result = {"verdict": verdict, "reason": "Mock mode preserves threshold behavior."}
            self._log_call(
                "judge",
                self.settings.dream_model,
                _count_tokens(json.dumps(left) + json.dumps(right)),
                _count_tokens(json.dumps(result)),
                1,
                session_id,
            )
            return result

        prompt = (
            "Compare two memories about the same person. Return STRICT JSON:\n"
            "{\"verdict\":\"duplicate|refinement|contradiction|distinct\",\"reason\":\"one sentence\"}\n"
            "- duplicate: same claim in different words.\n"
            "- refinement: B is a strictly more precise/updated version of A.\n"
            "- contradiction: they cannot both be true of the person now.\n"
            "- distinct: different claims that can coexist.\n"
            f"A: {json.dumps(left, sort_keys=True)}   B: {json.dumps(right, sort_keys=True)}"
        )
        try:  # pragma: no cover - depends on network
            verdict = await self._chat_json(
                purpose="judge",
                model=self.settings.dream_model,
                prompt=prompt,
                schema=PairJudgeVerdict,
                temperature=0,
                session_id=session_id,
            )
            return verdict.model_dump()
        except Exception as exc:
            await self._broadcast_degraded("judge", exc, session_id)
            return {"verdict": "distinct", "reason": "Judge unavailable; skipped item."}

    async def score_personalization(
        self, truth_sheet: str, opening_message: str, session_id: str | None = None
    ) -> dict[str, Any]:
        if not self.settings.live_llm_enabled:
            result = {
                "score": 0,
                "reason": "Smoke eval unavailable in mock mode.",
                "real_run": False,
            }
            self._log_call(
                "eval_judge",
                self.settings.judge_model,
                _count_tokens(truth_sheet + opening_message),
                _count_tokens(json.dumps(result)),
                1,
                session_id,
            )
            return result

        prompt = (
            "Score 1-5 how well this assistant OPENING message demonstrates specific knowledge of this "
            "learner (their known misconception, goal, and learning preference), while sounding natural.\n"
            "5 = references a specific prior struggle or preference accurately and naturally.\n"
            "3 = generic but subject-appropriate. 1 = could be sent to any learner.\n"
            "Return STRICT JSON {\"score\":N,\"reason\":\"...\"}.\n"
            f"LEARNER GROUND TRUTH: {truth_sheet}\n"
            f"ASSISTANT OPENING: {opening_message}"
        )
        try:  # pragma: no cover - depends on network
            parsed = await self._chat_json(
                purpose="eval_judge",
                model=self.settings.judge_model,
                prompt=prompt,
                schema=EvalJudgeVerdict,
                temperature=0,
                session_id=session_id,
            )
            return {
                "score": int(parsed.score),
                "reason": str(parsed.reason),
                "real_run": True,
            }
        except Exception as exc:
            await self._broadcast_degraded("eval_judge", exc, session_id)
            return {
                "score": 0,
                "reason": f"Eval judge failed: {exc}",
                "real_run": False,
            }

    def _log_call(
        self,
        purpose: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: int,
        session_id: str | None,
        error: str | None = None,
    ) -> None:
        with db.connection() as conn:
            conn.execute(
                """
                INSERT INTO llm_calls
                  (id, purpose, model, prompt_tokens, completion_tokens,
                   latency_ms, session_id, created_at, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_id("llm"),
                    purpose,
                    model,
                    prompt_tokens,
                    completion_tokens,
                    latency_ms,
                    session_id,
                    clock.iso_now(conn),
                    error,
                ),
            )


def build_tutor_prompt(student_message: str, memory_pack: list[dict[str, Any]]) -> str:
    procedural = [
        item
        for item in memory_pack
        if item.get("type") in {"preference", "affect", "strategy_outcome"}
    ]
    semantic = [
        item
        for item in memory_pack
        if item.get("type") in {"misconception", "mastery", "goal", "fact"}
    ]
    procedural_block = "\n".join(
        f"- {item['content']} (confidence {item.get('confidence', 0):.2f})"
        for item in procedural
    ) or "- No durable response directives yet."
    semantic_block = "\n".join(
        f"- {item['type'].upper()} ({item.get('confidence', 0):.2f}): {item['content']}"
        for item in semantic
    ) or "- No durable person model yet."
    return build_tutor_system_prompt(
        student_message,
        procedural_block,
        semantic_block,
        "Use the app clock date and current session title supplied by the session layer.",
        has_memories=bool(memory_pack),
    )


def mock_embedding(text: str, dim: int) -> list[float]:
    vector = [0.0] * dim
    for token in text.lower().replace("'", "").split():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:2], "big") % dim
        sign = 1 if digest[2] % 2 == 0 else -1
        vector[index] += sign * (1 + digest[3] / 255)
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / norm, 6) for value in vector]


def mock_tutor_reply(
    student_message: str, memory_pack: list[dict[str, Any]], max_words: int
) -> str:
    lower = student_message.lower()
    remembers_retry = any(
        any(marker in item.get("content", "").lower() for marker in MOCK_RECALL_MARKERS)
        for item in memory_pack
    )
    prefers_steps = any(
        any(marker in item.get("content", "").lower() for marker in MOCK_STEP_MARKERS)
        for item in memory_pack
    )
    remembers_affect = any(item.get("type") == "affect" for item in memory_pack)
    if remembers_retry and any(marker in lower for marker in MOCK_RECALL_TRIGGERS):
        prefix = "Low-pressure start: " if remembers_affect else ""
        return prefix + MOCK_RECALL_REPLY
    if any(marker in lower for marker in MOCK_MISCONCEPTION_TRIGGERS):
        return MOCK_MISCONCEPTION_REPLY
    if any(marker in lower for marker in MOCK_STEP_MARKERS) or prefers_steps:
        return MOCK_EXACT_STEPS_REPLY
    if any(marker in lower for marker in MOCK_MASTERY_MARKERS):
        return MOCK_MASTERY_REPLY
    return MOCK_DEFAULT_REPLY


def mock_extract(transcript: str) -> list[dict[str, Any]]:
    lower = transcript.lower()
    found: list[dict[str, Any]] = []
    if "automatic" in lower and any(marker in lower for marker in MOCK_RECALL_MARKERS):
        quote = find_first_case_snippet(transcript, MOCK_MISCONCEPTION_QUOTE_MARKERS)
        quote = quote or MOCK_MISCONCEPTION_QUOTE_MARKERS[0]
        found.append(
            {
                "type": "misconception",
                "content": MOCK_MISCONCEPTION_CONTENT,
                "subject_tags": MOCK_MISCONCEPTION_TAGS,
                "confidence": 0.78,
                "importance": 0.95,
                "source_quotes": [quote],
            }
        )
    if any(marker in lower for marker in MOCK_STEP_MARKERS):
        quote = find_first_case_snippet(transcript, MOCK_STEP_QUOTE_MARKERS)
        quote = quote or MOCK_STEP_QUOTE_MARKERS[0]
        found.append(
            {
                "type": "preference",
                "content": MOCK_PREFERENCE_CONTENT,
                "subject_tags": MOCK_PREFERENCE_TAGS,
                "confidence": 0.88,
                "importance": 0.78,
                "source_quotes": [quote],
            }
        )
    if any(marker in lower for marker in MOCK_LAUNCH_MARKERS):
        quote = find_first_case_snippet(transcript, MOCK_LAUNCH_QUOTE_MARKERS)
        quote = quote or MOCK_LAUNCH_QUOTE_MARKERS[0]
        found.append(
            {
                "type": "goal",
                "content": MOCK_GOAL_CONTENT,
                "subject_tags": MOCK_GOAL_TAGS,
                "confidence": 0.8,
                "importance": 0.9,
                "source_quotes": [quote],
            }
        )
    if any(marker in lower for marker in MOCK_AFFECT_MARKERS):
        quote = find_first_case_snippet(transcript, MOCK_AFFECT_QUOTE_MARKERS)
        quote = quote or MOCK_AFFECT_QUOTE_MARKERS[0]
        found.append(
            {
                "type": "affect",
                "content": MOCK_AFFECT_CONTENT,
                "subject_tags": MOCK_AFFECT_TAGS,
                "confidence": 0.72,
                "importance": 0.7,
                "source_quotes": [quote],
            }
        )
    if any(marker in lower for marker in MOCK_MASTERY_MARKERS):
        found.append(
            {
                "type": "mastery",
                "content": MOCK_MASTERY_CONTENT,
                "subject_tags": MOCK_MASTERY_TAGS,
                "confidence": 0.82,
                "importance": 0.84,
                "source_quotes": [
                    find_first_case_snippet(transcript, MOCK_MASTERY_QUOTE_MARKERS)
                    or MOCK_MASTERY_QUOTE_MARKERS[0]
                ],
            }
        )
    return found[:3]


def mock_session_level_extract(transcript: str) -> list[dict[str, Any]]:
    lower = transcript.lower()
    found: list[dict[str, Any]] = []
    if any(marker in lower for marker in MOCK_AFFECT_MARKERS):
        quote = find_first_case_snippet(transcript, MOCK_AFFECT_QUOTE_MARKERS)
        quote = quote or MOCK_AFFECT_QUOTE_MARKERS[0]
        found.append(
            {
                "type": "affect",
                "content": MOCK_AFFECT_CONTENT,
                "subject_tags": MOCK_AFFECT_TAGS,
                "confidence": 0.72,
                "importance": 0.7,
                "source_quotes": [quote],
            }
        )
    if any(marker in lower for marker in MOCK_MASTERY_MARKERS):
        quote = find_first_case_snippet(transcript, MOCK_MASTERY_QUOTE_MARKERS)
        quote = quote or MOCK_MASTERY_QUOTE_MARKERS[0]
        found.append(
            {
                "type": "strategy_outcome",
                "content": MOCK_STRATEGY_CONTENT,
                "subject_tags": MOCK_STRATEGY_TAGS,
                "confidence": 0.74,
                "importance": 0.8,
                "source_quotes": [quote],
            }
        )
    return found[:2]


def find_case_snippet(text: str, needle: str) -> str | None:
    index = text.lower().find(needle.lower())
    if index < 0:
        return None
    return text[index : index + len(needle)]


def find_first_case_snippet(text: str, needles: tuple[str, ...]) -> str | None:
    for needle in needles:
        snippet = find_case_snippet(text, needle)
        if snippet:
            return snippet
    return None


llm_client = LLMClient()

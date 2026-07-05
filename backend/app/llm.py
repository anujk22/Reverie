from __future__ import annotations

import asyncio
import hashlib
import json
import math
import time
from typing import Any, AsyncIterator

from . import clock
from .config import settings
from .db import db, new_id


def _count_tokens(text: str) -> int:
    return max(1, int(len(text.split()) * 1.35))


class LLMClient:
    def __init__(self) -> None:
        self.settings = settings

    async def health(self) -> dict[str, Any]:
        if not self.settings.live_llm_enabled:
            return {
                "reachable": False,
                "mode": "mock",
                "reason": "DASHSCOPE_API_KEY missing or MOCK_LLM=true",
                "chat_model": self.settings.chat_model,
                "embed_model": self.settings.embed_model,
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
                "embed_model": self.settings.embed_model,
                "sample": text[:32],
            }
        except Exception as exc:  # pragma: no cover - depends on network
            return {
                "reachable": False,
                "mode": "live",
                "error": str(exc),
                "chat_model": self.settings.chat_model,
                "embed_model": self.settings.embed_model,
            }

    async def embed(self, text: str, session_id: str | None = None) -> list[float]:
        if not self.settings.live_llm_enabled:
            vector = mock_embedding(text, self.settings.embed_dim)
            self._log_call("embed", self.settings.embed_model, _count_tokens(text), 0, 1, session_id)
            return vector

        start = time.perf_counter()
        try:  # pragma: no cover - depends on network
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=self.settings.dashscope_api_key,
                base_url=self.settings.dashscope_base_url,
            )
            response = await client.embeddings.create(
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
            latency = int((time.perf_counter() - start) * 1000)
            self._log_call(
                "embed",
                self.settings.embed_model,
                _count_tokens(text),
                0,
                latency,
                session_id,
                error=str(exc),
            )
            return mock_embedding(text, self.settings.embed_dim)

    async def complete_tutor(
        self,
        student_message: str,
        memory_pack: list[dict[str, Any]],
        session_id: str | None,
        purpose: str = "tutor",
        max_words: int = 120,
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
        start = time.perf_counter()
        try:  # pragma: no cover - depends on network
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=self.settings.dashscope_api_key,
                base_url=self.settings.dashscope_base_url,
                timeout=60,
            )
            response = await client.chat.completions.create(
                model=self.settings.chat_model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": student_message},
                ],
                temperature=0.7,
            )
            text = response.choices[0].message.content or ""
            usage = response.usage
            self._log_call(
                purpose,
                self.settings.chat_model,
                usage.prompt_tokens if usage else _count_tokens(prompt),
                usage.completion_tokens if usage else _count_tokens(text),
                int((time.perf_counter() - start) * 1000),
                session_id,
            )
            return text
        except Exception as exc:
            fallback = mock_tutor_reply(student_message, memory_pack, max_words)
            self._log_call(
                purpose,
                self.settings.chat_model,
                _count_tokens(prompt),
                _count_tokens(fallback),
                int((time.perf_counter() - start) * 1000),
                session_id,
                error=str(exc),
            )
            return fallback

    async def stream_tutor(
        self, student_message: str, memory_pack: list[dict[str, Any]], session_id: str
    ) -> AsyncIterator[str]:
        text = await self.complete_tutor(student_message, memory_pack, session_id)
        words = text.split(" ")
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
                self.settings.chat_model,
                _count_tokens(transcript),
                _count_tokens(json.dumps(candidates)),
                1,
                session_id,
            )
            return candidates
        prompt = (
            "You watch a tutoring exchange and extract durable observations about the STUDENT.\n"
            "Return STRICT JSON: {\"engrams\":[{\"type\":\"...\",\"content\":\"...\","
            "\"subject_tags\":[\"..\"],\"confidence\":0.0,\"importance\":0.0,"
            "\"source_quotes\":[\"exact substring from transcript\", ...]}]}\n"
            "Rules:\n"
            "- 0 to 3 engrams. Return {\"engrams\":[]} if nothing durable was revealed. "
            "Most turns reveal nothing.\n"
            "- type must be one of: misconception, mastery, preference, affect, goal, fact, strategy_outcome.\n"
            "- content: one sentence, third person, specific and testable. Bad: "
            "\"struggles with calculus\". Good: \"Differentiates f(g(x)) as f'(x) times g'(x), "
            "applying the product rule pattern to compositions.\"\n"
            "- Only claims supported by the transcript. Every engram MUST include at least one exact source quote.\n"
            "- Type assignment must be supported by the quoted evidence, not by surrounding labels or assumptions.\n"
            "- Do not create a misconception merely because the student mentions a past error; only create one "
            "when the quoted evidence shows current incorrect reasoning.\n"
            "- Correct application of a skill is mastery evidence, never misconception evidence. Contrastive example: "
            "if a transcript says \"I used to mix up rule A, but now I apply rule B correctly,\" extract mastery "
            "for the current correct performance, not a misconception from the historical mention.\n"
            "- confidence: how sure the transcript supports this. importance: how much a tutor should care "
            "(misconceptions and goals high; incidental facts low).\n"
            "TRANSCRIPT (most recent exchange last):\n"
            f"{transcript}"
        )
        start = time.perf_counter()
        try:  # pragma: no cover - depends on network
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=self.settings.dashscope_api_key,
                base_url=self.settings.dashscope_base_url,
                timeout=60,
            )
            response = await client.chat.completions.create(
                model=self.settings.chat_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content or '{"engrams":[]}'
            usage = response.usage
            self._log_call(
                "observer",
                self.settings.chat_model,
                usage.prompt_tokens if usage else _count_tokens(prompt),
                usage.completion_tokens if usage else _count_tokens(text),
                int((time.perf_counter() - start) * 1000),
                session_id,
            )
            parsed = json.loads(text)
            return parsed.get("engrams", [])[:3]
        except Exception as exc:
            self._log_call(
                "observer",
                self.settings.chat_model,
                _count_tokens(prompt),
                0,
                int((time.perf_counter() - start) * 1000),
                session_id,
                error=str(exc),
            )
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
                self.settings.chat_model,
                _count_tokens(transcript),
                _count_tokens(json.dumps(candidates)),
                1,
                session_id,
            )
            return candidates

        prompt = (
            "You are consolidating a tutoring session into durable long-term memory.\n"
            "Return STRICT JSON: {\"engrams\":[{\"type\":\"affect|strategy_outcome\","
            "\"content\":\"...\",\"subject_tags\":[\"..\"],\"confidence\":0.0,"
            "\"importance\":0.0,\"source_quotes\":[\"exact substring from transcript\", ...]}]}\n"
            "Rules:\n"
            "- Propose 0 to 2 memories, only if the full session arc supports them.\n"
            "- Only use type affect or strategy_outcome.\n"
            "- Every source quote must be an exact substring from the transcript.\n"
            "- Reject unsupported type assignments: the quotes must support both the content and the type.\n"
            "- Correct application of a skill is not a misconception. If a student corrects an earlier error, "
            "that may support strategy_outcome or mastery elsewhere, not a new misconception.\n"
            "- Do not duplicate an existing memory unless the transcript provides materially new evidence.\n"
            f"EXISTING MEMORIES: {json.dumps(existing_engrams, sort_keys=True)}\n"
            f"TRANSCRIPT:\n{transcript}"
        )
        start = time.perf_counter()
        try:  # pragma: no cover - depends on network
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=self.settings.dashscope_api_key,
                base_url=self.settings.dashscope_base_url,
                timeout=60,
            )
            response = await client.chat.completions.create(
                model=self.settings.chat_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content or '{"engrams":[]}'
            usage = response.usage
            self._log_call(
                "consolidate",
                self.settings.chat_model,
                usage.prompt_tokens if usage else _count_tokens(prompt),
                usage.completion_tokens if usage else _count_tokens(text),
                int((time.perf_counter() - start) * 1000),
                session_id,
            )
            parsed = json.loads(text)
            return parsed.get("engrams", [])[:2]
        except Exception as exc:
            self._log_call(
                "consolidate",
                self.settings.chat_model,
                _count_tokens(prompt),
                0,
                int((time.perf_counter() - start) * 1000),
                session_id,
                error=str(exc),
            )
            return []

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
            "Score 1-5 how well this tutor OPENING message demonstrates specific knowledge of this "
            "student (their known misconception, goal, and learning preference), while sounding natural.\n"
            "5 = references a specific prior struggle or preference accurately and naturally.\n"
            "3 = generic but subject-appropriate. 1 = could be sent to any student.\n"
            "Return STRICT JSON {\"score\":N,\"reason\":\"...\"}.\n"
            f"STUDENT GROUND TRUTH: {truth_sheet}\n"
            f"TUTOR OPENING: {opening_message}"
        )
        start = time.perf_counter()
        try:  # pragma: no cover - depends on network
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=self.settings.dashscope_api_key,
                base_url=self.settings.dashscope_base_url,
                timeout=60,
            )
            response = await client.chat.completions.create(
                model=self.settings.judge_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content or "{}"
            parsed = json.loads(text)
            usage = response.usage
            self._log_call(
                "eval_judge",
                self.settings.judge_model,
                usage.prompt_tokens if usage else _count_tokens(prompt),
                usage.completion_tokens if usage else _count_tokens(text),
                int((time.perf_counter() - start) * 1000),
                session_id,
            )
            return {
                "score": int(parsed["score"]),
                "reason": str(parsed["reason"]),
                "real_run": True,
            }
        except Exception as exc:
            self._log_call(
                "eval_judge",
                self.settings.judge_model,
                _count_tokens(prompt),
                0,
                int((time.perf_counter() - start) * 1000),
                session_id,
                error=str(exc),
            )
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
    ) or "- No durable teaching directives yet."
    semantic_block = "\n".join(
        f"- {item['type'].upper()} ({item.get('confidence', 0):.2f}): {item['content']}"
        for item in semantic
    ) or "- No durable student model yet."
    return f"""You are Reverie, a private tutor for Calculus I. You are warm, precise, and Socratic.
Use plain LaTeX-free notation. Keep replies under 120 words unless working a full example.

TEACHING DIRECTIVES:
{procedural_block}

STUDENT MODEL:
{semantic_block}

CURRENT STUDENT MESSAGE:
{student_message}
"""


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
    remembers_chain = any("chain" in item.get("content", "").lower() for item in memory_pack)
    prefers_examples = any("example" in item.get("content", "").lower() for item in memory_pack)
    if remembers_chain and "start" in lower:
        return (
            "Last time, f(g(x)) was tempting to treat like a product. Let's start with one "
            "worked example: if y = (3x + 1)^4, what is the outside function doing?"
        )
    if "f'(x)" in lower or "product rule" in lower:
        prefix = "Let's use an example first. " if prefers_examples else ""
        return (
            prefix
            + "For f(g(x)), the pieces are nested, not multiplied. Differentiate the outside "
            "while keeping the inside, then multiply by the derivative of the inside. For "
            "(3x + 1)^4, that gives 4(3x + 1)^3 times 3."
        )
    if "example first" in lower:
        return (
            "Absolutely. Worked example first: y = (2x - 5)^3. Outside is cube, inside is "
            "2x - 5. What do you get for outside derivative, leaving the inside untouched?"
        )
    if "outer" in lower and "inner" in lower:
        return (
            "Yes. That is the chain rule shape: outside derivative evaluated at the inside, "
            "times the inside derivative. Nice correction. Try one more: d/dx of (x^2 + 1)^5."
        )
    return (
        "Let's make it concrete. Are you looking at two functions multiplied side by side, "
        "or one function nested inside another?"
    )


def mock_extract(transcript: str) -> list[dict[str, Any]]:
    lower = transcript.lower()
    found: list[dict[str, Any]] = []
    if "f'(x) times g'(x)" in transcript or "product rule" in lower:
        quote = "f'(x) times g'(x)" if "f'(x) times g'(x)" in transcript else "product rule"
        found.append(
            {
                "type": "misconception",
                "content": "Differentiates f(g(x)) as f'(x) times g'(x), applying the product rule pattern to compositions.",
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.78,
                "importance": 0.95,
                "source_quotes": [quote],
            }
        )
    if "example first" in lower or "rules in the abstract" in lower:
        quote = find_case_snippet(transcript, "example first") or find_case_snippet(
            transcript, "rules in the abstract"
        ) or "example first"
        found.append(
            {
                "type": "preference",
                "content": "Learns chain rule best from a worked example before an abstract rule.",
                "subject_tags": ["worked_examples"],
                "confidence": 0.88,
                "importance": 0.78,
                "source_quotes": [quote],
            }
        )
    if "midterm" in lower:
        quote = find_case_snippet(transcript, "midterm") or "midterm"
        found.append(
            {
                "type": "goal",
                "content": "Is preparing for a differentiation midterm covering chain rule.",
                "subject_tags": ["midterm", "differentiation"],
                "confidence": 0.8,
                "importance": 0.9,
                "source_quotes": [quote],
            }
        )
    if "anxious" in lower or "panic" in lower:
        quote = "anxious" if "anxious" in lower else "panic"
        found.append(
            {
                "type": "affect",
                "content": "Anxiety rises around exam language; respond by concretizing the next step.",
                "subject_tags": ["exam_anxiety"],
                "confidence": 0.72,
                "importance": 0.7,
                "source_quotes": [quote],
            }
        )
    if "outer derivative" in lower and "inner derivative" in lower:
        found.append(
            {
                "type": "mastery",
                "content": "Correctly explains chain rule as outside derivative times inner derivative.",
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.82,
                "importance": 0.84,
                "source_quotes": ["outer derivative"],
            }
        )
    return found[:3]


def mock_session_level_extract(transcript: str) -> list[dict[str, Any]]:
    lower = transcript.lower()
    found: list[dict[str, Any]] = []
    if ("anxious" in lower or "panic" in lower or "freez" in lower) and (
        "midterm" in lower or "exam" in lower
    ):
        quote = find_case_snippet(transcript, "anxious") or find_case_snippet(
            transcript, "panic"
        ) or find_case_snippet(transcript, "freez") or "anxious"
        found.append(
            {
                "type": "affect",
                "content": "Anxiety rises around exam language; respond by concretizing the next step.",
                "subject_tags": ["exam_anxiety"],
                "confidence": 0.72,
                "importance": 0.7,
                "source_quotes": [quote],
            }
        )
    if "outer derivative" in lower and "inner derivative" in lower:
        quote = find_case_snippet(transcript, "outer derivative") or "outer derivative"
        found.append(
            {
                "type": "strategy_outcome",
                "content": "Guiding questions helped Maya self-correct chain rule reasoning.",
                "subject_tags": ["chain_rule", "guiding_questions"],
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


llm_client = LLMClient()

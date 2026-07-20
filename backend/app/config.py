from __future__ import annotations

from dataclasses import dataclass
import os


ENGRAM_TYPES = (
    "misconception",
    "mastery",
    "preference",
    "affect",
    "goal",
    "fact",
    "strategy_outcome",
)

SEMANTIC_TYPES = {"misconception", "mastery", "goal", "fact"}
PROCEDURAL_TYPES = {"preference", "affect", "strategy_outcome"}

TYPE_IMPORTANCE_PRIOR = {
    "misconception": 0.95,
    "mastery": 0.8,
    "preference": 0.75,
    "affect": 0.7,
    "goal": 0.9,
    "fact": 0.35,
    "strategy_outcome": 0.8,
}

SESSION_OPEN_PRIOR = {
    "goal": 1.0,
    "misconception": 0.95,
    "preference": 0.9,
    "affect": 0.65,
    "mastery": 0.55,
    "strategy_outcome": 0.6,
    "fact": 0.35,
}

MID_SESSION_PRIOR = {
    "misconception": 1.0,
    "mastery": 0.8,
    "preference": 0.7,
    "strategy_outcome": 0.65,
    "goal": 0.55,
    "affect": 0.55,
    "fact": 0.25,
}


@dataclass(frozen=True)
class Settings:
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "")
    dashscope_base_url: str = os.getenv(
        "DASHSCOPE_BASE_URL",
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )
    chat_model: str = os.getenv("CHAT_MODEL", "qwen-plus")
    observer_model: str = os.getenv("OBSERVER_MODEL", "qwen-flash")
    dream_model: str = os.getenv("DREAM_MODEL", "qwen-max")
    embed_model: str = os.getenv("EMBED_MODEL", "text-embedding-v4")
    judge_model: str = os.getenv("JUDGE_MODEL", "qwen-max")
    db_path: str = os.getenv("DB_PATH", "./data/reverie.db")
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    mock_llm: bool = os.getenv("MOCK_LLM", "").lower() == "true"
    context_budget_tokens: int = int(os.getenv("CONTEXT_BUDGET_TOKENS", "1200"))
    mid_session_relevance_threshold: float = float(
        os.getenv("MID_SESSION_RELEVANCE_THRESHOLD", "0.20")
    )
    clock_offset_seconds: int = int(os.getenv("CLOCK_OFFSET_SECONDS", "0"))
    embed_dim: int = int(os.getenv("EMBED_DIM", "1024"))
    lambda_base: float = float(os.getenv("LAMBDA_BASE", "0.35"))
    duplicate_reinforce_threshold: float = float(
        os.getenv("DUPLICATE_REINFORCE_THRESHOLD", "0.92")
    )
    dream_dedupe_threshold: float = float(os.getenv("DREAM_DEDUPE_THRESHOLD", "0.88"))

    @property
    def live_llm_enabled(self) -> bool:
        return bool(self.dashscope_api_key) and not self.mock_llm


settings = Settings()

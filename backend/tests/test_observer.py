from __future__ import annotations

from app.memory.observer import quote_sources, quote_supported, transcript_window


def test_transcript_window_uses_last_six_utterances() -> None:
    utterances = [
        {"id": f"utt_{index}", "role": "student", "content": f"message {index}"}
        for index in range(7)
    ]

    transcript = transcript_window(utterances)

    assert "message 0" not in transcript
    assert transcript.splitlines()[0] == "STUDENT: message 1"
    assert transcript.splitlines()[-1] == "STUDENT: message 6"


def test_quote_supported_accepts_exact_or_close_quote_only() -> None:
    assert quote_supported(
        "I need an example first.",
        "STUDENT: I need an example first.",
    )
    assert quote_supported(
        "I need an example frst.",
        "I need an example first.",
    )
    assert not quote_supported(
        "I am confident about integration by parts now.",
        "STUDENT: I still mix up the chain rule and product rule.",
    )


def test_quote_sources_prefers_exact_match_then_best_fuzzy_source() -> None:
    utterances = [
        {
            "id": "utt_example",
            "role": "student",
            "content": "Could we do an example first?",
        },
        {
            "id": "utt_chain",
            "role": "student",
            "content": "Use the outer derivative times the inner derivative.",
        },
    ]

    assert quote_sources("example first", utterances) == ["utt_example"]
    assert quote_sources(
        "Use the outer derivate times the inner derivative.",
        utterances,
    ) == ["utt_chain"]
    assert quote_sources("anything", []) == []

import pytest
from pydantic import ValidationError

from app.models import CandidateEngram, SessionLevelEngramResult


OBSERVED_STRING_PAYLOAD = {
    "type": "affect",
    "content": "The student is frustrated because the order sync failed close to the sale date, causing stress.",
    "subject_tags": "failed_order_sync, frustration, sale_date",
    "confidence": 0.9,
    "importance": 0.8,
    "source_quotes": "I am frustrated that this broke so late.",
}


def test_candidate_engram_coerces_comma_joined_strings():
    engram = CandidateEngram.model_validate(OBSERVED_STRING_PAYLOAD)
    assert engram.subject_tags == ["failed_order_sync", "frustration", "sale_date"]
    assert engram.source_quotes == ["I am frustrated that this broke so late."]


def test_session_level_result_parses_string_array_payload():
    raw = (
        '{"engrams": [{"type": "affect", '
        '"content": "The student is frustrated because the order sync failed close to the sale date, causing stress.", '
        '"subject_tags": "failed_order_sync, frustration, sale_date", '
        '"confidence": 0.9, "importance": 0.8, '
        '"source_quotes": "I am frustrated that this broke so late."}]}'
    )
    result = SessionLevelEngramResult.model_validate_json(raw)
    assert len(result.engrams) == 1
    assert result.engrams[0].source_quotes == ["I am frustrated that this broke so late."]


def test_candidate_engram_real_arrays_pass_unchanged():
    payload = dict(
        OBSERVED_STRING_PAYLOAD,
        subject_tags=["failed_order_sync", "frustration"],
        source_quotes=["The sale date is close, and I am frustrated that this broke so late."],
    )
    engram = CandidateEngram.model_validate(payload)
    assert engram.subject_tags == ["failed_order_sync", "frustration"]
    assert engram.source_quotes == [
        "The sale date is close, and I am frustrated that this broke so late."
    ]


def test_candidate_engram_rejects_empty_string_quote():
    payload = dict(OBSERVED_STRING_PAYLOAD, source_quotes="   ")
    with pytest.raises(ValidationError):
        CandidateEngram.model_validate(payload)

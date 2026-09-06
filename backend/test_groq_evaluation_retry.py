"""Focused tests for retrying transient Groq structured-output failures."""

import asyncio
import json
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

sys.path.insert(0, "/Users/tanu/Desktop/projects/interview-ace/backend")

from app.services.groq_service import evaluate_answer_groq


class FakeCompletions:
    def __init__(self, failures_before_success: int):
        self.calls = 0
        self.failures_before_success = failures_before_success
        self.last_request = None

    def create(self, **kwargs):
        self.calls += 1
        self.last_request = kwargs
        if self.calls <= self.failures_before_success:
            raise RuntimeError("Error code: 400 - Failed to validate JSON: json_validate_failed")
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=json.dumps(
                            {
                                "correctness_score": 78,
                                "communication_score": 84,
                                "filler_word_count": 2,
                                "feedback": "Clear answer with a practical example.",
                            }
                        )
                    )
                )
            ]
        )


def run_evaluation(answer_text: str, failures_before_success: int):
    completions = FakeCompletions(failures_before_success)
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))

    with (
        patch("app.services.groq_service._get_groq_client", return_value=client),
        patch("app.services.groq_service._get_model_name", return_value="test-model"),
        patch("app.services.groq_service.asyncio.sleep", new=AsyncMock()),
    ):
        result = asyncio.run(
            evaluate_answer_groq(
                "Describe a time you made a difficult technical trade-off.",
                answer_text,
            )
        )
    return result, completions


def test_short_answer_succeeds():
    result, completions = run_evaluation("I chose a cache after measuring repeated reads.", 0)
    assert result.correctness_score == 78
    assert result.communication_score == 84
    assert result.filler_word_count == 2
    assert completions.calls == 1
    system_prompt = completions.last_request["messages"][0]["content"]
    assert "Relevance" in system_prompt
    assert "Depth" in system_prompt
    assert "Specificity" in system_prompt
    assert "optional advanced techniques" in system_prompt


def test_long_and_behavioral_answers_retry_without_truncation():
    answer = "I first gathered input from the team and explained the trade-off. " * 120
    result, completions = run_evaluation(answer, 2)
    user_message = completions.last_request["messages"][1]["content"]

    assert result.feedback == "Clear answer with a practical example."
    assert completions.calls == 3
    assert answer in user_message
    assert "<candidate_answer>" in user_message
    assert completions.last_request["response_format"]["json_schema"]["strict"] is True


def test_audio_transcript_uses_the_same_evaluation_path():
    transcript = "Um, I built a deployment pipeline and improved its failure handling."
    result, completions = run_evaluation(transcript, 1)

    assert result.filler_word_count == 2
    assert completions.calls == 2


def test_stops_after_two_additional_structured_output_retries():
    try:
        run_evaluation("A saved answer that cannot be evaluated yet.", 3)
        raise AssertionError("Expected the third structured-output failure to be returned")
    except RuntimeError as error:
        assert str(error) == "Groq evaluation could not be completed. Please retry."

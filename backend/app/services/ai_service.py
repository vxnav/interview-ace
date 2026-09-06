"""Provider-independent AI service interface for interview question generation."""

from typing import Optional
from pydantic import BaseModel


class GeneratedQuestion(BaseModel):
    """Represents a single generated interview question."""
    question_text: str
    topic: str
    question_order: int


class AnswerEvaluation(BaseModel):
    """Represents an AI evaluation of an interview answer."""
    correctness_score: int
    communication_score: int
    filler_word_count: int
    feedback: str


async def generate_interview_questions(
    target_role: str,
    resume_data: Optional[dict] = None,
    interview_type: str = "mixed",
    num_questions: int = 5,
    difficulty: str = "medium",
) -> list[GeneratedQuestion]:
    """
    Generate tailored interview questions for a given role and optional resume.
    
    This function delegates to the configured LLM provider implementation.
    
    Args:
        target_role: The target job role for the interview.
        resume_data: Optional parsed resume data (dict with candidate info).
        num_questions: Number of questions to generate (default: 5).
    
    Returns:
        List of GeneratedQuestion objects with question_text, topic, and question_order.
    
    Raises:
        ValueError: If LLM API key is missing or configuration is invalid.
        RuntimeError: If LLM request fails or returns invalid data.
    """
    # Import here to allow provider selection via environment variable
    from .groq_service import generate_questions_groq
    
    questions = await generate_questions_groq(
        target_role=target_role,
        resume_data=resume_data,
        interview_type=interview_type,
        num_questions=num_questions,
        difficulty=difficulty,
    )
    
    return questions


async def evaluate_interview_answer(
    question_text: str,
    answer_text: str,
) -> AnswerEvaluation:
    """Evaluate an interview answer through the configured AI provider."""
    from .groq_service import GroqConfigError, GroqResponseError, evaluate_answer_groq

    try:
        return await evaluate_answer_groq(
            question_text=question_text,
            answer_text=answer_text,
        )
    except GroqConfigError as error:
        raise ValueError(str(error)) from error
    except GroqResponseError as error:
        raise RuntimeError(str(error)) from error


async def transcribe_interview_audio(
    filename: str,
    content: bytes,
    content_type: str,
) -> str:
    """Transcribe a recorded interview response through the configured provider."""
    from .groq_service import GroqConfigError, GroqResponseError, transcribe_audio_groq

    try:
        return await transcribe_audio_groq(filename, content, content_type)
    except GroqConfigError as error:
        raise ValueError(str(error)) from error
    except GroqResponseError as error:
        raise RuntimeError(str(error)) from error

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, EmailStr, Field


# ============ User Schemas ============

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ============ Resume Schemas ============

class ResumeCreate(BaseModel):
    """Request body for resume upload."""
    pass  # File upload handled separately with form/multipart


class ResumeResponse(BaseModel):
    id: int
    user_id: int
    file_path: str
    original_filename: Optional[str] = None
    parsed_data: Optional[dict[str, Any]] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ResumeListResponse(BaseModel):
    id: int
    file_path: str
    original_filename: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ============ Interview Schemas ============

class InterviewCreate(BaseModel):
    target_role: str = Field(..., min_length=1, max_length=255)
    resume_id: Optional[int] = None


class InterviewUpdate(BaseModel):
    """Update interview status or metadata."""
    status: Optional[str] = None


class InterviewResponse(BaseModel):
    id: int
    user_id: int
    resume_id: Optional[int] = None
    target_role: str
    status: str
    overall_score: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    questions: list["InterviewQuestionResponse"] = []

    class Config:
        from_attributes = True


class InterviewListResponse(BaseModel):
    id: int
    target_role: str
    status: str
    overall_score: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    answered_question_count: int = 0
    question_count: int = 0

    class Config:
        from_attributes = True


# ============ Interview Question Schemas ============

class InterviewQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1, max_length=100)
    question_order: int = Field(..., ge=1)


class InterviewQuestionResponse(BaseModel):
    id: int
    interview_id: int
    question_text: str
    topic: str
    question_order: int
    answer: Optional["AnswerResponse"] = None

    class Config:
        from_attributes = True


# ============ Answer Schemas ============

class AnswerCreate(BaseModel):
    transcript: Optional[str] = None
    audio_path: Optional[str] = None


class AnswerUpdate(BaseModel):
    transcript: Optional[str] = None
    audio_path: Optional[str] = None


class AnswerResponse(BaseModel):
    id: int
    interview_question_id: int
    transcript: Optional[str] = None
    audio_path: Optional[str] = None
    created_at: datetime
    evaluation: Optional["EvaluationResponse"] = None

    class Config:
        from_attributes = True


# ============ Evaluation Schemas ============

class EvaluationCreate(BaseModel):
    correctness_score: Optional[float] = Field(None, ge=0, le=100)
    communication_score: Optional[float] = Field(None, ge=0, le=100)
    filler_word_count: Optional[int] = Field(None, ge=0)
    feedback: Optional[str] = None


class EvaluationResponse(BaseModel):
    id: int
    answer_id: int
    correctness_score: Optional[float] = None
    communication_score: Optional[float] = None
    filler_word_count: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Question Generation Schemas ============

class GenerateQuestionsResponse(BaseModel):
    """Response from the generate-questions endpoint."""
    interview_id: int
    target_role: str
    num_generated: int
    questions: list[InterviewQuestionResponse]

    class Config:
        from_attributes = True


# ============ Interview Completion & Results Schemas ============

class CompleteInterviewResponse(BaseModel):
    """Response from completing an interview and calculating overall score."""
    interview_id: int
    status: str
    overall_score: Optional[float] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewResultAnswerResponse(BaseModel):
    """Answer information within interview results."""
    answer_id: int
    transcript: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewResultEvaluationResponse(BaseModel):
    """Evaluation information within interview results."""
    correctness_score: Optional[float] = None
    communication_score: Optional[float] = None
    filler_word_count: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewResultQuestionResponse(BaseModel):
    """Question details within interview results."""
    question_id: int
    question_text: str
    topic: str
    question_order: int
    answer: Optional[InterviewResultAnswerResponse] = None
    evaluation: Optional[InterviewResultEvaluationResponse] = None

    class Config:
        from_attributes = True


class InterviewResultsResponse(BaseModel):
    """Complete interview results with all questions, answers, and evaluations."""
    interview_id: int
    target_role: str
    status: str
    overall_score: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    questions: list[InterviewResultQuestionResponse]

    class Config:
        from_attributes = True


# ============ Analytics Schemas ============

class TopicPerformance(BaseModel):
    """Performance metrics for a specific topic."""
    topic: str
    average_score: float
    num_questions: int
    
    class Config:
        from_attributes = True


class PerformanceDataPoint(BaseModel):
    """Single data point for performance over time."""
    interview_id: int
    target_role: str
    overall_score: float
    completed_at: datetime
    
    class Config:
        from_attributes = True


class AreaToImprove(BaseModel):
    """Area that needs improvement based on low scores."""
    topic: str
    average_score: float
    num_questions: int
    lowest_correctness: Optional[float] = None
    lowest_communication: Optional[float] = None
    
    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    """Complete analytics data for a user's completed interviews."""
    average_overall_score: Optional[float] = None
    average_correctness_score: Optional[float] = None
    average_communication_score: Optional[float] = None
    total_completed_interviews: int = 0
    total_questions_answered: int = 0
    performance_over_time: list[PerformanceDataPoint] = []
    topic_wise_performance: list[TopicPerformance] = []
    areas_to_improve: list[AreaToImprove] = []
    
    class Config:
        from_attributes = True


# Update forward references for nested models
InterviewQuestionResponse.model_rebuild()
InterviewResponse.model_rebuild()
AnswerResponse.model_rebuild()
GenerateQuestionsResponse.model_rebuild()
InterviewResultQuestionResponse.model_rebuild()
InterviewResultsResponse.model_rebuild()

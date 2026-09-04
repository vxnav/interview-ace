from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy import and_
from sqlalchemy.orm import Session

from . import schemas, models
from .database import get_db
from .dependencies import get_current_user
from .utils import (
    hash_password,
    verify_password,
    create_access_token,
)


router = APIRouter()


# ============ Authentication Routes ============

@router.post("/auth/register", response_model=schemas.UserResponse)
def register(
    user_data: schemas.UserRegister,
    db: Session = Depends(get_db),
):
    """Register a new user."""
    # Check if email already exists
    existing_user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    
    # Create new user
    password_hash = hash_password(user_data.password)
    new_user = models.User(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/auth/login", response_model=schemas.Token)
def login(
    user_data: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT token."""
    user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires,
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


# ============ Resume Routes ============

@router.post("/resumes", response_model=schemas.ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a resume file for the authenticated user."""
    import os
    import uuid
    
    # Create uploads directory if it doesn't exist
    uploads_dir = "uploads/resumes"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Generate unique filename
    if not file.filename:
        raise HTTPException(400, "Filename is required")
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(uploads_dir, unique_filename)
    
    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        from .services.resume_parser import extract_resume_data

        parsed_data = extract_resume_data(file.filename, contents)
    except Exception:
        parsed_data = None
    
    # Create resume record
    resume = models.Resume(
        user_id=current_user.id,
        file_path=file_path,
        original_filename=file.filename,
        parsed_data=parsed_data,
    )
    
    db.add(resume)
    db.commit()
    db.refresh(resume)
    
    return resume


@router.get("/resumes", response_model=list[schemas.ResumeListResponse])
def list_resumes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all resumes for the authenticated user."""
    resumes = db.query(models.Resume).filter(
        models.Resume.user_id == current_user.id
    ).all()
    return resumes


@router.get("/resumes/{resume_id}", response_model=schemas.ResumeResponse)
def get_resume(
    resume_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific resume by ID."""
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    
    # Verify ownership
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resume",
        )
    
    return resume


# ============ Interview Routes ============

@router.post("/interviews", response_model=schemas.InterviewResponse)
def create_interview(
    interview_data: schemas.InterviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new interview for the authenticated user."""
    # Validate resume ownership if provided
    if interview_data.resume_id:
        resume = db.query(models.Resume).filter(
            models.Resume.id == interview_data.resume_id
        ).first()
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found",
            )
        
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to use this resume",
            )
    
    # Create interview
    interview = models.Interview(
        user_id=current_user.id,
        resume_id=interview_data.resume_id,
        target_role=interview_data.target_role,
        status=models.InterviewStatus.CREATED,
    )
    
    db.add(interview)
    db.commit()
    db.refresh(interview)
    
    return interview


@router.get("/interviews", response_model=list[schemas.InterviewListResponse])
def list_interviews(
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all interviews for the authenticated user."""
    query = db.query(models.Interview).filter(
        models.Interview.user_id == current_user.id
    )
    
    if status_filter:
        query = query.filter(models.Interview.status == status_filter)
    
    interviews = query.order_by(models.Interview.created_at.desc()).all()
    return [
        schemas.InterviewListResponse(
            id=interview.id,
            target_role=interview.target_role,
            status=interview.status,
            overall_score=interview.overall_score,
            created_at=interview.created_at,
            completed_at=interview.completed_at,
            answered_question_count=sum(
                question.answer is not None and question.answer.evaluation is not None
                for question in interview.questions
            ),
            question_count=len(interview.questions),
        )
        for interview in interviews
    ]


@router.get("/interviews/{interview_id}", response_model=schemas.InterviewResponse)
def get_interview(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific interview by ID."""
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    # Verify ownership
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this interview",
        )
    
    return interview


@router.patch("/interviews/{interview_id}", response_model=schemas.InterviewResponse)
def update_interview(
    interview_id: int,
    update_data: schemas.InterviewUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update interview status."""
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    # Verify ownership
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this interview",
        )
    
    if update_data.status:
        # Validate status is valid InterviewStatus
        try:
            interview.status = models.InterviewStatus(update_data.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in models.InterviewStatus])}",
            )
    
    db.commit()
    db.refresh(interview)
    
    return interview


@router.post(
    "/interviews/{interview_id}/complete",
    response_model=schemas.CompleteInterviewResponse,
)
def complete_interview(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Complete an interview and calculate the overall score.
    
    Requirements:
    - Interview must have all questions answered and evaluated.
    - Overall score = average of (correctness_score + communication_score) / 2 for each question.
    - Returns 400 if any question lacks an answer or evaluation.
    - Returns 409 if interview is already completed.
    """
    from datetime import datetime, timezone
    
    # Get and verify interview
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    # Verify ownership
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to complete this interview",
        )
    
    # Check if already completed
    if interview.status == models.InterviewStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview is already completed",
        )
    
    # Fetch all questions for this interview
    questions = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.interview_id == interview_id
    ).order_by(models.InterviewQuestion.question_order).all()
    
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview has no questions",
        )
    
    # Verify all questions have answers and evaluations
    question_scores = []
    for question in questions:
        if not question.answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question {question.question_order} does not have an answer yet",
            )
        
        if not question.answer.evaluation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Answer for question {question.question_order} has not been evaluated yet",
            )
        
        # Calculate question score: (correctness + communication) / 2
        evaluation = question.answer.evaluation
        if evaluation.correctness_score is None or evaluation.communication_score is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Evaluation for question {question.question_order} is missing scores",
            )
        
        question_score = (evaluation.correctness_score + evaluation.communication_score) / 2
        question_scores.append(question_score)
    
    # Calculate overall score as average of question scores, rounded to integer
    overall_score = round(sum(question_scores) / len(question_scores))
    
    # Update interview
    try:
        interview.overall_score = overall_score
        interview.status = models.InterviewStatus.COMPLETED
        interview.completed_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(interview)
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete interview",
        ) from error
    
    return schemas.CompleteInterviewResponse(
        interview_id=interview.id,
        status=interview.status,
        overall_score=interview.overall_score,
        completed_at=interview.completed_at,
    )


@router.get(
    "/interviews/{interview_id}/results",
    response_model=schemas.InterviewResultsResponse,
)
def get_interview_results(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the complete interview results with all questions, answers, and evaluations.
    
    Returns null for answer/evaluation if not yet submitted/evaluated.
    """
    # Get and verify interview
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    # Verify ownership
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this interview",
        )
    
    # Fetch all questions for this interview
    questions = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.interview_id == interview_id
    ).order_by(models.InterviewQuestion.question_order).all()
    
    # Build question responses with optional answer/evaluation
    question_responses = []
    for question in questions:
        # Get answer if it exists
        answer_response = None
        if question.answer:
            answer_response = schemas.InterviewResultAnswerResponse(
                answer_id=question.answer.id,
                transcript=question.answer.transcript,
                created_at=question.answer.created_at,
            )
        
        # Get evaluation if it exists
        evaluation_response = None
        if question.answer and question.answer.evaluation:
            eval_obj = question.answer.evaluation
            evaluation_response = schemas.InterviewResultEvaluationResponse(
                correctness_score=eval_obj.correctness_score,
                communication_score=eval_obj.communication_score,
                filler_word_count=eval_obj.filler_word_count,
                feedback=eval_obj.feedback,
                created_at=eval_obj.created_at,
            )
        
        question_response = schemas.InterviewResultQuestionResponse(
            question_id=question.id,
            question_text=question.question_text,
            topic=question.topic,
            question_order=question.question_order,
            answer=answer_response,
            evaluation=evaluation_response,
        )
        question_responses.append(question_response)
    
    # Convert overall_score to int if it exists, otherwise None
    overall_score_int = None
    if interview.overall_score is not None:
        overall_score_int = int(interview.overall_score)
    
    return schemas.InterviewResultsResponse(
        interview_id=interview.id,
        target_role=interview.target_role,
        status=interview.status,
        overall_score=overall_score_int,
        created_at=interview.created_at,
        completed_at=interview.completed_at,
        questions=question_responses,
    )


@router.post(
    "/interviews/{interview_id}/generate-questions",
    response_model=schemas.GenerateQuestionsResponse,
)
async def generate_questions(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate AI-powered interview questions tailored to the interview's target role and resume.
    
    Returns an error if the interview already has questions to prevent accidental duplicates.
    """
    from .services.ai_service import generate_interview_questions
    from .services.groq_service import GroqConfigError, GroqResponseError
    
    # Verify interview exists and belongs to current user
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate questions for this interview",
        )
    
    # Check if interview already has questions
    existing_questions = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.interview_id == interview_id
    ).first()
    
    if existing_questions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview already has questions. Delete existing questions first if you want to regenerate.",
        )
    
    # Retrieve resume data if resume_id is provided
    resume_data = None
    if interview.resume_id:
        resume = db.query(models.Resume).filter(
            models.Resume.id == interview.resume_id
        ).first()
        
        if resume and resume.parsed_data:
            resume_data = resume.parsed_data
    
    # Call AI service to generate questions
    try:
        generated_questions = await generate_interview_questions(
            target_role=interview.target_role,
            resume_data=resume_data,
            num_questions=5,
        )
    except GroqConfigError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM configuration error: {str(e)}",
        )
    except GroqResponseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM response error: {str(e)}",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM request failed: {str(e)}",
        )
    
    # Save generated questions to database in a transaction
    try:
        question_rows = []
        for gen_q in generated_questions:
            question = models.InterviewQuestion(
                interview_id=interview_id,
                question_text=gen_q.question_text,
                topic=gen_q.topic,
                question_order=gen_q.question_order,
            )
            db.add(question)
            question_rows.append(question)
        
        db.commit()
        
        # Refresh to get IDs
        for q in question_rows:
            db.refresh(q)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save generated questions: {str(e)}",
        )
    
    # Return the generated questions in response format
    question_responses = [
        schemas.InterviewQuestionResponse(
            id=q.id,
            interview_id=q.interview_id,
            question_text=q.question_text,
            topic=q.topic,
            question_order=q.question_order,
            answer=None,
        )
        for q in question_rows
    ]
    
    return schemas.GenerateQuestionsResponse(
        interview_id=interview_id,
        target_role=interview.target_role,
        num_generated=len(question_responses),
        questions=question_responses,
    )


# ============ Interview Question Routes ============

@router.post(
    "/interviews/{interview_id}/questions",
    response_model=schemas.InterviewQuestionResponse,
)
def add_question(
    interview_id: int,
    question_data: schemas.InterviewQuestionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a question to an interview."""
    # Verify interview ownership
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add questions to this interview",
        )
    
    # Check for duplicate question_order
    existing = db.query(models.InterviewQuestion).filter(
        and_(
            models.InterviewQuestion.interview_id == interview_id,
            models.InterviewQuestion.question_order == question_data.question_order,
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question with this order already exists in the interview",
        )
    
    # Create question
    question = models.InterviewQuestion(
        interview_id=interview_id,
        question_text=question_data.question_text,
        topic=question_data.topic,
        question_order=question_data.question_order,
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    
    return question


@router.get(
    "/interviews/{interview_id}/questions",
    response_model=list[schemas.InterviewQuestionResponse],
)
def get_questions(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all questions for an interview, ordered by question_order."""
    # Verify interview ownership
    interview = db.query(models.Interview).filter(
        models.Interview.id == interview_id
    ).first()
    
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this interview",
        )
    
    questions = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.interview_id == interview_id
    ).order_by(models.InterviewQuestion.question_order).all()
    
    return questions


# ============ Answer Routes ============

@router.post(
    "/questions/{question_id}/answer",
    response_model=schemas.AnswerResponse,
)
def submit_answer(
    question_id: int,
    answer_data: schemas.AnswerCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an answer to a question."""
    # Get question and verify it belongs to user's interview
    question = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.id == question_id
    ).first()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    interview = question.interview
    if interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to answer this question",
        )
    
    # Check if answer already exists
    existing_answer = db.query(models.Answer).filter(
        models.Answer.interview_question_id == question_id
    ).first()
    
    if existing_answer and existing_answer.evaluation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An answer for this question already exists",
        )
    if existing_answer:
        return existing_answer
    
    # Create answer
    answer = models.Answer(
        interview_question_id=question_id,
        transcript=answer_data.transcript,
        audio_path=answer_data.audio_path,
    )
    
    db.add(answer)
    db.commit()
    db.refresh(answer)
    
    return answer


@router.post(
    "/questions/{question_id}/audio-answer",
    response_model=schemas.AnswerResponse,
)
async def submit_audio_answer(
    question_id: int,
    audio: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a recorded answer and its Whisper transcript."""
    import os
    import uuid

    from .services.ai_service import transcribe_interview_audio

    question = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.id == question_id
    ).first()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    if question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to answer this question",
        )

    existing_answer = db.query(models.Answer).filter(
        models.Answer.interview_question_id == question_id
    ).first()
    if existing_answer and existing_answer.evaluation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An answer for this question already exists",
        )
    if existing_answer:
        return existing_answer

    if not audio.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio filename is required",
        )

    content = await audio.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio recording is empty",
        )

    content_type = audio.content_type or "audio/webm"
    extension = os.path.splitext(audio.filename)[1] or ".webm"
    uploads_dir = "uploads/audio"
    os.makedirs(uploads_dir, exist_ok=True)
    audio_path = os.path.join(uploads_dir, f"{uuid.uuid4()}{extension}")

    with open(audio_path, "wb") as audio_file:
        audio_file.write(content)

    try:
        transcript = await transcribe_interview_audio(
            filename=audio.filename,
            content=content,
            content_type=content_type,
        )
    except ValueError as error:
        os.remove(audio_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription configuration error: {str(error)}",
        ) from error
    except RuntimeError as error:
        os.remove(audio_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    answer = models.Answer(
        interview_question_id=question_id,
        audio_path=audio_path,
        transcript=transcript,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    return answer


@router.get(
    "/questions/{question_id}/answer",
    response_model=schemas.AnswerResponse,
)
def get_answer(
    question_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the answer for a question."""
    question = db.query(models.InterviewQuestion).filter(
        models.InterviewQuestion.id == question_id
    ).first()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    # Verify ownership
    if question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this question",
        )
    
    answer = db.query(models.Answer).filter(
        models.Answer.interview_question_id == question_id
    ).first()
    
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found",
        )
    
    return answer


@router.patch(
    "/answers/{answer_id}",
    response_model=schemas.AnswerResponse,
)
def update_answer(
    answer_id: int,
    update_data: schemas.AnswerUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an answer."""
    answer = db.query(models.Answer).filter(
        models.Answer.id == answer_id
    ).first()
    
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found",
        )
    
    # Verify ownership through interview
    question = answer.interview_question
    if question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this answer",
        )
    
    if update_data.transcript is not None:
        answer.transcript = update_data.transcript
    if update_data.audio_path is not None:
        answer.audio_path = update_data.audio_path
    
    db.commit()
    db.refresh(answer)
    
    return answer


# ============ Evaluation Routes ============

@router.post(
    "/answers/{answer_id}/evaluate",
    response_model=schemas.EvaluationResponse,
)
async def evaluate_answer(
    answer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluate an answer transcript with the configured AI provider."""
    from .services.ai_service import evaluate_interview_answer

    answer = db.query(models.Answer).filter(
        models.Answer.id == answer_id
    ).first()

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found",
        )

    question = answer.interview_question
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    if question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to evaluate this answer",
        )

    if not answer.transcript or not answer.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Answer transcript is required for evaluation",
        )

    existing_eval = db.query(models.Evaluation).filter(
        models.Evaluation.answer_id == answer_id
    ).first()
    if existing_eval:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An evaluation for this answer already exists",
        )

    try:
        result = await evaluate_interview_answer(
            question_text=question.question_text,
            answer_text=answer.transcript,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM configuration error: {str(error)}",
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM evaluation failed: {str(error)}",
        ) from error

    try:
        evaluation = models.Evaluation(
            answer_id=answer_id,
            correctness_score=result.correctness_score,
            communication_score=result.communication_score,
            filler_word_count=result.filler_word_count,
            feedback=result.feedback,
        )
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save answer evaluation",
        ) from error

    return evaluation


@router.post(
    "/answers/{answer_id}/evaluation",
    response_model=schemas.EvaluationResponse,
)
def create_evaluation(
    answer_id: int,
    eval_data: schemas.EvaluationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an evaluation for an answer."""
    # Get answer and verify ownership
    answer = db.query(models.Answer).filter(
        models.Answer.id == answer_id
    ).first()
    
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found",
        )
    
    question = answer.interview_question
    if question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to evaluate this answer",
        )
    
    # Check if evaluation already exists
    existing_eval = db.query(models.Evaluation).filter(
        models.Evaluation.answer_id == answer_id
    ).first()
    
    if existing_eval:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An evaluation for this answer already exists",
        )
    
    # Create evaluation
    evaluation = models.Evaluation(
        answer_id=answer_id,
        correctness_score=eval_data.correctness_score,
        communication_score=eval_data.communication_score,
        filler_word_count=eval_data.filler_word_count,
        feedback=eval_data.feedback,
    )
    
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    
    return evaluation


@router.get(
    "/answers/{answer_id}/evaluation",
    response_model=schemas.EvaluationResponse,
)
def get_evaluation(
    answer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the evaluation for an answer."""
    answer = db.query(models.Answer).filter(
        models.Answer.id == answer_id
    ).first()
    
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found",
        )
    
    # Verify ownership
    if answer.interview_question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this answer",
        )
    
    evaluation = db.query(models.Evaluation).filter(
        models.Evaluation.answer_id == answer_id
    ).first()
    
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )
    
    return evaluation


@router.patch(
    "/evaluations/{evaluation_id}",
    response_model=schemas.EvaluationResponse,
)
def update_evaluation(
    evaluation_id: int,
    update_data: schemas.EvaluationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an evaluation."""
    evaluation = db.query(models.Evaluation).filter(
        models.Evaluation.id == evaluation_id
    ).first()
    
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )
    
    # Verify ownership
    if evaluation.answer.interview_question.interview.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this evaluation",
        )
    
    if update_data.correctness_score is not None:
        evaluation.correctness_score = update_data.correctness_score
    if update_data.communication_score is not None:
        evaluation.communication_score = update_data.communication_score
    if update_data.filler_word_count is not None:
        evaluation.filler_word_count = update_data.filler_word_count
    if update_data.feedback is not None:
        evaluation.feedback = update_data.feedback
    
    db.commit()
    db.refresh(evaluation)
    
    return evaluation


# ============ Analytics Routes ============

@router.get("/analytics", response_model=schemas.AnalyticsResponse)
def get_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive analytics for the authenticated user's completed interviews.
    
    Returns:
    - Average overall score
    - Average correctness score
    - Average communication score
    - Total completed interviews count
    - Total questions answered
    - Performance over time (list of completed interviews)
    - Topic-wise performance (average score per topic)
    - Areas to improve (topics with lowest scores)
    """
    from sqlalchemy import func
    
    # Get all completed interviews for the current user
    completed_interviews = db.query(models.Interview).filter(
        and_(
            models.Interview.user_id == current_user.id,
            models.Interview.status == models.InterviewStatus.COMPLETED,
        )
    ).order_by(models.Interview.completed_at.desc()).all()
    
    if not completed_interviews:
        # Return empty analytics if no completed interviews
        return schemas.AnalyticsResponse(
            average_overall_score=None,
            average_correctness_score=None,
            average_communication_score=None,
            total_completed_interviews=0,
            total_questions_answered=0,
            performance_over_time=[],
            topic_wise_performance=[],
            areas_to_improve=[],
        )
    
    # Calculate overall statistics
    interview_ids = [interview.id for interview in completed_interviews]
    
    # Get all evaluations for completed interviews
    evaluations = db.query(models.Evaluation).join(
        models.Answer,
        models.Evaluation.answer_id == models.Answer.id,
    ).join(
        models.InterviewQuestion,
        models.Answer.interview_question_id == models.InterviewQuestion.id,
    ).filter(
        models.InterviewQuestion.interview_id.in_(interview_ids)
    ).all()
    
    # Calculate averages
    total_questions_answered = len(evaluations)
    average_overall_score = None
    average_correctness_score = None
    average_communication_score = None
    
    if completed_interviews:
        # Calculate average overall score from interviews
        valid_overall_scores = [
            interview.overall_score for interview in completed_interviews
            if interview.overall_score is not None
        ]
        if valid_overall_scores:
            average_overall_score = sum(valid_overall_scores) / len(valid_overall_scores)
    
    if evaluations:
        # Calculate average correctness
        valid_correctness = [
            e.correctness_score for e in evaluations
            if e.correctness_score is not None
        ]
        if valid_correctness:
            average_correctness_score = sum(valid_correctness) / len(valid_correctness)
        
        # Calculate average communication
        valid_communication = [
            e.communication_score for e in evaluations
            if e.communication_score is not None
        ]
        if valid_communication:
            average_communication_score = sum(valid_communication) / len(valid_communication)
    
    # Build performance over time
    performance_over_time = [
        schemas.PerformanceDataPoint(
            interview_id=interview.id,
            target_role=interview.target_role,
            overall_score=interview.overall_score or 0,
            completed_at=interview.completed_at,
        )
        for interview in completed_interviews
        if interview.overall_score is not None and interview.completed_at is not None
    ]
    
    # Calculate topic-wise performance
    topic_stats = {}
    for evaluation in evaluations:
        question = evaluation.answer.interview_question
        topic = question.topic
        
        if topic not in topic_stats:
            topic_stats[topic] = {
                "scores": [],
                "correctness": [],
                "communication": [],
                "num_questions": 0,
            }
        
        topic_stats[topic]["num_questions"] += 1
        
        if evaluation.correctness_score is not None and evaluation.communication_score is not None:
            avg_score = (evaluation.correctness_score + evaluation.communication_score) / 2
            topic_stats[topic]["scores"].append(avg_score)
        
        if evaluation.correctness_score is not None:
            topic_stats[topic]["correctness"].append(evaluation.correctness_score)
        if evaluation.communication_score is not None:
            topic_stats[topic]["communication"].append(evaluation.communication_score)
    
    topic_wise_performance = []
    for topic, stats in topic_stats.items():
        if stats["scores"]:
            avg_score = sum(stats["scores"]) / len(stats["scores"])
            topic_wise_performance.append(
                schemas.TopicPerformance(
                    topic=topic,
                    average_score=round(avg_score, 2),
                    num_questions=stats["num_questions"],
                )
            )
    
    # Sort by average score (descending) so we can identify areas to improve
    topic_wise_performance.sort(key=lambda x: x.average_score, reverse=True)
    
    # Calculate areas to improve (topics with lowest scores)
    areas_to_improve = []
    for topic, stats in topic_stats.items():
        if stats["scores"]:
            avg_score = sum(stats["scores"]) / len(stats["scores"])
            lowest_correctness = min(stats["correctness"]) if stats["correctness"] else None
            lowest_communication = min(stats["communication"]) if stats["communication"] else None
            
            areas_to_improve.append(
                schemas.AreaToImprove(
                    topic=topic,
                    average_score=round(avg_score, 2),
                    num_questions=stats["num_questions"],
                    lowest_correctness=lowest_correctness,
                    lowest_communication=lowest_communication,
                )
            )
    
    # Sort by average score (ascending) to show worst performers first
    areas_to_improve.sort(key=lambda x: x.average_score)
    # Keep only top 5 areas to improve
    areas_to_improve = areas_to_improve[:5]
    
    return schemas.AnalyticsResponse(
        average_overall_score=round(average_overall_score, 2) if average_overall_score is not None else None,
        average_correctness_score=round(average_correctness_score, 2) if average_correctness_score is not None else None,
        average_communication_score=round(average_communication_score, 2) if average_communication_score is not None else None,
        total_completed_interviews=len(completed_interviews),
        total_questions_answered=total_questions_answered,
        performance_over_time=performance_over_time,
        topic_wise_performance=topic_wise_performance,
        areas_to_improve=areas_to_improve,
    )

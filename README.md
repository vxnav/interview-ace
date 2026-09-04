# InterviewAce

A full-stack AI mock interview app for practicing role-specific interview questions and reviewing feedback afterward.

## What it does

InterviewAce lets a user register, upload a resume, start a mock interview for a target role, and answer generated questions by text or recorded audio. Each answer is evaluated for correctness, communication, and filler words. Completed interviews include an overall score, detailed results, history, and an analytics view of score trends and topic performance.

I built it to make interview practice less unstructured. Instead of preparing from a generic question list, the app can use a resume and target role to generate a short practice interview, then keep the feedback and results in one place.

## Current Features

- JWT-based registration and login
- Resume upload and text extraction from PDF, DOCX, and TXT files
- Groq-powered generation of five role-based interview questions
- Resume-aware questions when parsed resume text is available
- Text answers and browser audio recording
- Audio upload and transcription with Groq Whisper (`whisper-large-v3-turbo`)
- AI answer evaluation with correctness, communication, filler-word count, and written feedback
- Overall interview score calculated from evaluated answers
- Save and exit an interview, then resume it from the dashboard
- Safe retry of a saved answer when AI evaluation fails
- Completed interview results and interview history
- Analytics dashboard with an overall average, performance timeline, topic-performance radar chart, and strengths summary

## Interview Flow

```text
Choose role (+ optional resume)
	-> create interview
	-> generate 5 questions with Groq
	-> answer by text or audio
	-> transcribe audio when needed
	-> evaluate each answer
	-> calculate overall score
	-> view results, history, and analytics
```

An answer is stored before evaluation. If evaluation fails, the saved answer can be evaluated again without creating a duplicate or losing the recording. Only evaluated answers can count toward interview completion.

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Database | SQLite by default (configurable with `DATABASE_URL`) |
| Authentication | JWT with `python-jose`, Argon2 password hashing |
| AI | Groq chat completions and Groq Whisper transcription |
| Resume parsing | `pypdf` and `python-docx` |

## Project Structure

```text
interview-ace/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── ai_service.py       # Provider-facing AI interface
│   │   │   ├── groq_service.py     # Questions, transcription, evaluation
│   │   │   └── resume_parser.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── schemas.py
│   │   └── utils.py
│   ├── requirements.txt
│   └── uploads/
│       ├── audio/
│       └── resumes/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/api.ts
│   │   └── types/api.ts
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- A Groq API key

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=replace_with_a_long_random_value

# Optional
GROQ_MODEL=openai/gpt-oss-20b
DATABASE_URL=sqlite:///./interviewace.db
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive API docs are available at `http://localhost:8000/docs`.

### Frontend

In a separate terminal:

```bash
cd frontend
npm install
```

Optionally create `frontend/.env.local` when the API is not running at the default address:

```env
VITE_API_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes for AI features | Authenticates Groq question generation, transcription, and evaluation requests. |
| `SECRET_KEY` | Strongly recommended | Signs JWTs. The code has a development fallback, but it should be replaced. |
| `GROQ_MODEL` | No | Chat model used for question generation and answer evaluation. Defaults to `openai/gpt-oss-20b`. |
| `DATABASE_URL` | No | SQLAlchemy connection string. Defaults to `sqlite:///./interviewace.db`. |
| `VITE_API_URL` | No | Frontend API base URL. Defaults to `http://localhost:8000`. |

## Backend API Overview

All interview, resume, answer, result, and analytics endpoints require a JWT bearer token. Main endpoint groups:

- `POST /auth/register`, `POST /auth/login`
- `POST /resumes`, `GET /resumes`, `GET /resumes/{resume_id}`
- `POST /interviews`, `GET /interviews`, `GET/PATCH /interviews/{interview_id}`
- `POST /interviews/{interview_id}/generate-questions`
- `GET/POST /interviews/{interview_id}/questions`
- `POST/GET /questions/{question_id}/answer`
- `POST /questions/{question_id}/audio-answer`
- `POST /answers/{answer_id}/evaluate`
- `POST /interviews/{interview_id}/complete`
- `GET /interviews/{interview_id}/results`
- `GET /analytics`

The API also exposes `GET /health` and generated docs at `/docs`.

## AI and Audio Pipeline

Question generation sends the target role and, when available, parsed resume text to Groq. The response is validated as structured JSON before questions are saved. Generated questions use the app's current topic labels: technical, experience, behavioral, and project.

```text
Recorded browser audio
	-> POST /questions/{question_id}/audio-answer
	-> save audio file
	-> Groq Whisper transcription
	-> save transcript as an Answer
	-> POST /answers/{answer_id}/evaluate
	-> Groq evaluation JSON
	-> save Evaluation and show feedback
```

Text answers skip transcription and start at the saved-answer step. The evaluation response contains two 0-100 scores, a filler-word count, and feedback.

## Screenshots

Replace these placeholders with project screenshots later.

| Screen | Placeholder |
| --- | --- |
| Dashboard | `docs/screenshots/dashboard.png` |
| Interview screen | `docs/screenshots/interview.png` |
| Results | `docs/screenshots/results.png` |
| Analytics | `docs/screenshots/analytics.png` |

## Current Limitations

- Groq access is required for question generation, transcription, and evaluation.
- Resume files are stored locally in `backend/uploads`; there is no cloud file storage or production deployment configuration.
- The default SQLite database is intended for local development.
- The analytics page reports evaluated interview performance; it is not a measure of objective skill proficiency.
- The "Practice these areas" control on Analytics is currently a placeholder.

## Future Enhancements

- Let users choose technical, behavioral, project, and experience topics, including multiple topic selections, before generating an interview.
- Add targeted practice from analytics results.
- Add richer resume management and interview settings.
- Add deployment configuration, production storage, and tighter production CORS settings.
- Add more automated API and UI test coverage.

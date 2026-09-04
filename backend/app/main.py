from dotenv import load_dotenv

load_dotenv()


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_tables
from .routes import router


# Initialize FastAPI app
app = FastAPI(
    title="InterviewAce API",
    description="Backend API for AI-powered mock interview platform",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create tables on startup
@app.on_event("startup")
def startup():
    """Initialize database tables on application startup."""
    create_tables()


# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Include routes
app.include_router(router, tags=["core"])


# Root endpoint
@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "InterviewAce Backend API",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }



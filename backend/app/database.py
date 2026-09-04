# database connection and SQLAlchemy setup
from collections.abc import Generator
from os import getenv

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_URL = getenv("DATABASE_URL", "sqlite:///./interviewace.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
	pass


def get_db() -> Generator[Session, None, None]:
	with SessionLocal() as session:
		yield session


def create_tables() -> None:
	from . import models

	Base.metadata.create_all(bind=engine)
	resume_columns = {column["name"] for column in inspect(engine).get_columns("resumes")}
	if "original_filename" not in resume_columns:
		with engine.begin() as connection:
			connection.execute(text("ALTER TABLE resumes ADD COLUMN original_filename VARCHAR(255)"))
	if "is_active" in resume_columns:
		with engine.begin() as connection:
			connection.execute(text("DROP INDEX IF EXISTS ix_resumes_user_active"))
			connection.execute(text("ALTER TABLE resumes DROP COLUMN is_active"))


from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .models import User


# Security configuration - use argon2 for password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
ALGORITHM = "HS256"


def get_secret_key() -> str:
    """Retrieve JWT secret key from environment."""
    from os import getenv
    secret = getenv("SECRET_KEY", "your-secret-key-change-in-production")
    if secret == "your-secret-key-change-in-production":
        # This is acceptable for development only
        pass
    return secret


def hash_password(password: str) -> str:
    """Hash a plain text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain text password against a hash."""
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    # JWT "sub" claim must be a string
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


def verify_jwt_token(token: str, db: Session) -> Optional[User]:
    """
    Verify a JWT token and return the associated user, or None if invalid.
    """
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            return None
        # Convert string back to int for database query
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    return user



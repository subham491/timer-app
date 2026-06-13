"""
Shared utility functions.

Covers:
  - Password hashing and verification (bcrypt via passlib)
  - JWT access-token creation and decoding
  - UUID helper for universal_id columns
"""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings

#Password hashing
def hash_password(plain: str) -> str:
    """Return the bcrypt hash of *plain* as a UTF-8 string."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


#JWT
def create_access_token(payload: dict) -> str:
    """
    Create a signed JWT.

    *payload* should contain at least ``sub`` (the user's universal_id).
    An ``exp`` claim and a unique ``jti`` are added automatically.
    """
    data = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    data["exp"] = expire
    data["jti"] = str(uuid.uuid4())  # unique token ID – used for invalidation
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Raises ``JWTError`` (from python-jose) if the token is invalid or expired.
    The caller is responsible for catching that error.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


#Universal ID
def new_universal_id() -> str:
    """Return a new random UUID string (used for all universal_id columns)."""
    return str(uuid.uuid4())

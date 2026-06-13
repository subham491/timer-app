"""
FastAPI dependencies shared across endpoint modules.
ADR-006: Only Microsoft SSO tokens are accepted. No local auth.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.db.connection import DBSession
from app.repositories import user_repository as user_repo
from app.utils import decode_access_token

_bearer_scheme = HTTPBearer()


def get_current_user(
    db: DBSession,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> dict:
    """
    Validate the Soliton JWT and return the authenticated user.

    Per ADR-006:
    - JWTs are stateless and short-lived (30 min).
    - The backend does not blacklist tokens.
    - Archived users are rejected even with a valid token.

    Raises HTTP 401 if token is invalid or expired.
    Raises HTTP 403 if the user is archived.
    """
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise auth_error

    universal_id: str = payload.get("sub")
    jti: str = payload.get("jti")

    if not universal_id or not jti:
        raise auth_error

    user = user_repo.get_user_by_universal_id(db, universal_id)
    if not user:
        raise auth_error

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been archived.",
        )

    return {
        "jti":          jti,
        "user_id":      user.user_id,
        "universal_id": user.universal_id,
        "display_name": user.display_name,
        "email":        user.email,
        "role_id":      user.role_id,
    }


CurrentUser = Annotated[dict, Depends(get_current_user)]
"""Auth dependency — reads the Redis session via the session cookie."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.config import settings
from app.db.connection import DBSession
from app.repositories import user_repository as user_repo
from app.services import session_store


def get_current_user(request: Request, db: DBSession) -> dict:
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
    )

    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        raise auth_error

    session = session_store.get_session(session_id)
    if not session:
        raise auth_error

    user = user_repo.get_user_by_universal_id(db, session["universal_id"])
    if not user:
        raise auth_error
    if user.status != "active":
        session_store.delete_session(session_id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been archived.")

    return {
        "session_id": session_id,
        "csrf": session["csrf"],
        "user_id": user.user_id,
        "universal_id": user.universal_id,
        "display_name": user.display_name,
        "email": user.email,
        "role_id": user.role_id,
    }


CurrentUser = Annotated[dict, Depends(get_current_user)]
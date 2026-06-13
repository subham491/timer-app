"""CSRF: synchronizer token validated against the server-side session."""

import secrets

from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.services import session_store

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def _matches(a: str, b: str) -> bool:
    if not a or not b:
        return False
    return secrets.compare_digest(a, b)


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in _SAFE_METHODS:
            session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
            if session_id:
                session = await run_in_threadpool(session_store.get_session, session_id)
                header = request.headers.get(settings.CSRF_HEADER_NAME, "")
                if not session or not _matches(header, session.get("csrf", "")):
                    return JSONResponse({"detail": "CSRF validation failed."}, status_code=403)
        return await call_next(request)
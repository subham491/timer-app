"""
Server-side session store (Redis).

The browser holds only an opaque session ID; all state lives here keyed by that
ID with a TTL. Deleting the key revokes the session instantly. The per-session
CSRF token is stored here too.
"""

import json
import secrets
import time
from typing import Optional

from app.config import settings
from app.redis_client import redis_client

_PREFIX = "session:"


def _key(session_id: str) -> str:
    return f"{_PREFIX}{session_id}"


def create_session(*, user_id: int, universal_id: str) -> tuple[str, str]:
    """New session (fresh ID per login = no fixation). Returns (id, csrf)."""
    session_id = secrets.token_urlsafe(32)
    csrf_token = secrets.token_urlsafe(32)
    payload = {
        "user_id": user_id,
        "universal_id": universal_id,
        "csrf": csrf_token,
        "created_at": int(time.time()),
    }
    redis_client.set(_key(session_id), json.dumps(payload), ex=settings.SESSION_TTL_SECONDS)
    return session_id, csrf_token


def get_session(session_id: str) -> Optional[dict]:
    """Return the session, or None. Slides the TTL on access."""
    if not session_id:
        return None
    raw = redis_client.get(_key(session_id))
    if raw is None:
        return None
    redis_client.expire(_key(session_id), settings.SESSION_TTL_SECONDS)
    return json.loads(raw)


def delete_session(session_id: str) -> None:
    if session_id:
        redis_client.delete(_key(session_id))
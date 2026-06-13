"""
Test helpers: token minting, Microsoft-token mocking, and assertions.

The Soliton access token (the JWT your /auth/login/microsoft returns) is what
every non-login endpoint validates in middleware. We mint REAL ones signed with
your app's key so every request exercises the actual auth middleware — that is
what TC-12/13/15/16/21/44 (missing/invalid/expired token -> 401) depend on.

Microsoft id_token verification is mocked, because tests must never reach Azure.
"""

from datetime import datetime, timedelta, timezone
import uuid
from jose import jwt, JWTError  # PyJWT

from app.config import settings  


SENSITIVE_FIELDS = ("microsoft_oid", "password_hash")


# --- Soliton access-token minting -----------------------------------------
def make_access_token(user, *, expires_in=1800, **overrides):
    now = datetime.now(timezone.utc)
    payload = {"sub": user.universal_id, "jti": uuid.uuid4().hex,
               "exp": now + timedelta(seconds=expires_in)}
    secret = overrides.pop("secret", settings.SECRET_KEY)
    payload.update(overrides)
    return jwt.encode(payload, secret, algorithm=settings.ALGORITHM)


def auth_headers(user, **overrides) -> dict:
    return {"Authorization": f"Bearer {make_access_token(user, **overrides)}"}


def expired_headers(user) -> dict:
    return auth_headers(user, expires_in=-60)


def tampered_headers(user) -> dict:
    # Valid structure, wrong signing key -> signature verification fails.
    return auth_headers(user, secret="not-the-real-signing-key")


# --- Microsoft id_token mock ------------------------------------------------
def patch_ms_verify(monkeypatch, *, claims=None, raises=None):
    def fake(token: str):
        if raises is not None:
            raise raises
        return claims
    monkeypatch.setattr("app.services.auth_service._validate_microsoft_token", fake)


# --- Assertions -------------------------------------------------------------
def assert_no_sensitive_fields(payload):
    """Recursively assert microsoft_oid / password_hash never appear anywhere
    in a response body. Covers TC-1, 2, 14, 17, 27, 109, 138, ..."""
    def walk(node, path="root"):
        if isinstance(node, dict):
            for k, v in node.items():
                assert k not in SENSITIVE_FIELDS, f"Leaked '{k}' at {path}"
                walk(v, f"{path}.{k}")
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")
    walk(payload)


def as_items(body):
    """Return the list payload whether the endpoint returns a bare list or wraps
    it ({'items': [...]}, {'data': [...]}, {'users': [...]}, ...). ADJUST the key
    list if your API uses a fixed envelope."""
    if isinstance(body, list):
        return body
    for k in ("items", "data", "results", "rows", "users", "projects", "tasks",
              "assignments", "managers", "entries", "logs", "roles", "scopes"):
        if isinstance(body.get(k), list):
            return body[k]
    for v in body.values():
        if isinstance(v, list):
            return v
    return []

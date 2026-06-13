"""
Authentication service — ADR-006 compliant.

Microsoft SSO is the ONLY sign-in path.
Local register/login has been removed entirely.

Flow:
  1. Frontend uses MSAL to sign in with Microsoft and gets a Microsoft ID token.
  2. Frontend sends that token to POST /auth/login/microsoft.
  3. Backend validates the token against Microsoft's JWKS endpoint.
  4. Backend looks up the user:
     - If microsoft_oid is already bound → look up by oid.
     - If not bound yet → look up by email (first sign-in), bind the oid.
  5. Backend issues a Soliton JWT and returns it.
  6. All subsequent requests use the Soliton JWT only.
"""

import os
from typing import Optional

import httpx
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.repositories import user_repository as user_repo
from app.repositories.auth_log_repository import write_auth_log
from app.utils import create_access_token, verify_password

MANAGER_ROLE_ID = 3
ADMINISTRATOR_ROLE_ID = 4

_DEV_ENABLED_ENV_VALUES = {"local", "development", "dev"}


# ---------------------------------------------------------------------------
# Microsoft JWKS validation
# ---------------------------------------------------------------------------

MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")

_JWKS_URL = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/discovery/v2.0/keys"
_ISSUER   = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/v2.0"

# Simple in-process cache — refreshed on validation failure per ADR-004
_jwks_cache: Optional[dict] = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        _jwks_cache = _fetch_jwks()
    return _jwks_cache


def _fetch_jwks() -> dict:
    try:
        response = httpx.get(_JWKS_URL, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach Microsoft identity service. Please try again.",
        )


def _validate_microsoft_token(token: str) -> dict:
    """
    Validate the Microsoft ID token against the JWKS endpoint.
    Validates: signature, issuer, audience, expiry, tenant (tid claim).
    Returns the decoded claims dict.
    """
    global _jwks_cache

    def _attempt(jwks: dict) -> dict:
        return jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=MICROSOFT_CLIENT_ID,
            issuer=_ISSUER,
            options={"verify_at_hash": False},
        )

    try:
        return _attempt(_get_jwks())
    except JWTError:
        # Keys may have rotated — force one re-fetch per ADR-004
        _jwks_cache = _fetch_jwks()
        try:
            return _attempt(_jwks_cache)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Microsoft identity token.",
                headers={"WWW-Authenticate": "Bearer"},
            )


# ---------------------------------------------------------------------------
# SSO login
# ---------------------------------------------------------------------------

def microsoft_login(db: Session, *, microsoft_token: str, ip_address: Optional[str] = None) -> dict:
    """
    Validate a Microsoft ID token, find or bind the user, return a Soliton JWT.
    Writes to auth_logs on every attempt (success and failure).
    """

    # Step 1 — Validate the Microsoft token
    try:
        claims = _validate_microsoft_token(microsoft_token)
    except HTTPException:
        write_auth_log(
            db,
            event_type="sso_login_failure",
            auth_provider="microsoft",
            ip_address=ip_address,
            failure_reason="sso_token_invalid",
        )
        raise

    # Step 2 — Validate tenant
    token_tid = claims.get("tid", "")
    if token_tid != MICROSOFT_TENANT_ID:
        write_auth_log(
            db,
            event_type="sso_login_failure",
            auth_provider="microsoft",
            ip_address=ip_address,
            failure_reason="sso_tenant_mismatch",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This Microsoft account does not belong to the Soliton tenant.",
        )

    microsoft_oid = claims.get("oid", "")
    email         = claims.get("preferred_username", "") or claims.get("email", "")
    display_name  = claims.get("name", "")

    # Step 3 — Look up user by oid first (subsequent logins)
    user = user_repo.get_user_by_microsoft_oid(db, microsoft_oid)

    # Step 4 — First sign-in: look up by email and bind oid
    if not user:
        user = user_repo.get_user_by_email_for_sso(db, email)

        if not user:
            write_auth_log(
                db,
                event_type="sso_login_failure",
                auth_provider="microsoft",
                ip_address=ip_address,
                failure_reason="unknown_user",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account isn't enabled. Contact your administrator.",
            )

        # Bind the microsoft_oid — all future logins use oid lookup
        user_repo.bind_microsoft_oid(db, user.user_id, microsoft_oid)

        # Refresh display name from Microsoft claim if it changed
        if display_name and display_name != user.display_name:
            user_repo.update_user(db, user.user_id, updated_by=user.user_id, display_name=display_name)

    # Step 5 — Reject archived users
    if user.status != "active":
        write_auth_log(
            db,
            event_type="sso_login_failure",
            user_id=user.user_id,
            auth_provider="microsoft",
            ip_address=ip_address,
            failure_reason="account_archived",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been archived. Contact your administrator.",
        )

    # Step 6 — Update last login
    user_repo.update_last_login(db, user.user_id)

    # Step 7 — Write success to auth_logs
    write_auth_log(
        db,
        event_type="sso_login_success",
        user_id=user.user_id,
        auth_provider="microsoft",
        ip_address=ip_address,
    )

    # Step 8 — Issue Soliton JWT
    return _build_token_response(user)


def local_login(
    db: Session,
    *,
    email: str,
    password: str,
    ip_address: Optional[str] = None,
) -> dict:
    normalized_email = email.strip().lower()
    user = user_repo.get_user_by_email(db, normalized_email)

    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been archived. Contact your administrator.",
        )

    user_repo.update_last_login(db, user.user_id)
    write_auth_log(
        db,
        event_type="login_success",
        user_id=user.user_id,
        auth_provider="local",
        ip_address=ip_address,
    )

    return _build_frontend_auth_response(user)


def logout(db: Session, user_id: int, ip_address: Optional[str] = None) -> None:
    """
    Record logout in auth_logs. Session is invalidated client-side.
    Per ADR-006: sign-out is instant on the client; the audit entry is background.
    """
    write_auth_log(
        db,
        event_type="logout",
        user_id=user_id,
        auth_provider="microsoft",
        ip_address=ip_address,
    )


# ---------------------------------------------------------------------------
# Development auth
# ---------------------------------------------------------------------------

def is_dev_login_enabled() -> bool:
    """
    Allow dev-login only in explicitly non-production environments.

    Safety rules:
    - Always disabled when APP_ENV/ENVIRONMENT/ENV/NODE_ENV is production.
    - Enabled when DEV_AUTH_ENABLED=true.
    - Otherwise enabled only when one of the environment markers is local/dev/development.
    """
    environment = (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("ENV")
        or os.getenv("NODE_ENV")
        or ""
    ).strip().lower()

    if environment == "production":
        return False

    dev_auth_enabled = os.getenv("DEV_AUTH_ENABLED", "").strip().lower()
    if dev_auth_enabled in {"1", "true", "yes", "on"}:
        return True

    return environment in _DEV_ENABLED_ENV_VALUES


def dev_login(db: Session) -> dict:
    """
    Issue a backend-valid JWT for local development using an existing active
    administrator or manager user. Never creates users implicitly.
    """
    if not is_dev_login_enabled():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development auth endpoint is not available.",
        )

    active_users = [
        user
        for user in user_repo.get_all_users(db)
        if user.status == "active"
    ]

    if not active_users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Development auth requires an existing active user. "
                "Seed or create one first."
            ),
        )

    user = next(
        (
            candidate for candidate in active_users
            if candidate.role_id == ADMINISTRATOR_ROLE_ID
        ),
        next(
            (
                candidate for candidate in active_users
                if candidate.role_id == MANAGER_ROLE_ID
            ),
            active_users[0],
        ),
    )

    user_repo.update_last_login(db, user.user_id)
    return _build_dev_token_response(user)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_token_response(user) -> dict:
    """Build the Soliton JWT response. microsoft_oid is never included."""
    access_token = create_access_token({"sub": user.universal_id})
    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user": {
            "user_id":      user.user_id,
            "universal_id": user.universal_id,
            "display_name": user.display_name,
            "email":        user.email,
            "role_id":      user.role_id,
        },
    }


def _build_dev_token_response(user) -> dict:
    return _build_frontend_auth_response(user)


def _build_frontend_auth_response(user) -> dict:
    access_token = create_access_token({"sub": user.universal_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "display_name": user.display_name,
            "role": _role_name_for_frontend(user.role_id),
        },
    }


def _role_name_for_frontend(role_id: int) -> str:
    return {
        1: "regularUser",
        2: "reportViewer",
        3: "manager",
        4: "administrator",
    }.get(role_id, "regularUser")

def establish_user_from_claims(db: Session, *, claims: dict, ip_address: Optional[str] = None):
    if claims.get("tid", "") != MICROSOFT_TENANT_ID:
        write_auth_log(db, event_type="sso_login_failure", auth_provider="microsoft",
                       ip_address=ip_address, failure_reason="sso_tenant_mismatch")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="This Microsoft account does not belong to the Soliton tenant.")

    microsoft_oid = claims.get("oid", "")
    email = claims.get("preferred_username", "") or claims.get("email", "")
    display_name = claims.get("name", "")

    user = user_repo.get_user_by_microsoft_oid(db, microsoft_oid)
    if not user:
        user = user_repo.get_user_by_email_for_sso(db, email)
        if not user:
            write_auth_log(db, event_type="sso_login_failure", auth_provider="microsoft",
                           ip_address=ip_address, failure_reason="unknown_user")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Your account isn't enabled. Contact your administrator.")
        user_repo.bind_microsoft_oid(db, user.user_id, microsoft_oid)
        if display_name and display_name != user.display_name:
            user_repo.update_user(db, user.user_id, updated_by=user.user_id, display_name=display_name)

    if user.status != "active":
        write_auth_log(db, event_type="sso_login_failure", user_id=user.user_id,
                       auth_provider="microsoft", ip_address=ip_address, failure_reason="account_archived")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account has been archived. Contact your administrator.")

    user_repo.update_last_login(db, user.user_id)
    write_auth_log(db, event_type="sso_login_success", user_id=user.user_id,
                   auth_provider="microsoft", ip_address=ip_address)
    return user


def get_dev_user(db: Session):
    if not is_dev_login_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Development auth endpoint is not available.")
    active_users = [u for u in user_repo.get_all_users(db) if u.status == "active"]
    if not active_users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Development auth requires an existing active user. Seed one first.")
    user = next((u for u in active_users if u.role_id == ADMINISTRATOR_ROLE_ID),
                next((u for u in active_users if u.role_id == MANAGER_ROLE_ID), active_users[0]))
    user_repo.update_last_login(db, user.user_id)
    return user

def list_dev_users(db: Session) -> list[dict]:
    """Dev-only: list active users for the switcher. 404 in production."""
    if not is_dev_login_enabled():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development auth endpoint is not available.",
        )
    return [
        {
            "user_id": u.user_id,
            "display_name": u.display_name,
            "email": u.email,
            "role": _role_name_for_frontend(u.role_id),
        }
        for u in user_repo.get_all_users(db)
        if u.status == "active"
    ]


def get_dev_user_by_id(db: Session, user_id: int):
    """Dev-only: resolve a specific active user to log in as. 404 in production."""
    if not is_dev_login_enabled():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development auth endpoint is not available.",
        )
    user = user_repo.get_user_by_id(db, user_id)
    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or not active.",
        )
    user_repo.update_last_login(db, user.user_id)
    return user
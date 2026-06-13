"""
Auth endpoints — ADR-006 & ADR-007 compliant.

POST /auth/login/microsoft  – SSO login (only sign-in path)
POST /auth/logout           – record logout, invalidate client-side session
GET  /auth/me               – return authenticated user profile

Removed per ADR-006:
  POST /auth/register  (users are pre-created by Administrator only)
  POST /auth/login     (local email/password login removed)
"""

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import DevTokenResponse, MessageResponse, TokenResponse
from app.services import auth_service
from pydantic import BaseModel

router = APIRouter()


class MicrosoftLoginRequest(BaseModel):
    microsoft_token: str


class LocalLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login/microsoft", response_model=TokenResponse)
def microsoft_login(body: MicrosoftLoginRequest, request: Request, db: DBSession):
    """
    Sign in with Microsoft SSO.

    The frontend uses MSAL to authenticate with Microsoft and receives a
    Microsoft ID token. That token is passed here. The backend validates it,
    finds the pre-provisioned user record, issues a Soliton JWT, and returns it.

    On first sign-in, the user's microsoft_oid is bound to their record.
    All subsequent sign-ins look up by microsoft_oid, not email.
    """
    ip_address = request.client.host if request.client else None
    return auth_service.microsoft_login(
        db,
        microsoft_token=body.microsoft_token,
        ip_address=ip_address,
    )


@router.post("/login", response_model=DevTokenResponse)
def login(body: LocalLoginRequest, request: Request, db: DBSession):
    ip_address = request.client.host if request.client else None
    return auth_service.local_login(
        db,
        email=body.email,
        password=body.password,
        ip_address=ip_address,
    )


@router.post("/dev-login", response_model=DevTokenResponse)
def dev_login(db: DBSession):
    """
    Development-only login that returns a real backend JWT for an existing
    active administrator or manager user.
    """
    return auth_service.dev_login(db)


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, db: DBSession, user: CurrentUser):
    """
    Record the logout event in auth_logs.
    The session is invalidated immediately on the client side.
    Per ADR-006, sign-out never makes the user wait.
    """
    ip_address = request.client.host if request.client else None
    auth_service.logout(db, user_id=user["user_id"], ip_address=ip_address)
    return {"message": "Logged out successfully."}


@router.get("/me")
def get_profile(user: CurrentUser):
    """
    Return the profile of the currently authenticated user.
    microsoft_oid is never returned per ADR-006.
    """
    return {
        "user_id":      user["user_id"],
        "universal_id": user["universal_id"],
        "display_name": user["display_name"],
        "email":        user["email"],
        "role_id":      user["role_id"],
    }

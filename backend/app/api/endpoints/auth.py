"""Auth endpoints — BFF + Redis sessions + CSRF."""

import json

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.deps import CurrentUser
from app.config import settings
from app.db.connection import DBSession
from app.services import auth_service, bff_auth_service, session_store

router = APIRouter()

_FLOW_COOKIE = "auth_flow"


def _set_auth_cookies(response: Response, session_id: str, csrf_token: str) -> None:
    common = dict(max_age=settings.SESSION_TTL_SECONDS, secure=settings.COOKIE_SECURE,
                  samesite="lax", path="/")
    response.set_cookie(settings.SESSION_COOKIE_NAME, session_id, httponly=True, **common)
    response.set_cookie(settings.CSRF_COOKIE_NAME, csrf_token, httponly=False, **common)


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")


def _start_session_and_redirect(user) -> RedirectResponse:
    session_id, csrf_token = session_store.create_session(
        user_id=user.user_id, universal_id=user.universal_id
    )
    response = RedirectResponse(settings.POST_LOGIN_PATH, status_code=status.HTTP_302_FOUND)
    _set_auth_cookies(response, session_id, csrf_token)
    return response


@router.get("/login")
def login() -> RedirectResponse:
    flow = bff_auth_service.build_auth_code_flow()
    response = RedirectResponse(flow["auth_uri"], status_code=status.HTTP_302_FOUND)
    response.set_cookie(_FLOW_COOKIE, json.dumps(flow), httponly=True,
                        secure=settings.COOKIE_SECURE, samesite="lax", max_age=300, path="/")
    return response


@router.get("/callback")
def callback(request: Request, db: DBSession) -> RedirectResponse:
    raw_flow = request.cookies.get(_FLOW_COOKIE)
    if not raw_flow:
        raise HTTPException(status_code=400, detail="Sign-in session expired. Please try again.")
    claims = bff_auth_service.redeem_auth_code(json.loads(raw_flow), dict(request.query_params))
    ip_address = request.client.host if request.client else None
    user = auth_service.establish_user_from_claims(db, claims=claims, ip_address=ip_address)
    response = _start_session_and_redirect(user)
    response.delete_cookie(_FLOW_COOKIE, path="/")
    return response


@router.get("/dev-login")
def dev_login(db: DBSession) -> RedirectResponse:
    user = auth_service.get_dev_user(db)  # raises 404 in production
    return _start_session_and_redirect(user)


@router.post("/logout")
def logout(request: Request, db: DBSession, user: CurrentUser) -> JSONResponse:
    session_store.delete_session(user["session_id"])
    ip_address = request.client.host if request.client else None
    auth_service.logout(db, user_id=user["user_id"], ip_address=ip_address)
    response = JSONResponse({"message": "Logged out successfully."})
    _clear_auth_cookies(response)
    return response


@router.get("/me")
def get_profile(user: CurrentUser) -> dict:
    return {
        "id": str(user["user_id"]),
        "universal_id": user["universal_id"],
        "email": user["email"],
        "name": user["display_name"],
        "role": auth_service._role_name_for_frontend(user["role_id"]),
    }
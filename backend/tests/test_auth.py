"""
Authentication endpoints — TC 1-16.
POST /auth/login/microsoft | POST /auth/logout | GET /auth/me
 
Mocks the Microsoft token verifier (app.services.auth_service._validate_microsoft_token
via patch_ms_verify), asserts auth_logs side effects, sensitive-field redaction, and
exercises the REAL access-token middleware for the 401 cases.
 
NOTE: this file depends on the helpers.py fixes:
  - patch_ms_verify must patch app.services.auth_service._validate_microsoft_token
  - make_access_token must mint sub=universal_id + jti, signed with settings.SECRET_KEY
"""
 
from datetime import datetime, timezone
 
import pytest
from fastapi import HTTPException
from sqlalchemy import select
 
from app.models import User, AuthLog
from app.config import settings
from tests.factories import make_user
from tests.helpers import (
    auth_headers, expired_headers, tampered_headers,
    patch_ms_verify, assert_no_sensitive_fields,
)
 
# The configured Soliton tenant. Must be set in .env for the tenant check to pass;
# auth_service compares the token's `tid` claim against this same value.
SOLITON_TID = settings.MICROSOFT_TENANT_ID
 
 
def _ms_claims(user, **over):
    base = {"oid": "ms-oid-" + user.email, "tid": SOLITON_TID,
            "email": user.email, "name": user.display_name}
    base.update(over)
    return base
 
 
# --- TC-1 Successful SSO login ---------------------------------------------
def test_sso_login_success(client, db_session, monkeypatch):
    user = make_user(db_session, role="user", microsoft_oid="ms-oid-a@soliton.com",
                     email="a@soliton.com")
    patch_ms_verify(monkeypatch, claims=_ms_claims(user))
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
 
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == user.email
    assert_no_sensitive_fields(body)
 
 
# --- TC-2 First-time login binds microsoft_oid -----------------------------
def test_first_login_binds_oid(client, db_session, monkeypatch):
    user = make_user(db_session, role="user", email="b@soliton.com", microsoft_oid=None)
    patch_ms_verify(monkeypatch, claims=_ms_claims(user, oid="bound-oid-123"))
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
    assert r.status_code == 200
 
    db_session.expire_all()
    bound = db_session.get(User, user.user_id)
    assert bound.microsoft_oid == "bound-oid-123"
 
 
# --- TC-4 Success writes auth_logs (sso_login_success) ---------------------
def test_login_writes_auth_log(client, db_session, monkeypatch):
    user = make_user(db_session, role="user", email="c@soliton.com",
                     microsoft_oid="ms-oid-c")
    patch_ms_verify(monkeypatch, claims=_ms_claims(user))
 
    client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
 
    row = db_session.execute(
        select(AuthLog).where(AuthLog.user_id == user.user_id)
        .order_by(AuthLog.created_at.desc())
    ).scalars().first()
    assert row is not None
    assert row.event_type == "sso_login_success"
 
 
# --- TC-6 / TC-7 invalid + expired MS token -> sso_token_invalid -----------
def test_bad_ms_token_rejected(client, db_session, monkeypatch):
    # auth_service catches fastapi.HTTPException from the validator and logs the failure.
    patch_ms_verify(monkeypatch, raises=HTTPException(status_code=401, detail="bad"))
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "bad"})
    assert r.status_code == 401
 
    row = db_session.execute(
        select(AuthLog).order_by(AuthLog.created_at.desc())
    ).scalars().first()
    assert row.event_type == "sso_login_failure"
    assert row.failure_reason == "sso_token_invalid"
 
 
# --- TC-8 wrong tenant -> sso_tenant_mismatch ------------------------------
def test_wrong_tenant_rejected(client, db_session, monkeypatch):
    user = make_user(db_session, role="user", email="d@soliton.com", microsoft_oid="ms-oid-d")
    patch_ms_verify(monkeypatch, claims=_ms_claims(user, tid="some-other-tenant"))
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
    assert r.status_code == 401
 
    row = db_session.execute(
        select(AuthLog).order_by(AuthLog.created_at.desc())
    ).scalars().first()
    assert row.failure_reason == "sso_tenant_mismatch"
 
 
# --- TC-9 unknown user (no pre-provisioned record) -------------------------
def test_unregistered_user_rejected(client, monkeypatch):
    claims = {"oid": "ghost", "tid": SOLITON_TID,
              "email": "ghost@soliton.com", "name": "Ghost"}
    patch_ms_verify(monkeypatch, claims=claims)
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
    # App returns 403 for an authenticated-but-unprovisioned account.
    assert r.status_code == 403
 
 
# --- TC-10 archived user ----------------------------------------------------
def test_archived_user_rejected(client, db_session, monkeypatch):
    user = make_user(db_session, role="user", email="e@soliton.com",
                     microsoft_oid="ms-oid-e", status="archived")
    patch_ms_verify(monkeypatch, claims=_ms_claims(user))
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
    # App returns 403 for an archived account.
    assert r.status_code == 403
 
    row = db_session.execute(
        select(AuthLog).order_by(AuthLog.created_at.desc())
    ).scalars().first()
    assert row.failure_reason == "account_archived"
 
 
# --- TC-11 logout writes auth_logs -----------------------------------------
def test_logout_writes_auth_log(client, db_session):
    user = make_user(db_session, role="user")
    r = client.post("/auth/logout", headers=auth_headers(user))
    assert r.status_code == 200
 
    row = db_session.execute(
        select(AuthLog).where(AuthLog.user_id == user.user_id)
        .order_by(AuthLog.created_at.desc())
    ).scalars().first()
    assert row.event_type == "logout"
 
 
# --- TC-13 / TC-16 expired access token on protected endpoints -------------
@pytest.mark.parametrize("method,path", [("post", "/auth/logout"), ("get", "/auth/me")])
def test_expired_access_token_rejected(client, db_session, method, path):
    user = make_user(db_session, role="user")
    r = getattr(client, method)(path, headers=expired_headers(user))
    assert r.status_code == 401
 
 
# --- TC-12 / TC-15 tampered access token -----------------------------------
@pytest.mark.parametrize("method,path", [("post", "/auth/logout"), ("get", "/auth/me")])
def test_tampered_access_token_rejected(client, db_session, method, path):
    user = make_user(db_session, role="user")
    r = getattr(client, method)(path, headers=tampered_headers(user))
    assert r.status_code == 401
 
 
# --- TC-14 GET /auth/me returns own profile, no sensitive fields -----------
def test_me_returns_own_profile(client, db_session):
    user = make_user(db_session, role="manager", email="me@soliton.com")
    r = client.get("/auth/me", headers=auth_headers(user))
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "me@soliton.com"
    assert_no_sensitive_fields(body)
 
 
# --- TC-3 Successful login updates last_login_at ---------------------------
def test_login_updates_last_login_at(client, db_session, monkeypatch):
    old = datetime(2020, 1, 1, tzinfo=timezone.utc)
    user = make_user(db_session, role="user", email="ll@soliton.com",
                     microsoft_oid="ms-oid-ll", last_login_at=old)
    patch_ms_verify(monkeypatch, claims=_ms_claims(user))
 
    r = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
    assert r.status_code == 200
 
    db_session.expire_all()
    refreshed = db_session.get(User, user.user_id).last_login_at
    assert refreshed is not None and refreshed != old
 
 
# --- TC-5 Returned JWT is usable on subsequent requests --------------------
def test_login_token_usable(client, db_session, monkeypatch):
    user = make_user(db_session, role="user", email="smoke@soliton.com",
                     microsoft_oid="ms-oid-smoke")
    patch_ms_verify(monkeypatch, claims=_ms_claims(user))
 
    login = client.post("/auth/login/microsoft", json={"microsoft_token": "valid"})
    token = login.json()["access_token"]
 
    # Use the token the endpoint actually issued — not a minted one.
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "smoke@soliton.com"
 
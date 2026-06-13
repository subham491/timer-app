"""
Audit & Operational Log Endpoints — TC 138-143.
GET /audit-logs | GET /auth-logs | GET /error-logs   (all administrator-only)

The "non-admin gets 403" TCs each parametrize over the non-admin roles, so the
case stays a single named unit while covering every role the plan names.
"""

import pytest

from tests.factories import make_user
from tests.helpers import auth_headers, assert_no_sensitive_fields, as_items


# --- TC-138 GET /audit-logs — admin gets logs, no sensitive fields --------
def test_audit_logs_admin(client, db_session, admin):
    # Generate a real audit entry, then read it back.
    # change-role takes role_id (3 = manager). Depends on audit logging.
    target = make_user(db_session, role="user")
    client.post(f"/users/{target.user_id}/change-role",
                json={"role_id": 3}, headers=auth_headers(admin))
    r = client.get("/audit-logs", headers=auth_headers(admin))
    assert r.status_code == 200
    assert_no_sensitive_fields(r.json())          # no password_hash / microsoft_oid in old/new


# --- TC-139 GET /audit-logs — non-administrator gets 403 ------------------
@pytest.mark.parametrize("role", ["user", "report_viewer", "manager"])
def test_audit_logs_non_admin_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    assert client.get("/audit-logs", headers=auth_headers(actor)).status_code == 403


# --- TC-140 GET /auth-logs — admin gets auth logs -------------------------
def test_auth_logs_admin(client, db_session, admin):
    # Produce an auth event (logout) then read the log.
    client.post("/auth/logout", headers=auth_headers(make_user(db_session, role="user")))
    r = client.get("/auth-logs", headers=auth_headers(admin))
    assert r.status_code == 200
    assert isinstance(as_items(r.json()), list)


# --- TC-141 GET /auth-logs — non-administrator gets 403 -------------------
@pytest.mark.parametrize("role", ["user", "report_viewer", "manager"])
def test_auth_logs_non_admin_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    assert client.get("/auth-logs", headers=auth_headers(actor)).status_code == 403


# --- TC-142 GET /error-logs — admin gets logs, no credentials/PII ---------
def test_error_logs_admin(client, admin):
    r = client.get("/error-logs", headers=auth_headers(admin))
    assert r.status_code == 200
    assert_no_sensitive_fields(r.json())


# --- TC-143 GET /error-logs — non-administrator gets 403 ------------------
@pytest.mark.parametrize("role", ["user", "report_viewer", "manager"])
def test_error_logs_non_admin_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    assert client.get("/error-logs", headers=auth_headers(actor)).status_code == 403
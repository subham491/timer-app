"""
User Management Endpoints — TC 17-40.
GET /users | GET /users/{id} | POST /users | PATCH /users/{id}
POST /users/{id}/change-role | DELETE /users/{id}

Every test case in the plan has exactly one test below, labelled with its TC
number. A few TCs are inherently about more than one role — those parametrize
the role *within* the single TC, so the case stays one named unit.

Shape note: this app returns role_id (int FK) per ADR-003, not a role name, and
ChangeRoleRequest/UserCreateRequest take role_id. All request bodies and response
assertions below use role_id. Seeded ids: 1=user 2=report_viewer 3=manager 4=administrator.
"""

import json
import uuid

import pytest
from sqlalchemy import select, func

from app.models import User, AuditLog, TimeEntry
from tests.factories import (
    make_user, make_project, make_task, make_assignment,
    manager_with_project, team_member_on,
)
from tests.helpers import auth_headers, assert_no_sensitive_fields, as_items


def _new_user_body(role_id: int = 1):
    return {"display_name": "New User",
            "email": f"new_{uuid.uuid4().hex[:8]}@soliton.com",
            "role_id": role_id}


# --- TC-17 GET /users — report_viewer sees all users ----------------------
def test_list_users_report_viewer_sees_all(client, db_session, report_viewer):
    make_user(db_session, role="user")
    make_user(db_session, role="manager")
    r = client.get("/users", headers=auth_headers(report_viewer))
    assert r.status_code == 200
    assert_no_sensitive_fields(r.json())


# --- TC-18 GET /users — manager sees only team users ----------------------
def test_list_users_manager_sees_only_team(client, db_session):
    mgr, project = manager_with_project(db_session)
    team = team_member_on(db_session, project)
    outsider = make_user(db_session, role="user")     # not on a managed project
    r = client.get("/users", headers=auth_headers(mgr))
    assert r.status_code == 200
    ids = {u["user_id"] for u in as_items(r.json())}
    assert team.user_id in ids
    assert outsider.user_id not in ids


# --- TC-19 GET /users — administrator sees all users ----------------------
def test_list_users_admin_sees_all(client, db_session, admin):
    make_user(db_session, role="user")
    r = client.get("/users", headers=auth_headers(admin))
    assert r.status_code == 200


# --- TC-20 GET /users — regular user gets 403 -----------------------------
def test_list_users_regular_user_forbidden(client, regular_user):
    r = client.get("/users", headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-21 GET /users — no JWT returns 401 --------------------------------
def test_list_users_no_jwt(client):
    r = client.get("/users")
    assert r.status_code == 401


# --- TC-22 GET /users?role_id=3 — filter returns correct subset -----------
def test_list_users_role_filter(client, db_session, admin):
    make_user(db_session, role="manager")
    make_user(db_session, role="user")
    # Filter param + response field both use role_id (depends on the endpoint
    # supporting a role_id filter — Phase 2 app work if not yet implemented).
    r = client.get("/users?role_id=3", headers=auth_headers(admin))
    assert r.status_code == 200
    assert all(u["role_id"] == 3 for u in as_items(r.json()))


# --- TC-23 GET /users/{id} — user gets own profile ------------------------
def test_get_own_profile(client, regular_user):
    r = client.get(f"/users/{regular_user.user_id}", headers=auth_headers(regular_user))
    assert r.status_code == 200
    assert_no_sensitive_fields(r.json())


# --- TC-24 GET /users/{id} — manager gets team member profile -------------
def test_manager_gets_team_member(client, db_session):
    mgr, project = manager_with_project(db_session)
    team = team_member_on(db_session, project)
    r = client.get(f"/users/{team.user_id}", headers=auth_headers(mgr))
    assert r.status_code == 200


# --- TC-25 GET /users/{id} — regular user cannot view another -------------
def test_user_cannot_view_another(client, db_session, regular_user):
    other = make_user(db_session, role="user")
    r = client.get(f"/users/{other.user_id}", headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-26 GET /users/{id} — non-existent user returns 404 ----------------
def test_get_user_not_found(client, admin):
    r = client.get("/users/999999", headers=auth_headers(admin))
    assert r.status_code == 404


# --- TC-27 POST /users — administrator creates user -----------------------
def test_admin_creates_user(client, admin):
    r = client.post("/users", json=_new_user_body(), headers=auth_headers(admin))
    assert r.status_code == 201
    assert_no_sensitive_fields(r.json())


# --- TC-28 POST /users — non-administrator gets 403 -----------------------
def test_create_user_non_admin_forbidden(client, manager):
    r = client.post("/users", json=_new_user_body(), headers=auth_headers(manager))
    assert r.status_code == 403


# --- TC-29 POST /users — duplicate email returns 409 ----------------------
def test_create_user_duplicate_email(client, db_session, admin):
    existing = make_user(db_session, role="user", email="dupe@soliton.com")
    body = {"display_name": "Dup", "email": existing.email, "role_id": 1}
    r = client.post("/users", json=body, headers=auth_headers(admin))
    assert r.status_code == 409


# --- TC-30 POST /users — missing required field returns 422 ---------------
def test_create_user_missing_email(client, admin):
    r = client.post("/users", json={"display_name": "No Email"}, headers=auth_headers(admin))
    assert r.status_code == 422


# --- TC-31 PATCH /users/{id} — user updates own display_name --------------
def test_user_updates_own_display_name(client, db_session, regular_user):
    r = client.patch(f"/users/{regular_user.user_id}",
                     json={"display_name": "Updated Name"}, headers=auth_headers(regular_user))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(User, regular_user.user_id).display_name == "Updated Name"


# --- TC-32 PATCH /users/{id} — administrator updates any user -------------
def test_admin_updates_any_user(client, db_session, admin):
    target = make_user(db_session, role="user")
    r = client.patch(f"/users/{target.user_id}",
                     json={"display_name": "Admin Set"}, headers=auth_headers(admin))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(User, target.user_id).display_name == "Admin Set"


# --- TC-33 PATCH /users/{id} — user cannot update another -----------------
def test_user_cannot_update_another(client, db_session, regular_user):
    other = make_user(db_session, role="user")
    r = client.patch(f"/users/{other.user_id}",
                     json={"display_name": "Nope"}, headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-34 PATCH /users/{id} — non-existent user returns 404 --------------
def test_patch_user_not_found(client, admin):
    r = client.patch("/users/999999", json={"display_name": "Ghost"}, headers=auth_headers(admin))
    assert r.status_code == 404


# --- TC-35 POST change-role — admin changes role + audit log --------------
def test_change_role_writes_audit_log(client, db_session, admin):
    target = make_user(db_session, role="user")     # role_id 1
    old_role_id = target.role_id

    r = client.post(f"/users/{target.user_id}/change-role",
                    json={"role_id": 3}, headers=auth_headers(admin))
    assert r.status_code == 200

    db_session.expire_all()
    assert db_session.get(User, target.user_id).role_id == 3

    # Audit assertion depends on Phase 3 (audit_logs writes are not yet
    # implemented in the app). old_value/new_value carry the changed field role_id.
    log = db_session.execute(
        select(AuditLog).where(AuditLog.entity_type == "user",
                               AuditLog.entity_id == target.user_id)
        .order_by(AuditLog.created_at.desc())
    ).scalars().first()
    assert log is not None
    old_v, new_v = json.loads(log.old_value), json.loads(log.new_value)
    assert old_v["role_id"] == old_role_id and new_v["role_id"] == 3
    assert_no_sensitive_fields(old_v)
    assert_no_sensitive_fields(new_v)


# --- TC-36 POST change-role — non-administrator gets 403 ------------------
def test_change_role_non_admin_forbidden(client, db_session, manager):
    target = make_user(db_session, role="user")
    r = client.post(f"/users/{target.user_id}/change-role",
                    json={"role_id": 4}, headers=auth_headers(manager))
    assert r.status_code == 403


# --- TC-37 POST change-role — self-demotion is blocked --------------------
def test_self_demotion_blocked(client, db_session, admin):
    make_user(db_session, role="administrator")        # a second admin exists, so this
    r = client.post(f"/users/{admin.user_id}/change-role",   # 400 is specifically self-demotion,
                    json={"role_id": 1}, headers=auth_headers(admin))  # not the last-admin guard
    assert r.status_code == 400


# --- TC-38 POST change-role — last administrator demotion blocked ---------
def test_last_admin_demotion_blocked(client, admin):
    # `admin` is the only administrator in this transaction.
    r = client.post(f"/users/{admin.user_id}/change-role",
                    json={"role_id": 3}, headers=auth_headers(admin))
    assert r.status_code == 400


# --- TC-39 DELETE /users/{id} — admin archives, entries preserved ---------
def test_archive_user_preserves_entries(client, db_session, admin):
    from datetime import datetime, timezone
    target = make_user(db_session, role="user")
    project = make_project(db_session)
    task = make_task(db_session, project=project)
    make_assignment(db_session, user=target, project=project)
    from tests.factories import make_time_entry
    make_time_entry(db_session, user=target, task=task,
                    start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                    end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    before = db_session.execute(
        select(func.count()).select_from(TimeEntry).where(TimeEntry.user_id == target.user_id)
    ).scalar_one()

    r = client.delete(f"/users/{target.user_id}", headers=auth_headers(admin))
    assert r.status_code == 200

    db_session.expire_all()
    assert db_session.get(User, target.user_id).status == "archived"
    after = db_session.execute(
        select(func.count()).select_from(TimeEntry).where(TimeEntry.user_id == target.user_id)
    ).scalar_one()
    assert after == before          # historical entries preserved


# --- TC-40 DELETE /users/{id} — non-administrator gets 403 ----------------
def test_archive_user_non_admin_forbidden(client, db_session, manager):
    target = make_user(db_session, role="user")
    r = client.delete(f"/users/{target.user_id}", headers=auth_headers(manager))
    assert r.status_code == 403
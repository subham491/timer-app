"""
Assignment & Project Manager Management — TC 69-88.
GET/POST/PATCH /assignments
GET/POST /projects/{id}/managers | DELETE /projects/{id}/managers/{user_id}
"""

from sqlalchemy import select, func

from app.models import Assignment, ProjectManager          
from tests.factories import (
    make_user, make_project, make_assignment, make_project_manager,
    manager_with_project, team_member_on,
)
from tests.helpers import auth_headers, as_items


# ============================ ASSIGNMENTS ==================================

# --- TC-69 GET /assignments — user sees own only -------------------------
def test_list_assignments_user_own_only(client, db_session, regular_user):
    make_assignment(db_session, user=regular_user, project=make_project(db_session))
    make_assignment(db_session, user=make_user(db_session), project=make_project(db_session))
    r = client.get("/assignments", headers=auth_headers(regular_user))
    assert r.status_code == 200
    assert all(a["user_id"] == regular_user.user_id for a in as_items(r.json()))


# --- TC-70 GET /assignments — manager sees managed project assignments ----
def test_list_assignments_manager_managed(client, db_session):
    mgr, project = manager_with_project(db_session)
    team_member_on(db_session, project)
    r = client.get("/assignments", headers=auth_headers(mgr))
    assert r.status_code == 200
    assert all(a["project_id"] == project.project_id for a in as_items(r.json()))


# --- TC-71 GET /assignments — administrator sees all ----------------------
def test_list_assignments_admin_all(client, db_session, admin):
    make_assignment(db_session, user=make_user(db_session), project=make_project(db_session))
    assert client.get("/assignments", headers=auth_headers(admin)).status_code == 200


# --- TC-72 POST /assignments — manager assigns user to managed project ----
def test_manager_assigns_user(client, db_session):
    mgr, project = manager_with_project(db_session)
    target = make_user(db_session, role="user")
    r = client.post("/assignments",
                    json={"user_id": target.user_id, "project_id": project.project_id},
                    headers=auth_headers(mgr))
    assert r.status_code == 201
    assert r.json()["status"] == "active"


# --- TC-73 POST /assignments — duplicate active assignment returns 409 ----
def test_duplicate_active_assignment(client, db_session):
    mgr, project = manager_with_project(db_session)
    target = make_user(db_session, role="user")
    make_assignment(db_session, user=target, project=project, status="active")
    r = client.post("/assignments",
                    json={"user_id": target.user_id, "project_id": project.project_id},
                    headers=auth_headers(mgr))
    assert r.status_code == 409


# --- TC-74 POST /assignments — re-assignment creates new row, keeps history
def test_reassignment_preserves_gap_history(client, db_session):
    mgr, project = manager_with_project(db_session)
    target = make_user(db_session, role="user")
    make_assignment(db_session, user=target, project=project, status="inactive")
    r = client.post("/assignments",
                    json={"user_id": target.user_id, "project_id": project.project_id},
                    headers=auth_headers(mgr))
    assert r.status_code == 201
    rows = db_session.execute(
        select(Assignment).where(Assignment.user_id == target.user_id,
                                 Assignment.project_id == project.project_id)
    ).scalars().all()
    statuses = sorted(a.status for a in rows)
    assert statuses == ["active", "inactive"]      # old preserved, new added


# --- TC-75 POST /assignments — cannot assign archived user ----------------
def test_cannot_assign_archived_user(client, db_session):
    mgr, project = manager_with_project(db_session)
    archived = make_user(db_session, role="user", status="archived")
    r = client.post("/assignments",
                    json={"user_id": archived.user_id, "project_id": project.project_id},
                    headers=auth_headers(mgr))
    assert r.status_code == 400


# --- TC-76 POST /assignments — cannot assign to archived project ----------
def test_cannot_assign_to_archived_project(client, db_session):
    mgr = make_user(db_session, role="manager")
    project = make_project(db_session, status="archived")
    make_project_manager(db_session, user=mgr, project=project)
    target = make_user(db_session, role="user")
    r = client.post("/assignments",
                    json={"user_id": target.user_id, "project_id": project.project_id},
                    headers=auth_headers(mgr))
    assert r.status_code == 400


# --- TC-77 POST /assignments — regular user gets 403 ----------------------
def test_create_assignment_regular_user_forbidden(client, db_session, regular_user):
    project = make_project(db_session)
    target = make_user(db_session, role="user")
    r = client.post("/assignments",
                    json={"user_id": target.user_id, "project_id": project.project_id},
                    headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-78 PATCH /assignments/{id} — manager deactivates assignment -------
def test_manager_deactivates_assignment(client, db_session):
    mgr, project = manager_with_project(db_session)
    target = make_user(db_session, role="user")
    a = make_assignment(db_session, user=target, project=project, status="active")
    r = client.patch(f"/assignments/{a.assignment_id}",
                     json={"status": "inactive"}, headers=auth_headers(mgr))
    assert r.status_code == 200
    db_session.expire_all()
    updated = db_session.get(Assignment, a.assignment_id)
    assert updated.status == "inactive"
    assert updated.updated_by is not None


# --- TC-79 PATCH /assignments/{id} — regular user gets 403 ----------------
def test_patch_assignment_regular_user_forbidden(client, db_session, regular_user):
    a = make_assignment(db_session, user=make_user(db_session), project=make_project(db_session))
    r = client.patch(f"/assignments/{a.assignment_id}",
                     json={"status": "inactive"}, headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-80 PATCH /assignments/{id} — non-existent returns 404 -------------
def test_patch_assignment_not_found(client, admin):
    r = client.patch("/assignments/999999", json={"status": "inactive"}, headers=auth_headers(admin))
    assert r.status_code == 404


# ========================= PROJECT MANAGERS ================================

# --- TC-81 GET /projects/{id}/managers — manager sees managers of managed -
def test_list_managers_of_managed_project(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.get(f"/projects/{project.project_id}/managers", headers=auth_headers(mgr))
    assert r.status_code == 200
    assert mgr.user_id in {m["user_id"] for m in as_items(r.json())}


# --- TC-82 GET /projects/{id}/managers — regular user gets 403 -----------
def test_list_managers_regular_user_forbidden(client, db_session, regular_user):
    project = make_project(db_session)
    r = client.get(f"/projects/{project.project_id}/managers", headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-83 POST /projects/{id}/managers — manager adds a project manager --
def test_add_project_manager(client, db_session):
    mgr, project = manager_with_project(db_session)
    new_pm = make_user(db_session, role="manager")
    r = client.post(f"/projects/{project.project_id}/managers",
                    json={"user_id": new_pm.user_id}, headers=auth_headers(mgr))
    assert r.status_code == 201


# --- TC-84 POST /projects/{id}/managers — cannot add a regular user -------
def test_cannot_add_regular_user_as_manager(client, db_session, admin):
    project = make_project(db_session)
    regular = make_user(db_session, role="user")
    r = client.post(f"/projects/{project.project_id}/managers",
                    json={"user_id": regular.user_id}, headers=auth_headers(admin))
    assert r.status_code == 400


# --- TC-85 POST /projects/{id}/managers — duplicate active manager 409 ----
def test_duplicate_active_manager(client, db_session):
    mgr, project = manager_with_project(db_session)
    existing = make_user(db_session, role="manager")
    make_project_manager(db_session, user=existing, project=project)
    r = client.post(f"/projects/{project.project_id}/managers",
                    json={"user_id": existing.user_id}, headers=auth_headers(mgr))
    assert r.status_code == 409


# --- TC-86 POST /projects/{id}/managers — regular user gets 403 ----------
def test_add_manager_regular_user_forbidden(client, db_session, regular_user):
    project = make_project(db_session)
    candidate = make_user(db_session, role="manager")
    r = client.post(f"/projects/{project.project_id}/managers",
                    json={"user_id": candidate.user_id}, headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-87 DELETE managers/{user_id} — soft-remove via removed_at ---------
def test_remove_project_manager_soft(client, db_session):
    mgr, project = manager_with_project(db_session)
    target = make_user(db_session, role="manager")
    make_project_manager(db_session, user=target, project=project)

    r = client.delete(f"/projects/{project.project_id}/managers/{target.user_id}",
                      headers=auth_headers(mgr))
    assert r.status_code == 200

    db_session.expire_all()
    row = db_session.execute(
        select(ProjectManager).where(ProjectManager.project_id == project.project_id,
                                     ProjectManager.user_id == target.user_id)
    ).scalars().one()
    assert row.removed_at is not None        # row preserved, not deleted
    assert row.removed_by is not None


# --- TC-88 DELETE managers/{user_id} — regular user gets 403 -------------
def test_remove_manager_regular_user_forbidden(client, db_session, regular_user):
    project = make_project(db_session)
    target = make_user(db_session, role="manager")
    make_project_manager(db_session, user=target, project=project)
    r = client.delete(f"/projects/{project.project_id}/managers/{target.user_id}",
                      headers=auth_headers(regular_user))
    assert r.status_code == 403

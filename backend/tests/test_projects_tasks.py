"""
Project & Task Management — TC 41-68.
GET/POST/PATCH /projects | POST /projects/{id}/archive | POST /projects/{id}/restore
GET/POST/PATCH /tasks    | POST /tasks/{id}/archive

One test per TC. TCs that name two roles with the same expectation parametrize
the role inside the single test.
"""

import pytest

from app.models import Project, Task          
from tests.factories import (
    make_user, make_project, make_task, make_assignment,
    manager_with_project, team_member_on,
)
from tests.helpers import auth_headers, as_items


# ============================== PROJECTS ===================================

# --- TC-41 GET /projects — user sees only assigned projects ---------------
def test_list_projects_user_sees_assigned_only(client, db_session, regular_user):
    assigned = make_project(db_session)
    make_assignment(db_session, user=regular_user, project=assigned)
    other = make_project(db_session)
    r = client.get("/projects", headers=auth_headers(regular_user))
    assert r.status_code == 200
    ids = {p["project_id"] for p in as_items(r.json())}
    assert assigned.project_id in ids and other.project_id not in ids


# --- TC-42 GET /projects — manager sees managed projects ------------------
def test_list_projects_manager_sees_managed(client, db_session):
    mgr, managed = manager_with_project(db_session)
    unmanaged = make_project(db_session)
    r = client.get("/projects", headers=auth_headers(mgr))
    assert r.status_code == 200
    ids = {p["project_id"] for p in as_items(r.json())}
    assert managed.project_id in ids and unmanaged.project_id not in ids


# --- TC-43 GET /projects — report_viewer and administrator see all --------
@pytest.mark.parametrize("role", ["report_viewer", "administrator"])
def test_list_projects_privileged_see_all(client, db_session, role):
    make_project(db_session)
    actor = make_user(db_session, role=role)
    r = client.get("/projects", headers=auth_headers(actor))
    assert r.status_code == 200


# --- TC-44 GET /projects — no JWT returns 401 -----------------------------
def test_list_projects_no_jwt(client):
    assert client.get("/projects").status_code == 401


# --- TC-45 GET /projects/{id} — assigned user can view --------------------
def test_get_project_assigned_user(client, db_session, regular_user):
    project = make_project(db_session)
    make_assignment(db_session, user=regular_user, project=project)
    r = client.get(f"/projects/{project.project_id}", headers=auth_headers(regular_user))
    assert r.status_code == 200


# --- TC-46 GET /projects/{id} — unassigned user gets 403 ------------------
def test_get_project_unassigned_forbidden(client, db_session, regular_user):
    project = make_project(db_session)
    r = client.get(f"/projects/{project.project_id}", headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-47 GET /projects/{id} — non-existent project returns 404 ----------
def test_get_project_not_found(client, admin):
    assert client.get("/projects/999999", headers=auth_headers(admin)).status_code == 404


# --- TC-48 POST /projects — manager creates project -----------------------
def test_manager_creates_project(client, manager):
    r = client.post("/projects", json={"name": "New Project"}, headers=auth_headers(manager))
    assert r.status_code == 201
    assert r.json()["status"] == "active"


# --- TC-49 POST /projects — regular user and report_viewer get 403 --------
@pytest.mark.parametrize("role", ["user", "report_viewer"])
def test_create_project_forbidden(client, db_session, role):
    actor = make_user(db_session, role=role)
    r = client.post("/projects", json={"name": "Nope"}, headers=auth_headers(actor))
    assert r.status_code == 403


# --- TC-50 POST /projects — missing name returns 422 ----------------------
def test_create_project_missing_name(client, admin):
    r = client.post("/projects", json={"description": "no name"}, headers=auth_headers(admin))
    assert r.status_code == 422


# --- TC-51 PATCH /projects/{id} — manager updates managed project ---------
def test_manager_updates_managed_project(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.patch(f"/projects/{project.project_id}",
                     json={"name": "Renamed"}, headers=auth_headers(mgr))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Project, project.project_id).name == "Renamed"


# --- TC-52 PATCH /projects/{id} — manager cannot update non-managed -------
def test_manager_cannot_update_unmanaged(client, db_session, manager):
    other = make_project(db_session)
    r = client.patch(f"/projects/{other.project_id}",
                     json={"name": "Nope"}, headers=auth_headers(manager))
    assert r.status_code == 403


# --- TC-53 PATCH /projects/{id} — non-existent project returns 404 --------
def test_patch_project_not_found(client, admin):
    r = client.patch("/projects/999999", json={"name": "Ghost"}, headers=auth_headers(admin))
    assert r.status_code == 404


# --- TC-54 POST /projects/{id}/archive — manager archives managed ---------
def test_manager_archives_managed_project(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.post(f"/projects/{project.project_id}/archive", headers=auth_headers(mgr))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Project, project.project_id).status == "archived"


# --- TC-55 archived project blocks new Time Entries -----------------------
def test_archived_project_blocks_new_entries(client, db_session):
    mgr, project = manager_with_project(db_session)
    task = make_task(db_session, project=project)
    user = team_member_on(db_session, project)
    client.post(f"/projects/{project.project_id}/archive", headers=auth_headers(mgr))
    r = client.post("/time-entries/timer/start",
                    json={"task_id": task.task_id}, headers=auth_headers(user))
    assert r.status_code == 400


# --- TC-56 POST /projects/{id}/restore — administrator restores -----------
def test_admin_restores_project(client, db_session, admin):
    project = make_project(db_session, status="archived")
    r = client.post(f"/projects/{project.project_id}/restore", headers=auth_headers(admin))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Project, project.project_id).status == "active"


# --- TC-57 POST /projects/{id}/restore — manager cannot restore non-managed
def test_manager_cannot_restore_unmanaged(client, db_session, manager):
    other = make_project(db_session, status="archived")
    r = client.post(f"/projects/{other.project_id}/restore", headers=auth_headers(manager))
    assert r.status_code == 403


# =============================== TASKS =====================================

# --- TC-58 GET /tasks — user sees tasks in assigned projects only ---------
def test_list_tasks_user_assigned_only(client, db_session, regular_user):
    project = make_project(db_session)
    make_assignment(db_session, user=regular_user, project=project)
    task = make_task(db_session, project=project)
    r = client.get(f"/tasks?project_id={project.project_id}", headers=auth_headers(regular_user))
    assert r.status_code == 200
    assert task.task_id in {t["task_id"] for t in as_items(r.json())}


# --- TC-59 GET /tasks — report_viewer and administrator see all -----------
@pytest.mark.parametrize("role", ["report_viewer", "administrator"])
def test_list_tasks_privileged_see_all(client, db_session, role):
    make_task(db_session, project=make_project(db_session))
    actor = make_user(db_session, role=role)
    assert client.get("/tasks", headers=auth_headers(actor)).status_code == 200


# --- TC-60 GET /tasks/{id} — non-existent task returns 404 ----------------
def test_get_task_not_found(client, admin):
    assert client.get("/tasks/999999", headers=auth_headers(admin)).status_code == 404


# --- TC-61 POST /tasks — manager creates task in managed project ----------
def test_manager_creates_task(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.post("/tasks", json={"name": "Code Review", "project_id": project.project_id,
                                    "task_description": "Review PRs"}, headers=auth_headers(mgr))
    assert r.status_code == 201
    assert r.json()["status"] == "active"


# --- TC-62 POST /tasks — regular user gets 403 ----------------------------
def test_create_task_regular_user_forbidden(client, db_session, regular_user):
    project = make_project(db_session)
    make_assignment(db_session, user=regular_user, project=project)
    r = client.post("/tasks", json={"name": "Nope", "project_id": project.project_id},
                    headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-63 POST /tasks — cannot create task in archived project -----------
def test_create_task_in_archived_project(client, db_session, admin):
    project = make_project(db_session, status="archived")
    r = client.post("/tasks", json={"name": "Late", "project_id": project.project_id},
                    headers=auth_headers(admin))
    assert r.status_code == 400


# --- TC-64 PATCH /tasks/{id} — manager updates task in managed project ----
def test_manager_updates_task(client, db_session):
    mgr, project = manager_with_project(db_session)
    task = make_task(db_session, project=project)
    r = client.patch(f"/tasks/{task.task_id}",
                     json={"name": "Updated Task"}, headers=auth_headers(mgr))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Task, task.task_id).name == "Updated Task"


# --- TC-65 PATCH /tasks/{id} — manager cannot update task in non-managed --
def test_manager_cannot_update_task_unmanaged(client, db_session, manager):
    other = make_project(db_session)
    task = make_task(db_session, project=other)
    r = client.patch(f"/tasks/{task.task_id}", json={"name": "Nope"}, headers=auth_headers(manager))
    assert r.status_code == 403


# --- TC-66 POST /tasks/{id}/archive — manager archives task in managed ----
def test_manager_archives_task(client, db_session):
    mgr, project = manager_with_project(db_session)
    task = make_task(db_session, project=project)
    r = client.post(f"/tasks/{task.task_id}/archive", headers=auth_headers(mgr))
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Task, task.task_id).status == "archived"


# --- TC-67 archived task blocks new Time Entries --------------------------
def test_archived_task_blocks_new_entries(client, db_session):
    mgr, project = manager_with_project(db_session)
    task = make_task(db_session, project=project)
    user = team_member_on(db_session, project)
    client.post(f"/tasks/{task.task_id}/archive", headers=auth_headers(mgr))
    r = client.post("/time-entries/timer/start",
                    json={"task_id": task.task_id}, headers=auth_headers(user))
    assert r.status_code == 400


# --- TC-68 POST /tasks/{id}/archive — regular user gets 403 ---------------
def test_archive_task_regular_user_forbidden(client, db_session, regular_user):
    task = make_task(db_session, project=make_project(db_session))
    r = client.post(f"/tasks/{task.task_id}/archive", headers=auth_headers(regular_user))
    assert r.status_code == 403

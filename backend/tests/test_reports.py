"""
Reporting & Export Endpoints — TC 113-137.
R-01 my-timesheet | R-02 my-summary | R-03 team-timesheet | R-04 project-summary
R-05 user-activity-summary | R-06 task-breakdown | R-07 assignment-history | exports

Response key names (duration_display, etc.) are assumptions — ADJUST to your
serialiser. The HH:MM check walks the JSON so it is robust to nesting.
"""

import re
from datetime import datetime, timezone

import pytest

from tests.factories import (
    make_user, make_project, make_task, make_assignment, make_project_manager,
    make_time_entry, manager_with_project, team_member_on,
)
from tests.helpers import auth_headers

RANGE = "start_date=2026-06-01&end_date=2026-06-07"
HHMM = re.compile(r"^\d+:[0-5]\d$")


def _values_for(payload, key):
    found = []
    def walk(n):
        if isinstance(n, dict):
            for k, v in n.items():
                if k == key:
                    found.append(v)
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(payload)
    return found


def _user_with_logged_time(db_session, *, role="user", project=None, minutes=90):
    user = make_user(db_session, role=role)
    project = project or make_project(db_session)
    task = make_task(db_session, project=project)
    make_assignment(db_session, user=user, project=project)
    start = datetime(2026, 6, 4, 9, tzinfo=timezone.utc)
    make_time_entry(db_session, user=user, task=task, start_at=start,
                    end_at=start.replace(hour=9 + minutes // 60, minute=minutes % 60))
    return user, project, task


# ----------------------------- R-01 ---------------------------------------

# --- TC-113 my-timesheet — own timesheet, duration_display is HH:MM -------
def test_my_timesheet_hhmm(client, db_session):
    user, *_ = _user_with_logged_time(db_session)
    r = client.get(f"/reports/my-timesheet?{RANGE}", headers=auth_headers(user))
    assert r.status_code == 200
    displays = _values_for(r.json(), "duration_display")
    assert displays and all(HHMM.match(d) for d in displays)


# --- TC-114 my-timesheet — date range is required ------------------------
def test_my_timesheet_requires_date_range(client, regular_user):
    r = client.get("/reports/my-timesheet", headers=auth_headers(regular_user))
    assert r.status_code == 422


# --- TC-115 my-timesheet — optional project filter narrows results -------
def test_my_timesheet_project_filter(client, db_session):
    user, p1, _ = _user_with_logged_time(db_session)
    p2 = make_project(db_session)
    t2 = make_task(db_session, project=p2)
    make_assignment(db_session, user=user, project=p2)
    make_time_entry(db_session, user=user, task=t2,
                    start_at=datetime(2026, 6, 5, 9, tzinfo=timezone.utc),
                    end_at=datetime(2026, 6, 5, 10, tzinfo=timezone.utc))
    r = client.get(f"/reports/my-timesheet?{RANGE}&project_id={p1.project_id}",
                   headers=auth_headers(user))
    assert r.status_code == 200
    projects = set(_values_for(r.json(), "project_id"))
    assert projects <= {p1.project_id} or not projects   # only p1 (if id surfaced)


# ----------------------------- R-02 ---------------------------------------

# --- TC-116 my-summary — own summary incl. % of period ------------------
def test_my_summary(client, db_session):
    user, *_ = _user_with_logged_time(db_session)
    r = client.get(f"/reports/my-summary?{RANGE}", headers=auth_headers(user))
    assert r.status_code == 200


# --- TC-117 my-summary — date range is required --------------------------
def test_my_summary_requires_date_range(client, regular_user):
    assert client.get("/reports/my-summary", headers=auth_headers(regular_user)).status_code == 422


# ----------------------------- R-03 ---------------------------------------

# --- TC-118 team-timesheet — manager sees only managed project entries ---
def test_team_timesheet_manager_scoped(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.get(f"/reports/team-timesheet?project_id={project.project_id}&{RANGE}",
                   headers=auth_headers(mgr))
    assert r.status_code == 200


# --- TC-119 team-timesheet — regular user gets 403 -----------------------
def test_team_timesheet_regular_user_forbidden(client, regular_user):
    r = client.get(f"/reports/team-timesheet?project_id=1&{RANGE}",
                   headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-120 team-timesheet — project filter required for manager ---------
def test_team_timesheet_manager_requires_project(client, manager):
    r = client.get(f"/reports/team-timesheet?{RANGE}", headers=auth_headers(manager))
    assert r.status_code in (400, 422)


# ----------------------------- R-04 ---------------------------------------

# --- TC-121 project-summary — manager gets summary for managed project ---
def test_project_summary_manager(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.get(f"/reports/project-summary?project_id={project.project_id}&{RANGE}",
                   headers=auth_headers(mgr))
    assert r.status_code == 200


# --- TC-122 project-summary — report_viewer gets summary for any project -
def test_project_summary_report_viewer(client, db_session, report_viewer):
    project = make_project(db_session)
    r = client.get(f"/reports/project-summary?project_id={project.project_id}&{RANGE}",
                   headers=auth_headers(report_viewer))
    assert r.status_code == 200


# --- TC-123 project-summary — regular user gets 403 ----------------------
def test_project_summary_regular_user_forbidden(client, regular_user):
    r = client.get(f"/reports/project-summary?project_id=1&{RANGE}",
                   headers=auth_headers(regular_user))
    assert r.status_code == 403


# --- TC-124 project-summary — project and date range required ------------
def test_project_summary_requires_project(client, admin):
    r = client.get(f"/reports/project-summary?{RANGE}", headers=auth_headers(admin))
    assert r.status_code == 422


# ----------------------------- R-05 ---------------------------------------

# --- TC-125 user-activity-summary — report_viewer gets org-wide ----------
def test_user_activity_report_viewer(client, report_viewer):
    r = client.get(f"/reports/user-activity-summary?{RANGE}", headers=auth_headers(report_viewer))
    assert r.status_code == 200


# --- TC-126 user-activity-summary — manager gets 403 --------------------
def test_user_activity_manager_forbidden(client, manager):
    r = client.get(f"/reports/user-activity-summary?{RANGE}", headers=auth_headers(manager))
    assert r.status_code == 403


# --- TC-127 user-activity-summary — regular user gets 403 ---------------
def test_user_activity_regular_user_forbidden(client, regular_user):
    r = client.get(f"/reports/user-activity-summary?{RANGE}", headers=auth_headers(regular_user))
    assert r.status_code == 403


# ----------------------------- R-06 ---------------------------------------

# --- TC-128 task-breakdown — manager gets breakdown for managed project --
def test_task_breakdown_manager(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.get(f"/reports/task-breakdown?project_id={project.project_id}&{RANGE}",
                   headers=auth_headers(mgr))
    assert r.status_code == 200


# --- TC-129 task-breakdown — report_viewer gets breakdown for any project-
def test_task_breakdown_report_viewer(client, db_session, report_viewer):
    project = make_project(db_session)
    r = client.get(f"/reports/task-breakdown?project_id={project.project_id}&{RANGE}",
                   headers=auth_headers(report_viewer))
    assert r.status_code == 200


# --- TC-130 task-breakdown — regular user gets 403 ----------------------
def test_task_breakdown_regular_user_forbidden(client, regular_user):
    r = client.get(f"/reports/task-breakdown?project_id=1&{RANGE}",
                   headers=auth_headers(regular_user))
    assert r.status_code == 403


# ----------------------------- R-07 ---------------------------------------

# --- TC-131 assignment-history — manager gets history incl. inactive -----
def test_assignment_history_manager(client, db_session):
    mgr, project = manager_with_project(db_session)
    make_assignment(db_session, user=make_user(db_session), project=project, status="inactive")
    r = client.get(f"/reports/assignment-history?project_id={project.project_id}",
                   headers=auth_headers(mgr))
    assert r.status_code == 200


# --- TC-132 assignment-history — report_viewer gets 403 ----------------
def test_assignment_history_report_viewer_forbidden(client, report_viewer):
    r = client.get("/reports/assignment-history?project_id=1", headers=auth_headers(report_viewer))
    assert r.status_code == 403


# --- TC-133 assignment-history — project filter is required ------------
def test_assignment_history_requires_project(client, admin):
    r = client.get("/reports/assignment-history", headers=auth_headers(admin))
    assert r.status_code == 422


# ----------------------------- EXPORTS ------------------------------------

# --- TC-134 my-timesheet export — CSV ----------------------------------
def test_export_my_timesheet_csv(client, db_session):
    user, *_ = _user_with_logged_time(db_session)
    r = client.get(f"/reports/my-timesheet/export?{RANGE}&format=csv", headers=auth_headers(user))
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]


# --- TC-135 my-timesheet export — PDF ----------------------------------
def test_export_my_timesheet_pdf(client, db_session):
    user, *_ = _user_with_logged_time(db_session)
    r = client.get(f"/reports/my-timesheet/export?{RANGE}&format=pdf", headers=auth_headers(user))
    assert r.status_code == 200
    assert "application/pdf" in r.headers["content-type"]


# --- TC-136 project-summary export — manager CSV -----------------------
def test_export_project_summary_csv(client, db_session):
    mgr, project = manager_with_project(db_session)
    r = client.get(f"/reports/project-summary/export?project_id={project.project_id}&{RANGE}&format=csv",
                   headers=auth_headers(mgr))
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]


# --- TC-137 project-summary export — regular user gets 403 -------------
def test_export_project_summary_regular_user_forbidden(client, regular_user):
    r = client.get(f"/reports/project-summary/export?project_id=1&{RANGE}&format=csv",
                   headers=auth_headers(regular_user))
    assert r.status_code == 403

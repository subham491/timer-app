"""
Timer & Time Entry invariants — TC 89-112.

These are the rules that silently rot if untested. Each maps to a specific ADR
clause. Note the duration assertions: rather than freezing the clock, we assert
the stored row is internally consistent (duration == end - start). That is
robust whether your backend computes time in Python OR via SQL NOW()
(ADR-003 shows server-side NOW()/strftime, which freezegun would NOT affect).
"""

from datetime import datetime, timezone
import json
import re
from sqlalchemy import select, func

from app.models import TimeEntry, AuditLog          # adjust import
from tests.factories import (
    make_user, make_project, make_task, make_assignment, make_time_entry,
    assigned_user_with_task, manager_with_project, team_member_on,
)
from tests.helpers import auth_headers, assert_no_sensitive_fields, as_items

HHMM = re.compile(r"^\d+:[0-5]\d$")


def _running_count(session, user_id) -> int:
    return session.execute(
        select(func.count()).select_from(TimeEntry)
        .where(TimeEntry.user_id == user_id, TimeEntry.end_at.is_(None))
    ).scalar_one()


# --- TC-96 start timer ------------------------------------------------------
def test_start_timer(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    r = client.post("/time-entries/timer/start",
                    json={"task_id": task.task_id, "work_note": "feature X"},
                    headers=auth_headers(user))
    assert r.status_code == 201
    body = r.json()
    assert body["end_at"] is None
    assert body["duration_seconds"] is None
    assert body["source"] == "timer"


# --- TC-97 starting a second timer auto-stops the first (one transaction) ---
def test_start_auto_stops_existing(client, db_session):
    user, project, task_a = assigned_user_with_task(db_session)
    task_b = make_task(db_session, project=project)

    client.post("/time-entries/timer/start",
                json={"task_id": task_a.task_id}, headers=auth_headers(user))
    client.post("/time-entries/timer/start",
                json={"task_id": task_b.task_id}, headers=auth_headers(user))

    # Exactly one running timer survives (the partial unique index invariant).
    assert _running_count(db_session, user.user_id) == 1

    # The first entry was stopped and got a server-computed, consistent duration.
    stopped = db_session.execute(
        select(TimeEntry).where(TimeEntry.user_id == user.user_id,
                                TimeEntry.task_id == task_a.task_id)
    ).scalar_one()
    assert stopped.end_at is not None
    assert stopped.duration_seconds == int((stopped.end_at - stopped.start_at).total_seconds())
    assert stopped.duration_seconds >= 0


# --- TC-100 client-supplied duration_seconds is ignored on start -----------
def test_start_ignores_client_duration(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    r = client.post("/time-entries/timer/start",
                    json={"task_id": task.task_id, "duration_seconds": 9999},
                    headers=auth_headers(user))
    assert r.status_code == 201
    assert r.json()["duration_seconds"] is None


# --- TC-98 unassigned project -> 403 ---------------------------------------
def test_start_on_unassigned_project_forbidden(client, db_session):
    user = make_user(db_session, role="user")
    project = make_project(db_session)
    task = make_task(db_session, project=project)   # no assignment for `user`
    r = client.post("/time-entries/timer/start",
                    json={"task_id": task.task_id}, headers=auth_headers(user))
    assert r.status_code == 403


# --- TC-99 archived task -> 400 --------------------------------------------
def test_start_on_archived_task_rejected(client, db_session):
    user = make_user(db_session, role="user")
    project = make_project(db_session)
    task = make_task(db_session, project=project, status="archived")
    make_assignment(db_session, user=user, project=project)
    r = client.post("/time-entries/timer/start",
                    json={"task_id": task.task_id}, headers=auth_headers(user))
    assert r.status_code == 400


# --- TC-101 stop computes duration server-side -----------------------------
def test_stop_timer_computes_duration(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    client.post("/time-entries/timer/start",
                json={"task_id": task.task_id}, headers=auth_headers(user))

    r = client.post("/time-entries/timer/stop", headers=auth_headers(user))
    assert r.status_code == 200
    body = r.json()
    assert body["end_at"] is not None
    assert body["duration_seconds"] >= 0
    # internally consistent regardless of how the server clocked it
    assert _running_count(db_session, user.user_id) == 0


# --- TC-102 stop with no running timer -> 400 ------------------------------
def test_stop_without_running_timer(client, db_session):
    user = make_user(db_session, role="user")
    r = client.post("/time-entries/timer/stop", headers=auth_headers(user))
    assert r.status_code == 400


# --- TC-103 manual entry: server computes duration (deterministic) ---------
def test_manual_entry_duration(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    r = client.post("/time-entries/manual", json={
        "task_id": task.task_id,
        "start_at": "2026-06-04T09:00:00Z",
        "end_at": "2026-06-04T10:30:00Z",
        "work_note": "design review",
    }, headers=auth_headers(user))
    assert r.status_code == 201
    body = r.json()
    assert body["source"] == "manual"
    assert body["duration_seconds"] == 5400   # 1h30m, server-computed


# --- TC-104 end before start -> 422 ----------------------------------------
def test_manual_entry_end_before_start(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    r = client.post("/time-entries/manual", json={
        "task_id": task.task_id,
        "start_at": "2026-06-04T11:00:00Z",
        "end_at": "2026-06-04T09:00:00Z",
    }, headers=auth_headers(user))
    assert r.status_code == 422


# --- TC-105 manual entry ignores client duration_seconds -------------------
def test_manual_entry_ignores_client_duration(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    r = client.post("/time-entries/manual", json={
        "task_id": task.task_id,
        "start_at": "2026-06-04T09:00:00Z",
        "end_at": "2026-06-04T10:00:00Z",
        "duration_seconds": 99999,
    }, headers=auth_headers(user))
    assert r.status_code == 201
    assert r.json()["duration_seconds"] == 3600


# --- TC-108 source is immutable --------------------------------------------
def test_source_is_immutable(client, db_session, admin):
    user, project, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=user, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc),
                         source="manual")
    r = client.patch(f"/time-entries/{te.time_entry_id}",
                     json={"source": "timer"}, headers=auth_headers(admin))
    assert r.status_code in (400, 422)


# --- TC-107 own edit recomputes duration -----------------------------------
def test_edit_recomputes_duration(client, db_session):
    user, project, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=user, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    r = client.patch(f"/time-entries/{te.time_entry_id}", json={
        "start_at": "2026-06-04T09:00:00Z",
        "end_at": "2026-06-04T11:00:00Z",
    }, headers=auth_headers(user))
    assert r.status_code == 200
    assert r.json()["duration_seconds"] == 7200


# --- TC-94 / TC-110 own-only access ----------------------------------------
def test_user_cannot_read_others_entry(client, db_session):
    owner, project, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=owner, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    intruder = make_user(db_session, role="user")
    r = client.get(f"/time-entries/{te.time_entry_id}", headers=auth_headers(intruder))
    assert r.status_code == 403


# --- TC-89 GET /time-entries — user sees only own entries ------------------
def test_list_entries_user_own_only(client, db_session):
    owner, _, task = assigned_user_with_task(db_session)
    make_time_entry(db_session, user=owner, task=task,
                    start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                    end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    other, _, ot = assigned_user_with_task(db_session)
    make_time_entry(db_session, user=other, task=ot,
                    start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                    end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    r = client.get("/time-entries", headers=auth_headers(owner))
    assert r.status_code == 200
    assert all(e["user_id"] == owner.user_id for e in as_items(r.json()))


# --- TC-90 GET /time-entries — manager sees team entries -------------------
def test_list_entries_manager_sees_team(client, db_session):
    mgr, project = manager_with_project(db_session)
    member = team_member_on(db_session, project)
    task = make_task(db_session, project=project)
    te = make_time_entry(db_session, user=member, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    r = client.get("/time-entries", headers=auth_headers(mgr))
    assert r.status_code == 200
    assert te.time_entry_id in {e["time_entry_id"] for e in as_items(r.json())}


# --- TC-91 GET /time-entries — report_viewer sees all entries --------------
def test_list_entries_report_viewer_all(client, db_session, report_viewer):
    user, _, task = assigned_user_with_task(db_session)
    make_time_entry(db_session, user=user, task=task,
                    start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                    end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    r = client.get("/time-entries", headers=auth_headers(report_viewer))
    assert r.status_code == 200


# --- TC-92 GET /time-entries — date range filter --------------------------
def test_list_entries_date_filter(client, db_session):
    user, _, task = assigned_user_with_task(db_session)
    in_range = make_time_entry(db_session, user=user, task=task,
                               start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                               end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    out_range = make_time_entry(db_session, user=user, task=task,
                                start_at=datetime(2026, 5, 1, 9, tzinfo=timezone.utc),
                                end_at=datetime(2026, 5, 1, 10, tzinfo=timezone.utc))
    r = client.get("/time-entries?start_at=2026-06-01T00:00:00Z&end_at=2026-06-07T23:59:59Z",
                   headers=auth_headers(user))
    assert r.status_code == 200
    ids = {e["time_entry_id"] for e in as_items(r.json())}
    assert in_range.time_entry_id in ids and out_range.time_entry_id not in ids


# --- TC-93 GET /time-entries/{id} — user gets own entry, full fields -------
def test_get_own_entry_full_fields(client, db_session):
    user, _, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=user, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, 30, tzinfo=timezone.utc),
                         work_note="design review")
    r = client.get(f"/time-entries/{te.time_entry_id}", headers=auth_headers(user))
    assert r.status_code == 200
    body = r.json()
    for k in ("time_entry_id", "task_id", "start_at", "end_at",
              "duration_seconds", "duration_display", "work_note", "source"):
        assert k in body, f"missing field {k}"
    assert HHMM.match(body["duration_display"])


# --- TC-95 GET /time-entries/{id} — non-existent entry returns 404 ---------
def test_get_entry_not_found(client, admin):
    r = client.get("/time-entries/999999", headers=auth_headers(admin))
    assert r.status_code == 404


# --- TC-106 POST /time-entries/manual — cannot log against archived task ---
def test_manual_entry_archived_task(client, db_session):
    user = make_user(db_session, role="user")
    project = make_project(db_session)
    task = make_task(db_session, project=project, status="archived")
    make_assignment(db_session, user=user, project=project)
    r = client.post("/time-entries/manual", json={
        "task_id": task.task_id,
        "start_at": "2026-06-04T09:00:00Z",
        "end_at": "2026-06-04T10:00:00Z",
    }, headers=auth_headers(user))
    assert r.status_code == 400


# --- TC-109 PATCH — administrator edit creates audit log -------------------
def test_admin_edit_writes_audit_log(client, db_session, admin):
    user, _, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=user, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    r = client.patch(f"/time-entries/{te.time_entry_id}",
                     json={"work_note": "Updated by admin"}, headers=auth_headers(admin))
    assert r.status_code == 200

    log = db_session.execute(
        select(AuditLog).where(AuditLog.entity_type == "time_entry",
                               AuditLog.entity_id == te.time_entry_id)
        .order_by(AuditLog.created_at.desc())
    ).scalars().first()
    assert log is not None
    assert log.old_value and log.new_value
    assert_no_sensitive_fields(json.loads(log.old_value))
    assert_no_sensitive_fields(json.loads(log.new_value))


# --- TC-111 DELETE — user deletes own entry; audit log created -------------
def test_user_deletes_own_entry_audit(client, db_session):
    user, _, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=user, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    r = client.delete(f"/time-entries/{te.time_entry_id}", headers=auth_headers(user))
    assert r.status_code == 200

    listing = client.get("/time-entries", headers=auth_headers(user))
    assert te.time_entry_id not in {e["time_entry_id"] for e in as_items(listing.json())}

    log = db_session.execute(
        select(AuditLog).where(AuditLog.entity_type == "time_entry",
                               AuditLog.entity_id == te.time_entry_id)
        .order_by(AuditLog.created_at.desc())
    ).scalars().first()
    assert log is not None


# --- TC-112 DELETE — user cannot delete another user's entry ---------------
def test_user_cannot_delete_others_entry(client, db_session):
    owner, _, task = assigned_user_with_task(db_session)
    te = make_time_entry(db_session, user=owner, task=task,
                         start_at=datetime(2026, 6, 4, 9, tzinfo=timezone.utc),
                         end_at=datetime(2026, 6, 4, 10, tzinfo=timezone.utc))
    intruder = make_user(db_session, role="user")
    r = client.delete(f"/time-entries/{te.time_entry_id}", headers=auth_headers(intruder))
    assert r.status_code == 403

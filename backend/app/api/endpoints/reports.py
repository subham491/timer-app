"""
Reporting endpoints — ADR-007 Reporting & Export group.
All reports are derived at query time — nothing is stored.

GET /reports/my-timesheet
GET /reports/my-summary
GET /reports/team-timesheet
GET /reports/project-summary
GET /reports/user-activity-summary
GET /reports/task-breakdown
GET /reports/assignment-history
GET /reports/my-timesheet/export
GET /reports/project-summary/export
"""

import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models.task_model import Task
from app.models.time_entry_model import TimeEntry
from app.models.user_model import User
from app.models.project_model import Project
from app.models.assignment_model import Assignment

router = APIRouter()

# Role IDs — per ADR-001
_REPORT_VIEWER_ROLE_ID = 2
_ADMINISTRATOR_ROLE_ID = 4
_ORG_REPORT_ROLES = {_REPORT_VIEWER_ROLE_ID, _ADMINISTRATOR_ROLE_ID}

_ROLE_LABELS: dict[int, str] = {
    1: "Regular User",
    2: "Report Viewer",
    3: "Manager",
    4: "Administrator",
}


def _secs_to_hrs(seconds: int | None) -> str:
    """Convert seconds to a decimal-hours string with 2 d.p. (e.g. '2.50')."""
    if not seconds:
        return "0.00"
    return f"{seconds / 3600:.2f}"


def _parse_dates(start_date: str, end_date: str):
    try:
        start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format. Use ISO-8601 e.g. 2026-05-01",
        )
    return start, end


@router.get("/my-timesheet")
def my_timesheet(
    db: DBSession,
    user: CurrentUser,
    start_date: str = Query(..., description="ISO-8601 start date"),
    end_date: str = Query(..., description="ISO-8601 end date"),
    task_id: Optional[int] = Query(default=None),
    project_id: Optional[int] = Query(default=None),
):
    """R-01 — Detailed time entries for the current user over a date range."""
    start, end = _parse_dates(start_date, end_date)
    q = (
        db.query(TimeEntry, Task.name.label("task_name"), Project.name.label("project_name"))
        .join(Task, Task.task_id == TimeEntry.task_id)
        .join(Project, Project.project_id == Task.project_id)
        .filter(
            TimeEntry.user_id == user["user_id"],
            TimeEntry.end_at != None,
            TimeEntry.start_at >= start,
            TimeEntry.start_at < end,
        )
    )
    if task_id:
        q = q.filter(TimeEntry.task_id == task_id)
    if project_id:
        q = q.filter(Task.project_id == project_id)
    rows = q.order_by(TimeEntry.start_at.desc()).all()
    return [
        {
            "date":             r.TimeEntry.start_at.date().isoformat(),
            "project":          r.project_name,
            "task":             r.task_name,
            "work_note":        r.TimeEntry.work_note,
            "start_at":         r.TimeEntry.start_at,
            "end_at":           r.TimeEntry.end_at,
            "duration_seconds": r.TimeEntry.duration_seconds,
            "source":           r.TimeEntry.source,
        }
        for r in rows
    ]


@router.get("/my-summary")
def my_summary(
    db: DBSession,
    user: CurrentUser,
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """R-02 — Aggregated time per project/task for the current user."""
    start, end = _parse_dates(start_date, end_date)
    rows = (
        db.query(
            Project.name.label("project"),
            Task.name.label("task"),
            func.count(TimeEntry.time_entry_id).label("entry_count"),
            func.sum(TimeEntry.duration_seconds).label("actual_duration"),
        )
        .join(Task, Task.task_id == TimeEntry.task_id)
        .join(Project, Project.project_id == Task.project_id)
        .filter(
            TimeEntry.user_id == user["user_id"],
            TimeEntry.end_at != None,
            TimeEntry.start_at >= start,
            TimeEntry.start_at < end,
        )
        .group_by(Project.name, Task.name)
        .order_by(func.sum(TimeEntry.duration_seconds).desc())
        .all()
    )
    total = sum(r.actual_duration or 0 for r in rows)
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_duration_seconds": total,
        "rows": [
            {
                "project":          r.project,
                "task":             r.task,
                "entry_count":      r.entry_count,
                "actual_duration":  r.actual_duration or 0,
            }
            for r in rows
        ],
    }


@router.get("/team-timesheet")
def team_timesheet(
    db: DBSession,
    user: CurrentUser,
    start_date: str = Query(...),
    end_date: str = Query(...),
    project_id: Optional[int] = Query(default=None),
    user_id: Optional[int] = Query(default=None),
):
    """R-03 — Time entries for all users on managed projects."""
    start, end = _parse_dates(start_date, end_date)
    q = (
        db.query(
            User.display_name.label("user"),
            TimeEntry,
            Task.name.label("task_name"),
            Project.name.label("project_name"),
        )
        .join(Task, Task.task_id == TimeEntry.task_id)
        .join(Project, Project.project_id == Task.project_id)
        .join(User, User.user_id == TimeEntry.user_id)
        .filter(TimeEntry.end_at != None, TimeEntry.start_at >= start, TimeEntry.start_at < end)
    )
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if user_id:
        q = q.filter(TimeEntry.user_id == user_id)
    rows = q.order_by(TimeEntry.start_at.desc()).all()
    return [
        {
            "user":             r.user,
            "date":             r.TimeEntry.start_at.date().isoformat(),
            "project":          r.project_name,
            "task":             r.task_name,
            "work_note":        r.TimeEntry.work_note,
            "duration_seconds": r.TimeEntry.duration_seconds,
            "source":           r.TimeEntry.source,
        }
        for r in rows
    ]


@router.get("/project-summary")
def project_summary(
    db: DBSession,
    user: CurrentUser,
    project_id: int = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
    user_id: Optional[int] = Query(default=None),
):
    """R-04 — Time per user/task for a project."""
    start, end = _parse_dates(start_date, end_date)
    q = (
        db.query(
            User.display_name.label("user"),
            Task.name.label("task"),
            func.count(TimeEntry.time_entry_id).label("entry_count"),
            func.sum(TimeEntry.duration_seconds).label("actual_duration"),
        )
        .join(Task, Task.task_id == TimeEntry.task_id)
        .join(User, User.user_id == TimeEntry.user_id)
        .filter(
            Task.project_id == project_id,
            TimeEntry.end_at != None,
            TimeEntry.start_at >= start,
            TimeEntry.start_at < end,
        )
        .group_by(User.display_name, Task.name)
        .order_by(func.sum(TimeEntry.duration_seconds).desc())
    )
    if user_id:
        q = q.filter(TimeEntry.user_id == user_id)
    rows = q.all()
    total = sum(r.actual_duration or 0 for r in rows)
    return {
        "project_id": project_id,
        "total_duration_seconds": total,
        "rows": [
            {
                "user":            r.user,
                "task":            r.task,
                "entry_count":     r.entry_count,
                "actual_duration": r.actual_duration or 0,
            }
            for r in rows
        ],
    }


def _query_user_activity(
    db,
    start: datetime,
    end: datetime,
    role_id: Optional[int] = None,
) -> list[dict]:
    """
    Core R-05 logic — plain Python args, no FastAPI Query wrappers.
    Called by both the GET and the export endpoint so neither has to
    call the other (which would pass Query() objects as defaults).
    """
    active_projects_sq = (
        db.query(
            Assignment.user_id.label("uid"),
            func.count(func.distinct(Assignment.project_id)).label("cnt"),
        )
        .filter(Assignment.status == "active")
        .group_by(Assignment.user_id)
        .subquery()
    )

    q = (
        db.query(
            User.user_id,
            User.display_name,
            User.role_id,
            func.count(TimeEntry.time_entry_id).label("entry_count"),
            func.sum(TimeEntry.duration_seconds).label("actual_duration"),
            func.sum(
                case((TimeEntry.is_billable == True, TimeEntry.duration_seconds), else_=0)
            ).label("billable_duration"),
            func.sum(
                case((TimeEntry.is_billable == False, TimeEntry.duration_seconds), else_=0)
            ).label("non_billable_duration"),
            func.max(TimeEntry.start_at).label("last_entry"),
            func.coalesce(func.max(active_projects_sq.c.cnt), 0).label("active_projects"),
        )
        .outerjoin(
            TimeEntry,
            (TimeEntry.user_id == User.user_id)
            & (TimeEntry.end_at != None)
            & (TimeEntry.start_at >= start)
            & (TimeEntry.start_at < end),
        )
        .outerjoin(active_projects_sq, active_projects_sq.c.uid == User.user_id)
        .filter(User.deleted_at == None)
        .group_by(User.user_id, User.display_name, User.role_id)
        .order_by(func.sum(TimeEntry.duration_seconds).desc())
    )

    if role_id is not None:
        q = q.filter(User.role_id == role_id)

    rows = q.all()
    return [
        {
            "user_id":               r.user_id,
            "display_name":          r.display_name,
            "role_id":               r.role_id,
            "entry_count":           r.entry_count or 0,
            "actual_duration":       r.actual_duration or 0,
            "billable_duration":     r.billable_duration or 0,
            "non_billable_duration": r.non_billable_duration or 0,
            "active_projects":       r.active_projects or 0,
            "last_entry_date":       r.last_entry.date().isoformat() if r.last_entry else None,
        }
        for r in rows
    ]


@router.get("/user-activity-summary")
def user_activity_summary(
    db: DBSession,
    user: CurrentUser,
    start_date: str = Query(...),
    end_date: str = Query(...),
    role_id: Optional[int] = Query(default=None, description="Filter by role_id"),
):
    """R-05 — Org-wide activity summary per user. Requires reports:view_all scope."""
    if user["role_id"] not in _ORG_REPORT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="reports:view_all scope required.",
        )
    start, end = _parse_dates(start_date, end_date)
    return _query_user_activity(db, start, end, role_id=role_id)


@router.get("/user-activity-summary/export")
def export_user_activity_summary(
    db: DBSession,
    user: CurrentUser,
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """Export R-05 as CSV. Requires reports:export_all scope."""
    if user["role_id"] not in _ORG_REPORT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="reports:export_all scope required.",
        )

    start, end = _parse_dates(start_date, end_date)
    raw_rows = _query_user_activity(db, start, end)

    # Build human-readable rows — no IDs, durations in hours
    csv_rows = [
        {
            "User":               r["display_name"],
            "Role":               _ROLE_LABELS.get(r["role_id"], f"Role {r['role_id']}"),
            "Active Projects":    r["active_projects"],
            "Sessions":           r["entry_count"],
            "Total Hours":        _secs_to_hrs(r["actual_duration"]),
            "Billable Hours":     _secs_to_hrs(r["billable_duration"]),
            "Non-Billable Hours": _secs_to_hrs(r["non_billable_duration"]),
            "Last Entry":         r["last_entry_date"] or "—",
        }
        for r in raw_rows
    ]

    # Consolidated totals row
    csv_rows.append(
        {
            "User":               "TOTAL",
            "Role":               "",
            "Active Projects":    "",
            "Sessions":           sum(r["entry_count"] for r in raw_rows),
            "Total Hours":        _secs_to_hrs(sum(r["actual_duration"] for r in raw_rows)),
            "Billable Hours":     _secs_to_hrs(sum(r["billable_duration"] for r in raw_rows)),
            "Non-Billable Hours": _secs_to_hrs(sum(r["non_billable_duration"] for r in raw_rows)),
            "Last Entry":         "",
        }
    )

    output = io.StringIO()
    fieldnames = [
        "User", "Role", "Active Projects", "Sessions",
        "Total Hours", "Billable Hours", "Non-Billable Hours", "Last Entry",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(csv_rows)

    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                f"attachment; filename=user-activity-{start_date}-to-{end_date}.csv"
        },
    )


@router.get("/task-breakdown")
def task_breakdown(
    db: DBSession,
    user: CurrentUser,
    project_id: int = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """R-06 — Time distribution across tasks in a project."""
    start, end = _parse_dates(start_date, end_date)
    rows = (
        db.query(
            Task.task_id,
            Task.name.label("task"),
            Task.description,
            func.count(TimeEntry.time_entry_id).label("entry_count"),
            func.count(func.distinct(TimeEntry.user_id)).label("unique_contributors"),
            func.sum(TimeEntry.duration_seconds).label("actual_duration"),
        )
        .outerjoin(TimeEntry, (TimeEntry.task_id == Task.task_id) & (TimeEntry.end_at != None) & (TimeEntry.start_at >= start) & (TimeEntry.start_at < end))
        .filter(Task.project_id == project_id)
        .group_by(Task.task_id, Task.name, Task.description)
        .order_by(func.sum(TimeEntry.duration_seconds).desc())
        .all()
    )
    total = sum(r.actual_duration or 0 for r in rows)
    return {
        "project_id": project_id,
        "total_duration_seconds": total,
        "rows": [
            {
                "task":                 r.task,
                "description":          r.description,
                "entry_count":          r.entry_count,
                "unique_contributors":  r.unique_contributors,
                "actual_duration":      r.actual_duration or 0,
                "pct_of_total":         round((r.actual_duration or 0) / total * 100, 1) if total else 0,
            }
            for r in rows
        ],
    }


@router.get("/assignment-history")
def assignment_history(
    db: DBSession,
    user: CurrentUser,
    project_id: int = Query(...),
):
    """R-07 — Full assignment lifecycle for a project."""
    rows = (
        db.query(Assignment, User.display_name.label("user_name"))
        .join(User, User.user_id == Assignment.user_id)
        .filter(Assignment.project_id == project_id)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    return [
        {
            "user":         r.user_name,
            "status":       r.Assignment.status,
            "assigned_at":  r.Assignment.created_at,
            "updated_at":   r.Assignment.updated_at,
        }
        for r in rows
    ]


@router.get("/my-timesheet/export")
def export_my_timesheet(
    db: DBSession,
    user: CurrentUser,
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """Export R-01 as CSV."""
    rows = my_timesheet(db, user, start_date=start_date, end_date=end_date)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "project", "task", "work_note", "start_at", "end_at", "duration_seconds", "source"], lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=my_timesheet.csv"},
    )


@router.get("/project-summary/export")
def export_project_summary(
    db: DBSession,
    user: CurrentUser,
    project_id: int = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """Export R-04 as CSV."""
    data = project_summary(db, user, project_id=project_id, start_date=start_date, end_date=end_date)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["user", "task", "entry_count", "actual_duration"], lineterminator="\n")
    writer.writeheader()
    writer.writerows(data["rows"])
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=project_summary.csv"},
    )
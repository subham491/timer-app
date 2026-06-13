"""
All database operations related to the `time_entries` table.
Replaces timelog_repository.py — ADR-003 compliant.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.task_model import Task
from app.models.time_entry_model import TimeEntry


def get_entries_for_task(db: Session, task_id: int, user_id: int):
    """Return all time entries for a task, newest first."""
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.task_id == task_id, TimeEntry.user_id == user_id)
        .order_by(TimeEntry.created_at.desc())
        .all()
    )


def get_entry_by_id(db: Session, time_entry_id: int, user_id: int):
    """Return a single time entry."""
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.time_entry_id == time_entry_id, TimeEntry.user_id == user_id)
        .first()
    )


def get_entry_by_universal_id(db: Session, universal_id: str, user_id: int):
    """Return a single time entry by stable identifier."""
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.universal_id == universal_id, TimeEntry.user_id == user_id)
        .first()
    )


def get_running_entry_for_user(db: Session, user_id: int):
    """Return the currently Running Timer for a user, or None.
    Running Timer = end_at IS NULL per ADR-003.
    """
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.user_id == user_id, TimeEntry.status == "running")
        .first()
    )


def get_current_timer_entry_for_user(db: Session, user_id: int):
    """Return the current running or paused timer for a user, or None."""
    return (
        db.query(TimeEntry)
        .filter(
            TimeEntry.user_id == user_id,
            TimeEntry.status.in_(["running", "paused"]),
        )
        .order_by(TimeEntry.updated_at.desc())
        .first()
    )


def get_entries_in_period(db: Session, user_id: int, start: datetime, end: datetime):
    """Return completed entries whose start_at falls within [start, end)."""
    return (
        db.query(TimeEntry, Task.name.label("task_name"))
        .join(Task, Task.task_id == TimeEntry.task_id)
        .filter(
            TimeEntry.user_id == user_id,
            TimeEntry.end_at != None,          # completed entries only
            TimeEntry.start_at >= start,
            TimeEntry.start_at < end,
        )
        .order_by(TimeEntry.start_at.desc())
        .all()
    )


def get_all_entries_for_user(db: Session, user_id: int):
    """Return every time entry for a user, newest first."""
    return (
        db.query(TimeEntry, Task.name.label("task_name"))
        .join(Task, Task.task_id == TimeEntry.task_id)
        .filter(TimeEntry.user_id == user_id)
        .order_by(TimeEntry.start_at.desc())
        .all()
    )


def get_filtered_entries_for_user(
    db: Session,
    user_id: int,
    *,
    project_id: Optional[int] = None,
    task_id: Optional[int] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    limit: int = 20,
    offset: int = 0,
):
    query = (
        db.query(TimeEntry)
        .filter(TimeEntry.user_id == user_id)
        .order_by(TimeEntry.start_at.desc(), TimeEntry.created_at.desc())
    )

    if project_id is not None:
        query = query.filter(TimeEntry.project_id == project_id)

    if task_id is not None:
        query = query.filter(TimeEntry.task_id == task_id)

    if status is not None:
        query = query.filter(TimeEntry.status == status)

    if source is not None:
        query = query.filter(TimeEntry.source == source)

    if start_at is not None:
        query = query.filter(TimeEntry.start_at >= start_at)

    if end_at is not None:
        query = query.filter(TimeEntry.end_at <= end_at)

    total_items = query.count()
    items = query.offset(offset).limit(limit).all()
    return items, total_items


def get_overlapping_completed_entries_for_user(
    db: Session,
    user_id: int,
    *,
    start_at: datetime,
    end_at: datetime,
    exclude_time_entry_id: Optional[int] = None,
):
    query = db.query(TimeEntry).filter(
        TimeEntry.user_id == user_id,
        TimeEntry.end_at != None,
        TimeEntry.start_at < end_at,
        TimeEntry.end_at > start_at,
    )

    if exclude_time_entry_id is not None:
        query = query.filter(TimeEntry.time_entry_id != exclude_time_entry_id)

    return query.all()


def create_entry(
    db: Session,
    *,
    universal_id: str,
    task_id: int,
    user_id: int,
    source: str,
    start_at: datetime,
    status: str = "running",
    work_note: Optional[str] = None,
    end_at: Optional[datetime] = None,
    is_billable: bool = False,
    duration_seconds: Optional[int] = None,
) -> TimeEntry:
    """Create a new time entry. end_at=None means Running Timer."""
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            raise ValueError("Task not found.")

        entry = TimeEntry(
            universal_id=universal_id,
            task_id=task_id,
            project_id=task.project_id,
            user_id=user_id,
            work_note=work_note,
            source=source,
            status=status,
            is_billable=is_billable,
            start_at=start_at,
            started_at=start_at,
            end_at=end_at,
            ended_at=end_at,
            duration_seconds=duration_seconds,
        )
        db.add(entry)
        db.flush()
        db.refresh(entry)
        return entry

    except Exception:
        db.rollback()
        raise


def stop_entry(
    db: Session,
    time_entry_id: int,
    user_id: int,
    *,
    end_at: datetime,
    duration_seconds: int,
) -> bool:
    """Stop a Running Timer — sets end_at and duration_seconds. Returns False if not found."""
    try:
        entry = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.time_entry_id == time_entry_id,
                TimeEntry.user_id == user_id,
                TimeEntry.status == "running",
            )
            .first()
        )

        if not entry:
            return False

        entry.end_at = end_at
        entry.ended_at = end_at
        entry.duration_seconds = duration_seconds  # always server-computed per ADR-003
        entry.status = "stopped"
        entry.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True

    except Exception:
        db.rollback()
        raise


def edit_entry(
    db: Session,
    time_entry_id: int,
    user_id: int,
    updated_by: int,
    *,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    work_note: Optional[str] = None,
) -> bool:
    """
    Edit a completed time entry.
    duration_seconds is recomputed server-side from the updated timestamps.
    Running Timers (end_at IS NULL) cannot be edited.
    """
    try:
        entry = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.time_entry_id == time_entry_id,
                TimeEntry.user_id == user_id,
                TimeEntry.status == "stopped",  # paused/running entries are not editable here
            )
            .first()
        )

        if not entry:
            return False

        new_start = start_at   if start_at   is not None else entry.start_at
        new_end   = end_at     if end_at     is not None else entry.end_at

        # Normalise to UTC-aware datetimes for arithmetic
        def _to_utc(dt: datetime) -> datetime:
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

        start_dt, end_dt = _to_utc(new_start), _to_utc(new_end)
        computed_duration = int((end_dt - start_dt).total_seconds())

        if computed_duration < 0:
            raise ValueError("end_at must be after start_at.")

        entry.start_at         = new_start
        entry.started_at       = new_start
        entry.end_at           = new_end
        entry.ended_at         = new_end
        entry.duration_seconds = computed_duration   # always server-computed per ADR-003
        entry.updated_at       = datetime.now(timezone.utc)
        entry.updated_by       = updated_by

        if work_note is not None:
            entry.work_note = work_note

        db.flush()
        return True

    except ValueError:
        raise

    except Exception:
        db.rollback()
        raise


def delete_entry(db: Session, time_entry_id: int, user_id: int) -> bool:
    """Delete a time entry. Returns False if not found."""
    try:
        entry = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.time_entry_id == time_entry_id,
                TimeEntry.user_id == user_id,
            )
            .first()
        )

        if not entry:
            return False

        db.delete(entry)
        db.flush()
        return True

    except Exception:
        db.rollback()
        raise

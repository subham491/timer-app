"""
Timer service.

Handles the lifecycle of a time entry:
  start -> creates a running timer
  pause -> freezes the current running timer
  resume -> continues the current paused timer
  stop -> finalizes the current running or paused timer
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import assignment_repository as assignment_repo
from app.repositories import project_repository as project_repo
from app.repositories import task_repository as task_repo
from app.repositories import time_entry_repository as entry_repo
from app.utils import new_universal_id


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(entry) -> dict:
    """Convert a TimeEntry ORM object to a plain dict for legacy responses."""
    return {
        "time_entry_id": entry.time_entry_id,
        "universal_id": entry.universal_id,
        "task_id": entry.task_id,
        "user_id": entry.user_id,
        "work_note": entry.work_note,
        "source": entry.source,
        "start_at": entry.start_at,
        "end_at": entry.end_at,
        "duration_seconds": entry.duration_seconds,
        "created_at": entry.created_at,
    }


def _get_project_by_identifier(db: Session, project_identifier: Optional[str]):
    if not project_identifier:
        return None

    project = project_repo.get_project_by_universal_id(db, project_identifier)
    if project:
        return project

    if project_identifier.isdigit():
        return project_repo.get_project_by_id(db, int(project_identifier))

    return None


def _get_task_by_identifier(db: Session, task_identifier: str):
    task = task_repo.get_task_by_universal_id(db, task_identifier)
    if task:
        return task

    if task_identifier.isdigit():
        task_row = task_repo.get_task_by_id(db, int(task_identifier))
        return task_row[0] if task_row else None

    return None


def _resolve_project_and_task(
    db: Session,
    user_id: int,
    *,
    project_identifier: Optional[str],
    task_identifier: str,
):
    task = _get_task_by_identifier(db, task_identifier)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task does not exist.",
        )

    project = _get_project_by_identifier(db, project_identifier)
    if not project:
        project = project_repo.get_project_by_id(db, task.project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project does not exist.",
        )

    if project.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived projects cannot be used for timer actions.",
        )

    if task.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived tasks cannot be used for timer actions.",
        )

    if task.project_id != project.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task does not belong to the selected project.",
        )

    if not assignment_repo.get_active_assignment(db, user_id, project.project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have an active assignment to this project.",
        )

    return project, task


def _normalize_datetime(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _compute_elapsed_seconds(start_at: datetime, end_at: datetime) -> int:
    normalized_start = _normalize_datetime(start_at)
    normalized_end = _normalize_datetime(end_at)
    return max(0, int((normalized_end - normalized_start).total_seconds()))


def _finalize_entry(entry, *, ended_at: datetime) -> None:
    entry.end_at = ended_at
    entry.ended_at = ended_at
    entry.duration_seconds = _compute_elapsed_seconds(entry.start_at, ended_at)
    entry.status = "stopped"
    entry.updated_at = ended_at


def _pause_entry(entry, *, paused_at: datetime) -> None:
    entry.end_at = paused_at
    entry.ended_at = paused_at
    entry.duration_seconds = _compute_elapsed_seconds(entry.start_at, paused_at)
    entry.status = "paused"
    entry.updated_at = paused_at


def _resume_entry(entry, *, resumed_at: datetime) -> None:
    prior_duration = entry.duration_seconds or 0
    adjusted_start = resumed_at - timedelta(seconds=prior_duration)
    entry.start_at = adjusted_start
    entry.started_at = adjusted_start
    entry.end_at = None
    entry.ended_at = None
    entry.duration_seconds = None
    entry.status = "running"
    entry.updated_at = resumed_at


def start_timer_mvp(
    db: Session,
    user_id: int,
    *,
    project_id: Optional[str],
    task_id: str,
    work_note: Optional[str] = None,
    is_billable: bool = False,
):
    _, task = _resolve_project_and_task(
        db,
        user_id,
        project_identifier=project_id,
        task_identifier=task_id,
    )

    current_entry = entry_repo.get_current_timer_entry_for_user(db, user_id)
    if current_entry:
        now = _now_utc()
        if current_entry.status == "running":
            _finalize_entry(current_entry, ended_at=now)
        elif current_entry.status == "paused":
            current_entry.status = "stopped"
            current_entry.updated_at = now

    try:
        return entry_repo.create_entry(
            db,
            universal_id=new_universal_id(),
            task_id=task.task_id,
            user_id=user_id,
            work_note=work_note.strip() if work_note and work_note.strip() else None,
            source="timer",
            start_at=_now_utc(),
            status="running",
            is_billable=is_billable,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


def pause_current_timer_mvp(db: Session, user_id: int):
    current_entry = entry_repo.get_current_timer_entry_for_user(db, user_id)

    if not current_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current timer exists.",
        )

    if current_entry.status != "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a running timer can be paused.",
        )

    _pause_entry(current_entry, paused_at=_now_utc())
    db.flush()
    db.refresh(current_entry)
    return current_entry


def resume_current_timer_mvp(db: Session, user_id: int):
    current_entry = entry_repo.get_current_timer_entry_for_user(db, user_id)

    if not current_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No paused timer exists.",
        )

    if current_entry.status == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A timer is already running.",
        )

    if current_entry.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a paused timer can be resumed.",
        )

    _resume_entry(current_entry, resumed_at=_now_utc())
    db.flush()
    db.refresh(current_entry)
    return current_entry


def stop_current_timer_mvp(
    db: Session,
    user_id: int,
    *,
    work_note: Optional[str] = None,
    is_billable: Optional[bool] = None,
):
    current_entry = entry_repo.get_current_timer_entry_for_user(db, user_id)

    if not current_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current timer exists.",
        )

    stopped_at = _now_utc()
    if current_entry.status == "running":
        _finalize_entry(current_entry, ended_at=stopped_at)
    elif current_entry.status == "paused":
        current_entry.status = "stopped"
        current_entry.updated_at = stopped_at
    else:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a running or paused timer can be stopped.",
        )

    if work_note is not None:
        current_entry.work_note = work_note.strip() or None

    if is_billable is not None:
        current_entry.is_billable = is_billable

    db.flush()
    db.refresh(current_entry)
    return current_entry


def start_timer(
    db: Session,
    user_id: int,
    *,
    task_id: int,
    work_note: Optional[str] = None,
) -> dict:
    """Legacy start route backed by MVP timer creation logic."""
    entry = start_timer_mvp(
        db,
        user_id,
        project_id=None,
        task_id=str(task_id),
        work_note=work_note,
        is_billable=False,
    )
    return _serialize(entry)


def stop_timer(db: Session, user_id: int, time_entry_id: int) -> dict:
    """
    Stop a running timer identified by time_entry_id.
    This legacy path only stops timers that are currently running.
    """
    entry = entry_repo.get_entry_by_id(db, time_entry_id, user_id)

    if not entry or entry.status != "running":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Running timer not found.",
        )

    _finalize_entry(entry, ended_at=_now_utc())
    db.flush()
    db.refresh(entry)
    return _serialize(entry)


def get_running_timer(db: Session, user_id: int) -> Optional[dict]:
    """Return the currently running timer for user_id, or None."""
    entry = entry_repo.get_running_entry_for_user(db, user_id)
    return _serialize(entry) if entry else None

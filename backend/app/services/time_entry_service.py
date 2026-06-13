"""
Business logic for time entry management.
"""

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import TimeEntryDetailDto, TimeEntryListResponseDto, TimeEntrySummaryDto
from app.repositories import assignment_repository as assignment_repo
from app.repositories import project_repository as project_repo
from app.repositories import task_repository as task_repo
from app.repositories import time_entry_repository as entry_repo
from app.repositories import user_repository as user_repo
from app.utils import new_universal_id

MAX_SECONDS_PER_DAY = 24 * 60 * 60


def _normalize_datetime(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _compute_duration_seconds(start_at: datetime, end_at: datetime) -> int:
    normalized_start = _normalize_datetime(start_at)
    normalized_end = _normalize_datetime(end_at)
    return int((normalized_end - normalized_start).total_seconds())


def _format_duration(duration_seconds: Optional[int]) -> Optional[str]:
    if duration_seconds is None:
        return None

    total_seconds = max(duration_seconds, 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _start_of_day(value: datetime) -> datetime:
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _iter_daily_seconds(start_at: datetime, end_at: datetime):
    cursor = start_at

    while cursor < end_at:
        next_day = _start_of_day(cursor) + timedelta(days=1)
        segment_end = min(next_day, end_at)
        yield cursor.date().isoformat(), int((segment_end - cursor).total_seconds())
        cursor = segment_end


def _ensure_daily_limit_not_exceeded(
    db: Session,
    user_id: int,
    *,
    start_at: datetime,
    end_at: datetime,
    exclude_time_entry_id: Optional[int] = None,
):
    daily_totals: dict[str, int] = {}
    day_range_start = _start_of_day(start_at)
    day_range_end = _start_of_day(end_at) + timedelta(days=1)

    for day_key, seconds in _iter_daily_seconds(start_at, end_at):
        daily_totals[day_key] = daily_totals.get(day_key, 0) + seconds

    overlapping_entries = entry_repo.get_overlapping_completed_entries_for_user(
        db,
        user_id,
        start_at=day_range_start,
        end_at=day_range_end,
        exclude_time_entry_id=exclude_time_entry_id,
    )

    for entry in overlapping_entries:
        for day_key, seconds in _iter_daily_seconds(
            _normalize_datetime(entry.start_at),
            _normalize_datetime(entry.end_at),
        ):
            if day_key not in daily_totals:
                continue
            daily_totals[day_key] += seconds

    for day_key, seconds in daily_totals.items():
        if seconds <= MAX_SECONDS_PER_DAY:
            continue

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Manual time for {day_key} cannot exceed 24 hours.",
        )


def _resolve_project_by_identifier(db: Session, project_identifier: Optional[str]):
    if not project_identifier:
        return None

    project = project_repo.get_project_by_universal_id(db, project_identifier)
    if project:
        return project

    if project_identifier.isdigit():
        return project_repo.get_project_by_id(db, int(project_identifier))

    return None


def _resolve_task_by_identifier(db: Session, task_identifier: Optional[str]):
    if not task_identifier:
        return None

    task = task_repo.get_task_by_universal_id(db, task_identifier)
    if task:
        return task

    if task_identifier.isdigit():
        task_row = task_repo.get_task_by_id(db, int(task_identifier))
        return task_row[0] if task_row else None

    return None


def _resolve_time_entry_by_identifier(db: Session, entry_identifier: str, user_id: int):
    entry = entry_repo.get_entry_by_universal_id(db, entry_identifier, user_id)
    if entry:
        return entry

    if entry_identifier.isdigit():
        return entry_repo.get_entry_by_id(db, int(entry_identifier), user_id)

    return None


def _resolve_project_and_task(
    db: Session,
    user_id: int,
    *,
    project_identifier: Optional[str],
    task_identifier: str,
):
    task = _resolve_task_by_identifier(db, task_identifier)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task does not exist.",
        )

    project = _resolve_project_by_identifier(db, project_identifier)
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
            detail="Archived projects cannot be used for time entry actions.",
        )

    if task.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived tasks cannot be used for time entry actions.",
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


def _serialize_time_entry_detail(db: Session, entry) -> TimeEntryDetailDto:
    project = project_repo.get_project_by_id(db, entry.project_id)
    task_row = task_repo.get_task_by_id(db, entry.task_id)
    task = task_row[0] if task_row else None
    user_record = user_repo.get_user_by_id(db, entry.user_id)

    is_editable = entry.status == "stopped"

    return TimeEntryDetailDto(
        id=entry.universal_id,
        status=entry.status,
        source=entry.source,
        isBillable=entry.is_billable,
        startedAt=entry.started_at,
        endedAt=entry.ended_at,
        durationSeconds=entry.duration_seconds,
        durationDisplay=_format_duration(entry.duration_seconds),
        workNote=entry.work_note,
        project={
            "id": project.universal_id,
            "name": project.name,
            "status": project.status,
            "isTimerReady": project.status == "active" and task is not None and task.status == "active",
            "timerReadinessReason": None,
        } if project else None,
        task={
            "id": task.universal_id,
            "projectId": project.universal_id if project else str(task.project_id),
            "name": task.name,
            "status": task.status,
        } if task else None,
        user={
            "id": user_record.universal_id,
            "name": user_record.display_name,
            "email": user_record.email,
        } if user_record else None,
        createdAt=entry.created_at,
        updatedAt=entry.updated_at,
        canEdit=is_editable,
        canDelete=is_editable,
    )


def _serialize_time_entry_summary(db: Session, entry) -> TimeEntrySummaryDto:
    detail = _serialize_time_entry_detail(db, entry)
    return TimeEntrySummaryDto(**detail.model_dump(exclude={"canEdit", "canDelete"}))


def list_time_entries_mvp(
    db: Session,
    user_id: int,
    *,
    project_id: Optional[str] = None,
    task_id: Optional[str] = None,
    status_value: Optional[str] = None,
    source: Optional[str] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    limit: int = 20,
    page: int = 1,
) -> TimeEntryListResponseDto:
    resolved_project = _resolve_project_by_identifier(db, project_id) if project_id else None
    resolved_task = _resolve_task_by_identifier(db, task_id) if task_id else None

    if project_id and not resolved_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project does not exist.",
        )

    if task_id and not resolved_task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task does not exist.",
        )

    normalized_start = _normalize_datetime(start_at) if start_at else None
    normalized_end = _normalize_datetime(end_at) if end_at else None
    page_size = max(1, min(limit, 100))
    current_page = max(page, 1)
    offset = (current_page - 1) * page_size

    entries, total_items = entry_repo.get_filtered_entries_for_user(
        db,
        user_id,
        project_id=resolved_project.project_id if resolved_project else None,
        task_id=resolved_task.task_id if resolved_task else None,
        status=status_value,
        source=source,
        start_at=normalized_start,
        end_at=normalized_end,
        limit=page_size,
        offset=offset,
    )

    total_pages = max(ceil(total_items / page_size), 1)
    return TimeEntryListResponseDto(
        items=[_serialize_time_entry_summary(db, entry) for entry in entries],
        page=current_page,
        pageSize=page_size,
        totalItems=total_items,
        totalPages=total_pages,
    )


def create_manual_entry_mvp(
    db: Session,
    user_id: int,
    *,
    project_id: str,
    task_id: str,
    start_at: datetime,
    end_at: datetime,
    work_note: Optional[str] = None,
    is_billable: bool = False,
):
    _, task = _resolve_project_and_task(
        db,
        user_id,
        project_identifier=project_id,
        task_identifier=task_id,
    )

    normalized_start = _normalize_datetime(start_at)
    normalized_end = _normalize_datetime(end_at)
    duration_seconds = _compute_duration_seconds(normalized_start, normalized_end)

    if duration_seconds <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="endAt must be after startAt.",
        )

    _ensure_daily_limit_not_exceeded(
        db,
        user_id,
        start_at=normalized_start,
        end_at=normalized_end,
    )

    try:
        entry = entry_repo.create_entry(
            db,
            universal_id=new_universal_id(),
            task_id=task.task_id,
            user_id=user_id,
            source="manual",
            start_at=normalized_start,
            status="stopped",
            work_note=work_note.strip() if work_note and work_note.strip() else None,
            end_at=normalized_end,
            is_billable=is_billable,
            duration_seconds=duration_seconds,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return entry


def update_time_entry_mvp(
    db: Session,
    entry_identifier: str,
    user_id: int,
    *,
    project_id: Optional[str] = None,
    task_id: Optional[str] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    work_note: Optional[str] = None,
    is_billable: Optional[bool] = None,
):
    entry = _resolve_time_entry_by_identifier(db, entry_identifier, user_id)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found.",
        )

    if entry.status != "stopped":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only stopped time entries can be updated.",
        )

    if all(
        value is None
        for value in (project_id, task_id, start_at, end_at, work_note, is_billable)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update.",
        )

    next_project_id = project_id
    next_task_id = task_id
    if project_id is not None or task_id is not None:
        current_project = project_repo.get_project_by_id(db, entry.project_id)
        current_task = task_repo.get_task_by_id(db, entry.task_id)
        current_task_record = current_task[0] if current_task else None
        resolved_project_identifier = next_project_id or (current_project.universal_id if current_project else None)
        resolved_task_identifier = next_task_id or (current_task_record.universal_id if current_task_record else None)
        project, task = _resolve_project_and_task(
            db,
            user_id,
            project_identifier=resolved_project_identifier,
            task_identifier=resolved_task_identifier,
        )
        entry.project_id = project.project_id
        entry.task_id = task.task_id

    next_start_at = _normalize_datetime(start_at) if start_at is not None else entry.start_at
    next_end_at = _normalize_datetime(end_at) if end_at is not None else entry.end_at

    if next_end_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stopped time entries require an endAt value.",
        )

    duration_seconds = _compute_duration_seconds(next_start_at, next_end_at)
    if duration_seconds <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="endAt must be after startAt.",
        )

    _ensure_daily_limit_not_exceeded(
        db,
        user_id,
        start_at=next_start_at,
        end_at=next_end_at,
        exclude_time_entry_id=entry.time_entry_id,
    )

    entry.start_at = next_start_at
    entry.started_at = next_start_at
    entry.end_at = next_end_at
    entry.ended_at = next_end_at

    entry.duration_seconds = duration_seconds
    entry.updated_at = datetime.now(timezone.utc)
    entry.updated_by = user_id

    if work_note is not None:
        entry.work_note = work_note.strip() or None

    if is_billable is not None:
        entry.is_billable = is_billable

    db.flush()
    db.refresh(entry)
    return entry


def delete_time_entry_mvp(db: Session, entry_identifier: str, user_id: int) -> None:
    entry = _resolve_time_entry_by_identifier(db, entry_identifier, user_id)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found.",
        )

    if entry.status in {"running", "paused"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Running or paused timer entries cannot be deleted.",
        )

    deleted = entry_repo.delete_entry(db, entry.time_entry_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found.",
        )


def list_entries_for_task(db: Session, task_id: int, user_id: int) -> list[dict]:
    entries = entry_repo.get_entries_for_task(db, task_id, user_id)
    return [
        {
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
        for entry in entries
    ]


def edit_entry(
    db: Session,
    time_entry_id: int,
    user_id: int,
    *,
    start_at=None,
    end_at=None,
    work_note: Optional[str] = None,
) -> dict:
    entry = update_time_entry_mvp(
        db,
        str(time_entry_id),
        user_id,
        start_at=start_at,
        end_at=end_at,
        work_note=work_note,
    )
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


def delete_entry(db: Session, time_entry_id: int, user_id: int) -> None:
    delete_time_entry_mvp(db, str(time_entry_id), user_id)

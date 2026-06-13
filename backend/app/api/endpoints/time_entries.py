"""
Time entry endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import (
    CreateManualTimeEntryRequest,
    TimeEntryDetailDto,
    TimeEntryListResponseDto,
    TimeEntryPatchRequest,
    TimeEntryResponse,
    TimerStartRequest,
)
from app.repositories import time_entry_repository as entry_repo
from app.services import time_entry_service, timer_service

router = APIRouter()


def _serialize_legacy_entry(entry) -> dict:
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


@router.get("", response_model=TimeEntryListResponseDto)
def list_time_entries(
    db: DBSession,
    user: CurrentUser,
    project_id: Optional[str] = Query(default=None, alias="projectId"),
    task_id: Optional[str] = Query(default=None, alias="taskId"),
    status_value: Optional[str] = Query(default=None, alias="status"),
    source: Optional[str] = Query(default=None, alias="source"),
    start_at: Optional[datetime] = Query(default=None, alias="startAt"),
    end_at: Optional[datetime] = Query(default=None, alias="endAt"),
    limit: int = Query(default=20, ge=1, le=100),
    page: int = Query(default=1, ge=1),
):
    return time_entry_service.list_time_entries_mvp(
        db,
        user["user_id"],
        project_id=project_id,
        task_id=task_id,
        status_value=status_value,
        source=source,
        start_at=start_at,
        end_at=end_at,
        limit=limit,
        page=page,
    )


@router.post("/manual", response_model=TimeEntryDetailDto, status_code=201)
def create_manual_entry(
    body: CreateManualTimeEntryRequest,
    db: DBSession,
    user: CurrentUser,
):
    entry = time_entry_service.create_manual_entry_mvp(
        db,
        user["user_id"],
        project_id=body.project_id,
        task_id=body.task_id,
        start_at=body.start_at,
        end_at=body.end_at,
        work_note=body.work_note,
        is_billable=body.is_billable,
    )
    return time_entry_service._serialize_time_entry_detail(db, entry)


@router.patch("/{time_entry_id}", response_model=TimeEntryDetailDto)
def update_time_entry(
    time_entry_id: str,
    body: TimeEntryPatchRequest,
    db: DBSession,
    user: CurrentUser,
):
    entry = time_entry_service.update_time_entry_mvp(
        db,
        time_entry_id,
        user["user_id"],
        project_id=body.project_id,
        task_id=body.task_id,
        start_at=body.start_at,
        end_at=body.end_at,
        work_note=body.work_note,
        is_billable=body.is_billable,
    )
    return time_entry_service._serialize_time_entry_detail(db, entry)


@router.delete("/{time_entry_id}", status_code=204)
def delete_time_entry(time_entry_id: str, db: DBSession, user: CurrentUser):
    time_entry_service.delete_time_entry_mvp(db, time_entry_id, user["user_id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{time_entry_id}", response_model=TimeEntryDetailDto)
def get_time_entry(time_entry_id: str, db: DBSession, user: CurrentUser):
    entry = time_entry_service._resolve_time_entry_by_identifier(
        db, time_entry_id, user["user_id"]
    )
    if not entry:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found.")
    return time_entry_service._serialize_time_entry_detail(db, entry)


@router.post("/timer/start", response_model=TimeEntryResponse, status_code=201)
def start_timer(body: TimerStartRequest, db: DBSession, user: CurrentUser):
    return timer_service.start_timer(
        db,
        user["user_id"],
        task_id=int(body.task_id) if body.task_id.isdigit() else body.task_id,
        work_note=body.work_note,
    )


@router.post("/timer/stop", response_model=TimeEntryResponse)
def stop_timer(db: DBSession, user: CurrentUser):
    running = entry_repo.get_running_entry_for_user(db, user["user_id"])
    if not running:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No running timer found.",
        )
    return timer_service.stop_timer(db, user["user_id"], running.time_entry_id)

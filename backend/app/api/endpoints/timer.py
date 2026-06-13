"""
Timer endpoints.

GET    /timer/current                    - get the current running/paused timer
GET    /timer/context                    - get timer-ready projects/tasks + current timer
POST   /timer/start                      - start a new Running Timer
POST   /timer/stop/{time_entry_id}       - stop a Running Timer
GET    /timer/running                    - get the currently Running Timer (legacy shape)
PATCH  /timer/entries/{time_entry_id}    - manually edit a completed time entry
DELETE /timer/entries/{time_entry_id}    - delete a specific time entry
"""

from typing import Optional

from fastapi import APIRouter, Body

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import (
    MessageResponse,
    TimerCapabilitiesDto,
    TimerContextResponse,
    TimerCurrentResponse,
    TimerProjectReference,
    TimerReadyProjectDto,
    TimerStopRequest,
    TimerTaskReference,
    TimerTimeEntryDto,
    TimerUserReference,
    TimeEntryResponse,
    TimeEntryUpdateRequest,
    TimerStartRequest,
)
from app.repositories import assignment_repository as assignment_repo
from app.repositories import project_repository as project_repo
from app.repositories import task_repository as task_repo
from app.repositories import time_entry_repository as entry_repo
from app.repositories import user_repository as user_repo
from app.services import time_entry_service, timer_service

router = APIRouter()


def _to_timer_user_reference(user_record) -> TimerUserReference:
    return TimerUserReference(
        id=user_record.universal_id,
        name=user_record.display_name,
        email=user_record.email,
    )


def _to_timer_project_reference(project, *, is_timer_ready: bool) -> TimerProjectReference:
    return TimerProjectReference(
        id=project.universal_id,
        name=project.name,
        status=project.status,
        isTimerReady=is_timer_ready,
        timerReadinessReason=None if is_timer_ready else "Add at least one active task to enable timers.",
    )


def _to_timer_task_reference(task, project=None) -> TimerTaskReference:
    project_identifier = (
        project.universal_id
        if project is not None
        else str(task.project_id)
    )
    return TimerTaskReference(
        id=task.universal_id,
        projectId=project_identifier,
        name=task.name,
        status=task.status,
    )


def _to_timer_time_entry_dto(db: DBSession, entry) -> TimerTimeEntryDto:
    user_record = user_repo.get_user_by_id(db, entry.user_id)
    task_row = task_repo.get_task_by_id(db, entry.task_id)
    task = task_row[0] if task_row else None
    project = project_repo.get_project_by_id(db, entry.project_id)

    return TimerTimeEntryDto(
        id=entry.universal_id,
        status=entry.status,
        source=entry.source,
        isBillable=entry.is_billable,
        startedAt=entry.started_at,
        endedAt=entry.ended_at,
        durationSeconds=entry.duration_seconds,
        workNote=entry.work_note,
        project=_to_timer_project_reference(project, is_timer_ready=True) if project else None,
        task=_to_timer_task_reference(task, project=project) if task else None,
        user=_to_timer_user_reference(user_record) if user_record else None,
        createdAt=entry.created_at,
        updatedAt=entry.updated_at,
    )


def _get_timer_ready_projects_and_tasks(db: DBSession, user_id: int):
    timer_ready_projects: list[TimerReadyProjectDto] = []
    eligible_tasks: list[TimerTaskReference] = []

    assigned_projects = project_repo.get_projects_for_user(db, user_id)

    for project in assigned_projects:
        if project.status != "active":
            continue

        if not assignment_repo.get_active_assignment(db, user_id, project.project_id):
            continue

        task_rows = task_repo.get_tasks_for_project(db, project.project_id)
        active_tasks = [task for task, _ in task_rows if task.status == "active"]

        if not active_tasks:
            continue

        task_references = [
            _to_timer_task_reference(task, project=project) for task in active_tasks
        ]
        eligible_tasks.extend(task_references)
        timer_ready_projects.append(
            TimerReadyProjectDto(
                project=_to_timer_project_reference(project, is_timer_ready=True),
                tasks=task_references,
            )
        )

    return timer_ready_projects, eligible_tasks


@router.get("/current", response_model=TimerCurrentResponse)
def get_current_timer(db: DBSession, user: CurrentUser):
    """Return the current running or paused timer for the authenticated user."""
    entry = entry_repo.get_current_timer_entry_for_user(db, user["user_id"])
    return TimerCurrentResponse(
        currentTimer=_to_timer_time_entry_dto(db, entry) if entry else None
    )


@router.get("/context", response_model=TimerContextResponse)
def get_timer_context(db: DBSession, user: CurrentUser):
    """Return current timer state plus timer-ready projects/tasks for the caller."""
    entry = entry_repo.get_current_timer_entry_for_user(db, user["user_id"])
    timer_ready_projects, eligible_tasks = _get_timer_ready_projects_and_tasks(
        db, user["user_id"]
    )

    current_status = entry.status if entry else None
    capabilities = TimerCapabilitiesDto(
        canStartTimer=len(eligible_tasks) > 0 and current_status != "running",
        canPauseTimer=current_status == "running",
        canResumeTimer=current_status == "paused",
        canStopTimer=current_status in {"running", "paused"},
        canCreateManualEntry=len(eligible_tasks) > 0,
    )

    return TimerContextResponse(
        currentTimer=_to_timer_time_entry_dto(db, entry) if entry else None,
        timerReadyProjects=timer_ready_projects,
        eligibleTasks=eligible_tasks,
        capabilities=capabilities,
    )


@router.post("/start", response_model=TimerTimeEntryDto, status_code=201)
def start_timer(body: TimerStartRequest, db: DBSession, user: CurrentUser):
    """
    Start a new Running Timer on a task.
    If a timer is already running or paused for this user, it is stopped first.
    """
    entry = timer_service.start_timer_mvp(
        db,
        user["user_id"],
        project_id=body.project_id,
        task_id=body.task_id,
        work_note=body.work_note,
        is_billable=body.is_billable,
    )
    return _to_timer_time_entry_dto(db, entry)


@router.post("/pause", response_model=TimerTimeEntryDto)
def pause_timer(db: DBSession, user: CurrentUser):
    """Pause the caller's current running timer."""
    entry = timer_service.pause_current_timer_mvp(db, user["user_id"])
    return _to_timer_time_entry_dto(db, entry)


@router.post("/resume", response_model=TimerTimeEntryDto)
def resume_timer(db: DBSession, user: CurrentUser):
    """Resume the caller's current paused timer."""
    entry = timer_service.resume_current_timer_mvp(db, user["user_id"])
    return _to_timer_time_entry_dto(db, entry)


@router.post("/stop", response_model=TimerTimeEntryDto)
def stop_current_timer(
    db: DBSession,
    user: CurrentUser,
    body: Optional[TimerStopRequest] = Body(default=None),
):
    """Stop the caller's current running or paused timer."""
    entry = timer_service.stop_current_timer_mvp(
        db,
        user["user_id"],
        work_note=body.work_note if body else None,
        is_billable=body.is_billable if body else None,
    )
    return _to_timer_time_entry_dto(db, entry)


@router.post("/stop/{time_entry_id}", response_model=TimeEntryResponse)
def stop_timer(time_entry_id: int, db: DBSession, user: CurrentUser):
    """
    Stop a Running Timer.
    duration_seconds is computed server-side from (end_at - start_at).
    """
    return timer_service.stop_timer(db, user["user_id"], time_entry_id)


@router.get("/running", response_model=Optional[TimeEntryResponse])
def get_running_timer(db: DBSession, user: CurrentUser):
    """
    Return the currently Running Timer, or null if none is active.
    Called on page load to restore the live timer display without drift.
    """
    return timer_service.get_running_timer(db, user["user_id"])


@router.patch("/entries/{time_entry_id}", response_model=TimeEntryResponse)
def edit_entry(
    time_entry_id: int,
    body: TimeEntryUpdateRequest,
    db: DBSession,
    user: CurrentUser,
):
    """
    Manually correct the start_at, end_at, and/or work_note of a
    completed time entry. duration_seconds is recomputed server-side.
    Running Timers cannot be edited - stop them first.
    """
    return time_entry_service.edit_entry(
        db,
        time_entry_id,
        user["user_id"],
        start_at=body.start_at,
        end_at=body.end_at,
        work_note=body.work_note,
    )


@router.delete("/entries/{time_entry_id}", response_model=MessageResponse)
def delete_entry(time_entry_id: int, db: DBSession, user: CurrentUser):
    """Delete a specific time entry. The parent task is preserved."""
    time_entry_service.delete_entry(db, time_entry_id, user["user_id"])
    return {"message": "Time entry deleted."}

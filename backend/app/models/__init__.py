"""
Request body validation  - data from client
Response serialisation   - data to client

All field names match ADR-003 column names exactly.
ADR-006: Local auth models removed. Microsoft SSO only.
"""

from app.models.role_model import Role
from app.models.user_model import User
from app.models.project_model import Project
from app.models.task_model import Task
from app.models.assignment_model import Assignment
from app.models.project_manager_model import ProjectManager
from app.models.time_entry_model import TimeEntry
from app.models.log_models import AuditLog, AuthLog

from datetime import datetime
from typing import Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth — ADR-006
# ---------------------------------------------------------------------------

class MicrosoftLoginRequest(BaseModel):
    microsoft_token: str


class UserProfile(BaseModel):
    user_id: int
    universal_id: str
    display_name: str
    email: str
    role_id: int          # FK integer per ADR-003


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class DevAuthUserProfile(BaseModel):
    user_id: int
    email: str
    display_name: str
    role: str


class DevTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: DevAuthUserProfile


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserCreateRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role_id: int = 1


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    manager_id: Optional[int] = None


class ChangeRoleRequest(BaseModel):
    role_id: int


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

class TaskCreateRequest(BaseModel):
    project_id: int
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class TaskUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class TaskResponse(BaseModel):
    task_id: int
    universal_id: str
    project_id: int
    name: str
    description: Optional[str]
    status: str
    total_duration: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Time Entries / Timer — ADR-007
# ---------------------------------------------------------------------------

class TimerStartRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(validation_alias=AliasChoices("task_id", "taskId"))
    project_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("project_id", "projectId"),
    )
    work_note: Optional[str] = Field(
        None,
        max_length=500,
        validation_alias=AliasChoices("work_note", "workNote"),
    )
    is_billable: bool = Field(
        default=False,
        validation_alias=AliasChoices("is_billable", "isBillable"),
    )


class TimeEntryUpdateRequest(BaseModel):
    start_at: Optional[datetime] = Field(None, description="ISO-8601 format")
    end_at: Optional[datetime] = Field(None, description="ISO-8601 format")
    work_note: Optional[str] = Field(None, max_length=500)


class TimeEntryResponse(BaseModel):
    time_entry_id: int
    universal_id: str
    task_id: int
    user_id: int
    work_note: Optional[str]
    source: str                      # 'timer' or 'manual'
    start_at: datetime
    end_at: Optional[datetime]       # NULL = Running Timer
    duration_seconds: Optional[int]  # NULL while running; always server-computed
    created_at: datetime


class TimerUserReference(BaseModel):
    id: str
    name: str
    email: Optional[str] = None


class TimerProjectReference(BaseModel):
    id: str
    name: str
    status: Literal["active", "archived"]
    isTimerReady: bool
    timerReadinessReason: Optional[str] = None


class TimerTaskReference(BaseModel):
    id: str
    projectId: str
    name: str
    status: Literal["active", "archived"]


class TimerTimeEntryDto(BaseModel):
    id: str
    status: Literal["running", "paused", "stopped"]
    source: Literal["timer", "manual"]
    isBillable: bool
    startedAt: datetime
    endedAt: Optional[datetime] = None
    durationSeconds: Optional[int] = None
    workNote: Optional[str] = None
    project: Optional[TimerProjectReference] = None
    task: Optional[TimerTaskReference] = None
    user: Optional[TimerUserReference] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class TimerCurrentResponse(BaseModel):
    currentTimer: Optional[TimerTimeEntryDto] = None


class TimerCapabilitiesDto(BaseModel):
    canStartTimer: bool
    canPauseTimer: bool
    canResumeTimer: bool
    canStopTimer: bool
    canCreateManualEntry: bool


class TimerReadyProjectDto(BaseModel):
    project: TimerProjectReference
    tasks: list[TimerTaskReference]


class TimerContextResponse(BaseModel):
    currentTimer: Optional[TimerTimeEntryDto] = None
    timerReadyProjects: list[TimerReadyProjectDto]
    eligibleTasks: list[TimerTaskReference]
    capabilities: TimerCapabilitiesDto


class TimerPauseResponse(BaseModel):
    pausedEntry: TimerTimeEntryDto


class TimerResumeResponse(BaseModel):
    runningEntry: TimerTimeEntryDto


class TimerStopRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    time_entry_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("time_entry_id", "timeEntryId"),
    )
    work_note: Optional[str] = Field(
        default=None,
        max_length=500,
        validation_alias=AliasChoices("work_note", "workNote"),
    )
    is_billable: Optional[bool] = Field(
        default=None,
        validation_alias=AliasChoices("is_billable", "isBillable"),
    )


class TimerStopResponse(BaseModel):
    stoppedEntry: TimerTimeEntryDto


class CreateManualTimeEntryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(validation_alias=AliasChoices("project_id", "projectId"))
    task_id: str = Field(validation_alias=AliasChoices("task_id", "taskId"))
    start_at: datetime = Field(validation_alias=AliasChoices("start_at", "startAt"))
    end_at: datetime = Field(validation_alias=AliasChoices("end_at", "endAt"))
    work_note: Optional[str] = Field(
        default=None,
        max_length=500,
        validation_alias=AliasChoices("work_note", "workNote"),
    )
    is_billable: bool = Field(
        default=False,
        validation_alias=AliasChoices("is_billable", "isBillable"),
    )


class TimeEntryPatchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("project_id", "projectId"),
    )
    task_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("task_id", "taskId"),
    )
    work_note: Optional[str] = Field(
        default=None,
        max_length=500,
        validation_alias=AliasChoices("work_note", "workNote"),
    )
    is_billable: Optional[bool] = Field(
        default=None,
        validation_alias=AliasChoices("is_billable", "isBillable"),
    )
    start_at: Optional[datetime] = Field(
        default=None,
        validation_alias=AliasChoices("start_at", "startAt"),
    )
    end_at: Optional[datetime] = Field(
        default=None,
        validation_alias=AliasChoices("end_at", "endAt"),
    )


class TimeEntryDetailDto(TimerTimeEntryDto):
    durationDisplay: Optional[str] = None
    canEdit: bool
    canDelete: bool


class TimeEntrySummaryDto(TimerTimeEntryDto):
    durationDisplay: Optional[str] = None


class TimeEntryListResponseDto(BaseModel):
    items: list[TimeEntrySummaryDto]
    page: int
    pageSize: int
    totalItems: int
    totalPages: int


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

DateFilter = Literal["today", "week", "month"]


class TaskSummary(BaseModel):
    task_id: int
    task_name: str
    total_duration: int


class DashboardSummaryResponse(BaseModel):
    filter: str
    total_duration: int
    tasks: list[TaskSummary]


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    message: str

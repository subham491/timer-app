"""
Project endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import MessageResponse
from app.services import assignment_service, project_service

router = APIRouter()


class InlineProjectTaskCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: str = Field(default="active")


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: str = Field(default="active")
    assignmentUserIds: list[str] = Field(default_factory=list)
    projectManagerUserIds: list[str] = Field(default_factory=list)
    taskCreates: list[InlineProjectTaskCreateRequest] = Field(default_factory=list)


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = None
    assignmentUserIds: Optional[list[str]] = None
    projectManagerUserIds: Optional[list[str]] = None
    taskCreates: Optional[list[InlineProjectTaskCreateRequest]] = None


class AddManagerRequest(BaseModel):
    user_id: int


class ProjectUserReferenceResponse(BaseModel):
    id: str
    name: str
    email: str


class ProjectTaskResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    assignments: list[ProjectUserReferenceResponse]
    projectManagers: list[ProjectUserReferenceResponse]
    tasks: list[ProjectTaskResponse]
    activeTimerCount: int
    isTimerReady: bool
    timerReadinessReason: Optional[str]
    createdAt: datetime
    updatedAt: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    page: int
    pageSize: int
    totalItems: int
    totalPages: int


class ProjectLookupsResponse(BaseModel):
    assignableUsers: list[ProjectUserReferenceResponse]
    managerCandidates: list[ProjectUserReferenceResponse]
    projectManagers: list[ProjectUserReferenceResponse]
    statuses: list[str]


class ProjectTaskListResponse(BaseModel):
    items: list[ProjectTaskResponse]


@router.get("", response_model=ProjectListResponse)
def list_projects(
    db: DBSession,
    user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
):
    return project_service.list_projects(
        db,
        user["user_id"],
        user["role_id"],
        page=page,
        page_size=page_size,
    )


@router.get("/lookups", response_model=ProjectLookupsResponse)
def get_project_lookups(db: DBSession, user: CurrentUser):
    _ = user
    return project_service.get_project_lookups(db)


@router.get("/{project_id}/tasks", response_model=ProjectTaskListResponse)
def list_project_tasks(project_id: str, db: DBSession, user: CurrentUser):
    return project_service.list_project_tasks(
        db,
        project_id,
        user["user_id"],
        user["role_id"],
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: DBSession, user: CurrentUser):
    return project_service.get_project(db, project_id, user["user_id"], user["role_id"])


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreateRequest, db: DBSession, user: CurrentUser):
    return project_service.create_project(
        db,
        created_by=user["user_id"],
        role_id=user["role_id"],
        name=body.name,
        description=body.description,
        status_value=body.status,
        assignment_user_ids=body.assignmentUserIds,
        project_manager_user_ids=body.projectManagerUserIds,
        task_creates=[task.model_dump() for task in body.taskCreates],
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, body: ProjectUpdateRequest, db: DBSession, user: CurrentUser):
    return project_service.update_project(
        db,
        project_id,
        user["user_id"],
        user["role_id"],
        name=body.name,
        description=body.description,
        status_value=body.status,
        assignment_user_ids=body.assignmentUserIds,
        project_manager_user_ids=body.projectManagerUserIds,
        task_creates=[task.model_dump() for task in body.taskCreates] if body.taskCreates is not None else None,
    )


@router.post("/{project_id}/archive", response_model=ProjectResponse)
def archive_project(project_id: str, db: DBSession, user: CurrentUser):
    return project_service.archive_project(
        db,
        project_id,
        updated_by=user["user_id"],
        role_id=user["role_id"],
    )


@router.post("/{project_id}/restore", response_model=ProjectResponse)
def restore_project(project_id: str, db: DBSession, user: CurrentUser):
    return project_service.restore_project(
        db,
        project_id,
        updated_by=user["user_id"],
        role_id=user["role_id"],
    )


@router.get("/{project_id}/managers")
def list_managers(project_id: int, db: DBSession, user: CurrentUser):
    return assignment_service.list_project_managers(db, project_id)


@router.post("/{project_id}/managers", status_code=201)
def add_manager(project_id: int, body: AddManagerRequest, db: DBSession, user: CurrentUser):
    return assignment_service.add_project_manager(
        db,
        project_id=project_id,
        user_id=body.user_id,
        assigned_by=user["user_id"],
    )


@router.delete("/{project_id}/managers/{user_id}", response_model=MessageResponse)
def remove_manager(project_id: int, user_id: int, db: DBSession, user: CurrentUser):
    assignment_service.remove_project_manager(
        db,
        project_id=project_id,
        user_id=user_id,
        removed_by=user["user_id"],
    )
    return {"message": "Project manager removed successfully."}

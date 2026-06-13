"""
Tasks endpoints — ADR-007 compliant.

GET    /tasks                – list tasks for a project
POST   /tasks                – create a new task
GET    /tasks/{task_id}      – get a single task
PATCH  /tasks/{task_id}      – update task
POST   /tasks/{task_id}/archive – archive a task

Removed per ADR-007:
  GET /tasks/{task_id}/entries  (use GET /time-entries?task_id= instead)
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import (
    MessageResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskUpdateRequest,
)
from app.services import task_service

router = APIRouter()


@router.get("", response_model=list[TaskResponse])
def list_tasks(project_id: int, db: DBSession, user: CurrentUser):
    """Return all active tasks for a project, newest first."""
    _ = user
    return task_service.list_tasks(db, project_id)


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(body: TaskCreateRequest, db: DBSession, user: CurrentUser):
    """Create a new task in a project. Status starts as 'active'."""
    return task_service.create_task(
        db,
        project_id=body.project_id,
        user_id=user["user_id"],
        name=body.name,
        description=body.description,
    )


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: DBSession, user: CurrentUser):
    """Return a single task by ID."""
    _ = user
    return task_service.get_task(db, task_id)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, body: TaskUpdateRequest, db: DBSession, user: CurrentUser):
    """Update the name and/or description of a task."""
    _ = user
    return task_service.update_task(
        db,
        task_id,
        name=body.name,
        description=body.description,
    )


@router.post("/{task_id}/archive", response_model=MessageResponse)
def archive_task(task_id: int, db: DBSession, user: CurrentUser):
    """Archive a task — sets status to archived. Time entries are preserved."""
    _ = user
    task_service.archive_task(db, task_id)
    return {"message": "Task archived successfully."}

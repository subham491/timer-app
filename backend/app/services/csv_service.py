"""
Business logic for task CRUD operations.
"""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import task_repository as task_repo
from app.utils import new_universal_id


def _serialize(task, total_duration: int) -> dict:
    """Convert a Task ORM object into a plain dict matching TaskResponse."""
    return {
        "task_id": task.task_id,
        "universal_id": task.universal_id,
        "project_id": task.project_id,
        "name": task.name,
        "description": task.description,
        "status": task.status,
        "total_duration": total_duration,
        "created_at": task.created_at,
    }


def list_tasks(db: Session, project_id: int) -> list[dict]:
    """Return all active tasks with aggregated total_duration for a project."""
    rows = task_repo.get_tasks_for_project(db, project_id)
    return [_serialize(task, total_duration) for task, total_duration in rows]


def get_task(db: Session, task_id: int) -> dict:
    """
    Return a single task.
    Raises 404 if the task does not exist.
    """
    row = task_repo.get_task_by_id(db, task_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    task, total_duration = row
    return _serialize(task, total_duration)


def create_task(
    db: Session,
    project_id: int,
    user_id: int,
    *,
    name: str,
    description: Optional[str] = None,
) -> dict:
    """Create a new task and return it."""
    task = task_repo.create_task(
        db,
        universal_id=new_universal_id(),
        user_id=user_id,
        project_id=project_id,
        name=name,
        description=description,
    )
    return get_task(db, task.task_id)


def update_task(
    db: Session,
    task_id: int,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> dict:
    """
    Update allowed fields on a task.
    Raises 404 if not found. Raises 400 if no fields provided.
    """
    if name is None and description is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update (name or description).",
        )

    updated = task_repo.update_task(db, task_id, name=name, description=description)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return get_task(db, task_id)


def archive_task(db: Session, task_id: int) -> None:
    """
    Archive a task — sets status to archived.
    Raises 404 if not found.
    """
    archived = task_repo.archive_task(db, task_id)
    if not archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

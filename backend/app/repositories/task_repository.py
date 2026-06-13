"""
All database operations related to the `tasks` table.
"""

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task_model import Task
from app.models.time_entry_model import TimeEntry


def get_tasks_for_project(db: Session, project_id: int):
    """Return all active tasks for a project with aggregated total duration."""
    return (
        db.query(
            Task,
            func.coalesce(func.sum(TimeEntry.duration_seconds), 0).label("total_duration"),
        )
        .outerjoin(
            TimeEntry,
            (TimeEntry.task_id == Task.task_id) & (TimeEntry.end_at.isnot(None)),
        )
        .filter(Task.project_id == project_id, Task.status == "active")
        .group_by(Task)
        .order_by(Task.created_at.desc())
        .all()
    )


def get_task_by_id(db: Session, task_id: int):
    """Return a single task with its aggregated total duration."""
    return (
        db.query(
            Task,
            func.coalesce(func.sum(TimeEntry.duration_seconds), 0).label("total_duration"),
        )
        .outerjoin(
            TimeEntry,
            (TimeEntry.task_id == Task.task_id) & (TimeEntry.end_at.isnot(None)),
        )
        .filter(Task.task_id == task_id)
        .group_by(Task)
        .first()
    )


def get_task_by_universal_id(db: Session, universal_id: str) -> Optional[Task]:
    return db.query(Task).filter(Task.universal_id == universal_id).first()


def create_task(
    db: Session,
    *,
    universal_id: str,
    user_id: int,
    project_id: int,
    name: str,
    description: Optional[str],
) -> Task:
    """Create a new task and return it."""
    try:
        task = Task(
            universal_id=universal_id,
            user_id=user_id,
            project_id=project_id,
            name=name,
            description=description,
            status="active",
        )
        db.add(task)
        db.flush()
        db.refresh(task)
        return task

    except Exception:
        db.rollback()
        raise


def update_task(
    db: Session,
    task_id: int,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> bool:
    """Update allowed fields on a task. Returns False if not found."""
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()

        if not task:
            return False

        if name is not None:
            task.name = name

        if description is not None:
            task.description = description

        db.flush()
        return True

    except Exception:
        db.rollback()
        raise


def archive_task(db: Session, task_id: int) -> bool:
    """Archive a task â€” sets status to archived. Returns False if not found."""
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()

        if not task:
            return False

        task.status = "archived"
        db.flush()
        return True

    except Exception:
        db.rollback()
        raise


def soft_delete_task(db: Session, task_id: int) -> bool:
    """Compatibility helper for older callers; tasks are archived instead of soft-deleted."""
    return archive_task(db, task_id)

"""
Project manager repository — ADR-003 compliant.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.project_manager_model import ProjectManager


def get_managers_for_project(db: Session, project_id: int) -> list[ProjectManager]:
    return (
        db.query(ProjectManager)
        .filter(ProjectManager.project_id == project_id, ProjectManager.removed_at == None)
        .all()
    )


def get_active_manager(db: Session, user_id: int, project_id: int) -> Optional[ProjectManager]:
    return (
        db.query(ProjectManager)
        .filter(
            ProjectManager.user_id == user_id,
            ProjectManager.project_id == project_id,
            ProjectManager.removed_at == None,
        )
        .first()
    )


def count_active_managed_projects_for_user(db: Session, user_id: int) -> int:
    return (
        db.query(ProjectManager)
        .filter(
            ProjectManager.user_id == user_id,
            ProjectManager.removed_at == None,
        )
        .count()
    )


def add_manager(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    assigned_by: int,
) -> ProjectManager:
    try:
        pm = ProjectManager(
            project_id=project_id,
            user_id=user_id,
            assigned_by=assigned_by,
        )
        db.add(pm)
        db.flush()
        db.refresh(pm)
        return pm
    except Exception:
        db.rollback()
        raise


def remove_manager(
    db: Session,
    project_id: int,
    user_id: int,
    removed_by: int,
) -> bool:
    try:
        pm = get_active_manager(db, user_id, project_id)
        if not pm:
            return False
        pm.removed_at = datetime.now(timezone.utc)
        pm.removed_by = removed_by
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise

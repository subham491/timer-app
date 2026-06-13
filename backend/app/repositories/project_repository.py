"""
Project repository — ADR-003 compliant.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.project_model import Project


def get_all_projects(db: Session) -> list[Project]:
    return db.query(Project).filter(Project.deleted_at == None).order_by(Project.created_at.desc()).all()


def get_projects_for_user(db: Session, user_id: int) -> list[Project]:
    """Return active projects the user is assigned to."""
    from app.models.assignment_model import Assignment
    return (
        db.query(Project)
        .join(Assignment, Assignment.project_id == Project.project_id)
        .filter(
            Assignment.user_id == user_id,
            Assignment.status == "active",
            Assignment.deleted_at == None,
            Project.deleted_at == None,
        )
        .order_by(Project.created_at.desc())
        .all()
    )


def get_projects_managed_by(db: Session, user_id: int) -> list[Project]:
    """Return projects where user is an active project manager."""
    from app.models.project_manager_model import ProjectManager
    return (
        db.query(Project)
        .join(ProjectManager, ProjectManager.project_id == Project.project_id)
        .filter(
            ProjectManager.user_id == user_id,
            ProjectManager.removed_at == None,
            Project.deleted_at == None,
        )
        .order_by(Project.created_at.desc())
        .all()
    )


def get_project_by_id(db: Session, project_id: int) -> Optional[Project]:
    return db.query(Project).filter(Project.project_id == project_id, Project.deleted_at == None).first()


def get_project_by_universal_id(db: Session, universal_id: str) -> Optional[Project]:
    return (
        db.query(Project)
        .filter(Project.universal_id == universal_id, Project.deleted_at == None)
        .first()
    )


def create_project(
    db: Session,
    *,
    universal_id: str,
    name: str,
    description: Optional[str],
    created_by: int,
) -> Project:
    try:
        project = Project(
            universal_id=universal_id,
            name=name,
            description=description,
            status="active",
            created_by=created_by,
        )
        db.add(project)
        db.flush()
        db.refresh(project)
        return project
    except Exception:
        db.rollback()
        raise


def update_project(
    db: Session,
    project_id: int,
    updated_by: int,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> bool:
    try:
        project = get_project_by_id(db, project_id)
        if not project:
            return False
        if name is not None:
            project.name = name
        if description is not None:
            project.description = description
        project.updated_by = updated_by
        project.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise


def set_project_status(db: Session, project_id: int, status: str, updated_by: int) -> bool:
    try:
        project = get_project_by_id(db, project_id)
        if not project:
            return False
        project.status = status
        project.updated_by = updated_by
        project.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise

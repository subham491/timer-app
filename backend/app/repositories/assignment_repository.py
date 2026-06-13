"""
Assignment repository — ADR-003 compliant.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.assignment_model import Assignment


def get_assignments_for_user(db: Session, user_id: int) -> list[Assignment]:
    return (
        db.query(Assignment)
        .filter(Assignment.user_id == user_id, Assignment.deleted_at == None)
        .order_by(Assignment.created_at.desc())
        .all()
    )


def get_assignments_for_project(db: Session, project_id: int) -> list[Assignment]:
    return (
        db.query(Assignment)
        .filter(Assignment.project_id == project_id, Assignment.deleted_at == None)
        .order_by(Assignment.created_at.desc())
        .all()
    )


def get_active_assignment(db: Session, user_id: int, project_id: int) -> Optional[Assignment]:
    return (
        db.query(Assignment)
        .filter(
            Assignment.user_id == user_id,
            Assignment.project_id == project_id,
            Assignment.status == "active",
            Assignment.deleted_at == None,
        )
        .first()
    )


def create_assignment(
    db: Session,
    *,
    user_id: int,
    project_id: int,
    assigned_by: int,
) -> Assignment:
    try:
        assignment = Assignment(
            user_id=user_id,
            project_id=project_id,
            assigned_by=assigned_by,
            status="active",
        )
        db.add(assignment)
        db.flush()
        db.refresh(assignment)
        return assignment
    except Exception:
        db.rollback()
        raise


def update_assignment_status(
    db: Session,
    assignment_id: int,
    status: str,
    updated_by: int,
) -> bool:
    try:
        assignment = db.query(Assignment).filter(Assignment.assignment_id == assignment_id).first()
        if not assignment:
            return False
        assignment.status = status
        assignment.updated_by = updated_by
        assignment.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise
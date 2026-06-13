"""
Assignment and project-manager service shim.

Provides the service module expected by the existing endpoints so the app can
start without changing route structure.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import assignment_repository as assignment_repo
from app.repositories import project_manager_repository as project_manager_repo


def _serialize_assignment(assignment) -> dict:
    return {
        "assignment_id": assignment.assignment_id,
        "user_id": assignment.user_id,
        "project_id": assignment.project_id,
        "assigned_by": assignment.assigned_by,
        "status": assignment.status,
        "created_at": assignment.created_at,
        "updated_at": assignment.updated_at,
        "updated_by": assignment.updated_by,
    }


def _serialize_project_manager(project_manager) -> dict:
    return {
        "project_manager_id": project_manager.project_manager_id,
        "project_id": project_manager.project_id,
        "user_id": project_manager.user_id,
        "assigned_by": project_manager.assigned_by,
        "assigned_at": project_manager.assigned_at,
        "removed_at": project_manager.removed_at,
        "removed_by": project_manager.removed_by,
    }


def list_assignments(
    db: Session,
    user_id: int,
    role_id: int,
    project_id: int | None = None,
) -> list[dict]:
    assignments = (
        assignment_repo.get_assignments_for_project(db, project_id)
        if project_id is not None
        else assignment_repo.get_assignments_for_user(db, user_id)
    )
    return [_serialize_assignment(assignment) for assignment in assignments]


def create_assignment(
    db: Session,
    *,
    assigned_by: int,
    user_id: int,
    project_id: int,
) -> dict:
    assignment = assignment_repo.create_assignment(
        db,
        user_id=user_id,
        project_id=project_id,
        assigned_by=assigned_by,
    )
    return _serialize_assignment(assignment)


def update_assignment(
    db: Session,
    assignment_id: int,
    status_value: str,
    *,
    updated_by: int,
) -> dict:
    if status_value not in {"active", "inactive"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="status must be 'active' or 'inactive'.",
        )

    updated = assignment_repo.update_assignment_status(
        db,
        assignment_id,
        status_value,
        updated_by,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )

    assignments = assignment_repo.get_assignments_for_user(db, user_id=updated_by)
    assignment = next(
        (item for item in assignments if item.assignment_id == assignment_id),
        None,
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )
    return _serialize_assignment(assignment)


def list_project_managers(db: Session, project_id: int) -> list[dict]:
    managers = project_manager_repo.get_managers_for_project(db, project_id)
    return [_serialize_project_manager(manager) for manager in managers]


def add_project_manager(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    assigned_by: int,
) -> dict:
    manager = project_manager_repo.add_manager(
        db,
        project_id=project_id,
        user_id=user_id,
        assigned_by=assigned_by,
    )
    return _serialize_project_manager(manager)


def remove_project_manager(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    removed_by: int,
) -> None:
    removed = project_manager_repo.remove_manager(
        db,
        project_id=project_id,
        user_id=user_id,
        removed_by=removed_by,
    )
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project manager not found.",
        )

"""
Assignment endpoints — ADR-007.

GET    /assignments                  – list assignments
POST   /assignments                  – assign a user to a project
PATCH  /assignments/{assignment_id}  – update assignment status
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.services import assignment_service
from pydantic import BaseModel

router = APIRouter()


class AssignmentCreateRequest(BaseModel):
    user_id: int
    project_id: int


class AssignmentUpdateRequest(BaseModel):
    status: str   # 'active' or 'inactive'


@router.get("")
def list_assignments(
    db: DBSession,
    user: CurrentUser,
    project_id: Optional[int] = Query(default=None),
):
    """List assignments. Optionally filter by project_id."""
    return assignment_service.list_assignments(db, user["user_id"], user["role_id"], project_id)


@router.post("", status_code=201)
def create_assignment(body: AssignmentCreateRequest, db: DBSession, user: CurrentUser):
    """Assign a user to a project."""
    return assignment_service.create_assignment(
        db, assigned_by=user["user_id"], user_id=body.user_id, project_id=body.project_id
    )


@router.patch("/{assignment_id}")
def update_assignment(assignment_id: int, body: AssignmentUpdateRequest, db: DBSession, user: CurrentUser):
    """Update assignment status to active or inactive."""
    return assignment_service.update_assignment(db, assignment_id, body.status, updated_by=user["user_id"])


"""
Role & Permission Administration endpoints — ADR-007. Read-only. Administrator only.

GET /roles
GET /permission-scopes
GET /role-permissions
"""

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.repositories import rbac_repository as rbac_repo

router = APIRouter()


@router.get("/roles")
def get_roles(db: DBSession, user: CurrentUser):
    """Retrieve all available roles."""
    roles = rbac_repo.get_all_roles(db)
    return [
        {
            "role_id":     r.role_id,
            "name":        r.name,
            "description": r.description,
            "created_at":  r.created_at,
        }
        for r in roles
    ]


@router.get("/permission-scopes")
def get_permission_scopes(db: DBSession, user: CurrentUser):
    """Retrieve all permission scopes."""
    scopes = rbac_repo.get_all_scopes(db)
    return [
        {
            "scope_id":    s.scope_id,
            "name":        s.name,
            "description": s.description,
        }
        for s in scopes
    ]


@router.get("/role-permissions")
def get_role_permissions(db: DBSession, user: CurrentUser):
    """Retrieve all role-to-scope mappings."""
    mappings = rbac_repo.get_all_role_permissions(db)
    return [
        {
            "id":       m.id,
            "role_id":  m.role_id,
            "scope_id": m.scope_id,
        }
        for m in mappings
    ]
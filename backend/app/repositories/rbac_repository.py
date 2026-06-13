"""
RBAC repository — read-only access to roles, permission_scopes, role_permissions.
"""

from sqlalchemy.orm import Session

from app.models.role_model import Role
from app.models.permission_scope_model import PermissionScope
from app.models.role_permission_model import RolePermission


def get_all_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.role_id).all()


def get_all_scopes(db: Session) -> list[PermissionScope]:
    return db.query(PermissionScope).order_by(PermissionScope.scope_id).all()


def get_all_role_permissions(db: Session) -> list[RolePermission]:
    return db.query(RolePermission).order_by(RolePermission.role_id).all()
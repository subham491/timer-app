"""
User repository helpers.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.assignment_model import Assignment
from app.models.project_manager_model import ProjectManager
from app.models.user_model import User


def _role_name_from_role_id(role_id: int) -> str:
    return {
        1: "user",
        2: "report_viewer",
        3: "manager",
        4: "administrator",
    }.get(role_id, "user")


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    normalized_email = email.strip().lower()
    return (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email, User.deleted_at == None)
        .first()
    )


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return (
        db.query(User)
        .filter(User.user_id == user_id, User.deleted_at == None)
        .first()
    )


def get_user_by_universal_id(db: Session, universal_id: str) -> Optional[User]:
    return (
        db.query(User)
        .filter(User.universal_id == universal_id, User.deleted_at == None)
        .first()
    )


def get_user_by_microsoft_oid(db: Session, microsoft_oid: str) -> Optional[User]:
    return (
        db.query(User)
        .filter(User.microsoft_oid == microsoft_oid, User.deleted_at == None)
        .first()
    )


def get_user_by_email_for_sso(db: Session, email: str) -> Optional[User]:
    normalized_email = email.strip().lower()
    return (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email, User.deleted_at == None)
        .first()
    )


def bind_microsoft_oid(db: Session, user_id: int, microsoft_oid: str) -> None:
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            user.microsoft_oid = microsoft_oid
            user.email_verified = True
            user.updated_at = datetime.now(timezone.utc)
            db.flush()
    except Exception:
        db.rollback()
        raise


def email_exists(db: Session, email: str, *, exclude_user_id: int | None = None) -> bool:
    query = db.query(User).filter(func.lower(User.email) == email.strip().lower(), User.deleted_at == None)
    if exclude_user_id is not None:
        query = query.filter(User.user_id != exclude_user_id)
    return query.first() is not None


def get_all_users(db: Session) -> list[User]:
    return (
        db.query(User)
        .filter(User.deleted_at == None)
        .order_by(User.display_name.asc(), User.created_at.desc())
        .all()
    )


def get_active_users(db: Session) -> list[User]:
    return (
        db.query(User)
        .filter(User.deleted_at == None, User.status == "active")
        .order_by(User.display_name.asc(), User.created_at.desc())
        .all()
    )


def get_users_by_manager(db: Session, manager_id: int) -> list[User]:
    return (
        db.query(User)
        .filter(User.manager_id == manager_id, User.deleted_at == None)
        .order_by(User.display_name.asc())
        .all()
    )


def get_users_for_managed_projects(db: Session, manager_user_id: int) -> list[User]:
    return (
        db.query(User)
        .join(Assignment, Assignment.user_id == User.user_id)
        .join(ProjectManager, ProjectManager.project_id == Assignment.project_id)
        .filter(
            ProjectManager.user_id == manager_user_id,
            ProjectManager.removed_at == None,
            Assignment.status == "active",
            Assignment.deleted_at == None,
            User.deleted_at == None,
        )
        .distinct()
        .order_by(User.display_name.asc())
        .all()
    )


def count_active_administrators(db: Session) -> int:
    return (
        db.query(User)
        .filter(
            User.role_id == 4,
            User.status == "active",
            User.deleted_at == None,
        )
        .count()
    )


def create_user(
    db: Session,
    *,
    universal_id: str,
    display_name: str,
    email: str,
    password_hash: str | None = None,
    auth_provider: str = "local",
    role_id: int = 1,
    manager_id: int | None = None,
    created_by: int | None = None,
) -> User:
    try:
        user = User(
            universal_id=universal_id,
            display_name=display_name,
            email=email,
            auth_provider=auth_provider,
            password_hash=password_hash,
            role=_role_name_from_role_id(role_id),
            role_id=role_id,
            manager_id=manager_id,
            email_verified=auth_provider != "local",
            is_active=True,
            status="active",
            created_by=created_by,
            updated_by=created_by,
        )
        db.add(user)
        db.flush()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


def update_user(
    db: Session,
    user_id: int,
    updated_by: int,
    *,
    display_name: str | None = None,
    email: str | None = None,
    manager_id: int | None = None,
    manager_id_provided: bool = False,
) -> bool:
    try:
        user = db.query(User).filter(User.user_id == user_id, User.deleted_at == None).first()
        if not user:
            return False

        if display_name is not None:
            user.display_name = display_name
        if email is not None:
            user.email = email
        if manager_id_provided:
            user.manager_id = manager_id

        user.updated_by = updated_by
        user.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise


def change_role(db: Session, user_id: int, role_id: int, updated_by: int) -> bool:
    try:
        user = db.query(User).filter(User.user_id == user_id, User.deleted_at == None).first()
        if not user:
            return False
        user.role = _role_name_from_role_id(role_id)
        user.role_id = role_id
        user.updated_by = updated_by
        user.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise


def archive_user(db: Session, user_id: int, updated_by: int) -> bool:
    try:
        user = db.query(User).filter(User.user_id == user_id, User.deleted_at == None).first()
        if not user:
            return False
        user.status = "archived"
        user.is_active = False
        user.updated_by = updated_by
        user.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise


def soft_delete_user(db: Session, user_id: int, updated_by: int) -> bool:
    try:
        user = db.query(User).filter(User.user_id == user_id, User.deleted_at == None).first()
        if not user:
            return False

        now = datetime.now(timezone.utc)
        user.status = "archived"
        user.is_active = False
        user.deleted_at = now
        user.updated_by = updated_by
        user.updated_at = now
        db.flush()
        return True
    except Exception:
        db.rollback()
        raise


def update_last_login(db: Session, user_id: int) -> None:
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            db.flush()
    except Exception:
        db.rollback()
        raise

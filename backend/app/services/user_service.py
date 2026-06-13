"""
User management service.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.role_model import Role
from app.models.user_model import User
from app.repositories import project_manager_repository as project_manager_repo
from app.repositories import user_repository as user_repo
from app.utils import hash_password, new_universal_id

USER_ROLE_ID = 1
REPORT_VIEWER_ROLE_ID = 2
MANAGER_ROLE_ID = 3
ADMINISTRATOR_ROLE_ID = 4

VISIBLE_TO_ALL_ROLE_IDS = {REPORT_VIEWER_ROLE_ID, ADMINISTRATOR_ROLE_ID}
MANAGER_ELIGIBLE_ROLE_IDS = {MANAGER_ROLE_ID, ADMINISTRATOR_ROLE_ID}


def _stable_id(universal_id: str | None, numeric_id: int) -> str:
    return universal_id or str(numeric_id)


def _role_label(role_name: str) -> str:
    return {
        "user": "Regular User",
        "report_viewer": "Report Viewer",
        "manager": "Manager",
        "administrator": "Administrator",
    }.get(role_name, role_name.replace("_", " ").title())


def _get_roles_map(db: Session) -> dict[int, Role]:
    roles = db.query(Role).order_by(Role.role_id.asc()).all()
    return {role.role_id: role for role in roles}


def _serialize_role(role: Role) -> dict:
    return {
        "id": role.role_id,
        "name": role.name,
        "label": _role_label(role.name),
        "rank": role.role_id,
    }


def _serialize_reference(user: User) -> dict:
    return {
        "id": _stable_id(user.universal_id, user.user_id),
        "userId": user.user_id,
        "displayName": user.display_name,
        "email": user.email,
    }


def _serialize_user(
    user: User,
    *,
    acting_user_id: int,
    roles_by_id: dict[int, Role],
    users_by_id: dict[int, User],
) -> dict:
    role = roles_by_id.get(user.role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role configuration is invalid.",
        )

    manager = users_by_id.get(user.manager_id) if user.manager_id is not None else None

    return {
        "id": _stable_id(user.universal_id, user.user_id),
        "userId": user.user_id,
        "displayName": user.display_name,
        "email": user.email,
        "status": user.status,
        "role": _serialize_role(role),
        "manager": _serialize_reference(manager) if manager else None,
        "isSelf": user.user_id == acting_user_id,
        "createdAt": user.created_at,
        "updatedAt": user.updated_at,
        "deletedAt": user.deleted_at,
    }


def _resolve_user(db: Session, user_identifier: str) -> User | None:
    user = user_repo.get_user_by_universal_id(db, user_identifier)
    if user is not None:
        return user

    if user_identifier.isdigit():
        return user_repo.get_user_by_id(db, int(user_identifier))

    return None


def _require_user(user: User | None) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return user


def _require_admin(acting_role_id: int) -> None:
    if acting_role_id != ADMINISTRATOR_ROLE_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage users.",
        )


def _validate_role(db: Session, role_id: int) -> Role:
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role.",
        )
    return role


def _validate_manager(db: Session, manager_id: int | None, *, target_user_id: int | None = None) -> User | None:
    if manager_id is None:
        return None

    manager = user_repo.get_user_by_id(db, manager_id)
    if manager is None or manager.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid manager.",
        )

    if target_user_id is not None and manager.user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot be their own manager.",
        )

    if manager.role_id not in MANAGER_ELIGIBLE_ROLE_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reporting manager must have a manager or administrator role.",
        )

    return manager


def _resolve_reporting_manager(
    db: Session,
    *,
    role_id: int,
    manager_id: int | None,
    target_user_id: int | None = None,
) -> User | None:
    if role_id == USER_ROLE_ID:
        manager = _validate_manager(db, manager_id, target_user_id=target_user_id)
        if manager is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Regular users must report to a manager.",
            )
        return manager

    return None


def _ensure_last_admin_is_preserved(db: Session, target_user: User, *, next_role_id: int | None = None) -> None:
    current_is_admin = target_user.role_id == ADMINISTRATOR_ROLE_ID and target_user.status == "active"
    next_is_admin = next_role_id == ADMINISTRATOR_ROLE_ID if next_role_id is not None else current_is_admin

    if current_is_admin and not next_is_admin and user_repo.count_active_administrators(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one active administrator must remain.",
        )


def _ensure_project_manager_role_integrity(db: Session, target_user: User, next_role_id: int) -> None:
    if next_role_id in MANAGER_ELIGIBLE_ROLE_IDS:
        return

    active_project_count = project_manager_repo.count_active_managed_projects_for_user(
        db,
        target_user.user_id,
    )
    if active_project_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Remove the user from active project-manager assignments before demoting this role.",
        )


def _serialize_users_response(db: Session, users: list[User], *, acting_user_id: int) -> dict:
    roles_by_id = _get_roles_map(db)
    visible_users = user_repo.get_all_users(db)
    users_by_id = {user.user_id: user for user in visible_users}
    return {
        "items": [
            _serialize_user(
                user,
                acting_user_id=acting_user_id,
                roles_by_id=roles_by_id,
                users_by_id=users_by_id,
            )
            for user in users
        ]
    }


def list_users(db: Session, *, acting_user_id: int, acting_role_id: int) -> dict:
    if acting_role_id in VISIBLE_TO_ALL_ROLE_IDS:
        users = user_repo.get_all_users(db)
    elif acting_role_id == MANAGER_ROLE_ID:
        team_users = user_repo.get_users_for_managed_projects(db, acting_user_id)
        current_user = user_repo.get_user_by_id(db, acting_user_id)
        deduped_users = {user.user_id: user for user in team_users}
        if current_user is not None:
            deduped_users[current_user.user_id] = current_user
        users = sorted(deduped_users.values(), key=lambda user: user.display_name.lower())
    else:
        current_user = _require_user(user_repo.get_user_by_id(db, acting_user_id))
        users = [current_user]

    return _serialize_users_response(db, users, acting_user_id=acting_user_id)


def get_user_lookups(db: Session, *, acting_user_id: int, acting_role_id: int) -> dict:
    if acting_role_id != ADMINISTRATOR_ROLE_ID:
        return {
            "roles": [],
            "managerCandidates": [],
        }

    roles = db.query(Role).order_by(Role.role_id.asc()).all()
    manager_candidates = [
        user
        for user in user_repo.get_active_users(db)
        if user.role_id in MANAGER_ELIGIBLE_ROLE_IDS
    ]
    return {
        "roles": [_serialize_role(role) for role in roles],
        "managerCandidates": [_serialize_reference(user) for user in manager_candidates],
    }


def create_user(
    db: Session,
    *,
    acting_user_id: int,
    acting_role_id: int,
    display_name: str,
    email: str,
    password: str,
    role_id: int,
    manager_id: int | None,
) -> dict:
    _require_admin(acting_role_id)

    normalized_name = display_name.strip()
    if len(normalized_name) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name is required.",
        )

    normalized_email = email.strip().lower()
    if user_repo.email_exists(db, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists.",
        )

    normalized_password = password.strip()
    if len(normalized_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    _validate_role(db, role_id)
    manager = _resolve_reporting_manager(
        db,
        role_id=role_id,
        manager_id=manager_id,
    )

    user = user_repo.create_user(
        db,
        universal_id=new_universal_id(),
        display_name=normalized_name,
        email=normalized_email,
        password_hash=hash_password(normalized_password),
        auth_provider="local",
        role_id=role_id,
        manager_id=manager.user_id if manager else None,
        created_by=acting_user_id,
    )
    return _serialize_users_response(db, [user], acting_user_id=acting_user_id)["items"][0]


def update_user(
    db: Session,
    user_identifier: str,
    *,
    acting_user_id: int,
    acting_role_id: int,
    display_name: str | None,
    email: str | None,
    email_provided: bool,
    manager_id: int | None,
    manager_id_provided: bool,
) -> dict:
    target_user = _require_user(_resolve_user(db, user_identifier))

    if acting_role_id != ADMINISTRATOR_ROLE_ID:
        if target_user.user_id != acting_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this user.",
            )

        if email_provided or manager_id_provided:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own display name.",
            )

    normalized_name = display_name.strip() if display_name is not None else None
    normalized_email = email.strip().lower() if email is not None else None

    if normalized_name is not None and len(normalized_name) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name is required.",
        )

    if normalized_email is not None and user_repo.email_exists(
        db,
        normalized_email,
        exclude_user_id=target_user.user_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists.",
        )

    manager = None
    if acting_role_id == ADMINISTRATOR_ROLE_ID and manager_id_provided:
        manager = _validate_manager(
            db,
            manager_id,
            target_user_id=target_user.user_id,
        )

        if target_user.role_id == USER_ROLE_ID and manager is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Regular users must report to a manager.",
            )

    if not any(
        [
            normalized_name is not None,
            email_provided,
            manager_id_provided,
        ]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update.",
        )

    updated = user_repo.update_user(
        db,
        target_user.user_id,
        acting_user_id,
        display_name=normalized_name,
        email=normalized_email if email_provided else None,
        manager_id=manager.user_id if manager else None,
        manager_id_provided=manager_id_provided,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    refreshed_user = _require_user(user_repo.get_user_by_id(db, target_user.user_id))
    return _serialize_users_response(db, [refreshed_user], acting_user_id=acting_user_id)["items"][0]


def change_role(
    db: Session,
    user_identifier: str,
    *,
    role_id: int,
    acting_user_id: int,
    acting_role_id: int,
) -> dict:
    _require_admin(acting_role_id)

    target_user = _require_user(_resolve_user(db, user_identifier))

    if target_user.user_id == acting_user_id and role_id != ADMINISTRATOR_ROLE_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote themselves.",
        )

    _validate_role(db, role_id)
    _ensure_last_admin_is_preserved(db, target_user, next_role_id=role_id)
    _ensure_project_manager_role_integrity(db, target_user, role_id)

    if role_id == USER_ROLE_ID and target_user.manager_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assign a reporting manager before changing this user to Regular User.",
        )

    changed = user_repo.change_role(db, target_user.user_id, role_id, acting_user_id)
    if not changed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if role_id != USER_ROLE_ID and target_user.manager_id is not None:
        user_repo.update_user(
            db,
            target_user.user_id,
            acting_user_id,
            manager_id=None,
            manager_id_provided=True,
        )

    refreshed_user = _require_user(user_repo.get_user_by_id(db, target_user.user_id))
    return _serialize_users_response(db, [refreshed_user], acting_user_id=acting_user_id)["items"][0]


def soft_delete_user(
    db: Session,
    user_identifier: str,
    *,
    acting_user_id: int,
    acting_role_id: int,
) -> None:
    _require_admin(acting_role_id)

    target_user = _require_user(_resolve_user(db, user_identifier))

    if target_user.user_id == acting_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete themselves.",
        )

    _ensure_last_admin_is_preserved(db, target_user)

    deleted = user_repo.soft_delete_user(db, target_user.user_id, acting_user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

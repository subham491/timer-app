"""Project service."""

from datetime import datetime, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.assignment_model import Assignment
from app.models.project_manager_model import ProjectManager
from app.models.task_model import Task
from app.models.time_entry_model import TimeEntry
from app.models.user_model import User
from app.repositories import assignment_repository as assignment_repo
from app.repositories import project_manager_repository as project_manager_repo
from app.repositories import project_repository as project_repo
from app.repositories import task_repository as task_repo
from app.repositories import user_repository as user_repo
from app.utils import new_universal_id

REPORT_VIEWER_ROLE_ID = 2
MANAGER_ROLE_ID = 3
ADMINISTRATOR_ROLE_ID = 4

PROJECT_STATUSES = ["active", "archived"]


def _stable_id(universal_id: str | None, numeric_id: int) -> str:
    return universal_id or str(numeric_id)


def _serialize_user_reference(user: User) -> dict:
    return {
        "id": _stable_id(user.universal_id, user.user_id),
        "name": user.display_name,
        "email": user.email,
    }


def _serialize_task(task: Task) -> dict:
    return {
        "id": _stable_id(task.universal_id, task.task_id),
        "name": task.name,
        "description": task.description or "",
        "status": task.status,
    }


def _resolve_project(db: Session, project_identifier: str):
    project = project_repo.get_project_by_universal_id(db, project_identifier)
    if project:
        return project

    if project_identifier.isdigit():
        return project_repo.get_project_by_id(db, int(project_identifier))

    return None


def _require_project(project, *, message: str = "Project not found."):
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=message,
        )
    return project


def _dedupe_projects(projects: list) -> list:
    seen: set[int] = set()
    unique_projects = []

    for project in projects:
        if project.project_id in seen:
            continue
        seen.add(project.project_id)
        unique_projects.append(project)

    return unique_projects


def _list_visible_projects(db: Session, user_id: int, role_id: int) -> list:
    if role_id in {REPORT_VIEWER_ROLE_ID, ADMINISTRATOR_ROLE_ID}:
        projects = project_repo.get_all_projects(db)
    elif role_id == MANAGER_ROLE_ID:
        projects = project_repo.get_projects_managed_by(db, user_id)
    else:
        projects = project_repo.get_projects_for_user(db, user_id)

    return _dedupe_projects(projects)


def _user_can_access_project(db: Session, user_id: int, role_id: int, project_id: int) -> bool:
    if role_id in {REPORT_VIEWER_ROLE_ID, ADMINISTRATOR_ROLE_ID}:
        return True

    if role_id == MANAGER_ROLE_ID:
        return project_manager_repo.get_active_manager(db, user_id, project_id) is not None

    return assignment_repo.get_active_assignment(db, user_id, project_id) is not None


def _user_can_manage_project(db: Session, user_id: int, role_id: int, project_id: int) -> bool:
    if role_id == ADMINISTRATOR_ROLE_ID:
        return True

    if role_id == MANAGER_ROLE_ID:
        return project_manager_repo.get_active_manager(db, user_id, project_id) is not None

    return False


def _require_project_management_access(
    db: Session,
    user_id: int,
    role_id: int,
    project_id: int,
) -> None:
    if not _user_can_manage_project(db, user_id, role_id, project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this project.",
        )


def _require_project_creator_access(role_id: int) -> None:
    if role_id not in {MANAGER_ROLE_ID, ADMINISTRATOR_ROLE_ID}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create projects.",
        )


def _get_project_assignments(db: Session, project_id: int) -> list[dict]:
    users = (
        db.query(User)
        .join(Assignment, Assignment.user_id == User.user_id)
        .filter(
            Assignment.project_id == project_id,
            Assignment.status == "active",
            Assignment.deleted_at == None,
            User.deleted_at == None,
            User.status == "active",
        )
        .order_by(User.display_name.asc())
        .all()
    )
    return [_serialize_user_reference(user) for user in users]


def _get_project_managers(db: Session, project_id: int) -> list[dict]:
    users = (
        db.query(User)
        .join(ProjectManager, ProjectManager.user_id == User.user_id)
        .filter(
            ProjectManager.project_id == project_id,
            ProjectManager.removed_at == None,
            User.deleted_at == None,
            User.status == "active",
        )
        .order_by(User.display_name.asc())
        .all()
    )
    return [_serialize_user_reference(user) for user in users]


def _get_project_tasks(db: Session, project_id: int) -> list[Task]:
    return (
        db.query(Task)
        .filter(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
        .all()
    )


def _get_assignment_rows(db: Session, project_id: int) -> list[Assignment]:
    return (
        db.query(Assignment)
        .filter(Assignment.project_id == project_id, Assignment.deleted_at == None)
        .all()
    )


def _get_project_manager_rows(db: Session, project_id: int) -> list[ProjectManager]:
    return db.query(ProjectManager).filter(ProjectManager.project_id == project_id).all()


def _get_active_timer_count(db: Session, project_id: int) -> int:
    count = (
        db.query(func.count(TimeEntry.time_entry_id))
        .filter(
            TimeEntry.project_id == project_id,
            TimeEntry.status == "running",
        )
        .scalar()
    )
    return int(count or 0)


def _get_timer_readiness(project, tasks: list[Task]) -> tuple[bool, str | None]:
    if project.status == "archived":
        return False, "Project is archived"

    if any(task.status == "active" for task in tasks):
        return True, None

    return False, "No active tasks"


def _serialize_project_detail(db: Session, project) -> dict:
    tasks = _get_project_tasks(db, project.project_id)
    is_timer_ready, readiness_reason = _get_timer_readiness(project, tasks)

    return {
        "id": _stable_id(project.universal_id, project.project_id),
        "name": project.name,
        "description": project.description or "",
        "status": project.status,
        "assignments": _get_project_assignments(db, project.project_id),
        "projectManagers": _get_project_managers(db, project.project_id),
        "tasks": [_serialize_task(task) for task in tasks],
        "activeTimerCount": _get_active_timer_count(db, project.project_id),
        "isTimerReady": is_timer_ready,
        "timerReadinessReason": readiness_reason,
        "createdAt": project.created_at,
        "updatedAt": project.updated_at,
    }


def _validate_project_status(status_value: str | None) -> str | None:
    if status_value is None:
        return None

    if status_value not in PROJECT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="status must be 'active' or 'archived'.",
        )

    return status_value


def _normalize_project_name(name: str) -> str:
    normalized_name = name.strip()
    if len(normalized_name) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name is required.",
        )
    return normalized_name


def _validate_assignment_users(db: Session, user_ids: list[str]) -> list[User]:
    users: list[User] = []
    seen_user_ids: set[int] = set()

    for user_id in user_ids:
        user = user_repo.get_user_by_universal_id(db, user_id)
        if not user and user_id.isdigit():
            user = user_repo.get_user_by_id(db, int(user_id))

        if not user or user.deleted_at is not None or user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assignment user: {user_id}.",
            )

        if user.user_id in seen_user_ids:
            continue

        seen_user_ids.add(user.user_id)
        users.append(user)

    return users


def _validate_manager_candidates(db: Session, user_ids: list[str]) -> list[User]:
    users = _validate_assignment_users(db, user_ids)

    for user in users:
        if user.role_id not in {MANAGER_ROLE_ID, ADMINISTRATOR_ROLE_ID}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid project manager candidate: {_stable_id(user.universal_id, user.user_id)}.",
            )

    return users


def _sync_assignments(
    db: Session,
    project_id: int,
    assignment_users: list[User],
    *,
    acting_user_id: int,
) -> None:
    desired_user_ids = {user.user_id for user in assignment_users}
    assignment_rows = _get_assignment_rows(db, project_id)

    active_rows_by_user_id = {
        row.user_id: row for row in assignment_rows if row.status == "active"
    }

    now = datetime.now(timezone.utc)

    for user_id, row in active_rows_by_user_id.items():
        if user_id not in desired_user_ids:
            row.status = "inactive"
            row.updated_by = acting_user_id
            row.updated_at = now

    for user in assignment_users:
        active_row = active_rows_by_user_id.get(user.user_id)
        if active_row is not None:
            continue

        reusable_row = next(
            (
                row
                for row in assignment_rows
                if row.user_id == user.user_id and row.status != "active"
            ),
            None,
        )

        if reusable_row is not None:
            reusable_row.status = "active"
            reusable_row.updated_by = acting_user_id
            reusable_row.updated_at = now
            continue

        assignment_repo.create_assignment(
            db,
            user_id=user.user_id,
            project_id=project_id,
            assigned_by=acting_user_id,
        )


def _sync_project_managers(
    db: Session,
    project_id: int,
    manager_users: list[User],
    *,
    acting_user_id: int,
) -> None:
    desired_user_ids = {user.user_id for user in manager_users}
    manager_rows = _get_project_manager_rows(db, project_id)
    active_rows_by_user_id = {
        row.user_id: row for row in manager_rows if row.removed_at is None
    }

    now = datetime.now(timezone.utc)

    for user_id, row in active_rows_by_user_id.items():
        if user_id not in desired_user_ids:
            row.removed_at = now
            row.removed_by = acting_user_id

    for user in manager_users:
        if user.user_id in active_rows_by_user_id:
            continue

        project_manager_repo.add_manager(
            db,
            project_id=project_id,
            user_id=user.user_id,
            assigned_by=acting_user_id,
        )


def _create_inline_tasks(
    db: Session,
    project_id: int,
    task_creates: list[dict],
    *,
    acting_user_id: int,
) -> None:
    for task_create in task_creates:
        task = task_repo.create_task(
            db,
            universal_id=new_universal_id(),
            user_id=acting_user_id,
            project_id=project_id,
            name=task_create["name"],
            description=task_create.get("description"),
        )

        requested_status = task_create.get("status", "active")
        if requested_status == "archived":
            task.status = "archived"


def _sync_project_tasks(
    db: Session,
    project_id: int,
    task_updates: list[dict],
    *,
    acting_user_id: int,
) -> None:
    existing_tasks = _get_project_tasks(db, project_id)
    existing_by_stable_id = {
        _stable_id(task.universal_id, task.task_id): task for task in existing_tasks
    }
    seen_task_ids: set[int] = set()

    for task_update in task_updates:
        task_identifier = task_update.get("id")
        existing_task = (
            existing_by_stable_id.get(task_identifier)
            if task_identifier is not None
            else None
        )

        if existing_task is None and task_identifier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task id for this project: {task_identifier}.",
            )

        if existing_task is None:
            created_task = task_repo.create_task(
                db,
                universal_id=new_universal_id(),
                user_id=acting_user_id,
                project_id=project_id,
                name=task_update["name"],
                description=task_update.get("description"),
            )
            created_task.status = task_update.get("status", "active")
            seen_task_ids.add(created_task.task_id)
            continue

        existing_task.name = task_update["name"]
        existing_task.description = task_update.get("description")
        existing_task.status = task_update.get("status", "active")
        seen_task_ids.add(existing_task.task_id)

    for existing_task in existing_tasks:
        if existing_task.task_id in seen_task_ids:
            continue

        existing_task.status = "archived"


def _normalize_task_creates(task_creates: list[dict] | None) -> list[dict]:
    normalized_task_creates: list[dict] = []

    for task_create in task_creates or []:
        name = task_create.get("name", "").strip()
        if len(name) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inline task name is required.",
            )

        task_status = task_create.get("status", "active")
        if task_status not in PROJECT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inline task status must be 'active' or 'archived'.",
            )

        normalized_task_creates.append(
            {
                "id": task_create.get("id"),
                "name": name,
                "description": (task_create.get("description") or "").strip() or None,
                "status": task_status,
            }
        )

    return normalized_task_creates


def list_projects(
    db: Session,
    user_id: int,
    role_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    visible_projects = _list_visible_projects(db, user_id, role_id)
    total_items = len(visible_projects)
    total_pages = ceil(total_items / page_size) if total_items > 0 else 0
    start = (page - 1) * page_size
    end = start + page_size

    return {
        "items": [
            _serialize_project_detail(db, project)
            for project in visible_projects[start:end]
        ],
        "page": page,
        "pageSize": page_size,
        "totalItems": total_items,
        "totalPages": total_pages,
    }


def get_project(db: Session, project_identifier: str, user_id: int, role_id: int) -> dict:
    project = _resolve_project(db, project_identifier)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if not _user_can_access_project(db, user_id, role_id, project.project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return _serialize_project_detail(db, project)


def get_project_lookups(db: Session) -> dict:
    active_users = [user for user in user_repo.get_all_users(db) if user.status == "active"]
    manager_candidates = [
        user for user in active_users if user.role_id in {MANAGER_ROLE_ID, ADMINISTRATOR_ROLE_ID}
    ]

    serialized_assignable_users = [
        _serialize_user_reference(user) for user in active_users
    ]
    serialized_manager_candidates = [
        _serialize_user_reference(user) for user in manager_candidates
    ]

    return {
        "assignableUsers": serialized_assignable_users,
        "managerCandidates": serialized_manager_candidates,
        # Keep the contract-style field alongside managerCandidates for easier adoption.
        "projectManagers": serialized_manager_candidates,
        "statuses": PROJECT_STATUSES,
    }


def list_project_tasks(
    db: Session,
    project_identifier: str,
    user_id: int,
    role_id: int,
) -> dict:
    project = _resolve_project(db, project_identifier)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if not _user_can_access_project(db, user_id, role_id, project.project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return {
        "items": [_serialize_task(task) for task in _get_project_tasks(db, project.project_id)]
    }


def create_project(
    db: Session,
    created_by: int,
    role_id: int,
    *,
    name: str,
    description: str | None = None,
    status_value: str = "active",
    assignment_user_ids: list[str] | None = None,
    project_manager_user_ids: list[str] | None = None,
    task_creates: list[dict] | None = None,
) -> dict:
    _require_project_creator_access(role_id)

    normalized_status = _validate_project_status(status_value) or "active"
    assignment_users = _validate_assignment_users(db, assignment_user_ids or [])
    manager_users = _validate_manager_candidates(db, project_manager_user_ids or [])
    normalized_task_creates = _normalize_task_creates(task_creates)

    project = project_repo.create_project(
        db,
        universal_id=new_universal_id(),
        name=_normalize_project_name(name),
        description=(description or "").strip() or None,
        created_by=created_by,
    )

    if normalized_status != "active":
        project.status = normalized_status
        project.updated_by = created_by
        project.updated_at = datetime.now(timezone.utc)

    if assignment_users:
        _sync_assignments(
            db,
            project.project_id,
            assignment_users,
            acting_user_id=created_by,
        )

    if manager_users:
        _sync_project_managers(
            db,
            project.project_id,
            manager_users,
            acting_user_id=created_by,
        )

    if normalized_task_creates:
        _create_inline_tasks(
            db,
            project.project_id,
            normalized_task_creates,
            acting_user_id=created_by,
        )

    db.flush()
    db.refresh(project)
    return _serialize_project_detail(db, project)


def update_project(
    db: Session,
    project_identifier: str,
    user_id: int,
    role_id: int,
    *,
    name: str | None = None,
    description: str | None = None,
    status_value: str | None = None,
    assignment_user_ids: list[str] | None = None,
    project_manager_user_ids: list[str] | None = None,
    task_creates: list[dict] | None = None,
) -> dict:
    project = _require_project(_resolve_project(db, project_identifier))
    _require_project_management_access(db, user_id, role_id, project.project_id)

    normalized_status = _validate_project_status(status_value)
    normalized_task_creates = _normalize_task_creates(task_creates)

    if (
        name is None
        and description is None
        and normalized_status is None
        and assignment_user_ids is None
        and project_manager_user_ids is None
        and task_creates is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update.",
        )

    if name is not None:
        project.name = _normalize_project_name(name)

    if description is not None:
        project.description = description.strip() or None

    if normalized_status is not None:
        project.status = normalized_status

    project.updated_by = user_id
    project.updated_at = datetime.now(timezone.utc)

    if assignment_user_ids is not None:
        assignment_users = _validate_assignment_users(db, assignment_user_ids)
        _sync_assignments(
            db,
            project.project_id,
            assignment_users,
            acting_user_id=user_id,
        )

    if project_manager_user_ids is not None:
        manager_users = _validate_manager_candidates(db, project_manager_user_ids)
        _sync_project_managers(
            db,
            project.project_id,
            manager_users,
            acting_user_id=user_id,
        )

    if task_creates is not None:
        _sync_project_tasks(
            db,
            project.project_id,
            normalized_task_creates,
            acting_user_id=user_id,
        )

    db.flush()
    db.refresh(project)
    return _serialize_project_detail(db, project)


def archive_project(
    db: Session,
    project_identifier: str,
    *,
    updated_by: int,
    role_id: int,
) -> dict:
    project = _require_project(_resolve_project(db, project_identifier))
    _require_project_management_access(db, updated_by, role_id, project.project_id)

    project.status = "archived"
    project.updated_by = updated_by
    project.updated_at = datetime.now(timezone.utc)
    db.flush()
    db.refresh(project)
    return _serialize_project_detail(db, project)


def restore_project(
    db: Session,
    project_identifier: str,
    *,
    updated_by: int,
    role_id: int,
) -> dict:
    project = _require_project(_resolve_project(db, project_identifier))
    _require_project_management_access(db, updated_by, role_id, project.project_id)

    project.status = "active"
    project.updated_by = updated_by
    project.updated_at = datetime.now(timezone.utc)
    db.flush()
    db.refresh(project)
    return _serialize_project_detail(db, project)

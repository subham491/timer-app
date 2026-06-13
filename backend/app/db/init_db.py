from sqlalchemy import inspect, text

from app.db.connection import Base, SessionLocal, engine
from app.db.seed import seed_db

# Import all models so SQLAlchemy registers them before create_all runs.
# The import order matters - tables with FKs must come after the tables they reference.

# 1. Seed tables (no FKs to domain tables)
from app.models.permission_scope_model import PermissionScope
from app.models.role_model import Role
from app.models.role_permission_model import RolePermission

# 2. Core domain tables
from app.models.user_model import User
from app.models.project_model import Project
from app.models.project_manager_model import ProjectManager
from app.models.assignment_model import Assignment
from app.models.task_model import Task
from app.models.time_entry_model import TimeEntry

# 3. Log tables (append-only)
from app.models.log_models import AuditLog, AuthLog, ErrorLog


def _ensure_users_mvp_columns() -> None:
    """Apply additive MVP schema changes for existing users tables."""
    inspector = inspect(engine)

    if "users" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("users")
    }

    alter_statements: list[str] = []

    if "microsoft_oid" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN microsoft_oid TEXT"
        )

    if "role_id" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN role_id INTEGER NOT NULL DEFAULT 1"
        )

    if "role" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
        )

    if "manager_id" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN manager_id INTEGER"
        )

    if "status" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"
        )

    if "is_active" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true"
        )

    if "created_by" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN created_by INTEGER"
        )

    if "updated_by" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN updated_by INTEGER"
        )

    if "deleted_at" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP"
        )

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))

        connection.execute(
            text(
                """
                UPDATE users
                SET
                    microsoft_oid = COALESCE(microsoft_oid, microsoft_userid),
                    role_id = COALESCE(
                        NULLIF(role_id, 0),
                        CASE LOWER(COALESCE(role, 'user'))
                            WHEN 'administrator' THEN 4
                            WHEN 'admin' THEN 4
                            WHEN 'manager' THEN 3
                            WHEN 'report_viewer' THEN 2
                            WHEN 'reportviewer' THEN 2
                            WHEN 'report viewer' THEN 2
                            ELSE 1
                        END
                    ),
                    role = COALESCE(
                        NULLIF(role, ''),
                        CASE COALESCE(NULLIF(role_id, 0), 1)
                            WHEN 4 THEN 'administrator'
                            WHEN 3 THEN 'manager'
                            WHEN 2 THEN 'report_viewer'
                            ELSE 'user'
                        END
                    ),
                    status = COALESCE(
                        NULLIF(status, ''),
                        CASE
                            WHEN COALESCE(is_active, true) THEN 'active'
                            ELSE 'archived'
                        END
                    ),
                    is_active = COALESCE(
                        is_active,
                        CASE
                            WHEN COALESCE(NULLIF(status, ''), 'active') = 'archived' THEN false
                            ELSE true
                        END
                    )
                """
            )
        )


def _ensure_time_entries_mvp_columns() -> None:
    """Apply additive MVP schema changes for existing time_entries tables."""
    inspector = inspect(engine)

    if "time_entries" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("time_entries")
    }

    alter_statements: list[str] = []

    if "project_id" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE time_entries ADD COLUMN project_id INTEGER"
        )

    if "status" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE time_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'running'"
        )

    if "is_billable" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE time_entries ADD COLUMN is_billable BOOLEAN NOT NULL DEFAULT false"
        )

    if "started_at" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE time_entries ADD COLUMN started_at TIMESTAMP"
        )

    if "ended_at" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE time_entries ADD COLUMN ended_at TIMESTAMP"
        )

    if not alter_statements:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    UPDATE time_entries
                    SET
                        project_id = COALESCE(
                            project_id,
                            (SELECT project_id FROM tasks WHERE tasks.task_id = time_entries.task_id)
                        ),
                        status = COALESCE(
                            status,
                            CASE
                                WHEN end_at IS NULL THEN 'running'
                                ELSE 'stopped'
                            END
                        ),
                        is_billable = COALESCE(is_billable, false),
                        started_at = COALESCE(started_at, start_at),
                        ended_at = COALESCE(ended_at, end_at)
                    """
                )
            )
        return

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))

        connection.execute(
            text(
                """
                UPDATE time_entries
                SET
                    project_id = COALESCE(
                        project_id,
                        (SELECT project_id FROM tasks WHERE tasks.task_id = time_entries.task_id)
                    ),
                    status = COALESCE(
                        status,
                        CASE
                            WHEN end_at IS NULL THEN 'running'
                            ELSE 'stopped'
                        END
                    ),
                    is_billable = COALESCE(is_billable, false),
                    started_at = COALESCE(started_at, start_at),
                    ended_at = COALESCE(ended_at, end_at)
                """
            )
        )


def init_db():
    # Step 1 - Create all tables
    Base.metadata.create_all(bind=engine)
    _ensure_users_mvp_columns()
    _ensure_time_entries_mvp_columns()

    # Step 2 - Insert predefined seed data (roles, scopes, role-permissions)
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()

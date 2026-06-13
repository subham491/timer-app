"""
Seed data for roles and permission_scopes tables.
Inserts all predefined values defined in ADR-001 and ADR-003.

Run automatically on startup via init_db(), or manually:
    cd backend
    python -m app.db.seed
"""

from sqlalchemy.orm import Session

from app.models.role_model import Role
from app.models.permission_scope_model import PermissionScope
from app.models.role_permission_model import RolePermission


# ---------------------------------------------------------------------------
# Predefined roles — exactly 4, per ADR-001
# ---------------------------------------------------------------------------

ROLES = [
    {"role_id": 1, "name": "user",          "description": "Tracks own time on assigned projects"},
    {"role_id": 2, "name": "report_viewer", "description": "Org-wide read/report access. No management authority"},
    {"role_id": 3, "name": "manager",       "description": "Manages assigned projects: tasks, assignments, team time reports. Project-scoped"},
    {"role_id": 4, "name": "administrator", "description": "Full organisational access. User and role management"},
]


# ---------------------------------------------------------------------------
# Predefined permission scopes — per ADR-001 Permission Scopes section
# ---------------------------------------------------------------------------

PERMISSION_SCOPES = [
    # User Management
    {"name": "users:read_own",    "description": "View own profile"},
    {"name": "users:read_team",   "description": "View profiles of users on managed projects"},
    {"name": "users:read_all",    "description": "View all user profiles in the org"},
    {"name": "users:update_own",  "description": "Edit own display name only"},
    {"name": "users:update_any",  "description": "Edit any user name, manager, or status"},
    {"name": "users:change_role", "description": "Change any user role"},
    {"name": "users:create",      "description": "Create new user accounts"},
    {"name": "users:archive",     "description": "Archive any user"},

    # Projects
    {"name": "projects:read_assigned",   "description": "View own assigned projects"},
    {"name": "projects:read_managed",    "description": "View projects where the user is a named project manager"},
    {"name": "projects:read_all",        "description": "View all projects"},
    {"name": "projects:create",          "description": "Create a new project"},
    {"name": "projects:update_managed",  "description": "Edit managed projects"},
    {"name": "projects:update_any",      "description": "Edit any project"},
    {"name": "projects:archive_managed", "description": "Archive managed projects"},
    {"name": "projects:archive_any",     "description": "Archive any project"},

    # Tasks
    {"name": "tasks:read_assigned",   "description": "View tasks in assigned projects"},
    {"name": "tasks:read_all",        "description": "View tasks in all projects"},
    {"name": "tasks:create",          "description": "Create tasks in managed projects"},
    {"name": "tasks:update_managed",  "description": "Edit tasks in managed projects"},
    {"name": "tasks:update_any",      "description": "Edit tasks in any project"},
    {"name": "tasks:archive_managed", "description": "Archive tasks in managed projects"},
    {"name": "tasks:archive_any",     "description": "Archive tasks in any project"},

    # Assignments
    {"name": "assignments:read_own",        "description": "View own assignments"},
    {"name": "assignments:manage_managed",  "description": "Assign/remove users on managed projects"},
    {"name": "assignments:manage_any",      "description": "Assign/remove users on any project"},

    # Project Managers
    {"name": "project_managers:manage_managed", "description": "Add/remove project managers on own managed projects"},
    {"name": "project_managers:manage_any",     "description": "Add/remove project managers on any project"},

    # Time Entries
    {"name": "time_entries:create_own", "description": "Create own time entries on assigned projects"},
    {"name": "time_entries:read_own",   "description": "View own time entries"},
    {"name": "time_entries:read_team",  "description": "View time entries of users on managed projects"},
    {"name": "time_entries:read_all",   "description": "View all time entries in the org"},
    {"name": "time_entries:update_own", "description": "Edit own time entries"},
    {"name": "time_entries:update_any", "description": "Edit any user time entry"},
    {"name": "time_entries:delete_own", "description": "Delete own time entries"},
    {"name": "time_entries:delete_any", "description": "Delete any time entry"},

    # Reports
    {"name": "reports:view_own",    "description": "R-01 My Timesheet, R-02 My Summary"},
    {"name": "reports:view_team",   "description": "R-03 Team Timesheet, R-04 Project Summary, R-06, R-07 — project-scoped"},
    {"name": "reports:view_all",    "description": "All reports org-wide including R-05 User Activity Summary"},
    {"name": "reports:export_own",  "description": "Export own reports"},
    {"name": "reports:export_team", "description": "Export team reports"},
    {"name": "reports:export_all",  "description": "Export any report in the org"},

    # Audit / Security / System
    {"name": "audit_logs:read", "description": "View business data audit trail"},
    {"name": "auth_logs:read",  "description": "View authentication event log"},
    {"name": "error_logs:read", "description": "View system error log for RCA"},
    {"name": "system:manage",   "description": "System configuration — reserved for future use"},
]


# ---------------------------------------------------------------------------
# Role → Scope mapping — per ADR-001 Role-to-Scope Matrix
# role_id: 1=user  2=report_viewer  3=manager  4=administrator
# ---------------------------------------------------------------------------

ROLE_PERMISSIONS = [
    # user
    (1, "users:read_own"),
    (1, "users:update_own"),
    (1, "projects:read_assigned"),
    (1, "tasks:read_assigned"),
    (1, "assignments:read_own"),
    (1, "time_entries:create_own"),
    (1, "time_entries:read_own"),
    (1, "time_entries:update_own"),
    (1, "time_entries:delete_own"),
    (1, "reports:view_own"),
    (1, "reports:export_own"),

    # report_viewer
    (2, "users:read_own"),
    (2, "users:read_all"),
    (2, "users:update_own"),
    (2, "projects:read_assigned"),
    (2, "projects:read_all"),
    (2, "tasks:read_assigned"),
    (2, "tasks:read_all"),
    (2, "assignments:read_own"),
    (2, "time_entries:create_own"),
    (2, "time_entries:read_own"),
    (2, "time_entries:read_all"),
    (2, "time_entries:update_own"),
    (2, "time_entries:delete_own"),
    (2, "reports:view_own"),
    (2, "reports:view_all"),
    (2, "reports:export_own"),
    (2, "reports:export_all"),

    # manager
    (3, "users:read_own"),
    (3, "users:read_team"),
    (3, "users:update_own"),
    (3, "projects:read_assigned"),
    (3, "projects:read_managed"),
    (3, "projects:create"),
    (3, "projects:update_managed"),
    (3, "projects:archive_managed"),
    (3, "tasks:read_assigned"),
    (3, "tasks:create"),
    (3, "tasks:update_managed"),
    (3, "tasks:archive_managed"),
    (3, "assignments:read_own"),
    (3, "assignments:manage_managed"),
    (3, "project_managers:manage_managed"),
    (3, "time_entries:create_own"),
    (3, "time_entries:read_own"),
    (3, "time_entries:read_team"),
    (3, "time_entries:update_own"),
    (3, "time_entries:delete_own"),
    (3, "reports:view_own"),
    (3, "reports:view_team"),
    (3, "reports:export_own"),
    (3, "reports:export_team"),

    # administrator
    (4, "users:read_own"),
    (4, "users:read_team"),
    (4, "users:read_all"),
    (4, "users:update_own"),
    (4, "users:update_any"),
    (4, "users:change_role"),
    (4, "users:create"),
    (4, "users:archive"),
    (4, "projects:read_assigned"),
    (4, "projects:read_managed"),
    (4, "projects:read_all"),
    (4, "projects:create"),
    (4, "projects:update_managed"),
    (4, "projects:update_any"),
    (4, "projects:archive_managed"),
    (4, "projects:archive_any"),
    (4, "tasks:read_assigned"),
    (4, "tasks:read_all"),
    (4, "tasks:create"),
    (4, "tasks:update_managed"),
    (4, "tasks:update_any"),
    (4, "tasks:archive_managed"),
    (4, "tasks:archive_any"),
    (4, "assignments:read_own"),
    (4, "assignments:manage_managed"),
    (4, "assignments:manage_any"),
    (4, "project_managers:manage_managed"),
    (4, "project_managers:manage_any"),
    (4, "time_entries:create_own"),
    (4, "time_entries:read_own"),
    (4, "time_entries:read_team"),
    (4, "time_entries:read_all"),
    (4, "time_entries:update_own"),
    (4, "time_entries:update_any"),
    (4, "time_entries:delete_own"),
    (4, "time_entries:delete_any"),
    (4, "reports:view_own"),
    (4, "reports:view_team"),
    (4, "reports:view_all"),
    (4, "reports:export_own"),
    (4, "reports:export_team"),
    (4, "reports:export_all"),
    (4, "audit_logs:read"),
    (4, "auth_logs:read"),
    (4, "error_logs:read"),
    (4, "system:manage"),
]


# ---------------------------------------------------------------------------
# Seeder function
# ---------------------------------------------------------------------------

def seed_db(db: Session) -> None:
    """
    Insert all predefined roles, permission scopes, and role-permission
    mappings. Safe to re-run — skips any row that already exists.
    """

    for role_data in ROLES:
        exists = db.query(Role).filter_by(name=role_data["name"]).first()
        if not exists:
            db.add(Role(**role_data))
    db.commit()

    for scope_data in PERMISSION_SCOPES:
        exists = db.query(PermissionScope).filter_by(name=scope_data["name"]).first()
        if not exists:
            db.add(PermissionScope(**scope_data))
    db.commit()

    # Seed role → scope mappings
    for role_id, scope_name in ROLE_PERMISSIONS:
        scope = db.query(PermissionScope).filter_by(name=scope_name).first()
        if scope:
            exists = db.query(RolePermission).filter_by(
                role_id=role_id,
                scope_id=scope.scope_id,
            ).first()
            if not exists:
                db.add(RolePermission(role_id=role_id, scope_id=scope.scope_id))
    db.commit()
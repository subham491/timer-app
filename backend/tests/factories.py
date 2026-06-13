"""
Plain factory functions over the test Session.

Deliberately not factory_boy: plain functions are the most predictable thing to
run inside the SAVEPOINT-bound session, and every test reads cleanly as
"given this state, when I hit the endpoint, then ...".

ADJUST model imports and field names to match your ORM.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.models import (  
    Role, User, Project, Task, Assignment, ProjectManager, TimeEntry,
)


def _role_id(session, name: str) -> int:
    return session.execute(select(Role.role_id).where(Role.name == name)).scalar_one()


def make_user(session, *, role: str = "user", status: str = "active",
              email: str | None = None, display_name: str | None = None,
              microsoft_oid: str | None = None, **kw) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(
        universal_id=str(uuid.uuid4()),
        email=email or f"user_{uid}@soliton.com",
        display_name=display_name or f"User {uid}",
        role_id=_role_id(session, role),
        auth_provider="microsoft",
        microsoft_oid=microsoft_oid,
        status=status,
        email_verified=1,
        **kw,
    )
    session.add(user)
    session.flush()
    session.refresh(user)
    return user


def make_project(session, *, status: str = "active", created_by: User | None = None,
                 name: str | None = None, **kw) -> Project:
    creator = created_by or make_user(session, role="administrator")
    project = Project(
        universal_id=str(uuid.uuid4()),
        name=name or f"Project {uuid.uuid4().hex[:6]}",
        status=status,
        created_by=creator.user_id,
        **kw,
    )
    session.add(project)
    session.flush()
    session.refresh(project)
    return project


def make_task(session, *, project: Project, status: str = "active",
              name: str | None = None, created_by: User | None = None, **kw) -> Task:
    creator = created_by or make_user(session, role="manager")
    task = Task(
        universal_id=str(uuid.uuid4()),
        project_id=project.project_id,
        name=name or f"Task {uuid.uuid4().hex[:6]}",
        status=status,
        created_by=creator.user_id,
        **kw,
    )
    session.add(task)
    session.flush()
    session.refresh(task)
    return task


def make_assignment(session, *, user: User, project: Project,
                    status: str = "active", assigned_by: User | None = None, **kw) -> Assignment:
    actor = assigned_by or make_user(session, role="manager")
    a = Assignment(
        user_id=user.user_id,
        project_id=project.project_id,
        assigned_by=actor.user_id,
        status=status,
        **kw,
    )
    session.add(a)
    session.flush()
    session.refresh(a)
    return a


def make_project_manager(session, *, user: User, project: Project,
                         assigned_by: User | None = None, **kw) -> ProjectManager:
    actor = assigned_by or make_user(session, role="administrator")
    pm = ProjectManager(
        project_id=project.project_id,
        user_id=user.user_id,
        assigned_by=actor.user_id,
        assigned_at=datetime.now(timezone.utc),
        **kw,
    )
    session.add(pm)
    session.flush()
    session.refresh(pm)
    return pm


def make_time_entry(session, *, user: User, task: Task,
                    start_at: datetime, end_at: datetime | None = None,
                    source: str = "manual", work_note: str | None = None, **kw) -> TimeEntry:
    duration = None
    if end_at is not None:
        duration = int((end_at - start_at).total_seconds())
    te = TimeEntry(
        universal_id=str(uuid.uuid4()),
        task_id=task.task_id,
        user_id=user.user_id,
        start_at=start_at,
        end_at=end_at,
        duration_seconds=duration,
        source=source,
        work_note=work_note,
        **kw,
    )
    session.add(te)
    session.flush()
    session.refresh(te)
    return te


def assigned_user_with_task(session, *, role: str = "user"):
    """Convenience: a user actively assigned to a project that has an active
    task. Returns (user, project, task)."""
    user = make_user(session, role=role)
    project = make_project(session)
    task = make_task(session, project=project)
    make_assignment(session, user=user, project=project)
    return user, project, task


def manager_with_project(session, *, manager=None, project=None):
    """A manager who is a named Project Manager of a project. Returns (manager, project)."""
    manager = manager or make_user(session, role="manager")
    project = project or make_project(session)
    make_project_manager(session, user=manager, project=project)
    return manager, project


def team_member_on(session, project, *, role: str = "user"):
    """A user actively assigned to `project` — a 'team member' for *_read_team scopes."""
    user = make_user(session, role=role)
    make_assignment(session, user=user, project=project)
    return user

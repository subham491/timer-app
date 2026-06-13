"""
Central router — mounts all endpoint routers per ADR-007.
"""

from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    projects,
    assignments,
    tasks,
    timer,
    time_entries,
    reports,
    dashboard,
    logs,
    rbac,
    users,
)

router = APIRouter()

router.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
router.include_router(users.router,        prefix="/users",        tags=["Users"])
router.include_router(projects.router,     prefix="/projects",     tags=["Projects"])
router.include_router(assignments.router,  prefix="/assignments",  tags=["Assignments"])
router.include_router(tasks.router,        prefix="/tasks",        tags=["Tasks"])
router.include_router(timer.router,        prefix="/timer",        tags=["Timer"])
router.include_router(time_entries.router, prefix="/time-entries", tags=["Time Entries"])
router.include_router(reports.router,      prefix="/reports",      tags=["Reports"])
router.include_router(dashboard.router,    prefix="/dashboard",    tags=["Dashboard"])
router.include_router(logs.router,         prefix="",              tags=["Logs"])
router.include_router(rbac.router,         prefix="",              tags=["RBAC"])

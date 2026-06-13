"""
Audit & Operational Log endpoints — ADR-007. Administrator only.

GET /audit-logs
GET /auth-logs
GET /error-logs
"""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.repositories import log_repository as log_repo

router = APIRouter()


@router.get("/audit-logs")
def get_audit_logs(
    db: DBSession,
    user: CurrentUser,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    """Retrieve business data audit trail. Administrator only."""
    logs = log_repo.get_audit_logs(db, limit=limit, offset=offset)
    return [
        {
            "audit_log_id":  l.audit_log_id,
            "event_type":    l.event_type,
            "entity_type":   l.entity_type,
            "entity_id":     l.entity_id,
            "actor_user_id": l.actor_user_id,
            "old_value":     l.old_value,
            "new_value":     l.new_value,
            "created_at":    l.created_at,
        }
        for l in logs
    ]


@router.get("/auth-logs")
def get_auth_logs(
    db: DBSession,
    user: CurrentUser,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    """Retrieve authentication event log. Administrator only."""
    logs = log_repo.get_auth_logs(db, limit=limit, offset=offset)
    return [
        {
            "auth_log_id":    l.auth_log_id,
            "event_type":     l.event_type,
            "user_id":        l.user_id,
            "auth_provider":  l.auth_provider,
            "ip_address":     l.ip_address,
            "failure_reason": l.failure_reason,
            "created_at":     l.created_at,
        }
        for l in logs
    ]


@router.get("/error-logs")
def get_error_logs(
    db: DBSession,
    user: CurrentUser,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    """Retrieve system error log. Administrator only."""
    logs = log_repo.get_error_logs(db, limit=limit, offset=offset)
    return [
        {
            "error_log_id": l.error_log_id,
            "severity":     l.severity,
            "error_code":   l.error_code,
            "message":      l.message,
            "request_id":   l.request_id,
            "endpoint":     l.endpoint,
            "http_method":  l.http_method,
            "user_id":      l.user_id,
            "created_at":   l.created_at,
        }
        for l in logs
    ]
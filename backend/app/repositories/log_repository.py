"""
Log repository — read-only access to audit_logs, auth_logs, error_logs.
All three tables are append-only per ADR-003.
"""

from sqlalchemy.orm import Session

from app.models.log_models import AuditLog, AuthLog, ErrorLog


def get_audit_logs(db: Session, limit: int = 100, offset: int = 0) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_auth_logs(db: Session, limit: int = 100, offset: int = 0) -> list[AuthLog]:
    return (
        db.query(AuthLog)
        .order_by(AuthLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_error_logs(db: Session, limit: int = 100, offset: int = 0) -> list[ErrorLog]:
    return (
        db.query(ErrorLog)
        .order_by(ErrorLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
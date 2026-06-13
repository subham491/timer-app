"""
Auth log repository — append-only writes to auth_logs per ADR-003.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.log_models import AuthLog


def write_auth_log(
    db: Session,
    *,
    event_type: str,
    user_id: Optional[int] = None,
    auth_provider: Optional[str] = "microsoft",
    ip_address: Optional[str] = None,
    failure_reason: Optional[str] = None,
) -> None:
    """
    Append an authentication event to auth_logs.
    event_type values per ADR-003:
      'sso_login_success', 'sso_login_failure', 'logout'
    failure_reason values:
      'unknown_user', 'account_archived', 'sso_token_invalid', 'sso_tenant_mismatch'
    """
    try:
        log = AuthLog(
            event_type=event_type,
            user_id=user_id,
            auth_provider=auth_provider,
            ip_address=ip_address,
            failure_reason=failure_reason,
        )
        db.add(log)
        db.flush()
    except Exception:
        db.rollback()
        raise
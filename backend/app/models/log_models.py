from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_log_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    event_type: Mapped[str] = mapped_column(String, nullable=False)

    entity_type: Mapped[str] = mapped_column(String, nullable=False)

    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)

    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)

    # JSON of changed fields before mutation — never includes password_hash or microsoft_oid
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON of changed fields after mutation — same exclusions
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class AuthLog(Base):
    __tablename__ = "auth_logs"

    auth_log_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    event_type: Mapped[str] = mapped_column(String, nullable=False)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)

    auth_provider: Mapped[str | None] = mapped_column(String, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)

    failure_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class ErrorLog(Base):
    __tablename__ = "error_logs"

    error_log_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    severity: Mapped[str] = mapped_column(String, nullable=False)

    error_code: Mapped[str] = mapped_column(String, nullable=False)

    message: Mapped[str] = mapped_column(Text, nullable=False)

    stack_trace: Mapped[str | None] = mapped_column(Text, nullable=True)

    request_id: Mapped[str | None] = mapped_column(String, nullable=True)

    endpoint: Mapped[str | None] = mapped_column(String, nullable=True)

    http_method: Mapped[str | None] = mapped_column(String, nullable=True)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)

    # JSON of non-sensitive debugging context — no credentials, tokens, or PII
    context: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
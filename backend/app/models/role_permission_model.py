from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "scope_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.role_id"), nullable=False)

    scope_id: Mapped[int] = mapped_column(ForeignKey("permission_scopes.scope_id"), nullable=False)

    granted_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
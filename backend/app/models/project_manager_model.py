from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


class ProjectManager(Base):
    __tablename__ = "project_managers"

    project_manager_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    assigned_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    removed_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
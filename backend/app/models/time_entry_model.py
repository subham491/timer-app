from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


class TimeEntry(Base):
    __tablename__ = "time_entries"

    time_entry_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    universal_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.task_id", ondelete="CASCADE"),
        nullable=False,
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    work_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 'timer' or 'manual' — set at creation, never changed
    source: Mapped[str] = mapped_column(String, nullable=False)

    # 'running', 'paused', or 'stopped'
    status: Mapped[str] = mapped_column(String, nullable=False, default="running")

    is_billable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # NULL = Running Timer
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Always computed server-side from (end_at - start_at). Never from client.
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)

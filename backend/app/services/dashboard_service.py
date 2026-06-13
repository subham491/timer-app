"""
Dashboard service.
Computes time summaries for the personal dashboard.
Supports three date filters: today, this week (Mon-Sun), and this month.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.repositories import time_entry_repository as entry_repo


def _period_bounds(filter_name: str) -> tuple[datetime, datetime]:
    """
    Return (start, end) datetime objects for the requested period.
    end is exclusive (first moment of the next period).
    """
    now = datetime.now(timezone.utc)

    if filter_name == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

    elif filter_name == "week":
        start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = start + timedelta(weeks=1)

    elif filter_name == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = start.replace(year=now.year + 1, month=1)
        else:
            end = start.replace(month=now.month + 1)

    else:
        raise ValueError(f"Unknown filter: {filter_name!r}")

    return start, end


def get_summary(db: Session, user_id: int, filter_name: str) -> dict:
    """
    Aggregate completed time entry durations grouped by task.
    Returns a dict matching the DashboardSummaryResponse model.
    """
    start, end = _period_bounds(filter_name)
    rows = entry_repo.get_entries_in_period(db, user_id, start, end)

    task_totals: dict[int, dict] = defaultdict(
        lambda: {"task_name": "", "total_duration": 0}
    )

    for row in rows:
        tid = row["task_id"]
        task_totals[tid]["task_name"] = row["task_name"]
        task_totals[tid]["total_duration"] += row["duration_seconds"] or 0

    tasks = [
        {"task_id": tid, **data}
        for tid, data in sorted(
            task_totals.items(),
            key=lambda kv: kv[1]["total_duration"],
            reverse=True,
        )
    ]

    total = sum(t["total_duration"] for t in tasks)

    return {
        "filter": filter_name,
        "total_duration": total,
        "tasks": tasks,
    }
"""
Dashboard endpoints.

GET /dashboard/summary  – personal time summary (today / week / month)
GET /dashboard/export   – download full time entry history as CSV
"""

import io

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser
from app.db.connection import DBSession
from app.models import DashboardSummaryResponse
from app.services import csv_service, dashboard_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryResponse)
def personal_summary(
    db: DBSession,
    user: CurrentUser,
    filter: str = Query(default="today", pattern="^(today|week|month)$"),
):
    """
    Return total time per task for the selected period.
    filter can be today, week (Mon-Sun), or month.
    All durations are in seconds.
    """
    return dashboard_service.get_summary(db, user["user_id"], filter)


@router.get("/export")
def export_csv(db: DBSession, user: CurrentUser):
    """
    Export the full personal time entry history as a CSV file.
    Columns: task_name, work_note, start_at, end_at, duration_seconds
    """
    csv_data = csv_service.export_csv(db, user["user_id"])
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=time_entries_export.csv"},
    )
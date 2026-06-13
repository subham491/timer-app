"""
Application-wide constants.

Centralising magic strings here prevents typos, makes refactoring trivial,
and improves readability throughout the codebase.
"""

TASK_STATUS_TODO        = "todo"
TASK_STATUS_IN_PROGRESS = "in_progress"
TASK_STATUS_DONE        = "done"

LOG_STATUS_RUNNING   = "running"
LOG_STATUS_COMPLETED = "completed"
LOG_STATUS_EDITED    = "edited"

AUTH_PROVIDER_LOCAL = "local"
USER_ROLE_USER      = "user"

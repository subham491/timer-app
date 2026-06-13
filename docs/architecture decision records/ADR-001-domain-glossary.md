# ADR-001: Domain Glossary & Access Control Policy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 11-05-2026 |
| **Revised** | 18-05-2026 |
| **Deciders** | Mohammed Siddique, Subham Panda, Dayanand Hukkeri and Aswath Ravi |
| **Depends on** | None |
| **Superseded by** | None |

---

## Context

Canonical vocabulary and access-control policy for the **Soliton Timer App** — a single-organisation time-tracking tool. It is not a project management, task assignment, or budget-tracking application. Every ADR, ticket, column name, API field, and UI label must use these terms exactly.

---

## Decision

Maintain this document as the authoritative source for (1) all domain terminology, (2) the complete RBAC model, and (3) the defined report catalogue. Code changes that contradict any of these require an ADR revision first.

---

## Glossary

### People & Roles

| Term | Definition |
|---|---|
| **User** | Any authenticated person. The canonical term for a person record. Has exactly one Role. Not to be called: Employee, Member, Person, Account. |
| **Role** | A permission classification. Four fixed values — see RBAC section. |
| **Organisation** | Single deployment boundary: Soliton. All data belongs to one Organisation. Multi-tenancy is deferred. |

---

### Authentication

| Term | Definition |
|---|---|
| **Auth Provider** | How a User authenticates. `'microsoft'` = primary SSO path (UI-exposed). `'local'` = bcrypt password fallback, not shown in UI. |
| **Microsoft OID** | Azure AD Object ID (`oid` OIDC claim). Stable, permanent unique identifier per user. Used to look up the local user row on every SSO login. Never changes — email can; OID cannot. Stored as `microsoft_oid`. Never returned in API responses. |

Access JWTs are stateless and validated in backend middleware.
The backend does not persist active access tokens.

Access JWTs should remain short-lived (recommended: 15–30 minutes) because the system does not implement server-side access-token revocation.

 `MICROSOFT_TENANT_ID` is stored as an environment variable, validated in middleware against the token's `tid` claim.

---

### Work Structure

| Term | Definition |
|---|---|
| **Project** | Named container for work. Holds Tasks. Time is tracked against Tasks, not Projects directly. Status: `active` or `archived`. Has zero or more Project Managers recorded in `project_managers`. Not to be called: Client, Account, Engagement. |
| **Project Manager** | A User with role `manager` or `administrator` who holds named managerial authority over a Project. Recorded in the `project_managers` join table. Distinct from Assignments — a Project Manager is not necessarily assigned to the Project for time-logging. |
| **Task** | Named, reusable **category** of work within a Project. Not a deliverable, not assigned to a specific person. Any User assigned to the Project may log time against any of its Tasks. Not to be called: Activity, Work Item, Ticket. |
| **Assignment** | Explicit User ↔ Project relationship granting time-logging access. Has status `active` or `inactive`. New row on re-assignment (preserves gap history). Manages access only — Project Manager authority is in `project_managers`. Not to be called: Allocation, Membership. |

---

### Time Tracking

| Term | Definition |
|---|---|
| **Time Entry** | The atomic unit of recorded work. Belongs to one User and one Task. Has `start_at`, `end_at`, `duration_seconds`, optional `work_note`, and `source`. Not to be called: Session, Log, Record, TimeLog. |
| **Running Timer** | A Time Entry where `end_at IS NULL`. At most one per User. Starting a new timer auto-stops any existing one. Not to be called: Active Session, Open Entry. |
| **Manual Entry** | A Time Entry with `source = 'manual'`. User entered start/end directly. Treated identically to `'timer'` entries in all reports. |
| **Duration** | `(end_at − start_at)` in integer seconds. Always server-computed. Never accepted from client. Displayed as `HH:MM`. Not to be called: Time Spent, Hours, Logged Time. |
| **Actual Duration** | Sum of `duration_seconds` for a query result set. Derived at query time, never stored. Not to be called: Actual Hours, Spent Time. |

---

### Notes & Descriptions

| Term | Definition |
|---|---|
| **Task Description** | Stored as `task_description`. Explains what work belongs in the Task category. Per-Task, rarely changed. |
| **Work Note** | Stored as `work_note`. Free-text annotation on a specific Time Entry describing what was done. Optional. Not to be called: description, note, comment. |

---

### Lifecycle

| Term | Definition |
|---|---|
| **Active** | Project or Task open to new Time Entries. Default on creation. |
| **Archived** | Project or Task closed to new entries; historical data preserved. Restorable by Administrator. Not to be called: Closed, Inactive, Completed. |
| **Soft Delete** | Record marked `deleted_at` rather than physically removed. Excluded from standard queries. Never user-facing. |

---

### Reporting & Audit

| Term | Definition |
|---|---|
| **Timesheet** | User-scoped view of Time Entries for a period. Derived at query time from `time_entries`. Not a stored entity. |
| **Report** | Parameterised aggregation of Time Entries filtered by User, Project, Task, date range, or source. Read-only. See Report Catalogue below. |
| **Audit Log** | Immutable record of **business data mutations** (Time Entry edits, role changes, Project/Task status changes). For Administrators. |
| **Auth Log** | Immutable record of **authentication events** (login success/failure, logout, token revocation). Separate from Audit Log — different audience, retention, and query pattern. |
| **Error Log** | Append-only record of **system and application errors**. For developers performing root-cause analysis. Not exposed to regular Users or Managers. |

---

## Report Catalogue

All reports are derived at query time from `time_entries` joined to `tasks`, `projects`, `assignments`, and `users`. No report data is stored. All durations surface as both `duration_seconds` (integer) and `duration_display` (`HH:MM`).

### R-01 · My Timesheet

**Who:** All Users (scope: `reports:view_own`)  
**What:** All Time Entries for the requesting User over a date range, grouped by day.

| Column | Source |
|---|---|
| Date | `time_entries.start_at` (date part) |
| Project | `projects.name` |
| Task | `tasks.name` |
| Work Note | `time_entries.work_note` |
| Start / End | `time_entries.start_at`, `end_at` |
| Duration | Computed `duration_seconds` → `HH:MM` |
| Source | `time_entries.source` (`timer` / `manual`) |

**Totals row:** Actual Duration for the period.  
**Filters:** Date range (required). Task, Project (optional).

---

### R-02 · My Summary

**Who:** All Users (scope: `reports:view_own`)  
**What:** Aggregated time per Project and Task for the requesting User over a date range. Useful for reviewing how personal time was distributed.

| Column | Source |
|---|---|
| Project | `projects.name` |
| Task | `tasks.name` |
| Entry Count | `COUNT(time_entry_id)` |
| Actual Duration | `SUM(duration_seconds)` → `HH:MM` |
| % of Period | Actual Duration ÷ Total Duration × 100 |

**Filters:** Date range (required).

---

### R-03 · Team Timesheet

**Who:** Manager (scope: `reports:view_team`), Administrator (scope: `reports:view_all`)  
**What:** All Time Entries for every User on one or more Projects, over a date range. Manager sees only Projects where they are a named Project Manager (`project_managers.user_id = self`).

| Column | Source |
|---|---|
| User | `users.display_name` |
| Date | `time_entries.start_at` (date part) |
| Project | `projects.name` |
| Task | `tasks.name` |
| Work Note | `time_entries.work_note` |
| Duration | `duration_seconds` → `HH:MM` |
| Source | `time_entries.source` |

**Filters:** Project(s) (required for Manager; optional for Administrator). Date range (required). User (optional).

---

### R-04 · Project Summary

**Who:** Manager (scope: `reports:view_team`), Report Viewer + Administrator (scope: `reports:view_all`) Primary report for understanding where time went on a project.

| Column | Source |
|---|---|
| User | `users.display_name` |
| Task | `tasks.name` |
| Entry Count | `COUNT(time_entry_id)` |
| Actual Duration | `SUM(duration_seconds)` → `HH:MM` |
| % of Project Total | Per-user-task duration ÷ project total × 100 |

**Filters:** Project (required). Date range (required). User (optional).  
**Totals row:** Total Actual Duration for the Project in the period.

---

### R-05 · User Activity Summary

**Who:** Report Viewer (scope: `reports:view_all`), Administrator (scope: `reports:view_all`)  
**What:** Org-wide view of time logged per User across all Projects. Useful for identifying dormant Users or uneven workload distribution.

| Column | Source |
|---|---|
| User | `users.display_name` |
| Role | `roles.name` |
| Active Projects | `COUNT(DISTINCT project_id)` where assignment `status = 'active'` |
| Entry Count | `COUNT(time_entry_id)` in period |
| Actual Duration | `SUM(duration_seconds)` → `HH:MM` |
| Last Entry Date | `MAX(time_entries.start_at)` |

**Filters:** Date range (required). Role (optional).

---

### R-06 · Task Breakdown

**Who:** Manager (scope: `reports:view_team`), Report Viewer + Administrator (scope: `reports:view_all`)  
**What:** Time distribution across Tasks within a Project. Shows which categories of work consumed the most time. Manager-scoped to their Projects only.

| Column | Source |
|---|---|
| Task | `tasks.name` |
| Task Description | `tasks.task_description` |
| Entry Count | `COUNT(time_entry_id)` |
| Unique Contributors | `COUNT(DISTINCT user_id)` |
| Actual Duration | `SUM(duration_seconds)` → `HH:MM` |
| % of Project Total | Task duration ÷ project total × 100 |

**Filters:** Project (required). Date range (required).

---

### R-07 · Assignment History

**Who:** Manager (scope: `reports:view_team`), Administrator (scope: `reports:view_all`)  
**What:** Full assignment lifecycle for a Project — all Users who were ever assigned, including leave/rejoin gaps. Useful for roster auditing. Manager-scoped.

| Column | Source |
|---|---|
| User | `users.display_name` |
| Status | `assignments.status` |
| Assigned Date | `assignments.created_at` |
| Removed Date | `assignments.updated_at` where `status = 'inactive'` |
| Assigned By | Resolver → `users.display_name` (via `assignments.assigned_by`) |
| Duration on Project | `end − start` in days |

**Filters:** Project (required).

---

### Export

All reports support export via the corresponding `reports:export_*` scope. Formats: CSV (all reports), PDF (R-01, R-04 only — formatted for printing).

---

## Access Control & Permissions

### RBAC Design

The system uses Role-Based Access Control with **four fixed roles** and a DB-managed role→scope mapping. Adding a new role requires only DB inserts — no code changes.

```
roles (name, description)
    ↓ FK
role_permissions (role_id, scope_id)
    ↓ FK
permission_scopes (name, description)
```

**How it works:**
- Application loads and caches role→scope mappings from `role_permissions` at startup.
- Authentication middleware validates the JWT before permission guards evaluate: required_scope ∈ cached_scopes [jwt.role]
- Cache refreshes when role permissions change (no restart needed).
- Scope definitions are code constants — preventing arbitrary scope creation.
- Adding a new role: INSERT into `roles` + INSERT into `role_permissions` rows.


---

### The Four Roles

| Role | Code value | Summary |
|---|---|---|
| Regular User | `user` | Tracks own time on assigned Projects. |
| Report Viewer | `report_viewer` | Org-wide read/report access. No management authority. |
| Manager | `manager` | Manages assigned Projects: Tasks, Assignments, team time reports. Project-scoped via `project_managers`. |
| Administrator | `administrator` | Full organisational access. User and role management. |

Roles are seeded at migration. An Administrator may create new roles and assign scopes to them via the `roles` and `role_permissions` tables. No code change is needed.

---

### Permission Scopes

#### User Management

| Scope | Description |
|---|---|
| `users:read_own` | View own profile. |
| `users:read_team` | View profiles of Users on managed Projects. |
| `users:read_all` | View all User profiles in the org. |
| `users:update_own` | Edit own display name only. |
| `users:update_any` | Edit any User's name, manager, or status. |
| `users:change_role` | Change any User's role. |
| `users:create` | Create new User accounts. |
| `users:archive` | Archive any User. |

#### Project, Task & Assignment

| Scope | Description |
|---|---|
| `projects:read_assigned` | View own assigned Projects. |
| `projects:read_managed` | View Projects where the User is a named Project Manager. |
| `projects:read_all` | View all Projects. |
| `projects:create` | Create a new Project. |
| `projects:update_managed` | Edit managed Projects. |
| `projects:update_any` | Edit any Project. |
| `projects:archive_managed` | Archive managed Projects. |
| `projects:archive_any` | Archive any Project. |
| `tasks:read_assigned` | View Tasks in assigned Projects. |
| `tasks:read_all` | View Tasks in all Projects. |
| `tasks:create` | Create Tasks in managed Projects. |
| `tasks:update_managed` | Edit Tasks in managed Projects. |
| `tasks:update_any` | Edit Tasks in any Project. |
| `tasks:archive_managed` | Archive Tasks in managed Projects. |
| `tasks:archive_any` | Archive Tasks in any Project. |
| `assignments:read_own` | View own Assignments. |
| `assignments:manage_managed` | Assign/remove Users on managed Projects. |
| `assignments:manage_any` | Assign/remove Users on any Project. |
| `project_managers:manage_managed` | Add/remove Project Managers on own managed Projects. |
| `project_managers:manage_any` | Add/remove Project Managers on any Project. |

#### Time Entries

| Scope | Description |
|---|---|
| `time_entries:create_own` | Create own Time Entries on assigned Projects. |
| `time_entries:read_own` | View own Time Entries. |
| `time_entries:read_team` | View Time Entries of Users on managed Projects. |
| `time_entries:read_all` | View all Time Entries in the org. |
| `time_entries:update_own` | Edit own Time Entries. |
| `time_entries:update_any` | Edit any User's Time Entry. |
| `time_entries:delete_own` | Delete own Time Entries. |
| `time_entries:delete_any` | Delete any Time Entry. |

#### Reports

| Scope | Description |
|---|---|
| `reports:view_own` | R-01 My Timesheet, R-02 My Summary. |
| `reports:view_team` | R-03 Team Timesheet, R-04 Project Summary, R-06 Task Breakdown, R-07 Assignment History. Project-scoped to managed Projects. |
| `reports:view_all` | All reports, org-wide. Includes R-05 User Activity Summary. |
| `reports:export_own` | Export own reports (CSV/PDF). |
| `reports:export_team` | Export team reports. |
| `reports:export_all` | Export any report in the org. |

#### Audit, Security & System

| Scope | Description |
|---|---|
| `audit_logs:read` | View business data audit trail. |
| `auth_logs:read` | View authentication event log. |
| `error_logs:read` | View system error log for RCA. |
| `system:manage` | System configuration (reserved for future use). |

---

### Role-to-Scope Matrix

| Scope | user | report_viewer | manager | administrator |
|---|:---:|:---:|:---:|:---:|
| `users:read_own` | ✅ | ✅ | ✅ | ✅ |
| `users:read_team` | — | — | ✅ | ✅ |
| `users:read_all` | — | ✅ | — | ✅ |
| `users:update_own` | ✅ | ✅ | ✅ | ✅ |
| `users:update_any` | — | — | — | ✅ |
| `users:change_role` | — | — | — | ✅ |
| `users:create` | — | — | — | ✅ |
| `users:archive` | — | — | — | ✅ |
| `projects:read_assigned` | ✅ | ✅ | ✅ | ✅ |
| `projects:read_managed` | — | — | ✅ | ✅ |
| `projects:read_all` | — | ✅ | — | ✅ |
| `projects:create` | — | — | ✅ | ✅ |
| `projects:update_managed` | — | — | ✅ | ✅ |
| `projects:update_any` | — | — | — | ✅ |
| `projects:archive_managed` | — | — | ✅ | ✅ |
| `projects:archive_any` | — | — | — | ✅ |
| `tasks:read_assigned` | ✅ | ✅ | ✅ | ✅ |
| `tasks:read_all` | — | ✅ | — | ✅ |
| `tasks:create` | — | — | ✅ | ✅ |
| `tasks:update_managed` | — | — | ✅ | ✅ |
| `tasks:update_any` | — | — | — | ✅ |
| `tasks:archive_managed` | — | — | ✅ | ✅ |
| `tasks:archive_any` | — | — | — | ✅ |
| `assignments:read_own` | ✅ | ✅ | ✅ | ✅ |
| `assignments:manage_managed` | — | — | ✅ | ✅ |
| `assignments:manage_any` | — | — | — | ✅ |
| `project_managers:manage_managed` | — | — | ✅ | ✅ |
| `project_managers:manage_any` | — | — | — | ✅ |
| `time_entries:create_own` | ✅ | ✅ | ✅ | ✅ |
| `time_entries:read_own` | ✅ | ✅ | ✅ | ✅ |
| `time_entries:read_team` | — | — | ✅ | ✅ |
| `time_entries:read_all` | — | ✅ | — | ✅ |
| `time_entries:update_own` | ✅ | ✅ | ✅ | ✅ |
| `time_entries:update_any` | — | — | — | ✅ |
| `time_entries:delete_own` | ✅ | ✅ | ✅ | ✅ |
| `time_entries:delete_any` | — | — | — | ✅ |
| `reports:view_own` | ✅ | ✅ | ✅ | ✅ |
| `reports:view_team` | — | — | ✅ | ✅ |
| `reports:view_all` | — | ✅ | — | ✅ |
| `reports:export_own` | ✅ | ✅ | ✅ | ✅ |
| `reports:export_team` | — | — | ✅ | ✅ |
| `reports:export_all` | — | ✅ | — | ✅ |
| `audit_logs:read` | — | — | — | ✅ |
| `auth_logs:read` | — | — | — | ✅ |
| `error_logs:read` | — | — | — | ✅ |

> **Manager scopes are project-scoped.** A Manager's elevated permissions apply only to Projects where they appear in `project_managers`. The repository layer enforces this with a secondary check after the permission guard passes.

---

### Role Elevation Rules

| Rule | Detail |
|---|---|
| Only Administrators change roles | Managers cannot modify any User's role. |
| Self-demotion is blocked | Prevents accidental lock-out. |
| At least one active Administrator | A demotion that would leave zero Administrators is rejected. |
| All role changes logged | Written to `audit_logs` with `old_value` and `new_value`. |

---

## Naming Conventions

### Canonical Terms

| Canonical | Do Not Use |
|---|---|
| Time Entry | Session, Log, TimeLog, Record, Work Session |
| Task | Activity, Work Item, Category, Ticket |
| Project | Client, Engagement, Account, Workspace |
| Work Note | description, note, comment, memo |
| User | Employee, Member, Person, Account |
| Archived | Closed, Inactive, Completed |
| Actual Duration | Actual Hours, Logged Time, Spent Time |
| Running Timer | Active Session, Open Entry |
| Assignment | Allocation, Membership, Access Grant |
| Project Manager | Project Lead, Owner, Responsible (must use the join table, not a freeform label) |

### Database

- Tables: plural `snake_case` — `time_entries`, `users`, `roles`, `permission_scopes`, `role_permissions`, `project_managers`
- PKs: `{entity}_id`
- Timestamps: UTC, `_at` suffix — `created_at`, `start_at`, `deleted_at`
- Status: `TEXT` named `status` with lowercase literals — never `is_active` boolean
- Duration: `INTEGER` seconds — `duration_seconds` (never float hours)
- Soft delete: `deleted_at TIMESTAMP NULL` — `NULL` = not deleted
- Roles: `role_id INTEGER FK → roles(role_id)` — never raw `TEXT`

### API

- Paths: plural kebab-case — `/time-entries`, `/projects`, `/project-managers`
- Fields: `snake_case` — `start_at`, `work_note`, `duration_seconds`
- Timestamps: ISO 8601 UTC — `'2026-05-11T09:00:00Z'`
- Duration: return both `duration_seconds` (int) and `duration_display` (`HH:MM`)
- `password_hash` and `microsoft_oid` never in any response
- `duration_seconds` never accepted from client payload

---

## Mutability Rules

| Column(s) | Mutable By | Notes |
|---|---|---|
| `time_entries: start_at, end_at` | User (own) | Backend recomputes `duration_seconds` |
| `time_entries: work_note` | User (own) | No restriction |
| `time_entries: duration_seconds` | System only | Never from client |
| `time_entries: source` | System only | Immutable after creation |
| `time_entries: any field` | Administrator | Logged in `audit_logs` |
| `tasks / projects: status` | Manager (managed), Administrator | Logged in `audit_logs` |
| `assignments: status` | Manager (managed), Administrator | New row on re-assignment |
| `project_managers: rows` | Manager (add/remove on own projects), Administrator (any) | Logged in `audit_logs` |
| `users: display_name` | User (own), Administrator | — |
| `users: role_id` | Administrator only | Logged; self-change blocked |
| `users: manager_id` | Administrator only | Logged in `audit_logs` |
| `users: status` | Administrator only | Logged in `audit_logs` |
| `roles` | Administrator (DB) | New roles via DB insert only |
| `role_permissions` | Administrator (DB) | Scope assignments via DB insert only |
| `permission_scopes` | Nobody | Seeded; code constants |
| `audit_logs`, `auth_logs`, `error_logs` | Nobody | Append-only |

---

## Scope Boundary

This is a time tracker. The following are explicitly out of scope.

| Out of scope | Reason |
|---|---|
| Task estimates / target hours | Budget tracking |
| Task assignees | Project management |
| Billing rates, invoicing | Financial scope |
| Task due dates, priorities | Project management |
| Budget-vs-actual comparison | Financial reporting |
| Per-user permission overrides | Not required; fixed roles sufficient |

Changes to this boundary require a new ADR revision.

---

## Consequences

**Positive**
- DB-managed `role_permissions` means new roles need no code deploy.
- `report_viewer` provides org-wide read visibility without management authority.
- Three separate log tables give clean isolation of concerns with independent consumers and retention policies.
- Manager scope is project-scoped via `project_managers` — no data leakage outside a Manager's projects.
- Report catalogue defines concrete outputs upfront, preventing scope creep in implementation.

**Negative**
- Permission cache must be invalidated on role changes; stale cache can cause brief permission drift.
- The glossary must be updated before any code change — discipline required.
- `project_managers` join requires a JOIN on every manager-scoped permission check (vs. a single column lookup).

---

## References

- Clockify, Toggl Track, Harvest — role and permission model reference.

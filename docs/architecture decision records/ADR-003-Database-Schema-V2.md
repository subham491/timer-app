# ADR-003: Database Schema Design V2

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 11-05-2026 |
| **Revised** | 10-06-2026 |
| **Deciders** | Mohammed Siddique, Subham Panda, Dayanand Hukkeri and Aswath Ravi |
| **Depends on** | ADR-001 |
| **Supersedes** | ADR-002 (01-05-2026) |

---

## Context

The prototype schema (ADR-002) was written before ADR-001 and contained 17 naming and structural violations. This ADR corrects all violations, adds missing domain entities, resolves design review feedback, and implements a scalable DB-managed RBAC model with four roles.

**This ADR and ADR-001 are the joint source of truth.** All migrations, ORM models, serialisers, and UI labels derive field names from these documents.

---

## Decision

Tweleve-table SQLite schema, strictly scoped to time tracking for Soliton. Forward-compatible with PostgreSQL without column renames.

---

## Schema Tables

### `roles`

Seeded; 4 rows. No runtime CRUD by application users.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `role_id` | INTEGER | N | PK AUTOINCREMENT |
| `name` | TEXT | N | UNIQUE. `'user'`, `'report_viewer'`, `'manager'`, `'administrator'` |
| `description` | TEXT | N | ADR-001 summary — self-documents without cross-referencing |
| `created_at` | TIMESTAMP | N | UTC |


---

### `permission_scopes`

Seeded; one row per defined scope. Names are code constants — not user-creatable.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `scope_id` | INTEGER | N | PK AUTOINCREMENT |
| `name` | TEXT | N | UNIQUE. e.g. `'reports:view_all'`, `'project_managers:manage_any'` |
| `description` | TEXT | N | Matches ADR-001 scope table |
| `created_at` | TIMESTAMP | N | UTC |

*(Seed data: one row per scope defined in ADR-001 Permission Scopes section.)*

---

### `role_permissions`

Maps roles to scopes. Seeded for the four base roles. New roles are added here without code changes.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `id` | INTEGER | N | PK AUTOINCREMENT |
| `role_id` | INTEGER | N | FK → roles(role_id) |
| `scope_id` | INTEGER | N | FK → permission_scopes(scope_id) |
| `granted_by` | INTEGER | Y | FK → users(user_id). NULL = seeded at migration |
| `created_at` | TIMESTAMP | N | UTC |

`UNIQUE(role_id, scope_id)` — prevents duplicate scope grants per role.

---

### `users`

| Column | Type | Null? | Notes |
|---|---|---|---|
| `user_id` | INTEGER | N | PK AUTOINCREMENT. Internal FK reference — never exposed externally |
| `universal_id` | TEXT | N | UNIQUE. Stable external identifier (UUID in PostgreSQL) |
| `display_name` | TEXT | N | Shown in UI/reports. From Microsoft `name` claim on first SSO login |
| `email` | TEXT | N | UNIQUE. Display/contact identifier. SSO lookup key is `microsoft_oid`, not email |
| `microsoft_oid` | TEXT | Y | UNIQUE. Azure OID (`oid` claim). Identity-binding key for SSO. Set on first SSO login; never changed. NULL for local-only users |
| `auth_provider` | TEXT | N | `'local'` or `'microsoft'`. Determines authentication path |
| `password_hash` | TEXT | Y | bcrypt (cost ≥ 12). NULL for SSO users. Never in API responses |
| `role_id` | INTEGER | N | FK → roles(role_id). Default = 1 (`user`). Changes logged in `audit_logs` |
| `manager_id` | INTEGER | Y | FK → users(user_id) self-ref. Direct manager for org hierarchy. NULL = top of tree. App prevents circular chains |
| `email_verified` | INTEGER | N | `0/1`. Auto-set to 1 on first SSO login. Required for local accounts before login |
| `status` | TEXT | N | `'active'` or `'archived'`. Archived = no login, no new entries; history preserved |
| `last_login_at` | TIMESTAMP | Y | UTC. Updated on every successful login. Used to detect dormant accounts |
| `created_at` | TIMESTAMP | N | UTC |
| `updated_at` | TIMESTAMP | N | UTC |
| `created_by` | INTEGER | Y | FK → users(user_id). NULL for self-registration/SSO. Set when Admin manually creates account |
| `updated_by` | INTEGER | Y | FK → users(user_id). Admin who last modified this record |
| `deleted_at` | TIMESTAMP | Y | NULL = not deleted. Soft-delete preserves FK integrity for Time Entries |

---

### `projects`

| Column | Type | Null? | Notes |
|---|---|---|---|
| `project_id` | INTEGER | N | PK AUTOINCREMENT |
| `universal_id` | TEXT | N | UNIQUE |
| `name` | TEXT | N | Display name in UI and reports |
| `description` | TEXT | Y | Optional project context. Distinct from `task_description` and `work_note` |
| `status` | TEXT | N | `'active'` or `'archived'` |
| `created_by` | INTEGER | N | FK → users(user_id). Immutable after creation |
| `created_at` | TIMESTAMP | N | UTC |
| `updated_at` | TIMESTAMP | N | UTC |
| `updated_by` | INTEGER | Y | FK → users(user_id). Last modifier |
| `deleted_at` | TIMESTAMP | Y | NULL = not deleted |

`manager_id` column is **not present** on `projects`. Project Manager authority is managed exclusively via `project_managers`.

---

### `project_managers`

Named managerial authority over a Project. Distinct from `assignments` — a Project Manager is not required to be assigned for time-logging. Supports multiple managers per project and preserves full history via `removed_at`.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `project_manager_id` | INTEGER | N | PK AUTOINCREMENT |
| `project_id` | INTEGER | N | FK → projects(project_id) ON DELETE CASCADE |
| `user_id` | INTEGER | N | FK → users(user_id) ON DELETE CASCADE. App enforces `role_id IN (3, 4)` |
| `assigned_by` | INTEGER | N | FK → users(user_id). Who granted this manager role. Immutable |
| `assigned_at` | TIMESTAMP | N | UTC. When the manager role took effect |
| `removed_at` | TIMESTAMP | Y | NULL = currently active. Set on removal — row is never deleted |
| `removed_by` | INTEGER | Y | FK → users(user_id). Who removed this manager. NULL while active |


**Partial unique index** — one active manager record per user-project pair:
```sql
CREATE UNIQUE INDEX idx_project_managers_active
  ON project_managers(user_id, project_id)
  WHERE removed_at IS NULL;
```

**All changes logged in `audit_logs`** — `entity_type = 'project_manager'`, `entity_id = project_manager_id`.

---

### `assignments`

User ↔ Project time-logging access. Status-tracked to preserve leave/rejoin gap history.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `assignment_id` | INTEGER | N | PK AUTOINCREMENT |
| `user_id` | INTEGER | N | FK → users(user_id) ON DELETE CASCADE |
| `project_id` | INTEGER | N | FK → projects(project_id) ON DELETE CASCADE |
| `assigned_by` | INTEGER | N | FK → users(user_id). Who created this assignment. Immutable |
| `status` | TEXT | N | `'active'` or `'inactive'`. Set to `'inactive'` on removal; new row on re-assignment |
| `created_at` | TIMESTAMP | N | UTC. Start of this tenure |
| `updated_at` | TIMESTAMP | N | UTC. When status last changed |
| `updated_by` | INTEGER | Y | FK → users(user_id). Who changed the status |
| `deleted_at` | TIMESTAMP | Y | Cascade soft-delete only. Not for voluntary removal — use `status = 'inactive'` |

**Partial unique index:**
```sql
CREATE UNIQUE INDEX idx_assignments_active
  ON assignments(user_id, project_id)
  WHERE status = 'active';
-- One active assignment per user-project pair; unlimited historical inactive rows.
```

---

### `tasks`

Time-categorisation labels within a Project. Not a deliverable, not assigned to a person.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `task_id` | INTEGER | N | PK AUTOINCREMENT |
| `universal_id` | TEXT | N | UNIQUE |
| `project_id` | INTEGER | N | FK → projects(project_id) ON DELETE CASCADE. NOT NULL — Task without Project is meaningless |
| `name` | TEXT | N | Category label shown in timer UI: `'Code Review'`, `'Sprint Planning'` |
| `task_description` | TEXT | Y | What work belongs in this category. Distinct from `work_note` |
| `status` | TEXT | N | `'active'` or `'archived'` |
| `created_at` | TIMESTAMP | N | UTC |
| `updated_at` | TIMESTAMP | N | UTC |
| `created_by` | INTEGER | N | FK → users(user_id). Manager/Administrator who created this Task |
| `updated_by` | INTEGER | Y | FK → users(user_id). Last modifier |
| `deleted_at` | TIMESTAMP | Y | NULL = not deleted. Time Entries preserved on soft-delete |

**Omitted fields:** `assigned_to` (task assignment is project management scope) and `estimate_seconds` (estimates are budget tracking scope). Both excluded per ADR-001 Scope Boundary.

---

### `time_entries`

The central data object. Every logged moment of work. Running Timer = `end_at IS NULL`.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `time_entry_id` | INTEGER | N | PK AUTOINCREMENT |
| `universal_id` | TEXT | N | UNIQUE |
| `task_id` | INTEGER | N | FK → tasks(task_id) ON DELETE CASCADE |
| `user_id` | INTEGER | N | FK → users(user_id) ON DELETE CASCADE |
| `work_note` | TEXT | Y | Per-session free-text. Not to be called `description`, `note`, or `comment` |
| `source` | TEXT | N | `'timer'` or `'manual'`. Set at creation; immutable |
| `start_at` | TIMESTAMP | N | UTC. Set by app on timer start, or by user for manual entry |
| `end_at` | TIMESTAMP | Y | UTC. NULL = Running Timer. Set on stop or manual input |
| `duration_seconds` | INTEGER | Y | System-computed `(end_at − start_at)`. NULL while running. Never from client payload |
| `created_at` | TIMESTAMP | N | UTC |
| `updated_at` | TIMESTAMP | N | UTC |
| `updated_by` | INTEGER | Y | FK → users(user_id). NULL until first post-creation edit |

---

### `audit_logs`

Business data mutations only. Append-only. No `UPDATE` or `DELETE` ever issued.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `audit_log_id` | INTEGER | N | PK AUTOINCREMENT |
| `event_type` | TEXT | N | `'{entity}.{action}'` — e.g. `'time_entry.edited'`, `'user.role_changed'`, `'project_manager.added'` |
| `entity_type` | TEXT | N | `'time_entry'`, `'user'`, `'project'`, `'task'`, `'assignment'`, `'project_manager'` |
| `entity_id` | INTEGER | N | PK of the affected row |
| `actor_user_id` | INTEGER | Y | FK → users(user_id). NULL = system event |
| `old_value` | TEXT | Y | JSON of changed fields before mutation. Never includes `password_hash` or `microsoft_oid` |
| `new_value` | TEXT | Y | JSON of changed fields after mutation. Same exclusions |
| `created_at` | TIMESTAMP | N | UTC |

**Covers:** Time Entry create/edit/delete, User role/status/manager changes, Project/Task archive/restore, Assignment activate/deactivate, Project Manager add/remove.

---

### `auth_logs`

Authentication and security events only. Append-only.

| Column | Type | Null? | Notes |
|---|---|---|---|
| `auth_log_id` | INTEGER | N | PK AUTOINCREMENT |
| `event_type` | TEXT | N | `'sso_login_success'`, `'sso_login_failure'`, `'local_login_success'`, `'local_login_failure'`, `'logout'` |
| `user_id` | INTEGER | Y | FK → users(user_id). NULL if user not identified (unknown email on failed login) |
| `auth_provider` | TEXT | Y | `'local'` or `'microsoft'` |
| `ip_address` | TEXT | Y | For security pattern analysis. May be hashed for privacy compliance |
| `failure_reason` | TEXT | Y | `'invalid_password'`, `'account_archived'`, `'sso_token_invalid'`, `'sso_tenant_mismatch'`, `'unknown_user'`. NULL on success |
| `created_at` | TIMESTAMP | N | UTC |

---

### Sessions (Redis — not a SQL table)

The Backend-for-Frontend authentication model (ADR-004, ADR-006, ADR-011) stores user sessions in **Redis**, not in PostgreSQL. They are deliberately *not* a table in this schema: sessions are short-lived, high-churn, and benefit from Redis-native key TTL for idle expiry, none of which fits the durable relational model this ADR governs. They are documented here only so the schema is not mistaken for the complete persistence picture.

Each session is keyed `session:{session_id}` and holds: the internal `user_id`, the bound CSRF token, an **application-encrypted** cache of the user's Microsoft access and refresh tokens (encrypted before write — Redis is not relied on for at-rest encryption), `created_at`, and `last_seen_at`. A reverse index `user:{user_id}:sessions` (a Redis set) supports revoking all of a user's sessions on archival. Idle expiry (30 minutes) is the key TTL; the absolute cap (8 hours) is checked against `created_at`. The authoritative shape is in `CONTRACT-backend-auth.md`.

The `users` table remains the source of truth for identity and `microsoft_oid` binding; the `auth_logs` table remains the durable audit trail of sign-in and sign-out events. Sessions vanishing from Redis (expiry, eviction, or a restart without AOF) only signs users out — it loses no auditable or business data.

---

### `error_logs`

System and application errors for developer root-cause analysis. Append-only. Accessible only to users with `error_logs:read` scope (Administrator).

| Column | Type | Null? | Notes |
|---|---|---|---|
| `error_log_id` | INTEGER | N | PK AUTOINCREMENT |
| `severity` | TEXT | N | `'warning'`, `'error'`, `'critical'` |
| `error_code` | TEXT | N | Application-defined code: `'DB_QUERY_FAILED'`, `'EXTERNAL_TIMEOUT'`, `'VALIDATION_ERROR'` |
| `message` | TEXT | N | Non-sensitive error description. No credentials, tokens, or PII |
| `stack_trace` | TEXT | Y | Truncated stack trace for RCA. Excluded for `'warning'` severity |
| `request_id` | TEXT | Y | Correlation ID linking this error to a specific request across logs |
| `endpoint` | TEXT | Y | API path that was processing when the error occurred |
| `http_method` | TEXT | Y | `'GET'`, `'POST'`, etc. |
| `user_id` | INTEGER | Y | FK → users(user_id). Whose request triggered the error. NULL for background jobs |
| `context` | TEXT | Y | JSON of non-sensitive debugging context. No credentials, tokens, or PII |
| `created_at` | TIMESTAMP | N | UTC |

**Retention:** Delete entries older than 90 days.
```sql
DELETE FROM error_logs WHERE created_at < datetime('now', '-90 days');
```

---

## Structural Rules

### Running Timer

Stop any existing Running Timer before inserting a new one. Both in a single transaction.

```sql
UPDATE time_entries
SET end_at = CURRENT_TIMESTAMP,
    duration_seconds = strftime('%s', CURRENT_TIMESTAMP) - strftime('%s', start_at),
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = :user_id AND end_at IS NULL;
-- Then INSERT the new Time Entry
```

> PostgreSQL: `CREATE UNIQUE INDEX ON time_entries (user_id) WHERE end_at IS NULL;`

---

### Soft-Delete Coverage

| Table | `deleted_at`? | Why |
|---|---|---|
| `users` | ✅ | FK integrity; Time Entries must outlive User archival |
| `projects` | ✅ | Task/Time Entry history must survive archival |
| `assignments` | ✅ | Cascade structural cleanup; distinct from `status = 'inactive'` |
| `tasks` | ✅ | Time Entries must survive Task archival |
| `project_managers` | ❌ | History preserved via `removed_at` — no soft-delete needed |
| `time_entries` | ❌ | Explicit user action; trail is in `audit_logs` |
| `audit_logs` | ❌ | Immutable |
| `auth_logs` | ❌ | Immutable |
| `error_logs` | ❌ | TTL-managed (90-day retention) |
| `roles` | ❌ | Seeded reference data |
| `permission_scopes` | ❌ | Seeded reference data |
| `role_permissions` | ❌ | Deactivate by deleting the row (scope removal is intentional) |

---

### Recommended Indexes

| Table | Columns | Purpose |
|---|---|---|
| `users` | `(role_id)` | Filter by role |
| `users` | `(manager_id)` | Direct-report lookups |
| `users` | `(status)` | Active user queries |
| `projects` | `(status)` | Active project list |
| `project_managers` | `(user_id)` | "My managed projects" list |
| `project_managers` | `(project_id)` | "Who manages this project?" |
| `assignments` | `(user_id, status)` | "My Projects" list |
| `assignments` | `(project_id, status)` | Project member directory |
| `tasks` | `(project_id, status)` | Task list per project |
| `time_entries` | `(user_id, end_at)` | Running Timer lookup |
| `time_entries` | `(user_id, start_at)` | Timesheet queries (R-01, R-02) |
| `time_entries` | `(task_id, start_at)` | Task-scoped aggregation (R-06) |
| `audit_logs` | `(entity_type, entity_id)` | Record-specific audit history |
| `auth_logs` | `(event_type, created_at)` | Security pattern queries |
| `error_logs` | `(error_code, created_at)` | Error pattern / RCA queries |
| `error_logs` | `(severity, created_at)` | Critical error triage |

---

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| `projects.manager_id` single column | Cannot support multiple managers per project; no history of past managers. `project_managers` join table adopted instead. |
| Hard-coded `ROLE_SCOPES` dict | New roles require code deploy. `role_permissions` table makes it a DB operation. |
| `UNIQUE(user_id, project_id, status)` on assignments | Allows unlimited `'inactive'` rows. Partial index `WHERE status = 'active'` is correct. |
| `assigned_to` on tasks | Tasks are time categories; task assignment is project management scope. |
| `estimate_seconds` on tasks | Estimates are budget tracking scope; excluded by ADR-001 Scope Boundary. |
| `email` as SSO lookup key | Email can change; Azure OID cannot. |
| System errors in `audit_logs` | Different consumers, retention, queries. Separation is correct — hence dedicated `error_logs`. |
| Single `audit_logs` for all event types | Auth, business, and error events have distinct audiences and retention. Three tables required. |
| PostgreSQL immediately | Prototype requires zero-infrastructure. Schema migrates with type substitutions only. |

---

## PostgreSQL Migration

No column renames needed. Type substitutions and constraint promotion only.

| SQLite | PostgreSQL |
|---|---|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` |
| `TIMESTAMP` | `TIMESTAMPTZ DEFAULT NOW()` (all `_at` columns; session tz = UTC) |
| `email_verified INTEGER` | `BOOLEAN DEFAULT FALSE` |
| `universal_id TEXT UNIQUE` | `UUID DEFAULT gen_random_uuid()` |

```sql
-- PostgreSQL-level constraints to add on migration
CREATE UNIQUE INDEX ON time_entries (user_id) WHERE end_at IS NULL;
CREATE UNIQUE INDEX ON assignments (user_id, project_id) WHERE status = 'active';
CREATE UNIQUE INDEX ON project_managers (user_id, project_id) WHERE removed_at IS NULL;

ALTER TABLE users           ADD CONSTRAINT chk_users_status   CHECK (status IN ('active','archived'));
ALTER TABLE users           ADD CONSTRAINT chk_users_auth     CHECK (auth_provider IN ('local','microsoft'));
ALTER TABLE projects        ADD CONSTRAINT chk_proj_status    CHECK (status IN ('active','archived'));
ALTER TABLE tasks           ADD CONSTRAINT chk_task_status    CHECK (status IN ('active','archived'));
ALTER TABLE assignments     ADD CONSTRAINT chk_asgn_status    CHECK (status IN ('active','inactive'));
ALTER TABLE time_entries    ADD CONSTRAINT chk_te_source      CHECK (source IN ('timer','manual'));
ALTER TABLE time_entries    ADD CONSTRAINT chk_te_duration    CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
ALTER TABLE error_logs      ADD CONSTRAINT chk_err_severity   CHECK (severity IN ('warning','error','critical'));
```

---

## Consequences

**Positive**
- DB-managed `role_permissions` supports new roles without code deploys.
- `project_managers` join table supports multiple managers per project and preserves full manager history — the `removed_at` pattern matches the gap-tracking model already used in `assignments`.
- `report_viewer` provides org-wide reporting visibility without management authority.
- Three log tables give independent concerns: data governance, security, and developer RCA.
- `error_logs` with `request_id` and `context` enables effective cross-log correlation for RCA.
- Manager scope is project-scoped via `project_managers` — no cross-project data leakage.

**Negative**
- Permission cache must be invalidated on `role_permissions` changes; brief stale window possible.
- `error_logs` grows continuously — 90-day retention job must run reliably.
- `roles` FK + `permission_scopes` FK adds seed-data dependency: seed order is `permission_scopes` → `roles` → `role_permissions` → `users`.
- Manager-scope gate now requires a JOIN on `project_managers` (vs. a single column check on `projects`); acceptable for the correctness and history benefits.

**Neutral**
- `error_logs` is developer-facing; requires `error_logs:read` scope (Administrator only).

---

## Future Scope

| Feature | Schema Change |
|---|---|
| Time Entry Approval | Add `approval_status`, `approved_by`, `approval_note` to `time_entries` |
| Client / Account | New `clients` table; `projects.client_id FK` |
| Third-party Integrations | New `integrations` table mapping external IDs to Tasks |
| Per-user Permission Overrides | New `user_permissions` override table if ever required |

---

## Implementation Notes

**Seed order:** `permission_scopes` → `roles` → `role_permissions` → then all domain tables.

**Migration from prototype:**
1. Seed `permission_scopes`, `roles`, `role_permissions`.
2. Create `projects`, `assignments`, `audit_logs`, `auth_logs`, `error_logs`.
3. Rename `timelogs` → `time_entries`; rename columns per Change Log.
4. Add `microsoft_oid`, `role_id` (from `role` text), drop `microsoft_userid`, `microsoft_tenantid`, `password_salt`.
5. Add `manager_id`, `email_verified`, `created_by`, `updated_by` to `users`.
6. Drop `manager_id` from `projects`; add `updated_by`. Create `project_managers` table.
7. Add `status`, `updated_at`, `updated_by` to `assignments`; create partial unique index.
8. Drop `assigned_to`, `estimate_seconds` from `tasks`; add `created_by`, `updated_by`.
9. Enforce `tasks.project_id NOT NULL`; replace `tasks.status 'todo'` → `'active'`.
10. Add `deleted_at` where required; apply all indexes.

**Repository:**
- All standard queries: `WHERE deleted_at IS NULL`
- Assignments: `AND status = 'active'` for access-control queries
- Project Manager gate: `WHERE removed_at IS NULL` on `project_managers`
- `duration_seconds`: always compute server-side; strip from all inbound payloads
- Running Timer: stop-and-insert in one transaction
- JWT signature and claims validation performed in authentication middleware on every authenticated request.
- Cleanup jobs: error_logs (daily, 90-day retention)

**Security:**
- bcrypt cost factor ≥ 12; hash server-side only
- `password_hash` and `microsoft_oid` never in API responses
- Validate the `tid` claim against `MICROSOFT_TENANT_ID` during the backend code exchange
- `error_logs.context` must be sanitised before write — no credentials, tokens, or PII; auth `code`/`state` values must never be logged
- Administrator self-demotion blocked in application logic before DB write
- App enforces `role_id IN (3, 4)` before inserting into `project_managers`
- Sessions are server-side (Redis) and revocable; logout, archival, and admin kill end them immediately. Account `status` is re-checked on every request so a revoked or archived user is rejected on their next request.
- Archival revokes all of a user's sessions: commit the archive in PostgreSQL, then delete the session keys and the `user:{user_id}:sessions` set in Redis.
- The Microsoft token cache in each session is encrypted application-side before being written to Redis.

---

## References

- ADR-001 — Domain Glossary & Access Control Policy (18-05-2026)
- ADR-002 — Prototype schema (superseded; retain for migration reference)
- ADR-004 — System Architecture (BFF model, Redis session store)
- ADR-006 — Authentication Flow (session model, `oid` binding)
- CONTRACT-backend-auth.md — authoritative session shape and `auth_logs` event mapping
- Microsoft Identity Platform — OIDC `oid`, `tid` claims
- bcrypt — Provos & Mazières, 1999 (USENIX)
- Clockify, Toggl Track, Harvest — role model reference
- SQLite docs — partial indexes, `PRAGMA foreign_keys`
- PostgreSQL 14 docs — `TIMESTAMPTZ`, `BIGSERIAL`, partial indexes, `CHECK` constraints

---

## Change Log

| Date | Change |
|---|---|
| 11-05-2026 | Initial V2 schema, superseding ADR-002; corrected 17 naming/structural violations, added domain entities and DB-managed RBAC. |
| 18-05-2026 | Review revision aligning terminology with ADR-001. |
| 10-06-2026 | BFF authentication revision. Added `'unknown_user'` to the `auth_logs.failure_reason` values. Added a Sessions note documenting that sessions live in Redis (not a SQL table) with an application-encrypted Microsoft token cache, idle-TTL expiry, and a per-user reverse index for revocation. Replaced the stale stateless-JWT security notes with the server-side session model (revocable, per-request `status` recheck, commit-then-revoke on archival). No relational table changes. |
# Timer App — Backend

FastAPI backend with Microsoft SSO (BFF pattern), Redis-backed sessions, and
CSRF protection. PostgreSQL via SQLAlchemy. Managed with [uv](https://docs.astral.sh/uv/).

## Requirements

- **Python 3.13+**
- **PostgreSQL 13+** (pgAdmin 4 optional, for inspecting data)
- **Docker Desktop** (to run Redis)
- **uv** — install with `pip install uv`

## Quick start

```bash
# 1. Install dependencies into an isolated .venv
uv sync

# 2. Create your environment file and fill it in
cp .env.example .env
#    - set SECRET_KEY (python -c "import secrets; print(secrets.token_hex(32))")
#    - set DATABASE_URL to your Postgres
#    - leave APP_ENV=development for one-click dev login

# 3. Start Redis (sessions live here)
docker run -d --name timer-redis -p 6379:6379 \
  redis:7-alpine redis-server --requirepass devredispass
# (later: docker start timer-redis)

# 4. Create the database in pgAdmin (or let the app create it):
#    a database named  timer_app_db
#    Tables + role seed data are created automatically on first run.

# 5. Run the dev server
uv run uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` — check `http://localhost:8000/health`
and the API docs at `http://localhost:8000/docs`.

## Seed your first user

Roles are seeded automatically, but you need at least one **active** user.
Run this in pgAdmin against `timer_app_db`:

```sql
INSERT INTO users
  (universal_id, display_name, email, auth_provider, role, role_id,
   status, is_active, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'Local Admin', 'admin@example.com', 'microsoft',
   'administrator', 4, 'active', true, true, now(), now());
```

- **Dev mode** picks any active admin/manager automatically — email can be anything.
- **Real SSO** matches by email, so set `email` to the actual Microsoft account
  you'll sign in with. `microsoft_oid` is bound automatically on first login.

`role_id`: 1 = user, 2 = report_viewer, 3 = manager, 4 = administrator.

## Auth modes

| Mode | `.env` | How you sign in |
|---|---|---|
| **Development** | `APP_ENV=development`, `DEV_AUTH_ENABLED=true` | One click — the frontend auto-logs-in via `/api/auth/dev-login`, plus a "login as" user switcher. No Microsoft setup needed. |
| **Real SSO** | `APP_ENV=production`, `DEV_AUTH_ENABLED=false` | Real Microsoft sign-in. Requires Entra config below. |

Env changes are read at startup — **restart the backend** after editing `.env`.

### Real Microsoft SSO setup

1. In Entra, register a **Web** redirect URI matching `OAUTH_REDIRECT_URI`
   (e.g. `http://localhost:8000/api/auth/callback`).
2. Create a client secret; put its **Value** in `MICROSOFT_CLIENT_SECRET`, and
   set `MICROSOFT_TENANT_ID` / `MICROSOFT_CLIENT_ID`.
3. Ensure a `users` row exists whose `email` matches your Microsoft account.
4. Set `APP_ENV=production`, restart, and sign in from the app's login page.

Keep `COOKIE_SECURE=false` on local http; set it `true` only behind HTTPS.

## Project layout

```
app/
├── main.py              # app + middleware (CSRF, security headers), lifespan
├── config.py            # settings (reads .env)
├── redis_client.py      # shared Redis client
├── api/
│   ├── deps.py          # get_current_user (reads the session cookie)
│   └── endpoints/       # auth, users, projects, tasks, timer, reports, ...
├── services/            # auth_service, session_store, bff_auth_service, ...
├── repositories/        # DB queries
├── models/              # SQLAlchemy models
├── middleware/          # csrf.py, security_headers.py
└── db/                  # connection, init_db (auto-create + seed)
```

## Tests

```bash
uv run pytest
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `AttributeError: 'Settings' object has no attribute ...` | A field is missing from `config.py`/`.env`. |
| 500 on `/api/auth/dev-login` | Redis not running, or `REDIS_URL` password mismatch. |
| `"Development auth endpoint is not available."` | You're in `APP_ENV=production` — that's expected; use real SSO. |
| 403 `"Your account isn't enabled."` after Microsoft login | No `users` row matches your Microsoft email. |
| `redirect_uri mismatch` at Microsoft | `OAUTH_REDIRECT_URI` must exactly equal the Entra Web redirect URI. |
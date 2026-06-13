# CONTRACT: Backend Authentication API (BFF Model)

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 10-06-2026 |
| **Owner** | Frontend + Backend |
| **Depends on** | ADR-001, ADR-003, ADR-004, ADR-006, ADR-011 |
| **Implements** | ADR-007 |

---

## Scope

The wire contract for authentication under the BFF model. The backend owns the OAuth exchange against Microsoft as a confidential client; the browser holds only an httpOnly session cookie. There is no Bearer header, no app JWT in any response body, and no token-handling code in the frontend. Sessions are stored in Redis; real-time timer state is delivered over SSE.

| ADR-007 capability | This contract | Status |
|---|---|---|
| Microsoft SSO authentication | `GET /auth/login` + `GET /auth/callback` | Specified |
| Current authenticated user retrieval | `GET /auth/me` | Specified |
| Logout | `POST /auth/logout` | Specified |
| Token refresh | Internal to the backend (silent Microsoft refresh per session) | Specified — **no client-facing endpoint** |
| Local authentication fallback | — | Out per ADR-006 |

---

## Conventions

- **Origin:** the SPA and the API are served from the same origin behind the reverse proxy; the API is mounted under `/api`. All paths below are relative to `/api`. Cross-origin deployment is out of contract.
- **Content-Type:** `application/json` for JSON endpoints. `GET /auth/login` and `GET /auth/callback` are browser navigations and respond with `302`, not JSON.
- **Timestamps:** ISO 8601 UTC.
- **Error envelope** (ADR-004) for every JSON 4xx/5xx:

```json
{ "error_code": "<machine-readable code>", "message": "<human-readable text>" }
```

Redirect endpoints cannot return JSON to the SPA; they signal errors via `302` to `/login?error=<error_code>` (see Error Signaling).

### Cookies

| Cookie | Attributes | Purpose |
|---|---|---|
| `timer_session` | `HttpOnly; Secure; SameSite=Lax; Path=/api` | Opaque session identifier (>=128-bit random, not a JWT). Resolved server-side to the Redis session record. |
| `timer_csrf` | `Secure; SameSite=Lax; Path=/` (readable by JS) | CSRF token for the double-submit check. |

Both are session-scoped with `Max-Age` equal to the absolute session TTL. Neither cookie ever contains User data or Microsoft tokens.

### CSRF (double-submit)

Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) must carry the header:

```
X-CSRF-Token: <value of the timer_csrf cookie>
```

The backend rejects mutating requests where the header is missing or does not match the value bound to the session: `403 { "error_code": "csrf_mismatch" }`. `GET` requests are exempt — this includes the SSE stream, which is GET-only and read-only. The axios interceptor attaches the header globally on mutating methods.

### The `user` object

Returned by `GET /auth/me`. Field names per ADR-003. **`user_id`, `microsoft_oid`, and `password_hash` are never included.**

```json
{
  "universal_id": "9f1c8e2a-3b7d-4c10-9e21-7a0b5d2f4c88",
  "display_name": "Subham Panda",
  "email": "subham.panda@soliton.com",
  "role": "administrator",
  "status": "active",
  "auth_provider": "microsoft"
}
```

- `role` — one of `user`, `report_viewer`, `manager`, `administrator` (ADR-001).
- `status` — `active` or `archived`.

---

## Session Model (Redis)

A session is a Redis record created at sign-in and destroyed at logout, expiry, or revocation.

**Primary key:** `session:{session_id}` -> a hash (or serialized blob) containing:

| Field | Notes |
|---|---|
| `user_id` | Internal FK reference. Never exposed. |
| `csrf_token` | Bound value for the double-submit check. |
| `ms_token_cache` | Microsoft access + refresh tokens, **encrypted by the application** before write (`SESSION_ENCRYPTION_KEY`). Redis is not relied on for at-rest encryption. Never leaves the backend. |
| `created_at` | UTC. Drives the absolute lifetime. |
| `last_seen_at` | UTC. Refreshed on activity; drives the idle timeout. |

**Reverse index for revocation:** `user:{user_id}:sessions` -> a Redis set of that User's live `session_id`s. This makes "revoke all of a User's sessions" an O(set-size) delete rather than a keyspace scan.

**Idle expiry via native TTL.** Each `session:{session_id}` key is written with a Redis TTL equal to the idle window. Activity resets the TTL (sliding window). When the key expires, the session is gone with no cleanup job. The absolute lifetime is enforced by checking `created_at` on each request and rejecting once exceeded.

**Lifetime policy (decided):**

- **Idle timeout:** 30 minutes (sliding; TTL on the session key).
- **Absolute lifetime:** 8 hours since `created_at` (hard cap regardless of activity).

The idle window matches ADR-006's original 30-minute number; the 8-hour absolute cap is acceptable because the unlocked-laptop threat is bounded by idle expiry and the session is revocable at any moment. Both are environment variables.

**Silent Microsoft refresh.** When the session's Microsoft access token nears expiry, the backend refreshes it using the stored refresh token. If Microsoft refuses (password change, account disabled, conditional-access change), the session is revoked and the next request returns 401. The client never sees or participates in refresh.

**Validation on every request.** Middleware resolves `timer_session` -> Redis lookup, confirms the key exists (idle TTL not yet elapsed), checks `created_at` against the absolute cap, and confirms the User's `status` is `active`. Role and `scopes[]` are loaded per request (or from the role->scope cache per ADR-001), so role changes apply on the **next request** — an improvement over the JWT model's expiry lag.

**Persistence.** Redis persistence (AOF) is enabled so sessions survive a Redis restart; if persistence is disabled in a given environment, a Redis restart logs all users out (acceptable — they re-sign-in silently). This is a deployment decision, recorded here so it is not left to the Redis default by accident.

---

## Endpoints

### `GET /auth/login`

Begins sign-in. Browser navigation, not XHR.

**Query parameters**

| Param | Required | Notes |
|---|---|---|
| `return_to` | No | SPA path to land on after sign-in. Must be a relative path beginning `/`; anything else is replaced with `/time-tracker` (open-redirect guard). |

**Behavior**

1. Generate `state` (CSRF for the OAuth leg) and PKCE verifier; persist both in a short-lived, httpOnly `timer_oauth` cookie (10-minute TTL).
2. `302` to Microsoft's authorize endpoint: confidential client ID, backend redirect URI (`/api/auth/callback`), `scope=openid profile email offline_access`, `state`, PKCE challenge.

If the caller already has a live session, respond `302` directly to `return_to` — idempotent sign-in.

**Rate limiting:** light, per-IP, app-level (see Configuration). Low abuse value — it only issues a redirect.

---

### `GET /auth/callback`

Microsoft's redirect target. Browser navigation.

**Processing order**

1. Validate `state` against the `timer_oauth` cookie; on mismatch -> error redirect `oauth_state_mismatch`.
2. If Microsoft returned `error=access_denied` (user cancelled) -> `302 /login` with **no** error param (ADR-006 §1: cancel shows no error).
3. Exchange the code (client secret + PKCE verifier) for tokens; validate the identity token's signature, `iss`, `aud`, `exp`, and `tid` against `MICROSOFT_TENANT_ID` -> on failure `sso_token_invalid` / `sso_tenant_mismatch`.
4. Resolve the User per ADR-006 §6: lookup by `microsoft_oid`; if none, lookup by `email` and bind `oid` (first sign-in); if none -> `unknown_user`.
5. If `status = 'archived'` -> `account_archived`.
6. Create the Redis session (encrypting the Microsoft token cache), add the `session_id` to `user:{user_id}:sessions`, set `timer_session` and `timer_csrf`, delete `timer_oauth`, update `users.last_login_at`, write `auth_logs` (`sso_login_success`).
7. `302` to the validated `return_to` (default `/time-tracker`).

**Error signaling** — every failure writes `auth_logs` with the matching `failure_reason`, sets no session cookies, and redirects:

| Condition | Redirect | `auth_logs.failure_reason` | SPA message (ADR-006 §1) |
|---|---|---|---|
| Not pre-created | `/login?error=unknown_user` | `unknown_user` | "Your account isn't enabled. Contact your administrator." |
| Archived | `/login?error=account_archived` | `account_archived` | "This account has been archived." |
| Wrong tenant | `/login?error=sso_tenant_mismatch` | `sso_tenant_mismatch` | "We couldn't sign you in. Please try again." |
| Invalid token / exchange failure | `/login?error=sso_token_invalid` | `sso_token_invalid` | "We couldn't sign you in. Please try again." |
| State mismatch / expired `timer_oauth` | `/login?error=oauth_state_mismatch` | `sso_token_invalid` | "We couldn't sign you in. Please try again." |
| User cancelled at Microsoft | `/login` (no param) | — (not logged as failure) | none |

**Rate limiting:** stricter, per-IP, app-level — this is the expensive endpoint (token exchange + DB writes + Redis write).

---

### `GET /auth/me`

Boot-time and on-demand session verification. The frontend's single source of session truth.

**Auth:** `timer_session` cookie. No CSRF header (GET).

**`200 OK`**

```json
{
  "user": { "...user object..." },
  "scopes": ["time_entries:create_own", "time_entries:read_own", "reports:view_own", "..."]
}
```

`scopes` is the flattened scope list for the User's role per ADR-001's role->scope matrix. The frontend gates UX on this array and never on `role`.

**`401 Unauthorized`** — no cookie, unknown/expired/revoked session, or archived User:

```json
{ "error_code": "session_invalid", "message": "Your session has expired. Please sign in again." }
```

One generic code by design — the client's reaction (force sign-out) is identical in every case, and distinguishing them would leak session-state information.

---

### `POST /auth/logout`

**Auth:** `timer_session` cookie + `X-CSRF-Token` header.

**Behavior:** delete the Redis session key, remove the `session_id` from `user:{user_id}:sessions`, expire both cookies (`Max-Age=0`), write `auth_logs` (`logout`). This is true revocation, not audit-only.

**`204 No Content`** — also returned when the session was already invalid; logout is idempotent and never fails for the user.

> Microsoft single sign-out (clearing the Microsoft browser session) is intentionally out of scope: signing the user out of Microsoft would affect other Soliton tools. The session being revoked means re-entry to the timer app requires a fresh (usually silent) Microsoft sign-in.

---

### Real-time timer state (SSE)

A read-only, server-to-client SSE stream carries timer state changes for the authenticated User across their open tabs and devices. This replaces the previously planned WebSocket channel.

**Endpoint:** `GET /timer/stream` (timer domain; referenced here for the auth contract).

**Auth:** `timer_session` cookie, attached automatically on the `EventSource` GET. No CSRF header (GET, read-only). Validated by the same session middleware as every other request.

**Behavior**

- On connect, the middleware validates the session exactly as for any request; an invalid session gets `401` and the `EventSource` enters its error/reconnect cycle.
- The server emits typed events (timer started, stopped, updated, deleted) for the authenticated User's sessions.
- If the session expires or is revoked while the stream is open, the server **closes the stream**. The client's `EventSource.onerror` fires; its reconnect attempt re-validates via the next `/auth/me` or stream request, receives `401`, and the frontend forces sign-out. The stream is never an independent auth path.
- The event is a hint: the client invalidates the affected TanStack Query keys and refetches; it never trusts the payload as authoritative.

**Reverse-proxy requirement:** SSE responses must not be buffered by the proxy. Set `X-Accel-Buffering: no` (nginx) or the Caddy equivalent on this route, and ensure response buffering/compression is disabled for the stream. This is the most common cause of "SSE works locally but stalls behind the proxy" — flagged for whoever owns the reverse-proxy config.

---

### Session revocation (administrative)

Archiving a User (existing User Management surface, ADR-007) must revoke all of that User's live sessions: after the archive commits in PostgreSQL, delete every `session_id` listed in `user:{user_id}:sessions`, then the set itself.

**Consistency note:** Redis is outside the PostgreSQL transaction, so revocation is *not* atomic with the archive. The order is commit-then-revoke. A sub-second window exists where an archived User's already-in-flight request could still pass before its session key is deleted; the next request fails because middleware re-checks `status`. This window is an accepted, documented trade-off of an out-of-transaction session store. A standalone "revoke sessions" admin endpoint is deferred to the Admin Panel work.

---

## Audit Logging (ADR-003 `auth_logs`)

| Event | `event_type` | Notes |
|---|---|---|
| Successful sign-in | `sso_login_success` | On callback step 6 |
| Failed sign-in | `sso_login_failure` | With `failure_reason` per the callback table |
| Logout | `logout` | On `POST /auth/logout` |

`unknown_user` is added to ADR-003's `failure_reason` enumeration as part of the bundled ADR-003 revision (see Resolved Decisions).

---

## Configuration

| Variable | Notes |
|---|---|
| `MICROSOFT_CLIENT_ID` | Web-platform App Registration |
| `MICROSOFT_CLIENT_SECRET` | **New.** Confidential client secret. Backend-only; rotation procedure owned by IT |
| `MICROSOFT_TENANT_ID` | Unchanged |
| `REDIS_URL` | **New.** Session store connection |
| `SESSION_IDLE_SECONDS` | Default 1800 (30 minutes) |
| `SESSION_ABSOLUTE_SECONDS` | Default 28800 (8 hours) |
| `SESSION_ENCRYPTION_KEY` | **New.** Application-side encryption of `ms_token_cache` before writing to Redis |
| `AUTH_LOGIN_RATE_LIMIT` | App-level per-IP limit on `/auth/login` (light) |
| `AUTH_CALLBACK_RATE_LIMIT` | App-level per-IP limit on `/auth/callback` (stricter) |

`JWT_SECRET` and `JWT_TTL_SECONDS` are retired with this contract.

---

## Decisions

| Topic | Decision |
|---|---|
| Session store | **Redis**, idle expiry via native key TTL, `ms_token_cache` encrypted application-side |
| Session TTL | **30-minute idle, 8-hour absolute**; both env-configurable |
| Real-time channel | **SSE** (cookie-authenticated, read-only), replacing WebSocket |
| Rate limiting | **App-level**, per-IP; light on `/auth/login`, stricter on `/auth/callback` |
| Azure App Registration | **Web platform** with a backend-only client secret; redirect URI `{API_ORIGIN}/api/auth/callback` |
| ADR-003 schema | **One bundled revision** adding the session model notes and the `unknown_user` `failure_reason` value |
| Admin revocation | Commit-then-revoke against Redis; sub-second non-atomic window accepted and documented |

---

## Remaining External Dependency

**Azure App Registration** must be re-provisioned as a Web platform with a client secret and redirect URI `{API_ORIGIN}/api/auth/callback`. This is the blocking external dependency, routed through IT via Uthra. Everything else can be built and tested against mock mode until this lands.

---

## References

- ADR-001 — Domain Glossary & Access Control Policy
- ADR-003 — Database Schema V2 (`users`, `auth_logs`; session model + `unknown_user` added in the bundled revision)
- ADR-004 — System Architecture (revision pending: session storage, client secret, real-time channel, error envelope retained)
- ADR-006 — Authentication Flow (§6 lifecycle unchanged; §§1-5 mechanics superseded)
- ADR-011 — Frontend Authentication Implementation (BFF)
- OAuth 2.0 for Browser-Based Apps (IETF draft) — BFF pattern; OWASP CSRF Prevention Cheat Sheet — double-submit cookie
# ADR-011: Authentication Implementation (BFF Model)

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 10-06-2026 |
| **Deciders** | Fronent + Backend Team |
| **Depends on** | ADR-001, ADR-004, ADR-005, ADR-006 |
| **Companion** | CONTRACT-backend-auth.md |

---

## Context

An earlier draft of this ADR proposed an SPA token model: MSAL.js running in the browser, exchanging a Microsoft identity token for an app JWT at `POST /auth/login`, with the JWT stored in `localStorage` and sent as a Bearer header. That draft was not accepted.

The SPA token model was evaluated against two alternatives — httpOnly-cookie JWT and a full Backend-for-Frontend (BFF) — and this ADR proposes the BFF model. The deciding factors:

- **Token revocation.** The stateless JWT model had no mid-session revocation; a compromised token stayed valid until expiry. BFF sessions are server-side records that can be deleted instantly.
- **XSS exposure.** No token of any kind is reachable from JavaScript. `localStorage` token theft, the primary residual risk accepted in ADR-004, is eliminated.
- **Relogin friction.** The 30-minute hard re-login (ADR-006 section: 4) disappears as a *hard* event: the backend silently renews its Microsoft tokens server-side, and the session lives up to a full workday.

This model reverses two decisions recorded as accepted in the depended-on ADRs and therefore requires the corresponding ADR revisions to land together with it: ADR-004 ("no server-side session storage", "no client secret needed") and ADR-006 (token mechanics in sections 1–5). The user lifecycle in ADR-006 section: 6 — admin pre-creation, `microsoft_oid` binding on first sign-in, archival offboarding — is unchanged and remains authoritative.

All domain terms follow ADR-001. The identity service is referred to as **Microsoft** (the identity service behind the `'microsoft'` Auth Provider).

---

## Decision

The frontend no longer participates in the OAuth flow and never holds a token.

1. **The backend owns the entire OAuth exchange.** Sign-in is a full-page redirect to a backend endpoint, which drives the authorization-code flow against Microsoft as a confidential client and ends by redirecting the browser back to the SPA with an httpOnly session cookie set.
2. **The frontend's only authentication artifact is the session cookie**, which the browser attaches automatically. The frontend cannot read it, does not store it, and has no storage seam for tokens.
3. **Session state in the frontend is derived exclusively from `GET /auth/me`.** The Redux `auth` slice holds the User profile, `scopes[]`, and one of three session states — it holds no token field.
4. **MSAL.js is removed from the frontend entirely.** `@azure/msal-browser` and `@azure/msal-react` are uninstalled; `shared/lib/msal.ts` and `AuthCallbackPage` are deleted. The OAuth callback is a backend URL.
5. **All mutating requests carry a CSRF token header**, sourced from a non-httpOnly CSRF cookie set by the backend (double-submit pattern, specified in the companion contract).
6. **Live timer state is delivered over Server-Sent Events (SSE)**, not WebSocket. The SSE stream is a read-only, server-to-client channel authenticated by the session cookie.

---

## The Three Session States (unchanged)

ADR-006 section: 5's model survives intact; only how each state is entered changes.

| State | Meaning | How it is entered |
|---|---|---|
| `signed_out` | No session. Sign-in page shown. | Initial default; `GET /auth/me` returns 401; logout completes; any API call returns 401 |
| `checking` | Session cookie may exist; validity unknown. Loading screen shown. | App bootstrap, before `GET /auth/me` resolves |
| `signed_in` | Backend confirmed the session. App usable. | `GET /auth/me` returns 200 |

Because the cookie is httpOnly, the frontend cannot inspect it to shortcut this — every page load starts in `checking` and resolves via `/auth/me`. This is simpler than the SPA-token approach, which combined a synchronous `localStorage` read with a background verification.

---

## Runtime Flows

### Sign-in

1. User clicks **Sign in with Soliton** on `LoginPage`.
2. `useLogin` performs a full-page navigation to `{API_BASE}/auth/login` (optionally with a `return_to` path). No XHR, no popup, no MSAL.
3. The backend redirects to Microsoft; Microsoft authenticates; Microsoft redirects to the backend callback; the backend binds or resolves the User per ADR-006 section: 6, creates a session, sets the cookies, and 302-redirects the browser to the SPA.
4. The SPA boots, enters `checking`, calls `GET /auth/me`, receives the User and `scopes[]`, and enters `signed_in`.
5. The SSE connection opens. The session cookie authenticates the stream request — no token in the URL.

Sign-in failures (unknown user, archived account, tenant mismatch) arrive as a redirect to `/login?error=<code>`; `LoginPage` maps the code to the ADR-006 section: 1 message table.

### Returning user

Identical to ADR-006 section: 2 from the user's perspective: app boots in `checking`, `/auth/me` resolves, user lands on the dashboard or the sign-in page. No flash of the wrong screen.

### Sign-out

`useLogout` calls `POST /auth/logout` (with the CSRF header), which destroys the server-side session and expires the cookies, then routes to `/login`. Logout is now a true revocation — the session is deleted server-side, not merely forgotten client-side.

### Mid-session expiry or revocation

Any request returning 401 dispatches `forceSignOut()`: the slice resets to `signed_out` and the router redirects to `/login?error=session_expired`. There is no token to clear. Because revocation now exists, an Administrator archiving a User or revoking a session takes effect on that User's **next request**, not at token expiry — this closes the "old role persists until JWT expiry" failure mode listed in ADR-004.

### Mid-stream session death (SSE)

If a session expires or is revoked while the SSE stream is open, the backend closes the stream. The client's `EventSource` fires `onerror`; the reconnect attempt calls `GET /auth/me`, receives 401, and dispatches `forceSignOut()`. The stream is never a parallel authentication path — it dies with the session like every other request.

---

## Component-Level Shape (and how it differs from the SPA-token draft)

The prior SPA-token draft was implemented in code; this table maps each piece to its BFF form so the migration is explicit.

| Area | SPA token (prior draft) | This ADR (BFF) |
|---|---|---|
| `shared/lib/msal.ts` | MSAL v5 configuration | **Deleted** |
| MSAL packages | `msal-browser`, `msal-react` v5 | **Uninstalled** |
| `AuthCallbackPage` | Handled redirect, exchanged token | **Deleted** — callback is a backend URL |
| `LoginPage` | Triggered MSAL redirect | Navigates to `{API_BASE}/auth/login`; renders `?error=` codes |
| `storage.service.ts` (auth seam) | Read/write app JWT | **Removed** — no token persistence. Theme persistence unaffected |
| `store/slices/auth` | `user`, `scopes`, `token`, 3 states | `user`, `scopes`, 3 states — **no token field** |
| `shared/api/client.ts` | Bearer header injection | `withCredentials: true`; no auth header |
| `auth.interceptor.ts` | Attach Bearer; on 401 clear token | Attach `X-CSRF-Token` on mutating methods; on 401 dispatch `forceSignOut()` |
| `useLogin` | MSAL `loginRedirect` + `POST /auth/login` | `window.location.assign('{API_BASE}/auth/login')` |
| `useLogout` | Clear storage, fire-and-forget audit call | `POST /auth/logout` then route to `/login` |
| `useAuthBootstrap` | Read storage -> verify via `/auth/me` | Call `/auth/me` directly (cookie rides along) |
| `ProtectedRoute` / `PublicRoute` | Gate on slice state + `scopes[]` | **Unchanged** |
| `Can` component | UX gating on `scopes[]` | **Unchanged** |
| `websocket.service.ts` | WebSocket, token in connection params | **Replaced** by `sse.service.ts` — `EventSource`, cookie-authenticated, no token param |
| Mock mode (`VITE_AUTH_MODE=mock`) | Faked token + profile | Faked `GET /auth/me` response only |
| Dev server | Direct cross-origin calls | Vite `server.proxy` routes `/api` to the backend so cookies are same-origin in development |

What is explicitly **unchanged**: route guard behavior, the `Can` component, the rule that frontend RBAC is UX-only and gates on `scopes[]` (never role strings), the feature-module shape from ADR-005, and the `user` object the frontend consumes.

### SSE client notes

- `EventSource` issues a GET and cannot set custom headers — so the SSE stream carries no CSRF header. This is correct: the stream is read-only (server-to-client), and the CSRF rule already exempts GET. The SSE endpoint must never perform a mutating action.
- The SSE handler invalidates the affected TanStack Query keys on each event (e.g. `['time-entries','running']`) exactly as the WebSocket handler did — the event is a hint to refetch, never a trusted payload.
- Reconnect/backoff and the **Live** / **Reconnecting...** UI indicator behavior carry over unchanged from the prior real-time design; only the transport differs.

---

## Security Posture

| Property | How it is achieved |
|---|---|
| No script-readable credentials | Session cookie is `HttpOnly`; no token in `localStorage`, Redux, or memory |
| CSRF protection | `SameSite=Lax` session cookie plus double-submit CSRF header on every mutating request |
| Instant revocation | Logout, archival, and admin revocation delete the server-side session |
| No client secret in the browser | The confidential-client secret exists only in backend configuration |
| Tenant restriction | Enforced server-side during code exchange (ADR-006, unchanged) |
| Frontend RBAC is cosmetic | Enforcement is backend-only; `scopes[]` drives UX gating exactly as before |

The frontend's residual responsibilities are small and deliberate: send the CSRF header, treat 401 as `signed_out`, and never attempt to read or persist session material.

---

## Consequences

### Positive

- Frontend auth code shrinks substantially: no MSAL configuration (and no exposure to its version-breaking changes), no token storage seam, no callback page, no token-refresh concern.
- The real-time channel's auth question is resolved by construction — the cookie authenticates the SSE stream.
- Logout and offboarding become real: revocation is immediate.
- The 30-minute hard re-login disappears; session length becomes server policy (30-minute idle, 8-hour absolute).

### Negative

- The frontend can no longer run against Azure alone — every auth path requires the backend, so local development depends on either the backend running or mock mode.
- CSRF handling is new frontend surface (one interceptor) and new backend surface (token issuance and validation).
- Same-origin deployment (reverse proxy fronting SPA and API) becomes effectively mandatory for sane cookie behavior; this constrains the deployment topology in ADR-004.

### Neutral

- The Azure App Registration must be re-provisioned as a **Web** platform with a client secret and a backend redirect URI. This goes through the existing IT escalation path and remains the external blocking dependency.
- The session TTL becomes server session policy (30-minute idle / 8-hour absolute) rather than a JWT `exp` value.

---

## Change Log

| Date | Change |
|---|---|
| 10-06-2026 | Initial proposal: BFF authentication model. MSAL removed from the frontend; httpOnly session cookie; CSRF double-submit; session state derived from `/auth/me`; real-time timer state over cookie-authenticated SSE. Replaces an earlier unaccepted SPA-token draft in the same review. |

---

## References

- ADR-001 — Domain Glossary & Access Control Policy
- ADR-004 — System Architecture (revision required: session storage, client secret, failure modes)
- ADR-005 — Frontend Architecture (revision required: bootstrap localStorage read, auth slice shape)
- ADR-006 — Authentication Flow (section: 6 user lifecycle unchanged; section: section: 1-5 token mechanics superseded)
- CONTRACT-backend-auth.md — the wire contract this implementation consumes
- OAuth 2.0 for Browser-Based Apps (IETF draft) — BFF as the recommended pattern
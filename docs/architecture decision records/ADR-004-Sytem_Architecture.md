# ADR-004: System Architecture

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 25-05-2026 |
| **Revised** | 27-05-2026 |
| **Deciders** | Subham Panda, Mohammed Siddique M and Aswath Ravi |
| **Depends on** | ADR-001 (Domain Glossary & Access Control Policy) |

---

## Context

The Soliton Timer App is a single-organisation web-based time-tracking tool. It is built as three pieces — a browser SPA, a Python backend service, and a PostgreSQL database. Users sign in via the **`'microsoft'`** Auth Provider (defined in ADR-001) and receive a short-lived JWT that authorises every subsequent request. Live cross-tab and cross-device updates flow over a WebSocket.

All domain terms used below — **User**, **Auth Provider**, **Time Entry**, **Running Timer**, **Project**, **Task**, **Audit Log**, **Auth Log** — are defined in ADR-001 and are not redefined here. This document covers what ADR-001 does not: containers, components, technology choices, and communication patterns.

The architecture is documented in three C4 levels — Context (C1), Containers (C2), and Components (C3) — followed by the technology choices, communication patterns, and operational concerns.

---

## System Context (C4 Level 1)

The big picture: who uses the system and what external services it depends on.

![System Context Diagram](../diagrams/c4-1-context.png)

| Element | Defined in |
|---|---|
| **User** | ADR-001 — *People & Roles* |
| **Soliton Timer App** | This ADR (the system being documented) |
| **Microsoft** | ADR-001 — *Authentication* (the identity service behind the `'microsoft'` Auth Provider) |

No other external systems are involved. Email gateways, analytics platforms, payment processors, and third-party reporting tools are all out of scope — see ADR-001 *Scope Boundary*.

---

## Containers (C4 Level 2)

The technical building blocks inside the system, and how they communicate.

![Container Diagram](../diagrams/c4-2-containers.png)

### Why the Database is inside the system boundary

The C4 model draws the system boundary around things **we own and operate**. Microsoft's identity service is owned and operated by Microsoft, so it sits outside the boundary as an external system. The Database runs on hardware we control, holds data we own, and ships in lockstep with the Backend Service — so it is drawn as a Container inside the boundary, not as an external dependency.

### The three containers

| Container | Stack | What it does |
|---|---|---|
| **Browser SPA** | React 19 + Vite + TypeScript | Renders the UI, holds the JWT, manages local state, opens a WebSocket for live updates. |
| **Backend Service** | FastAPI + Python 3.12 (Uvicorn) | Authenticates Users, issues JWTs, serves REST endpoints, hosts the WebSocket channel, writes to the Database. |
| **Database** | PostgreSQL 16 | Source of truth for all persistent data. Schema in ADR-003. |

### Communication channels

| From | To | Channel | Purpose |
|---|---|---|---|
| User | Browser SPA | Browser UI (HTTPS) | The user-facing surface |
| Browser SPA | Microsoft | OAuth 2.0 + PKCE (MSAL.js) | Sign-in for the `'microsoft'` Auth Provider |
| Browser SPA | Backend Service | HTTPS REST with `Authorization: Bearer <jwt>`; WebSocket on the same origin | Business operations + live updates |
| Backend Service | Microsoft | HTTPS GET to JWKS endpoint, cached 24h | Verify identity tokens from the SPA |
| Backend Service | Database | SQL over asyncpg | Persist and read all state |

### Why a single backend, single database

A single stateless backend process and a single database is right for a single-organisation deployment at this scale. It removes whole classes of distributed-systems problems (cross-service latency, eventual consistency, queue ordering, distributed transactions). When the load demands more than one process, the backend is intentionally stateless so multiple instances can run behind a sticky-session load balancer — documented but not paid for today.

---

## Components (C4 Level 3) — Browser SPA

The Browser SPA container "opened up" — for frontend developers and reviewers who need to know where to add or change code.

![Frontend Component Diagram](../diagrams/c4-3-components-frontend.png)

| Component | Stack | Role | Lives in |
|---|---|---|---|
| **App Shell** | React + React Router | Bootstrap, provider tree, router, layouts | `src/app/` |
| **Feature Modules** | React + custom hooks | Per-feature pages, components, hooks, services (auth, time-entries, tasks) | `src/features/{feature}/` |
| **Redux Store** | Redux Toolkit | Global UI state — `auth` and `ui` slices | `src/store/slices/` |
| **TanStack Query** | `@tanstack/react-query` | Server-state cache — canonical home for backend-owned data | configured in `src/app/providers/` |
| **MSAL Client** | `@azure/msal-browser` | OAuth 2.0 + PKCE flow for the `'microsoft'` Auth Provider | `src/shared/api/msal.ts` |
| **API Client** | axios + WebSocket | REST + WSS transport; single seam to the Backend Service | `src/shared/api/`, `src/shared/ws/` |

See **ADR-005** (Frontend Architecture) for the full module map, feature module shape, state placement decision rule, and the WebSocket sync contract.

### Note: C3 for the Backend Service is pending

The Component diagram for the Backend Service container is **not** in this revision. Any future collaborator should add it as a follow-up. Cross-reference: **ADR-005 — *Real-Time Sync*** describes the contract the Backend container fulfils.

---

## Technology Choices

For each major choice, the alternatives we considered and why the chosen option won.

### Frontend Framework — React 19

| Option | Strengths | Trade-offs | Verdict |
|---|---|---|---|
| **React 19** | Largest UI library ecosystem; first-class TypeScript; Microsoft's official MSAL React library; mature hooks model | Bundle size larger than newer alternatives; doesn't include router, forms, HTTP — must compose | ✓ Chosen |
| Vue 3 | Smaller bundle; gentler learning curve; built-in reactive primitives | Smaller talent pool in our region; smaller accessible-component ecosystem | Rejected: team familiarity with React; Vue training cost dwarfs the bundle-size win |
| Angular | Batteries-included (router, forms, HTTP, DI); strongly opinionated; first-class TypeScript | Heavier runtime; steeper learning curve; we'd fight the framework on parts we want to do differently | Rejected: too prescriptive for V1 scope |
| Svelte / SvelteKit | Smallest runtime (compiles to vanilla JS); cleaner reactive syntax | Smaller ecosystem; no official MSAL library; less mature for enterprise apps | Rejected: MSAL React is the deciding factor |
| Solid | React-like syntax with fine-grained reactivity | Very young ecosystem; no MSAL integration | Rejected: too early to bet on |

**Why it wins:** Microsoft's official MSAL React library removes the most fragile part of the auth implementation. Bundle size is acceptable for an internal app on a corporate network.

### Backend Framework — FastAPI

| Option | Strengths | Trade-offs | Verdict |
|---|---|---|---|
| **FastAPI** | Async-first; auto-generated OpenAPI; Pydantic validation; modern Python 3.10+ | Smaller ecosystem than Django; newer than Flask | ✓ Chosen |
| Django REST Framework | Most mature Python REST framework; admin UI, ORM, auth, migrations; huge ecosystem | Synchronous by default; full-stack assumptions add weight when we only need REST | Rejected: we don't need an admin UI; async is essential for WebSocket |
| Flask | Minimal core; flexible; very mature | No first-class async; no built-in validation; no automatic API docs | Rejected: FastAPI is "Flask with batteries we want" |
| Litestar | Similar to FastAPI; faster in benchmarks | Smaller community; less documentation | Rejected: ecosystem favours FastAPI |
| Node.js (Express / NestJS) | Same language as frontend; large npm ecosystem | We'd lose Python's data tooling; Pydantic is hard to replicate in JS | Rejected: language unification isn't strong enough |

**Why it wins:** Pydantic validation removes a class of bugs at the API boundary. Auto-generated OpenAPI is the contract by default. Async-native is essential for the WebSocket channel.

### Database — PostgreSQL 16

| Option | Strengths | Trade-offs | Verdict |
|---|---|---|---|
| **PostgreSQL 16** | ACID + MVCC; mature; first-class JSONB; rich extension ecosystem; managed offerings everywhere | More ops surface than SQLite; slower for tiny single-user workloads | ✓ Chosen |
| MySQL / MariaDB | Equally mature; widely deployed | No JSONB; less strict isolation defaults; weaker historical constraint enforcement | Rejected: Postgres' stricter defaults match our integrity-first stance |
| SQLite | Zero-ops; file-based; most-deployed database in the world | Single-writer model doesn't fit concurrent writes from multiple tabs/devices | Rejected: concurrency model doesn't fit |
| MongoDB | Document model; flexible schema | Domain is highly relational; weaker transactions than Postgres | Rejected: relational fit is wrong |
| CockroachDB | Horizontally scalable; Postgres-wire-compatible | Operational complexity dwarfs the gain at single-org scale | Rejected: over-engineered for our deployment |

**Why it wins:** ADR-003's schema is relational. ACID matters because Audit Log must be a faithful record. Tooling (pgAdmin, pg_dump, WAL-based PITR) is unmatched.

### Authentication Library — MSAL.js

| Option | Strengths | Trade-offs | Verdict |
|---|---|---|---|
| **MSAL.js (`@azure/msal-browser` + `@azure/msal-react`)** | Microsoft's official library; handles state, nonce, PKCE, code exchange; documented and supported by Microsoft | ~80KB minified; tied to Microsoft's identity service (not a problem — that's our IdP) | ✓ Chosen |
| Auth0 React SDK | Works with any OIDC provider; thoughtful API | Puts Auth0 in front of Microsoft (a middleman where we have a direct relationship); adds a vendor | Rejected: an unneeded dependency |
| NextAuth.js | Excellent DX; pluggable | Built for Next.js; our SPA is Vite + React | Rejected: framework mismatch |
| Custom OAuth | Full control | OAuth + PKCE has many subtle correctness issues; writing it securely is a project in itself | Rejected: the security-critical parts are exactly the parts not to write yourself |
| oidc-client-ts | Generic OIDC client | More code for Microsoft-specifics (tenant validation, MFA prompts) | Rejected: MSAL's Microsoft support is worth the lock-in |

**Why it wins:** OAuth + PKCE has many failure modes. The people who write the spec also write MSAL. 80KB is fair payment for not writing security-critical code.

### Real-time Channel — WebSocket

| Option | Strengths | Trade-offs | Verdict |
|---|---|---|---|
| **WebSocket** | Bidirectional, low-latency; FastAPI native; one connection per User across tabs | Stateful — lives on a specific backend process; reconnect logic required; some corporate proxies still strip the upgrade | ✓ Chosen |
| Server-Sent Events (SSE) | Simpler; auto-reconnects in the browser | Server-to-client only; doesn't reduce REST request volume meaningfully | Rejected: worse fit for the bidirectional events we need |
| Long polling | Works through any HTTP-aware proxy | High latency; high server load | Rejected: doesn't fit live-updating UI |
| Pusher / Ably | Managed; reliability is someone else's problem | Third-party dependency for something we can build; data flows through a vendor | Rejected: don't want operational logic on a vendor's roadmap |
| GraphQL Subscriptions | Powerful query language for subscriptions | We don't use GraphQL elsewhere | Rejected: we're a REST shop |

**Why it wins:** Cross-tab and cross-device sync needs both directions. FastAPI's built-in support means no extra library. Corporate-proxy concerns are manageable on a controlled deployment.

### Supporting Choices

| Choice | Why | Notable alternatives |
|---|---|---|
| **Vite** (build) | Native ESM dev server; sub-second startup; very fast HMR | Webpack (slow), Parcel (smaller community), Turbopack (still beta) |
| **TanStack React Query** (server state) | Industry-leading cache, refetch, mutation handling; mutation hooks fit our optimistic-update patterns | SWR (smaller), RTK Query (Redux-coupled), Apollo (GraphQL focus) |
| **Redux Toolkit** (client state) | Small explicit store for theme, auth, UI flags; mature devtools; team familiarity | Zustand (smaller ecosystem), Jotai/Recoil (atomic but unfamiliar), Context API (no devtools) |
| **MUI v6 + SCSS modules** (styling) | Accessible components by default; SCSS modules for scope-isolated overrides | Tailwind (team prefers semantic SCSS), Chakra (smaller), Mantine (smaller ecosystem) |
| **Vitest** (testing) | Vite-native; Jest-compatible API; ESM-first; fast | Jest (slower with ESM), Mocha (less batteries-included) |
| **Pydantic v2** (validation) | Bundled with FastAPI; Rust-rewritten core; strict typing | Marshmallow (older API), attrs + cattrs (more manual) |

---

## Communication Patterns

Three patterns cover everything.

### REST over HTTPS

All CRUD operations and Reports. Authentication via `Authorization: Bearer <jwt>`. Pydantic validates request bodies; invalid shapes return `422` with field-level errors. Authentication failures return `401`; authorisation failures return `403`. Consistent error envelope `{ "error_code": "<code>", "message": "<human-readable>" }` so the frontend can map codes to UI without parsing free text.

### WebSocket over WSS

A single persistent connection per User. After login the SPA opens `/ws` carrying the same JWT. The backend pushes typed events — Running Timer started, Time Entry stopped, role changed, Project archived — and the frontend invalidates the affected TanStack Query keys (see ADR-005 *Real-Time Sync*). The client uses REST for all state changes; the WebSocket is server-to-client in practice. Reconnect backoff: 1s, 2s, 4s, 8s, 16s, 30s cap. On reconnect the client refetches core queries to recover any state changes during the disconnect.

### JWKS fetch

The Backend Service fetches Microsoft's public signing keys once on cold start, then caches them for 24 hours. A signature verification failure forces one immediate re-fetch in case keys rotated; if the second attempt fails too the request is rejected. If the JWKS endpoint is unreachable on cold start, the very first SSO login fails — but once cached, the backend is independent of Microsoft for 24 hours.

---

## Authentication

ADR-001 defines two **Auth Provider** values: `'microsoft'` (SSO, primary, UI-exposed) and `'local'` (bcrypt password fallback, hidden). This section describes the wire-level implementation.

Both paths terminate in an HS256-signed JWT with a short TTL (recommended 15–30 minutes per ADR-001). The token embeds the User's role and permission scopes, so per-request authorisation is a signature check plus a scope membership test — no database lookup. The token is stored in `localStorage` and sent on every REST request as `Authorization: Bearer <jwt>`.

There is no server-side revocation. A compromised token remains valid until its `exp`. We accept this trade-off because the short TTL bounds exposure, and revocation would either require a per-request blacklist lookup (defeating the stateless model) or opaque sessions (a different architecture).

---

## Logging and Audit

ADR-001 defines three persisted log tables — **Audit Log** (`audit_logs`), **Auth Log** (`auth_logs`), and **Error Log** (`error_logs`). All three are append-only, retained indefinitely, and gated by their respective `*:read` scopes.

Audit Log and Auth Log rows are written in the **same database transaction** as the state change they describe. A failure to write the audit row fails the operation. This is the integrity guarantee that makes the audit trail trustworthy.

---

## Deployment Topology

| Concern | V1 choice | Why |
|---|---|---|
| Hosting | Single host (VM or container) running Uvicorn + PostgreSQL | Single-organisation scale; no multi-tier needed in V1 |
| TLS termination | Reverse proxy (nginx or Caddy) | Standard pattern; certificate management is a solved problem |
| Backups | `pg_dump` daily + WAL archival | Industry standard; restore tested before production cutover |
| Secrets | Environment variables read at process start | Simple at this scale. `JWT_SECRET`, DB credentials, `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID`. No client secret needed — MSAL on the frontend handles the OAuth dance. |
| Monitoring | Health check endpoint + log aggregation | Sufficient for V1; metrics dashboard is a future enhancement |
| Scaling path | Stateless backend behind a sticky-session-aware load balancer | We don't pay the cost until needed, but we don't paint ourselves into a corner |

---

## Failure Modes

The User-visible behaviour of each major dependency failure.

| What fails | What the User sees | Recovery |
|---|---|---|
| Microsoft is unavailable | New SSO logins fail; existing sessions continue to work until JWT expiry | Local fallback at `/login?fallback=1` is the recovery path for Administrators |
| PostgreSQL is unavailable | Backend returns 5xx on any DB-touching request; SPA shows a connection-error banner | DB restart; backend reconnects automatically; WebSocket events queue briefly |
| Backend Service crashes | Connection-error banner; WebSocket reconnects with backoff | Process supervisor (systemd, Docker restart policy) brings the service back up |
| Browser loses network | TanStack Query marks queries stale; WebSocket reconnects with backoff | Automatic when the network returns |
| JWT expires mid-session | User redirected to `/login?error=session_expired` | User signs in again — usually a single click via MSAL silent SSO if the Microsoft session is still alive |
| User's role is changed | Old role's permissions persist until JWT expiry; next login picks up new permissions | Communicated explicitly when the Administrator makes the change |

No silent data loss is possible. Every write either succeeds and is acknowledged, or fails and surfaces an error. The Audit Log makes every change traceable.

---

## Consequences

### Positive

- **Small, understandable system.** Three containers, one external dependency. New team members can hold the whole architecture in their head within a day.
- **No server-side session storage.** The JWT carries all the authorisation context. Easier to scale horizontally; easier to debug because the request is self-describing.
- **No password storage for SSO Users.** Microsoft owns the credential surface.
- **OpenAPI spec is the source of truth** for what every endpoint accepts and returns.
- **Standard, hireable technology choices.** React, FastAPI, PostgreSQL — anyone joining the team will have seen all of these.

### Negative

- **Single Backend Service is a single point of failure.** Acceptable for the deployment scale; documented scaling path exists.
- **Short JWT TTL means visible re-login.** Users notice this after returning from a meeting. Accepted in exchange for bounded token exposure.
- **No mid-session JWT revocation.** A compromised token remains valid until expiry. Mitigated by short TTL and the fact that JWTs only escape via XSS, against which CSP and React's default escaping are layered defences.
- **JWT in `localStorage` is theoretically XSS-reachable.** Accepted because CSP and content sanitisation are layered defences. `httpOnly` cookies are a future option if the threat profile changes.
- **WebSocket connections are stateful.** Horizontal scaling requires sticky-session affinity or pub/sub fan-out.

### Neutral

- **Tied to Microsoft for SSO.** Other IdPs would require library and configuration changes — non-issue at Soliton; flagged for completeness.
- **PostgreSQL-only.** Postgres-specific features (JSONB, `EXTRACT`-based time math) are used; migrating to MySQL would be substantial.
- **React-only on the frontend.** Switching frameworks would be a rewrite, not a refactor.

---

## Change Log

| Date | Change |
|----|----|
| 25-05-2026 | Initial version. |
| 27-05-2026 | Review revision: aligned terminology with ADR-001 strictly — no new defined terms introduced. The Microsoft identity service is referenced as "Microsoft" (the `'microsoft'` Auth Provider's identity service) rather than "Microsoft Entra ID" (which is not in ADR-001). "Soliton Employee" replaced with `User` per ADR-001. Collapsed redefinition tables to short pointers to ADR-001. Added C3 Component diagram for the Browser SPA; explained why the Database is inside the system boundary; added explicit note that the Backend Service C3 is pending.Pointed References at ADR-005 |

---

## References

- **ADR-001** — Domain Glossary & Access Control Policy (canonical terminology)
- **ADR-003** — Database Schema
- **ADR-005** — Frontend Architecture
  **ADR-006** — Authentication Flow
- **C4 Model** — Simon Brown, https://c4model.com
- **OWASP ASVS** — Application Security Verification Standard (alignment reference)
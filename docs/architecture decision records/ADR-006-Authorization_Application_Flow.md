# ADR-006: Authentication Flow

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 22-05-2026 |
| **Revised** | 10-06-2026 |
| **Deciders** | Backend + Frontend Team |
| **Related documents** | ADR-004, ADR-001, ADR-003, ADR-011, CONTRACT-backend-auth.md |

---

## Decision

Users sign in with Microsoft (SSO is the only path). The sign-in itself runs on the backend (a Backend-for-Frontend pattern): the app sends the user to the backend, which handles the exchange with Microsoft and gives the browser a session held in an httpOnly cookie. The cookie is the only thing the browser holds — there is no token in the page. A session lasts up to a full working day but ends after thirty minutes of inactivity; there is no "remember me forever," and a session can be ended instantly at any time.

Users do not self-onboard. An administrator pre-creates the user record in the app before that person can sign in. Microsoft's identity is bound to the record on the user's first successful sign-in.

This ADR covers two related decisions: how users sign in (sections 1–5) and how users come to exist in the system (section 6). Section 6 is unchanged from the original version; sections 1–5 describe the BFF session model. The wire-level detail lives in `CONTRACT-backend-auth.md`.

---

## 1. Signing in with Microsoft

This is the primary way users sign in. When the user clicks **Sign in with Soliton**, the app hands off to our backend, which sends them to Microsoft's sign-in page. Microsoft handles passwords, multi-factor authentication, and any company policies. Once Microsoft confirms the user is who they say they are, Microsoft sends them back to our backend with proof of identity. The backend verifies that proof, checks it against our user database, creates a session, and sends the user's browser to the dashboard with the session cookie set. The user's browser never handles the Microsoft proof or any token directly — the whole exchange happens on the backend.

![Sign in with Microsoft](../diagrams/sso_login.png)

**What this gives the customer:**

- **No password management for users.** Soliton accounts use whatever Microsoft is already configured to require — single sign-on, multi-factor, conditional access policies, everything.
- **No password storage on our side.** We never see the user's Microsoft password, and we don't store one ourselves.
- **Users who aren't on Soliton's Microsoft tenant cannot sign in.** Even if a user has a valid Microsoft account elsewhere, our backend rejects identity tokens that came from the wrong tenant.

**If something goes wrong:**

| Situation | What the user sees |
|---|---|
| User cancels at Microsoft | Returned to the sign-in page with no error |
| Microsoft confirms identity but the user isn't in our system | "Your account isn't enabled. Contact your administrator." |
| User's account is archived | "This account has been archived." |
| Network or service error | "We couldn't sign you in. Please try again." |

---

## 2. Returning to the app

When a user comes back to the app — closing and reopening the browser, refreshing the page, or clicking a link from email — we don't want to make them sign in again if their session is still valid. The browser still has the session cookie from last time; on load the app asks the backend "is this session still valid?" before showing the dashboard.

![Returning User](../diagrams/returning_user.png)

**What the user experiences:**

- If the session is still valid (active within the last 30 minutes and under its daily cap), they go straight to the dashboard with no interruption.
- If the session has expired, been revoked, or the user's account status changed (e.g. an administrator archived them), they're sent back to the sign-in page.
- While the app is checking with the backend (usually well under a second), the user sees a loading screen — never an empty dashboard, never an unnecessary sign-in page.

---

## 3. Signing out

When the user clicks **Sign out**, the app tells the backend to end the session, which deletes it on the server and expires the cookie, then sends the user to the sign-in page. The sign-out event is recorded for the audit trail.

![Sign out](../diagrams/signout.png)

**Two important properties:**

- **Sign-out is a true end of the session.** Unlike a token model where signing out only forgets the token locally, here the session is destroyed on the server — it cannot be reused even if the cookie were somehow retained.
- **The audit trail records every sign-out.** Administrators can see who signed out, from where, and when.

---

## 4. How sessions expire

A session ends in one of two ways: **thirty minutes of inactivity** (the idle timeout), or **eight hours after sign-in** regardless of activity (the absolute cap), whichever comes first. The next time the user takes any action after the session has ended, they're told their session expired and sent back to the sign-in page to start fresh.

![Session expires](../diagrams/session_expiry.png)

**Why these two limits:**

- The **30-minute idle** limit is the security-meaningful one: it bounds exposure if a user leaves a computer unlocked. Walking away ends the session shortly after, with nothing for someone to find.
- The **8-hour absolute** cap lets a normal working day proceed without a mid-afternoon interruption. The backend silently renews its connection to Microsoft in the background, so an active user is never stopped to re-authenticate within the day.
- For Microsoft sign-in users, re-signing in usually doesn't require typing a password — Microsoft remembers the recent sign-in and confirms with a single click.
- Both limits are configurable via the `SESSION_IDLE_SECONDS` and `SESSION_ABSOLUTE_SECONDS` environment variables. The architectural property is "revocable server-side sessions with an idle and an absolute bound" — the specific durations are operational policy. Because sessions are revocable at any moment, a longer absolute cap no longer weakens security the way a longer token lifetime would have.

---

## 5. The three states a session can be in

At any given moment, a user's session is in one of three states. Understanding these three states explains every UI behavior in the app.

![Session states](../diagrams/session_state.png)

| State | What it means |
|---|---|
| **Signed out** | No valid session. The user sees the sign-in page. |
| **Checking** | The browser has a session cookie but the app is asking the backend whether it's still valid. The user sees a brief loading screen. |
| **Signed in** | The backend confirmed the session is valid. The user can use the app. |

The **Checking** state is the reason returning users don't see a flash of the sign-in page when they reload — the app holds the loading screen until it knows for sure whether the session is still good. Because the session cookie can't be read by the app's own code, every load genuinely asks the backend rather than guessing from what's stored locally.

---

## 6. How users come to exist in the system

Microsoft tells us who someone *is*. It does not tell us whether that person is allowed to use the Soliton Timer App, nor what role they should have. Those are our decisions, and they need a deliberate process.

We use a two-step onboarding pattern:

1. **IT adds the person to Azure AD** as part of their normal joiner process. This gives the person a Microsoft identity and gets them into Soliton's tenant.
2. **An administrator pre-creates the user in the timer app** — email, display name, and role (User, Report Viewer, Manager, or Administrator per ADR-001). This creates a row in the `users` table with the email set, the role assigned, and the `microsoft_oid` field empty.

The first time the user clicks **Sign in with Soliton**, the backend receives Microsoft's identity token, finds the pre-created row by email, fills in the `microsoft_oid` from the token, and from that point on the user is bound. All future sign-ins match on `microsoft_oid` directly, not email.

### Why bind on `microsoft_oid` and not email

The `microsoft_oid` is Microsoft's permanent unique identifier for a user account. It does not change when the person's email changes (marriage, rebranding, internal transfers). It is also cryptographically tied to the identity token Microsoft issues, so it cannot be spoofed by anyone holding the same email on a different tenant.

Email is used only for the initial lookup. After binding, it becomes a display attribute.

### What happens if someone tries to sign in without being pre-created

The backend returns an `unknown_user` error and the user sees **"Your account isn't enabled. Contact your administrator."** — the same error already covered in section 1. The failure mode is clean: the user knows what to do, and an administrator adds them in the app in about 30 seconds.

### Why we don't auto-create on first sign-in

The most convenient alternative would be to create a user row automatically the first time someone with a valid Soliton Microsoft account visits the app. We deliberately chose not to do that:

- **Anyone in Soliton's tenant could give themselves access.** Contractors, interns who haven't been provisioned for this tool, employees from other business units — all of them have valid Microsoft accounts. The timer app contains timesheet data and administrative controls; self-onboarding is too permissive.
- **Our role model lives in our database, not in Azure AD.** Even if a user is auto-created, an administrator still has to assign a role. Two-step onboarding is more honest about this reality than a flow that pretends to be automatic but actually requires manual follow-up.

### Why we don't sync from Azure AD groups

Full synchronisation from Azure AD groups (add to group → appears in app within minutes) is the third pattern we considered. It would be the cleanest long-term answer, but the cost is wrong for V1:

- We would need group-to-role mapping (e.g. `timer-app-admins` AD group → `administrator` role in our DB). This doubles the configuration surface — every role change has to happen in two places.
- It requires either SCIM provisioning or a background reconciliation job. Both are infrastructure work that doesn't pay back at our scale.

If Soliton grows past a few hundred users or wants HR to drive onboarding directly, this pattern is worth revisiting.

### Offboarding

When a user leaves Soliton or no longer needs timer app access, an administrator archives the user in the app (status flips to `archived`). The Azure AD account is unaffected — the user may still need it for other tools.

Archived users are rejected at sign-in with **"This account has been archived"** (already covered in section 1). The user record itself is retained for the audit trail; ADR-003 disallows physical deletion of `users` rows because they are referenced by `time_entries`, `audit_logs`, and similar.

---

## Security summary

| Property | How it's enforced |
|---|---|
| Soliton-only access | Identity tokens from any Microsoft tenant other than Soliton's are rejected during the backend code exchange |
| Bounded session windows | 30-minute idle timeout plus 8-hour absolute cap; no long-lived "remember me" |
| Instant revocation | Sessions live server-side; logout, archival, and admin kill end them immediately rather than waiting for an expiry |
| No credential in the browser | The session is an httpOnly cookie the page cannot read; the Microsoft tokens and the client secret stay on the backend |
| CSRF protection | Mutating requests require a session-bound token header; cross-site requests cannot supply it |
| No self-onboarding | A user must be pre-created by an administrator before they can sign in, even with a valid Soliton Microsoft account |
| Permanent identity binding | First sign-in binds Microsoft's `oid` to the user record; subsequent lookups use `oid`, not email |
| Full audit trail | Every sign-in attempt, every sign-out, and every administrative user change is recorded |
| Sensitive data never leaks to the client | `microsoft_oid` is never returned in any response |
| Standard libraries handle the hard parts | Microsoft's official server-side library handles the OAuth protocol; we don't write the security-critical code ourselves |

---

## Consequences

### Positive

- **Single source of truth for identity.** Azure AD owns who people are, what their password is, and what MFA they need.
- **Single source of truth for app access.** Our `users` table owns who is allowed in the timer app and what role they have.
- **Clean offboarding.** Archiving in the app cuts off access without touching Azure AD — and now takes effect immediately, because archival revokes the user's live sessions.
- **No credential in the browser.** No token in page storage; the session cookie can't be read by scripts, and the Microsoft tokens and client secret never leave the backend.
- **No password storage anywhere in our system.** The bcrypt dependency, the local login form, and the rate-limiting logic are all eliminated.

### Negative

- **Two-step onboarding.** A new joiner cannot self-serve. If an administrator hasn't pre-created them in the app, their first sign-in attempt fails. In practice this batches naturally with the joiner paperwork process.
- **No break-glass account.** If Microsoft is down, no one can sign in to the timer app, including administrators. This is the trade-off accepted by removing the local fallback path.
- **First-administrator bootstrap requires a seed script.** At go-live there is no administrator in the `users` table, so a one-time seed must run before the first sign-in attempt.
- **A session store must be operated.** Sessions live in Redis, which has to be run, secured, and backed up — the operational price of revocation. It holds encrypted Microsoft tokens, making it a sensitive asset.
- **CSRF is a managed risk.** Because the browser sends the session cookie automatically, mutating requests are protected with a session-bound token to block cross-site abuse.
- **Revocation is not atomic with the database.** Archiving a user commits in the database and then revokes sessions; a brief window is closed by re-checking account status on every request.

### Neutral

- **The "unknown_user" error is generic.** It tells the user to contact their administrator but does not name them. This is intentional (avoids leaking who the administrators are) but may surface as a support ticket the first time someone hits it.

---

## Open questions

| # | Question | Status |
|---|---|---|
| 1 | What is the bulk-import path for the initial seed at go-live? Likely a one-time CSV import or seed script — to be agreed with Soliton operations. | Open |
| 2 | What happens if a user's Azure AD email changes after binding? Display name and email should refresh from the latest sign-in; `microsoft_oid` stays the same. | Open — needs explicit handler logic |
| 3 | If Microsoft Entra ID has an extended outage, what is Soliton's recovery posture for the timer app? | Open — needs operations input |

---

## Related documents

- **ADR-004 — System Architecture.** The overall system this auth flow lives in: client app, backend service, database, Redis session store, and Microsoft as the identity provider. Defines the BFF wire model at the architecture level.
- **ADR-001 — Domain Glossary and Access Control Policy.** Who the users are, what roles exist (User, Report Viewer, Manager, Administrator), and what each role is allowed to do.
- **ADR-003 — Database Schema.** The tables this flow touches: `users` (account records, including the `microsoft_oid` field that gets bound on first sign-in), `auth_logs` (the sign-in audit trail), `audit_logs` (administrative changes), and the role and permission tables.
- **ADR-011 — Frontend Authentication Implementation (BFF).** How the frontend consumes this flow: full-page redirect to sign in, session state derived from `/auth/me`, no token handling.
- **CONTRACT-backend-auth.md.** The wire-level contract — endpoints, cookies, CSRF, session model, and error signaling.

---

## Change Log

| Date | Change |
|---|---|
| 22-05-2026 | Initial version: SSO-only sign-in, short-lived session token, admin pre-creation with `oid` binding. |
| 10-06-2026 | BFF revision. Sections 1–5 rewritten: the backend now owns the OAuth exchange (confidential client); the browser holds only an httpOnly session cookie; sessions are server-side and revocable; expiry is 30-min idle plus 8-hr absolute (replacing the single 30-min token window); sign-out is true revocation. Section 6 (user lifecycle) unchanged. Updated the security summary and consequences; fixed the mislabeled ADR-001/ADR-004 cross-references. |
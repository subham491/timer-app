# ADR-010: Timer Workflow and Time Entry Contract

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 03-06-2026 |
| **Deciders** | Frontend and Backend Team |
| **Depends on** | ADR-001, ADR-003, ADR-009 |
| **Supersedes** | None |
| **Superseded by** | None |

---

## Context

The application needs a formal `Timer` workflow that is consistent with the domain model, database schema, and project/task readiness decisions already defined by earlier ADRs.

The earlier ADRs establish the following baseline:

- ADR-001 defines that time is tracked against a **Task**, not directly against a Project
- ADR-001 defines a **Time Entry** as the atomic work record
- ADR-001 defines a **Running Timer** as a Time Entry where `end_at IS NULL`
- ADR-001 and ADR-003 together establish that only one Running Timer may exist per User
- ADR-003 defines `duration_seconds` as a server-owned field
- ADR-009 defines that Projects may exist without Tasks, but timer creation without a valid Task is not allowed

The timer module must now answer the workflow questions that those ADRs intentionally left open:

1. how live timer start and stop should behave
2. how the frontend should discover timer-ready work
3. how manual entries should be created and corrected
4. how backend validation should prevent invalid or ambiguous time records
5. how frontend and backend should align through one implementation contract

Without this ADR:

- timer behavior may drift between frontend assumptions and backend enforcement
- project/task readiness may be interpreted differently across modules
- duration handling may become inconsistent
- edit and delete behavior may remain unclear
- end users may encounter ambiguous or invalid tracking flows

---

## Decision

The Timer module will be implemented as a **task-based, API-first time-entry workflow**.

The module will support:

- starting a live timer against a valid Task
- stopping the current running timer
- viewing current timer state
- viewing and filtering historical time entries
- grouping historical time entries by Task when useful for review
- creating manual time entries
- editing eligible stopped entries
- deleting eligible stopped entries
- loading timer-ready Projects and Tasks from an explicit timer context endpoint
- receiving real-time timer state updates across tabs and devices
- capturing billable versus non-billable classification at time-entry level

The following rules are mandatory:

- timer creation without a valid Task is not allowed
- only one Running Timer may exist per User at a time
- duration is always computed server-side
- archived or inaccessible work items are not timer-eligible
- timer state changes must be propagated in real time to the same User's active sessions

---

## Decision Details

### 1. Timers Are Strictly Task-Based

Every live timer and every manual time entry must reference a valid active Task.

This is needed because the Task is the smallest meaningful execution unit in the domain model.

This helps the end user because:

- recorded work remains attributable to a real unit of execution
- reports stay cleaner and easier to trust
- approvals and reviews can happen with better context
- billing and delivery discussions stay tied to actual work categories

Functional rules:

- Project without Task: allowed
- Timer without Task: not allowed
- Task must belong to the selected Project
- Project must be timer-ready
- User must have permission to track time against that Project and Task

---

### 2. Only One Running Timer Is Allowed Per User

At any time, a User may have at most one active Running Timer.

This is needed because overlapping live timers would create ambiguous time attribution and unreliable totals.

This helps the end user because:

- current activity is always unambiguous
- the UI can present one clear active state
- accidental overlap is prevented by design
- totals remain easier to trust

Implementation rule:

- starting a new timer must stop any existing Running Timer for that User inside the same transaction

Product policy for the initial version:

- starting a new timer auto-stops the current running timer and starts the new one

This policy helps the end user because:

- they do not need to manually clean up an old timer before switching work
- work-switching becomes faster with fewer clicks

---

### 3. Manual Entries Are First-Class, But Still Follow Timer Rules

Users may create manual entries by supplying explicit `start_at` and `end_at` values.

This is needed because not all work is tracked live and enterprise users often need to backfill missed time.

This helps the end user because:

- missed work can still be captured accurately
- offline, meeting-heavy, or interrupted workflows remain supported
- the system stays practical instead of forcing perfect live tracking discipline

Functional rules:

- manual entry still requires a valid active Task
- `end_at` must be greater than `start_at`
- duration must be computed server-side
- manual entry must not overlap a running timer in a way that violates business rules

---

### 4. Timer Context Must Be Explicit And Server-Driven

The frontend must load timer-ready Projects, timer-ready Tasks, and current running state from a dedicated timer context workflow instead of inferring timer readiness from unrelated list endpoints.

This is needed because timer readiness depends on multiple rules:

- assignment or access rights
- Project lifecycle status
- Task lifecycle status
- current running timer state
- timer-specific filtering rules

This helps the end user because:

- the timer UI can surface only valid choices
- fewer invalid actions are attempted
- users receive clearer guidance faster
- the frontend avoids duplicating business rules incorrectly

---

### 5. Duration Is Always Server-Owned

The client may display elapsed time for UX purposes, but persisted duration is always calculated and finalized by the backend.

This is needed because client-side duration can drift due to tab suspension, device time changes, clock skew, or partial UI failures.

This helps the end user because:

- totals remain consistent across screens
- reports and approvals use one trusted value
- edits and corrections remain deterministic

Functional rules:

- client payloads must never contain authoritative `duration_seconds`
- create, stop, and update operations must recalculate duration server-side

---

### 6. Stopped Entries Are Editable Under Controlled Rules

Stopped entries may be edited when the actor has permission and the entry is no longer running.

This is needed because users and approvers sometimes need to correct notes, tasks, or timestamps after the fact.

This helps the end user because:

- honest mistakes can be corrected without deleting and recreating all history
- historical data can be improved without breaking workflow clarity

Functional rules:

- running entries cannot be edited as historical records while active
- stopped entries may be updated if permitted
- edits must revalidate task/project eligibility
- edits must recompute duration server-side

---

### 7. Delete Behavior Must Be Explicit, Not Implied

Deletion of time entries must be a deliberate workflow governed by backend validation.

This is needed because time history is operationally sensitive and should not be lost accidentally.

This helps the end user because:

- destructive actions are clearer and safer
- the system can apply permission rules consistently
- audit-sensitive organizations can later replace delete with soft-delete if policy changes

Initial functional rule:

- only eligible stopped entries may be deleted
- running entries cannot be deleted while active

---

### 8. Historical Entries Should Support Grouping By Task

The timer module should support grouping historical entries by the same Task in addition to plain chronological review.

This is needed because many users think about their recorded time in terms of work buckets such as repeated standups, coordination work, or recurring execution tasks.

This helps the end user because:

- repeated work becomes easier to review
- users can spot duplicate or fragmented entries faster
- task-level effort patterns become more visible without exporting data first
- edit and audit workflows become faster for recurring work

Functional rules:

- the default historical view may remain chronological
- the API must support task-grouped retrieval for timer logs
- grouped output should still preserve individual entry detail inside each group

---

### 9. Real-Time Timer State Must Synchronize Across Tabs And Devices

The system should establish a WebSocket-based real-time channel for timer state changes for the authenticated User.

This is needed because users may keep the timer open in multiple browser tabs, browser windows, or different devices during the workday.

This helps the end user because:

- starting a timer on one tab is immediately visible on another
- stopping a timer on one device prevents stale running state on another
- current work context stays more trustworthy
- accidental duplicate actions are reduced

Functional rules:

- timer start, stop, update, and delete events should be broadcast to the same User's active sessions
- current running state and affected historical entries should refresh in response to server events
- WebSocket events should complement backend validation, not replace it
- HTTP APIs remain the source of command execution; WebSocket is used for real-time synchronization

---

### 10. Time Entries Should Support Billable Classification

The timer workflow should allow a time entry to be marked as billable or non-billable.

This is needed because reporting and downstream billing discussions often depend on whether recorded time should count toward billable work.

This helps the end user because:

- billable time can be identified at the moment of entry
- reporting becomes easier and more accurate later
- users do not need to reconstruct billing intent after the fact

Important note:

- this requirement is product-valid, but it is not part of the currently accepted ADR-003 schema
- persistence of `isBillable` should therefore be formalized through a future schema-extension ADR before backend implementation is treated as final

---

## Architecture Implications

### Frontend

The frontend Timer feature should remain feature-driven and contain:

- `api/`
- `components/`
- `hooks/`
- `pages/`
- `types/`
- `utils/`
- `validations/`
- `tests/`

Why this is needed:

- timer behavior mixes current state, historical state, validation, and time-specific interaction rules

How this helps the end user:

- stronger module boundaries support a more stable timer experience and fewer regressions
- real-time synchronization helps the UI stay accurate across tabs and devices

### Backend

The backend should expose a dedicated timer and time-entry domain through:

- endpoint layer
- service layer
- repository layer
- validation and permission enforcement

Why this is needed:

- running-timer uniqueness, task eligibility, and duration ownership must be centralized

How this helps the end user:

- timer behavior remains consistent even if the frontend evolves
- cross-session state stays aligned through one server-owned event flow

---

## Rationale

This ADR extends ADR-001, ADR-003, and ADR-009 by converting earlier domain and schema rules into an executable timer workflow.

It closes important implementation gaps:

- how the current timer is started and stopped
- how the frontend discovers timer-ready work safely
- how manual time is recorded
- how corrections happen without weakening data quality
- how one source of truth for duration is preserved
- how grouped historical review works
- how timer state stays synchronized across concurrent sessions
- how billable versus non-billable work is captured in the timer workflow

This helps the end user because:

- live tracking becomes predictable
- manual time remains practical
- invalid timer actions are blocked early
- time history remains more accurate and easier to trust
- multi-tab and multi-device usage becomes safer and less confusing
- billing-aware reporting becomes easier to support

---

## Consequences

### Positive

- timer behavior becomes explicit and reviewable
- live and manual tracking follow one coherent model
- timer readiness remains aligned with Projects and Tasks
- frontend and backend gain one stable integration contract
- reporting quality improves through stronger attribution and server-owned duration
- repeated work becomes easier to review through task grouping
- multi-session timer state becomes more reliable
- billable reporting becomes easier once schema support is formalized

### Negative

- backend validation becomes more detailed
- timer context requires a dedicated API rather than ad hoc inference
- start and edit flows require careful transactional handling
- WebSocket infrastructure adds operational and event-design complexity
- `isBillable` requires a follow-up schema decision if it is to be stored permanently

### Neutral

- this ADR does not replace the domain or schema ADRs; it operationalizes them for the Timer module

---

## Alternatives Considered

### Alternative 1: Allow Timers Directly Against Projects

Rejected.

Why it was considered:

- it appears simpler for the UI

Why it was not chosen:

- it weakens attribution and breaks the task-based time-tracking model defined earlier

Impact on the user if chosen:

- time records would become broader, noisier, and less useful for review or reporting

### Alternative 2: Allow Multiple Concurrent Running Timers Per User

Rejected.

Why it was considered:

- some users believe they multitask across multiple work streams

Why it was not chosen:

- it creates ambiguity, overlap, and lower trust in recorded totals

Impact on the user if chosen:

- active state becomes harder to understand and historical reports become less reliable

### Alternative 3: Let The Frontend Compute And Persist Duration

Rejected.

Why it was considered:

- it appears faster to implement in the UI

Why it was not chosen:

- it weakens backend authority and creates inconsistency risk

Impact on the user if chosen:

- users may see different totals across timer, history, and reports

### Alternative 4: Require Manual Entry In A Separate Non-Timer Module

Rejected for the initial design.

Why it was considered:

- it could reduce complexity in the live timer screen

Why it was not chosen:

- users generally think of manual time and live time as one time-tracking workflow

Impact on the user if chosen:

- extra navigation and slower correction/backfill workflows

---

## Follow-Up Artifacts

This ADR is supported by the following companion artifacts:

- `docs/contracts/timer-module.contract.yml`
- `docs/c4-models/timerC4Model.md`

---

## Implementation Notes

- timer start must require `task_id`
- timer start must validate that the Task belongs to the selected Project
- timer start must validate access and lifecycle eligibility
- timer context should expose current running timer and only timer-eligible work
- timer APIs should support grouped historical retrieval by Task
- timer event streaming should notify the same User's active sessions about start, stop, update, and delete changes
- manual entry and stopped-entry edit must recompute duration server-side
- frontend should not offer timer start for projects that are not timer-ready
- if `isBillable` is persisted, schema support must be added intentionally rather than assumed from ADR-003

---

## References

- ADR-001: Domain Glossary & Access Control Policy
- ADR-003: Database Schema Design V2
- ADR-009: Projects Workflow, Contract, and Timer Readiness

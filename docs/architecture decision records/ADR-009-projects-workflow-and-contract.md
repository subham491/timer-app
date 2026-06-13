# ADR-009: Projects Workflow, Contract, and Timer Readiness

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 03-06-2026 |
| **Deciders** | Frontend and Backend Team |
| **Depends on** | ADR-001, ADR-003 |
| **Supersedes** | None |
| **Superseded by** | None |

---

## Context

The application requires a scalable `Projects` workflow that is consistent with the domain model and schema already established by earlier ADRs.

ADR-001 establishes the business vocabulary and makes two rules especially important here:

- a **Project** is a named container for work
- time is tracked against **Tasks**, not directly against Projects

ADR-003 defines the underlying schema direction and already includes:

- `projects`
- `tasks`
- `assignments`
- project-scoped access and management structures

The new workflow must therefore:

1. preserve the earlier domain model
2. define how project creation should behave in the frontend
3. define how frontend and backend align through a stable API contract
4. define when a Project is operationally ready for timer workflows

Without this decision, implementation is likely to drift in three ways:

- project creation might incorrectly require tasks at all times
- timer behavior might become ambiguous for projects without tasks
- frontend and backend might implement mismatched payload and workflow assumptions

---

## Decision

The Projects module will be implemented using a **project-first, API-first workflow**.

The module will allow a Project to be created independently, while treating Tasks as optional operational extensions that may be added during the same interaction or later.

Timers will remain strictly **task-based**. Timer creation without a valid task is not allowed.

---

## Decision Details

### 1. Project Creation Is Independent Of Task Creation

Projects may be created before any Tasks exist.

This is needed because real projects may exist in:

- planning
- approval
- onboarding
- inactive pre-execution states

This helps the end user because:

- project setup is not blocked by incomplete task planning
- abandoned creation flows are reduced
- teams can register work structures earlier

---

### 2. Inline Task Creation Is Optional During Project Creation

The create flow will support:

- project only
- project with assignments
- project with project managers
- project with tasks
- project with both assignments and tasks

This is needed because enterprise teams do not always follow the same onboarding sequence.

This helps the end user because:

- one flow supports both quick setup and richer setup
- users do not need to leave the creation flow to complete operational structure
- project administration becomes lower-friction

The structural mapping must align with ADR-003:

- project access is represented through `assignments`
- managerial ownership is represented through `project_managers`

---

### 3. Tasks Are Operational Extensions, Not Mandatory Prerequisites

Tasks are required for execution and time tracking, but not for initial project identity.

This is needed because Projects represent business structure, while Tasks represent executable work categories.

This helps the end user because:

- business setup can happen before operational setup
- the system reflects real delivery stages more accurately

---

### 4. Timers Are Allowed Only Against Tasks

Timer creation without a task is not allowed.

Functional rules:

- Project without Task: allowed
- Timer without Task: not allowed
- Project becomes timer-ready only when at least one active Task exists

This is needed because timer entries must map to actionable work units, not only administrative containers.

This helps the end user because:

- time logs remain meaningful
- approvals become clearer
- reports and analytics stay attributable
- billing and execution views remain cleaner

This rule must be enforced by both frontend and backend:

- frontend must require task selection
- backend must reject timer creation if `task_id` is missing, invalid, archived, or unrelated to the selected project

---

### 5. Frontend And Backend Will Align Through A Formal Contract

The Projects module contract will define:

- list, detail, create, update, archive, and restore behavior
- lookup payloads for forms and filters
- optional inline task creation payloads
- project timer-readiness fields
- project-manager and assignment mapping behavior aligned to ADR-003

This is needed because the workflow now supports multiple valid creation paths while preserving one strict timer rule.

This helps the end user because:

- UI and API behavior stays consistent
- form behavior becomes more reliable
- fewer rework cycles reach end users as bugs

---

## Architecture Implications

### Frontend

The frontend Projects feature should remain feature-driven and contain:

- `api/`
- `components/`
- `hooks/`
- `pages/`
- `types/`
- `validations/`
- `tests/`

Why this is needed:
- the module has enough complexity to require explicit boundaries

How this helps the end user:
- better maintainability supports a more stable and predictable project workflow

### Backend

The backend should expose a dedicated `projects` domain via:

- endpoint layer
- service layer
- repository layer
- project/task relationship models
- assignment and project-manager relationship handling

Why this is needed:
- business rules for project creation and timer-readiness should not be scattered

How this helps the end user:
- API behavior stays consistent across create, update, archive, restore, and timer-related validation

---

## Rationale

This decision extends ADR-001 and ADR-003 by adding the missing workflow layer between domain design and feature implementation.

It strengthens the earlier documents because it answers:

- how Projects are created in practice
- whether Tasks are mandatory at creation time
- whether time tracking can happen without Tasks
- how frontend and backend coordinate on the same workflow
- how assignments and project-manager ownership should surface in the workflow

This helps the end user at the end because:

- project setup is flexible
- timer behavior is strict and understandable
- the system avoids ambiguous time records

---

## Consequences

### Positive

- project onboarding becomes more flexible
- taskless projects are supported for planning-stage work
- timer governance remains strict and operationally sound
- frontend and backend can build against one agreed workflow contract
- user confusion is reduced around when a project is ready for time tracking

### Negative

- create and update payloads become slightly richer
- timer-readiness must be surfaced clearly in UI and API
- backend validation must be explicit rather than implied

### Neutral

- this ADR does not replace ADR-001 or ADR-003; it extends them with workflow behavior

---

## Alternatives Considered

### Alternative 1: Require Tasks During Every Project Creation

Rejected.

Why it was considered:

- appears simpler for workflow enforcement

Why it was not chosen:

- it creates unnecessary friction during planning and onboarding stages

Impact on the user if chosen:

- users would be forced to define execution details too early

### Alternative 2: Allow Timers Directly Against Projects

Rejected.

Why it was considered:

- appears simpler for timer UX

Why it was not chosen:

- it weakens attribution and breaks the task-based domain model defined in ADR-001

Impact on the user if chosen:

- vague time entries, weaker approvals, and noisier reporting

### Alternative 3: Separate Task Creation Into A Distinct Flow Only

Rejected for the initial implementation.

Why it was considered:

- stronger separation of concerns

Why it was not chosen:

- many users benefit from creating tasks during project setup

Impact on the user if chosen:

- more navigation and higher form abandonment

---

## Follow-Up Artifacts

This ADR is supported by the following companion artifacts:

- `docs/contracts/projects-module.contract.yml`
- `docs/contracts/projects-module.swagger-ui.html`
- `docs/c4-models/projectC4Model.md`

---

## Implementation Notes

- Project creation must map user access through `assignments`
- Project creation must map managerial ownership through `project_managers`
- Project creation must accept optional inline task creation
- Project detail should surface timer-readiness clearly
- Timer workflows must exclude or disable projects that have no active tasks

---

## References

- ADR-001: Domain Glossary & Access Control Policy
- ADR-003: Database Schema Design V2

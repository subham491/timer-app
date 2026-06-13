# Timer Module C4 Model Input

Use this file as prompt-ready source material for generating C4 diagrams for the `Timer` module.

This version is intentionally structured so every major element explains:

- why it is needed
- how it helps the end user

## Scope

This model covers only the `Timer` module.

Why it is needed:
- a focused scope keeps timer architecture reviewable and prevents the workflow rules from getting diluted by unrelated modules

How it helps the user:
- the final implementation stays clearer, more predictable, and easier to use correctly

## System Context

### Primary User: Authenticated Employee Or Manager

Why it is needed:
- this is the actor who starts timers, stops timers, creates manual entries, reviews timesheets, and corrects mistakes

How it helps the user:
- the design can prioritize low-click daily use, strong clarity, and fast correction workflows

### External Or Adjacent Systems

#### Identity Provider

Why it is needed:
- timer operations must run in the context of an authenticated identity

How it helps the user:
- every time entry remains attributable to the correct user

#### Backend API

Why it is needed:
- timer validation, running-timer rules, duration ownership, and persistence should be centralized

How it helps the user:
- timer start, stop, and manual entry behavior stays consistent across devices and sessions

#### WebSocket Timer Event Channel

Why it is needed:
- the same user may have the timer open in multiple tabs, browser windows, or devices at the same time

How it helps the user:
- timer state changes become visible across active sessions quickly and stale UI state is reduced

#### Database

Why it is needed:
- time entries, task relationships, project readiness, and access rules must persist durably

How it helps the user:
- tracked work remains durable, reviewable, and reportable over time

## User Goals

### Start a timer quickly

Why it is needed:
- live tracking is the primary daily workflow for most users

How it helps the user:
- active work can be captured with minimal effort and fewer forgotten entries

### Stop a timer clearly

Why it is needed:
- users need an obvious way to complete the active work session

How it helps the user:
- finished work becomes finalized and immediately reviewable

### Create manual time entry

Why it is needed:
- not all work is tracked live, especially in meetings, offline scenarios, or delayed admin work

How it helps the user:
- users can still keep complete time history without faking a live workflow

### Review and filter historical entries

Why it is needed:
- users need confidence in what has already been captured

How it helps the user:
- they can search notes, review by project or task, and correct issues faster

### Review grouped entries by the same task

Why it is needed:
- repeated work is often easier to understand when similar entries are grouped together

How it helps the user:
- recurring work patterns and fragmented entries become easier to review and correct

### Edit eligible stopped entries

Why it is needed:
- mistakes in notes, timestamps, or task selection happen in real enterprise workflows

How it helps the user:
- the system stays practical and forgiving without losing structure

### Track time only against valid tasks

Why it is needed:
- time records should attach to executable work units, not only broad administrative containers

How it helps the user:
- time history remains more meaningful, more auditable, and better for reporting

Functional rule:
- timer creation without a valid task is not allowed

### Keep only one active timer per user

Why it is needed:
- concurrent timers create ambiguous and untrustworthy time attribution

How it helps the user:
- there is always one clear current activity and cleaner totals

## System Context Relationships

### Employee Or Manager -> Frontend Web App

Why it is needed:
- this is the main interaction surface for live tracking and time review

How it helps the user:
- one coherent workspace supports both current and historical time workflows

### Frontend Web App -> Backend API

Why it is needed:
- timer commands and time-entry queries require server validation and persistence

How it helps the user:
- actions succeed consistently and invalid actions fail with clearer reasons

### Backend API -> Database

Why it is needed:
- time history, assignments, and timer-eligibility relationships must be stored and queried centrally

How it helps the user:
- timer state remains durable and consistent across sessions

### Frontend Web App -> WebSocket Timer Event Channel

Why it is needed:
- the frontend needs a live event stream for timer updates that happen outside the current tab

How it helps the user:
- active timer state stays synchronized with fewer manual refreshes

### WebSocket Timer Event Channel -> Backend API

Why it is needed:
- the event stream must be fed by server-owned timer changes and validation outcomes

How it helps the user:
- real-time updates remain trustworthy because they originate from the same backend source of truth

### Frontend Web App -> Identity Provider

Why it is needed:
- timer actions belong to authenticated actors and role-aware permissions

How it helps the user:
- time is always tied to the correct identity and access scope

## Container Model

### Container 1: Frontend Web App

Technology:
- React + Vite + TypeScript + Material UI

Responsibilities:
- render timer entry workflow
- render current timer state
- render manual entry mode
- render historical time-entry list and filters
- render grouped historical views such as same-task grouping
- call timer and time-entry APIs
- manage server state with React Query
- subscribe to real-time timer events
- perform client-side validation only as a UX aid, not as the source of truth

Why it is needed:
- users need a fast and low-friction timer experience for frequent daily use

How it helps the user:
- core tracking actions stay quick while still preserving enterprise reliability

### Container 2: Backend API

Technology:
- Python backend with endpoint, service, repository layering

Responsibilities:
- validate timer start and stop actions
- validate project-task relationship
- validate assignment and permission rules
- enforce one running timer per user
- compute and finalize duration server-side
- validate manual entry and edit workflows
- expose timer context and historical entries
- publish timer state changes to the real-time event channel

Why it is needed:
- timer rules are business-critical and should not depend on frontend correctness

How it helps the user:
- users get more consistent behavior and more trustworthy totals

### Container 3: Database

Technology:
- relational database

Responsibilities:
- persist time entries
- persist tasks and projects
- persist assignment-based access relationships
- persist audit timestamps and update history fields

Why it is needed:
- timer operations depend on durable work structure and durable historical time

How it helps the user:
- tracked work remains stable, searchable, and reportable

## Component Model: Frontend Timer Module

### TimerPage

Why it is needed:
- one route-level composition point should orchestrate the timer feature

How it helps the user:
- the timer experience stays coherent and easier to evolve safely

### TimeboardOverview

Why it is needed:
- users need a quick summary of live and recent work state

How it helps the user:
- important timing context is visible without extra clicks

### TimerEntryPanel

Why it is needed:
- live timer start/stop and manual entry creation need one focused interaction surface

How it helps the user:
- the most common work happens from one compact and understandable panel

This panel should support:

- timer mode
- manual mode
- project selection
- task selection
- optional work note
- billable flag if billing is part of the product policy

Why it is needed:
- users need one clear entry point for all tracking actions

How it helps the user:
- reduces mode confusion and lowers repetitive navigation

### TimerFilters

Why it is needed:
- historical entries need fast narrowing controls

How it helps the user:
- searching notes and filtering by project/task becomes faster and more scalable

This area should also support:

- grouping by task

Why it is needed:
- users do not always want to review time only in raw chronological order

How it helps the user:
- recurring work becomes easier to scan and summarize

### TimerLogGroup

Why it is needed:
- grouped historical entries improve readability over long timelines

How it helps the user:
- users can understand day or period breakdowns more quickly

It should also support:

- grouping entries by the same task

Why it is needed:
- recurring entries under one task are a common enterprise review pattern

How it helps the user:
- task-level effort becomes easier to inspect without leaving the timer page

### TimerLogRow

Why it is needed:
- each entry needs clear task, project, note, duration, and edit actions

How it helps the user:
- review and correction workflows become more direct

### useTimerPageState

Why it is needed:
- page orchestration, filters, and timer-context state should not be mixed into rendering code

How it helps the user:
- more stable interactions reduce regressions in daily workflows

### useTimerEntryForm

Why it is needed:
- timer and manual-entry form rules need a dedicated orchestration point

How it helps the user:
- validation feedback and submit behavior become more consistent

### timerApi

Contains:
- getTimerContext
- getCurrentTimer
- startTimer
- stopTimer
- listTimeEntries
- createManualTimeEntry
- updateTimeEntry
- deleteTimeEntry

Why it is needed:
- timer-specific API logic should stay inside the timer feature boundary

How it helps the user:
- easier maintenance leads to more reliable timer behavior over time

### timerRealtimeClient

Responsibilities:
- establish WebSocket connection
- subscribe to timer started/stopped and time-entry change events
- invalidate or patch frontend timer queries when server events arrive

Why it is needed:
- real-time synchronization concerns should not be scattered across page components

How it helps the user:
- active timer state stays aligned across tabs and devices with less UI confusion

## Component Model: Backend Timer Module

### Timer Endpoint Layer

Why it is needed:
- request routing and HTTP response shaping should stay separate from timer business rules

How it helps the user:
- API behavior becomes cleaner and easier to reason about

### Timer Service Layer

Why it is needed:
- start/stop logic, manual entry validation, edit rules, and one-running-timer enforcement belong in one business layer

How it helps the user:
- timer actions behave consistently even as the UI grows

It should also coordinate:

- publishing timer lifecycle events after committed state changes

Why it is needed:
- real-time updates must only reflect successful backend state transitions

How it helps the user:
- users see accurate timer state instead of speculative UI changes

### Timer Repository Layer

Why it is needed:
- persistence and query logic should stay out of service code

How it helps the user:
- cleaner code supports better long-term reliability and maintainability

### Task And Assignment Validation Collaboration

Why it is needed:
- timer eligibility depends on task status, project readiness, and assignment/access rules

How it helps the user:
- the backend can block invalid work early and provide clearer guidance

## Important Data Objects

### Time Entry

Fields:
- id
- source
- workNote
- startAt
- endAt
- durationSeconds
- status
- isBillable
- user
- project
- task

Why it is needed:
- this is the atomic record of tracked work

How it helps the user:
- every piece of work remains understandable, attributable, and reportable

### Running Timer

Definition:
- a Time Entry with no `endAt`

Why it is needed:
- live tracking requires one current active record

How it helps the user:
- the user can always see exactly what is active right now

### Timer Context

Contains:
- current running timer
- timer-ready projects
- timer-ready tasks grouped by project
- capability flags when useful
- realtime connection metadata when useful

Why it is needed:
- the frontend should not reconstruct timer validity from scattered data sources

How it helps the user:
- valid options are clearer and invalid options are reduced before submission

### Timer Realtime Event

Contains:
- event type
- affected time entry id
- current running timer snapshot or invalidation hint
- timestamp

Why it is needed:
- tabs and devices need a server-driven way to learn about timer changes

How it helps the user:
- all active sessions can converge on the same state faster

## Key Flows

### Flow 1: Load Timer Page

1. User opens the Timer page
2. Frontend requests timer context
3. Backend returns current running timer, timer-ready projects, timer-ready tasks, and capability information
4. Frontend renders a ready-to-use timer workspace
5. Frontend establishes the WebSocket timer event connection

Why it is needed:
- the page must start with a valid and actionable state

How it helps the user:
- fewer initial clicks and less confusion about what can be tracked
- current state can stay synchronized after the page loads

### Flow 2: Start Timer

1. User selects a project
2. User selects a valid task within that project
3. User optionally enters a work note
4. User starts the timer
5. Backend validates assignment, project status, task status, and project-task relationship
6. Backend auto-stops any existing running timer if product policy requires it
7. Backend creates the new running time entry
8. Frontend refreshes current timer state and overview metrics
9. Backend emits timer start and timer context update events to the user's active sessions

Why it is needed:
- this is the primary live-tracking workflow

How it helps the user:
- work switching stays fast while rule enforcement stays reliable
- other tabs and devices reflect the new running state quickly

### Flow 3: Stop Timer

1. User stops the running timer
2. Backend closes the active entry
3. Backend computes and persists duration
4. Frontend refreshes overview and time-entry history
5. Backend emits timer stop and time-entry update events to the user's active sessions

Why it is needed:
- active work must become finalized history

How it helps the user:
- users can trust the recorded duration and review the result immediately
- other sessions stop showing stale running timers

### Flow 4: Create Manual Entry

1. User switches to manual mode
2. User selects project and task
3. User enters start and end timestamps
4. User optionally adds note and billable state
5. Backend validates eligibility and recomputes duration
6. Frontend refreshes the historical entry list
7. Backend emits time-entry created events so other sessions refresh relevant history

Why it is needed:
- not all work is captured live

How it helps the user:
- missing work can still be captured without inventing a fake live session

### Flow 5: Edit Stopped Entry

1. User opens a stopped entry for edit
2. User changes note, task, timestamps, or billable state
3. Backend validates the new state and recomputes duration
4. Frontend refreshes the updated history
5. Backend emits time-entry updated events to the user's active sessions

Why it is needed:
- users need a correction path for real-world mistakes

How it helps the user:
- time history stays accurate without unnecessary re-entry effort

### Flow 6: Review Same-Task Grouped History

1. User opens the historical timer list
2. User selects group-by-task mode
3. Frontend requests grouped time-entry data
4. Backend returns groups keyed by task with individual entries preserved inside each group
5. Frontend renders grouped review blocks

Why it is needed:
- recurring work is easier to review as grouped effort than as isolated individual rows

How it helps the user:
- users can inspect repeated work faster and spot anomalies more easily

### Flow 7: Invalid Timer Attempt Without Task

1. User attempts to start time without selecting a valid task
2. Frontend blocks the action or prevents the invalid selection path
3. If bypassed, backend rejects the request
4. User receives clear guidance to select a valid task

Why it is needed:
- task-based timer enforcement must exist at both UI and backend levels

How it helps the user:
- prevents ambiguous records and gives clearer recovery guidance

### Flow 8: Switch Work While Another Timer Is Running

1. User has an active running timer
2. User selects a new project and task
3. User starts a new timer
4. Backend auto-stops the old timer in the same transaction
5. Backend creates the new running timer
6. Frontend reflects the new active work item

Why it is needed:
- work switching is common in enterprise environments

How it helps the user:
- users can change work quickly without manually cleaning up state first

### Flow 9: Reflect Timer Change On Another Tab Or Device

1. User starts or stops a timer on one tab or device
2. Backend commits the timer state change
3. Backend publishes the corresponding WebSocket event
4. Another active tab or device for the same user receives the event
5. Frontend invalidates or patches current timer and history state
6. The second session updates without manual refresh

Why it is needed:
- multi-session behavior is common for real users

How it helps the user:
- all active sessions stay closer to the same truth and stale views are reduced

## Quality Attributes

### Accuracy

Why it is needed:
- time tracking is only useful if timestamps, task relationships, and durations are trustworthy

How it helps the user:
- users can trust totals, approvals, and reports

### Low-Click UX

Why it is needed:
- timer actions are frequent and repetitive

How it helps the user:
- daily work becomes faster and less frustrating

### Maintainability

Why it is needed:
- timer rules combine current state, history, validation, and permissions

How it helps the user:
- better code quality supports a more stable product

### Scalability

Why it is needed:
- historical time-entry volume can grow significantly

How it helps the user:
- review screens stay usable as more time is logged

### Realtime Consistency

Why it is needed:
- multiple sessions can otherwise drift apart quickly during timer use

How it helps the user:
- users can trust what they see even when they move between tabs and devices

### Testability

Why it is needed:
- timer workflows are business-critical and regression-prone

How it helps the user:
- fewer production issues in start, stop, edit, and manual entry flows

## Suggested C4 Diagram Outputs

Generate these diagrams:

1. System Context diagram for the Timer module
2. Container diagram for Frontend, Backend API, and Database
3. Frontend Component diagram
4. Backend Component diagram
5. Dynamic diagram for Load Timer Page flow
6. Dynamic diagram for Start Timer flow
7. Dynamic diagram for Manual Entry flow
8. Dynamic diagram for grouped same-task history review
9. Dynamic diagram for blocked timer creation without task
10. Dynamic diagram for switching work while another timer is already running
11. Dynamic diagram for cross-tab and cross-device timer synchronization

## Prompt Template

Use this prompt with ChatGPT:

`Create a C4 model for the Timer module of an enterprise time-tracking web application using the architecture described in timerC4Model.md. For every element, preserve the stated reason for why it is needed and how it helps the end user. Reflect that timers are task-based, timer creation without a valid task is not allowed, only one running timer is allowed per user, starting a new timer auto-stops the previous one, manual entries are allowed but still task-based, duration is computed server-side, historical entries can be grouped by the same task, and WebSocket-based real-time synchronization keeps timer state aligned across tabs and devices. Generate System Context, Container, Frontend Component, Backend Component, Dynamic Load Timer Page flow, Start Timer flow, Manual Entry flow, grouped same-task history review flow, blocked timer creation without task flow, work-switch flow, and cross-tab/cross-device synchronization views.`

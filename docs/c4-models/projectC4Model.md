# Projects Module C4 Model Input

Use this file as prompt-ready source material for generating C4 diagrams for the `Projects` module.

This version is intentionally structured so every major element explains:

- why it is needed
- how it helps the end user

## Scope

This model covers only the `Projects` module.

Why it is needed:
- a focused scope prevents the architecture discussion from becoming vague

How it helps the user:
- the final module design becomes clearer and easier to implement correctly

## System Context

### Primary User: Authenticated Employee Or Manager

Why it is needed:
- this is the person who creates, reviews, and maintains project records

How it helps the user:
- the design can prioritize speed, clarity, and low-click administrative workflows

### External Or Adjacent Systems

#### Identity Provider

Why it is needed:
- access to projects should depend on authenticated user identity

How it helps the user:
- only the right people see and manage the right project data

#### Backend API

Why it is needed:
- project data and business rules belong in a central backend service

How it helps the user:
- consistent results across list, detail, create, edit, archive, and restore actions

#### Database

Why it is needed:
- project definitions, assignments, project-manager mappings, tasks, and statuses must persist over time

How it helps the user:
- project information remains durable and available across sessions

### User Goals

#### View projects

Why it is needed:
- users need an overview of available work structures

How it helps the user:
- they can understand the current project landscape quickly

#### Search and filter projects

Why it is needed:
- enterprise datasets grow too large for manual scanning

How it helps the user:
- users find the right project faster with fewer clicks

#### Create a project

Why it is needed:
- new work initiatives need a formal structure

How it helps the user:
- teams can start organizing work immediately

The project creation flow must allow:

- project only
- project with assignments
- project with project managers
- project with tasks
- project with both assignments and tasks

Why that is needed:
- operational task design is not always available at the moment the project record must be created

How it helps the user:
- users can complete the minimum useful setup now and enrich the project later

#### Edit a project

Why it is needed:
- project ownership, tasks, and statuses change over time

How it helps the user:
- the system stays accurate and useful instead of becoming stale

#### Archive or restore a project

Why it is needed:
- not all projects stay active forever, but records should remain recoverable

How it helps the user:
- lifecycle management becomes safe and reversible

#### See project managers, assignments, and linked tasks

Why it is needed:
- users need both managerial accountability and access scope in one place

How it helps the user:
- they can understand who manages the project, who is assigned to it, and what work belongs to it

#### Start timers only when tasks exist

Why it is needed:
- timers should attach to actionable work units, not only administrative containers

How it helps the user:
- time logs remain operationally meaningful and better aligned with reporting

Functional rule:
- timer creation without a task is not allowed

## System Context Relationships

### Employee Or Manager -> Frontend Web App

Why it is needed:
- this is the main interaction channel for project management

How it helps the user:
- gives one consistent interface for project administration

### Frontend Web App -> Backend API

Why it is needed:
- the frontend must fetch and mutate project data

How it helps the user:
- supports responsive list views and reliable save actions

### Backend API -> Database

Why it is needed:
- project data must be stored and queried centrally

How it helps the user:
- changes persist correctly and can be retrieved later

### Frontend Web App -> Identity Provider

Why it is needed:
- access control begins with authenticated identity

How it helps the user:
- reinforces safe and role-aware usage

## Container Model

### Container 1: Frontend Web App

Technology:
- React + Vite + TypeScript + Material UI

Responsibilities:
- render projects list page
- render create/edit form
- handle search, filters, sorting, and pagination
- call backend APIs
- manage server state with React Query
- support optional inline task creation during project creation

Why it is needed:
- the user needs an efficient and responsive project management UI

How it helps the user:
- enables low-click project operations from one coherent page

### Container 2: Backend API

Technology:
- Python backend with endpoint, service, repository layering

Responsibilities:
- expose projects endpoints
- validate request payloads
- enforce project business rules
- return summaries, details, and lookups
- allow project-first creation even when tasks are not yet defined
- enforce that timer participation depends on task availability

Why it is needed:
- business logic and persistence rules should not live in the frontend

How it helps the user:
- creates more reliable, consistent project behavior

### Container 3: Database

Technology:
- relational database

Responsibilities:
- persist projects
- persist assignment relationships
- persist project-manager relationships
- persist project-task relationships
- persist audit timestamps and status changes

Why it is needed:
- the system needs durable project data and relationships

How it helps the user:
- project history and structure remain stable over time

## Component Model: Frontend Projects Module

### ProjectsPage

Why it is needed:
- the route needs one top-level composition point

How it helps the user:
- the overall page stays structured and easier to evolve without breaking core flows

### ProjectsToolbar

Contains:
- search
- status filter
- project manager filter
- create action

Why it is needed:
- users need the main control surface at the top of the page

How it helps the user:
- faster finding and acting on projects without opening multiple panels first

### ProjectsList

Why it is needed:
- projects must be rendered in a scalable enterprise list or grid

How it helps the user:
- users can scan many projects quickly and act from the same context

### ProjectFormDrawer

Why it is needed:
- create and edit should happen without taking the user away from the list

How it helps the user:
- users keep their context and complete changes faster

This drawer must support:

- project-only creation
- project plus assignment mapping
- project plus project-manager mapping
- project plus inline task creation
- project plus both assignments and tasks

Why it is needed:
- one rigid create path would not match real enterprise onboarding workflows

How it helps the user:
- fewer abandoned forms and smoother staged setup

### useProjectsPageState

Why it is needed:
- filter state, drawer state, and page orchestration should not be mixed into rendering code

How it helps the user:
- more stable and predictable interactions

### useProjectForm

Why it is needed:
- form logic, validation, and submit handling need one focused place

How it helps the user:
- cleaner validation behavior and fewer form regressions

It should also manage:

- optional inline task sections
- dynamic create payload generation
- validation for project-only versus project-plus-task flows
- validation for assignments and project-manager mappings

### projectsApi

Contains:
- listProjects
- getProject
- createProject
- updateProject
- archiveProject
- restoreProject
- getProjectLookups

Why it is needed:
- project-specific API logic should stay within the project feature boundary

How it helps the user:
- easier maintenance translates into more reliable project operations

## Component Model: Backend Projects Module

### Endpoint Layer

Why it is needed:
- request routing and HTTP mapping must be separated from business rules

How it helps the user:
- clearer API behavior and cleaner error handling

### Service Layer

Why it is needed:
- create, update, archive, and restore rules belong in one business layer

How it helps the user:
- actions behave consistently no matter how the frontend evolves

### Repository Layer

Why it is needed:
- query and persistence logic should stay out of service code

How it helps the user:
- better maintainability supports better long-term performance and correctness

### Model Layer

Includes:
- project entity
- assignment mapping
- project manager mapping
- project task mapping

Why it is needed:
- project relationships must be explicit

How it helps the user:
- the system can accurately show who is involved and what work belongs to the project

This layer must also support:

- projects existing without tasks
- tasks being added later

Why it is needed:
- the business lifecycle of a project can start before execution begins

How it helps the user:
- administrative setup and operational setup can happen at different times

## Important Data Objects

### Project

Fields:
- id
- name
- description
- status
- createdAt
- updatedAt

Why it is needed:
- these are the minimum fields required to identify, classify, and manage a project

How it helps the user:
- the project is both understandable in lists and editable in detail views

Important rule:
- a project can exist without tasks

Why it is needed:
- projects are not always operational at creation time

How it helps the user:
- the user can register a project before all task planning is finished

### Project Summary

Contains:
- base project fields
- project manager count
- assignment count
- task count
- active timer count

Why it is needed:
- the list view needs compact but decision-useful information

How it helps the user:
- users can judge scope and activity without opening every project

### Project Detail

Contains:
- project summary fields
- assignments[]
- projectManagers[]
- tasks[]

Why it is needed:
- editing and inspection require full relationship visibility

How it helps the user:
- users can update the project from one complete view

Important rule:
- an empty `tasks[]` collection means the project exists but is not timer-ready yet

How it helps the user:
- the UI can explain clearly why project setup is complete enough for administration but not yet ready for tracking time

## Key Flows

### Flow 1: List Projects

1. User opens Projects page
2. Frontend requests `GET /projects`
3. Backend returns paginated, filtered summaries
4. Frontend renders the list and actions

Why it is needed:
- this is the primary project discovery workflow

How it helps the user:
- quick visibility into project inventory and current work structure

### Flow 2: Create Project

1. User clicks `Create Project`
2. Frontend opens the drawer
3. Frontend loads lookups if needed
4. User optionally adds assignments
5. User optionally adds project managers
6. User optionally adds inline tasks
7. User submits the form
8. Frontend calls `POST /projects`
9. Backend validates and stores the project
10. Backend also stores assignments, project managers, and tasks if they were included
11. Frontend refreshes the list

Why it is needed:
- new work must be onboarded efficiently

How it helps the user:
- users can define project structure in one low-click workflow

Important note:
- task creation is optional in this flow

Why it is needed:
- not every project starts with ready-to-execute tasks

How it helps the user:
- users are not blocked from creating the project due to incomplete task planning

### Flow 3: Edit Project

1. User clicks `Edit`
2. Frontend loads project detail
3. Drawer opens with current values
4. User updates fields
5. Frontend calls `PATCH /projects/{projectId}`
6. Backend updates the project
7. Frontend refreshes relevant queries

Why it is needed:
- projects evolve over time

How it helps the user:
- users can keep records accurate without rebuilding them

### Flow 4: Archive Project

1. User clicks `Archive`
2. Frontend calls archive endpoint
3. Backend marks the project archived
4. Frontend refreshes the list

Why it is needed:
- project lifecycle control should not depend on hard deletion

How it helps the user:
- users can safely retire projects while preserving history

### Flow 5: Timer readiness

1. User creates a project without tasks
2. Project appears in project management views
3. Timer module does not allow time tracking against that project yet
4. User later adds one or more tasks
5. Project becomes operationally ready for timer workflows

Why it is needed:
- it separates administrative setup from operational execution

How it helps the user:
- the user can onboard work in stages without losing process clarity

### Flow 6: Invalid timer attempt without task

1. User tries to start a timer from a project that has no valid active task
2. Frontend blocks the action or disables the project in timer selection
3. If bypassed, backend rejects timer creation
4. User sees guidance to add or select a task first

Why it is needed:
- the rule must be enforced at both UX and backend levels

How it helps the user:
- users get clear feedback instead of creating ambiguous or invalid time entries

## Quality Attributes

### Enterprise UX

Why it is needed:
- the page should support fast repetitive administration

How it helps the user:
- fewer clicks, clearer actions, and better list usability

### Maintainability

Why it is needed:
- this module will evolve with more rules and fields

How it helps the user:
- stable code quality leads to stable user workflows

### Scalability

Why it is needed:
- project volume can grow significantly

How it helps the user:
- the page remains performant as data grows

### Workflow flexibility

Why it is needed:
- enterprise projects often move from planning to execution in stages

How it helps the user:
- the system adapts to real delivery workflows instead of forcing a rigid create sequence

### Testability

Why it is needed:
- business-critical workflows should be verifiable

How it helps the user:
- fewer regressions in list, filter, and form behavior

## Suggested C4 Diagram Outputs

Generate these diagrams:

1. System Context diagram for the Projects module
2. Container diagram for Frontend, Backend API, and Database
3. Frontend Component diagram
4. Backend Component diagram
5. Dynamic diagram for Create Project flow
6. Dynamic diagram for Project-to-Timer readiness flow
7. Dynamic diagram for blocked timer creation without task

## Prompt Template

Use this prompt with ChatGPT:

`Create a C4 model for the Projects module of an enterprise time-tracking web application using the architecture described in projectC4Model.md. For every element, preserve the stated reason for why it is needed and how it helps the end user. Reflect that projects can be created independently, tasks can be created inline optionally, assignments control time-logging access, project_managers control managerial ownership, and timer creation is not allowed without a valid task. Generate System Context, Container, Frontend Component, Backend Component, Dynamic Create Project flow, Project-to-Timer readiness flow, and blocked timer creation without task views.`

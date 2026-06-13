# ADR-002: Database Schema

---

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 01-05-2026 |
| **Deciders** | Mohammed Siddique, Subham Panda|
| **Supersedes** | None |
| **Superseded by** | None |

---

## Context

This ADR documents the SQLite database schema. It documents the table name, column name, data type and constraints in this schema.
The API endpoints and other variable of the application uses the same variable names used in this schema.
Any subsequent schema migration, ORM model, API serialiser, or UI label MUST derive its field names from this document

## Decision

we will follow the main three-table schema for the Timer App. Based on this schema the timer-app prototype is being built.

## Rationale

A Database schema has to be decided to help the frontend and backend engineer collaborate and develop the APIs and logic surrounding them with this variable names as the common connector.
Decision on the database schema enables to integrate the frontend with backend effectively.

### Schema Overview

USERS
    user_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    universal_id    TEXT    NOT NULL UNIQUE,
    display_name    TEXT    NOT NULL,
    email           TEXT    NOT NULL UNIQUE,
    password_hash   TEXT,
    password_salt   TEXT,
    auth_provider   TEXT    NOT NULL DEFAULT 'local',
    microsoft_userid   TEXT,
    microsoft_tenantid TEXT,
    role            TEXT    NOT NULL DEFAULT 'user',
    email_verified  INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP

TASKS
    task_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    universal_id TEXT    NOT NULL UNIQUE,
    user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    project_id   INTEGER,
    name         TEXT    NOT NULL,
    description  TEXT,
    status       TEXT    NOT NULL DEFAULT 'todo',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

TIMELOGS
    log_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    universal_id     TEXT    NOT NULL UNIQUE,
    task_id          INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    task_description TEXT,
    user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    start_time       TIMESTAMP NOT NULL,
    end_time         TIMESTAMP,
    duration         INTEGER,
    status           TEXT    NOT NULL DEFAULT 'running',
    edited_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_by        INTEGER REFERENCES users(user_id),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

TOKEN_BLACKLIST
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    jti        TEXT    NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP   

## Consequences

### Positive

Integration between frontend and backend becomes easier and smooth.

### Negative

Any future changes to the DB migt require additonal effort to make required changes.

### Neutral

No Changes since this is the first decision record.

## Scaling Implications

The Database schema was designed considering the fact that the future addtion of the project feature along with SSO based authorization, and Admin feature can be easily added on top of this existing database schema.


## Implementation Notes

Utilize this database schema for db creation and repository manipulation operations.

# Architecture Decision Records — Timer App

This directory contains the Architecture Decision Records (ADRs) for the Timer App project.

An ADR is a document that captures an important architectural decision made along with its context and consequences. ADRs are **immutable once accepted** — they are never deleted, only superseded by newer ADRs.

---

## What is an ADR?

An ADR answers three questions:
1. **What** decision was made?
2. **Why** was it made (context, constraints, alternatives considered)?
3. **What are the consequences** — intended and unintended?

ADRs are the primary artifact that lets a new developer understand *why* the codebase looks the way it does, not just *what* it does.

---

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-000](ADR-000-template.md) | ADR Template | Template | — |
| [ADR-001](ADR-001-domain-glossary.md) | Domain Glossary & Core Entity Definitions | Proposed | 11-05-2026 |
| [ADR-002](ADR-002-Database_Schema.md) | Database_Schema | Accepted | 01-05-2026 |
| [ADR-003](ADR-003-Database_Schema-V2.md) | Database_Schema for V2 | Proposed | 11-05-2026 |
| [ADR-009](ADR-009-projects-workflow-and-contract.md) | Projects Workflow, Contract, and Timer Readiness | Proposed | 03-06-2026 |
| [ADR-010](ADR-010-timer-workflow-and-time-entry-contract.md) | Timer Workflow and Time Entry Contract | Proposed | 03-06-2026 |

---

## How to Use This Directory

### Reading ADRs
Start with **ADR-001** (Domain Glossary) before reading any other ADR. It defines the vocabulary used across all other documents.

### Writing a New ADR
1. Copy `ADR-000-template.md`.
2. Name it `ADR-NNN-short-title.md` where `NNN` is the next sequential number.
3. Fill in every section. Do not leave sections blank — write "N/A" with a reason if a section genuinely does not apply.
4. Set status to `Proposed`.
5. Open a pull request. The ADR is reviewed like any other code change.
6. Once the team agrees, update status to `Accepted` and merge.

### Superseding an ADR
Never delete or edit an accepted ADR. Instead:
1. Write a new ADR explaining the new decision and why the old one no longer holds.
2. Update the old ADR's status to `Superseded by ADR-NNN`.
3. Add a link from the old ADR to the new one.

---

## ADR Statuses

| Status | Meaning |
|--------|---------|
| `Proposed` | Under discussion, not yet agreed |
| `Accepted` | Agreed by the team and in effect |
| `Deprecated` | No longer recommended but not yet replaced |
| `Superseded` | Replaced by a later ADR (link provided) |
| `Template` | Not a real ADR — the blank template |

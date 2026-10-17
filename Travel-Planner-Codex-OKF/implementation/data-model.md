---
type: Architecture Proposal
title: Suggested data model
description: A small relational model that separates facts, scenarios, and sourced
  estimates.
status: draft
tags:
- travel-planner
- codex-handoff
generated:
  by: chatgpt/handoff-author
  at: '2026-10-17T18:10:00Z'
sources:
- id: interview
  resource: /references/interview.md
  title: Ryan product discovery interview, 2026-10-17
evidence_class: mixed
---

# Status

This is a proposed logical model, not a prescribed database or migration. Inspect an existing repo before choosing storage. IDs are opaque; date-only and timestamp fields must be distinct.

| Entity | Suggested key fields | Integrity |
|---|---|---|
| Household | id, name | Private shared workspace |
| Membership | household_id, user_id, role | Server authorization on every read/write |
| Person | id, household_id, name | Ryan and Lily are separate accounting subjects |
| EmploymentPolicy | person_id, effective_from, weekday_hours, accrual rule, rollover rule | Effective-dated policy; unknown fields stay unknown |
| BalanceAnchor | person_id, as_of_date, hours, editor, created_at | Explicit closing-date convention |
| AccrualCredit | person_id, credit_date, exact_hours, source | Generated or overridden; no duplicate credit IDs |
| CalendarObligation | person_id, date, kind, pto_hours, mandatory | Holiday/non-trip leave; no duplicated debit |
| SchoolBreak | household_id, start_date, end_date, title, source | Opportunity annotation, not a leave debit |
| PlanYear | id, household_id, year | Selected horizon through Dec 31 |
| Scenario | id, plan_year_id, name, parent_id, revision | Distinct baseline/alternative identity |
| Trip | id, scenario_id, destination_id, title, locked | Independent clone identity |
| Participation | id, trip_id, person_id, start_date, end_date | Optional participant; separate date ranges |
| DayAllocation | scenario_id, person_id, date, pto_hours, classification, lock, trip reference | Unique effective person-date debit; conflicts explicit |
| Destination | id, label, coordinates, airport candidates | Stable identity, not only a map pixel |
| Estimate | scenario/trip reference, query fingerprint, components, currency, source, retrieved_at | No ambiguous per-person/group totals |
| WeatherContext | destination, dates/season, kind, source, updated_at | Climate versus forecast explicit |
| ChangeRecord | household_id, entity_id, revision, editor, created_at, change | Conflict detection/recovery |

## Allocation ownership

Avoid competing authoritative debit tables. Calendar obligations describe required leave; scenario trip/day allocations describe intended use. One deterministic resolver constructs each person's effective daily debit with reasons. Explicit exceptions should override with an audit record. Do not sum raw holiday and trip tables together.

## Global versus scenario data

Proposed globals: membership, employment policy, balance anchors, actual historical usage, school breaks. Proposed scenario data: future trips, participant schedules, hypothetical non-trip leave changes, locks. A scenario references a global input revision, and balance corrections trigger recomputation. Decide precise boundaries before writing migrations; avoid copying anchors into every scenario and letting them drift unnoticed.

## Derived projections

Forecasts and comparison summaries are derived, not independent mutable truth. Cache by scenario revision plus employment/calendar/anchor input revision. Update a trip's dates, allocations, and lock checks atomically. Never commit a partially shifted trip.

## Concrete first implementation — 2026-10-17

The proposed relational entity list above was not treated as a fixed schema. SQLite stores `users`, hashed `sessions`, a single atomic `planner` document/revision, recoverable `history`, and fingerprinted provider `evidence`. The planner document contains year-indexed shared policies, school breaks, and isolated scenario trip/day/non-trip records. Server Zod/domain validation and transaction-level optimistic revision checks enforce integrity. All endpoints authorize the two household identities; there is no multi-tenant routing or public household ID access. The shared server, not browser storage, is authoritative.

This document model keeps scenario edits atomic and the implementation small for two users. Increasing membership, very large plans, or multiple server replicas would require explicit schema/deployment work. First startup creates the schema idempotently. Backups use SQLite `VACUUM INTO`; revision restores respect current locks. See the root README for deployment, password recovery, backup, and test instructions.

## Free production adapter — 2026-10-17

`cloudflare/store.ts` implements durable D1 storage for the shared planner, history and evidence. The deployed mode delegates identity sessions to Cloudflare Access; Node-local password/session tables stay local. A database trigger archives the old planner revision in the same transaction as a single conditional update with `RETURNING`; racing edits yield one success and one explicit conflict. D1 schema creation is idempotent after the first authorized request. Configured household identity is checked before reading or initializing household data. The 256-KiB application journal bound makes free-tier parsing work finite and returns a visible error instead of silently dropping data.

Node and D1 expose the same evidence-cache contract. Tests run the real local D1 engine across restart and concurrent writes, plus the complete bundled Worker in workerd with signed synthetic Access tokens/JWKS. No mock authentication flag is included in the deployed Worker; the browser bridge belongs only to tests. Keep the same D1 database ID bound across deployments.

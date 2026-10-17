---
type: Delivery Plan
title: Implementation sequence
description: Build the complete planning loop before expanding itinerary depth.
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

# Implementation approach — proposed

## 1. Inspect and establish

Read repository instructions and this bundle. Choose a stack consistent with the repo or, for greenfield, a small web stack with a real server database and authentication. Record architecture and provider decisions. Create explicit demo fixtures with synthetic data; do not initialize a real account with invented balances or bookings.

## 2. Implement the accounting core

Build exact-hour accrual generation, date ledger, holiday resolver, anchors/corrections, and scenario-independent forecasting. Execute the numerical acceptance cases before connecting attractive UI. Make missing input states first-class.

## 3. Deliver a persistent vertical slice

Two authorized users share a year workspace. Enter balances/policies; add a destination/trip with separate participation dates and per-day leave; save; reopen from a second session. Prove durability and authorization early.

## 4. Complete year planning

Build attractive year view, compact balance cards, trip drawer, lock behavior, non-travel leave, school-break highlights, and full-horizon feedback. Include cancel/delete/undo behavior that preserves data integrity.

## 5. Alternatives and explanations

Clone/name scenarios, compare plans, calculate exact multi-donor tradeoffs, preview and apply changes without mutating the baseline. Validate every suggestion by ledger resimulation.

## 6. Discovery services

Integrate map search and destination exploration, sourced flight/lodging estimates, and correctly labeled weather context. If provider access is unavailable, finish the core and expose honest unavailable states; clearly list outstanding discovery requirements before calling the full requested scope complete.

## 7. Verify and hand over

Run core unit tests, workflow integration tests, authorization/concurrency tests, and a real-browser visual pass. Demonstrate two distinct sessions. Document local startup, migrations, environment variables without secrets, test commands, deployment, backups/recovery, provider limitations, and how the users configure real PTO values.

## Product review focus

Show the year planning workflow first. Ask targeted feedback on calendar/map balance and scenario comparison after the user can interact; do not block the accounting implementation on a branding decision.

## Definition of done

The core loop is functional, durable, accessible to both users, and passes [acceptance](/quality/acceptance.md). Missing integrations and unknown employer inputs are explicitly visible. No fabricated availability, price, forecast, saved state, or success message substitutes for working behavior.

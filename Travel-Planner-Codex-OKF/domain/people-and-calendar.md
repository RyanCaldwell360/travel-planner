---
type: Domain Concept
title: People and calendars
description: Work schedules, holiday differences, and family opportunities.
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

# Confirmed context

| Person | Work schedule | Holiday treatment | Travel example |
|---|---|---|---|
| Ryan | 40 hours, Monday–Friday | Not established | Cozumel early arrival, remote work before Ironman |
| Lily | 40 hours, Monday–Friday | Has to use PTO for holidays | Greece trip; later Cozumel arrival, possibly Friday |

An eight-hour weekday is the proposed initial model. Keep hours as the accounting unit. School breaks are opportunity highlights for family trips, not a prohibition on other dates. Kaia's father is flexible about swapping parenting time; no custody constraints are needed initially.

## Calendar design proposals

- Use date-only values for leave/travel calendar days. America/Chicago is the household display default; timestamps for saves/quotes use UTC with offset-aware rendering.
- Separate each person's work calendar from the trip location's local timezone.
- A calendar day can have travel membership plus a work classification; these are separate facts.
- Highlight holidays and school breaks with labels, never color alone.
- A Lily holiday that requires PTO consumes it even when no trip exists. During a trip, consume it exactly once.
- If a holiday is actually worked or handled differently, allow an explicit reviewed override rather than force a duplicate deduction.
- Do not mark all future school breaks or employer holidays as known without real input.

See [PTO semantics](/domain/pto.md) and [trip structure](/domain/trips.md).

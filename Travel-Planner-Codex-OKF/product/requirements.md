---
type: Requirements
title: Requirements and scope
description: Traceable first-version requirements and deferred features.
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
evidence_class: confirmed
---

# Requirements

All C requirements below are confirmed by the interview. P items are proposed implementation safeguards. IDs are stable for tests and issues.

| ID | Requirement | Observable result |
|---|---|---|
| C01 | Shared year planning | Both users can review a selected year's trips and opportunities. |
| C02 | Separate PTO forecasts | Each has a balance timeline through December, not a combined household pool. |
| C03 | Pay-period accrual | Forecast uses each person's actual configured credit dates and rate. |
| C04 | Balance corrections | Manually update a current balance without losing the plan. |
| C05 | Non-travel leave | Enter PTO for obligations unrelated to a trip. |
| C06 | Individual trip participation | Separate arrival/departure dates and per-day PTO use within the same trip. |
| C07 | Remote work | Being away does not automatically consume PTO on working days. |
| C08 | Protected days | Lock whole trips or individual days against alteration. |
| C09 | Full-year feasibility | Detect later shortages caused by an earlier trip. |
| C10 | Concrete tradeoffs | Show hours/dates that can be removed from one or multiple flexible trips. |
| C11 | Saved alternatives | Keep named versions and compare without overwriting the baseline. |
| C12 | Family opportunities | Highlight entered Kaia school breaks; custody weekends need not restrict travel. |
| C13 | Destination exploration | Use an interactive map to discover/select places and enter dates. |
| C14 | Origin | Default travel estimates to Minneapolis–Saint Paul (MSP). |
| C15 | Sourced estimates | Show estimated flights plus lodging based on sources, not invented user guesses. |
| C16 | Weather | Provide weather context for destination/date exploration. |
| C17 | Persistent collaboration | Both laptops can edit the same saved planner after closing/reopening. |
| C18 | Employment differences | M–F, 40-hour weeks for both; Lily uses PTO for holidays. |
| C19 | Visual appeal | Map, photography, journal warmth, readable year overview. |
| P01 | Data integrity | Explain missing inputs; no silent lost updates or duplicate PTO deductions. |
| P02 | Privacy | Restrict the shared plan to authorized household members. |
| P03 | Evidence clarity | Separate demo, stale, unavailable, approximate, and live sourced information. |

## First usable release

The complete planning loop includes setup, trip/day editing, yearly forecasting, locking, non-travel leave, alternatives, tradeoffs, and server-persisted shared access. Deliver discovery integrations in a follow-on increment if provider access would block that loop, and clearly report that increment as incomplete rather than redefining C13–C16 away.

## Deferred or deliberately absent

- Detailed daily sightseeing itinerary editor: later, after the year-planning loop.
- Booking/payment processing and automatic employer/payroll sync: not requested.
- Automatic affordability decision or annual budget enforcement: explicitly unnecessary; users judge cost themselves.
- Minimum PTO reserve: user does not currently want one.
- Complex minimum-night, trip-priority, or other hard optimization rules: not needed initially.
- Custody-calendar enforcement, separate personal draft workflow, mobile-first design: not required for first release.
- Automatic remote-work recommendations: do not assume an employer permits working from a destination.

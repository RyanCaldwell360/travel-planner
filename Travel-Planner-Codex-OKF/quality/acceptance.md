---
type: Acceptance Specification
title: Behavioral acceptance scenarios
description: Concrete tests for calculations, tradeoffs, persistence, and discovery.
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

# Fixtures

All numbers/dates here are **synthetic test inputs**, not the couple's actual PTO or bookings. Use eight-hour weekdays unless a case overrides. Explicit event fixtures can bypass payroll generation to isolate behavior.

## A01 — Travel differs from leave (C06–C07)

Ryan is in Cozumel Monday through Sunday. He works remotely Monday–Thursday and takes Friday off. Lily arrives Friday and stays through Sunday, taking Friday off. With no holidays, charge Ryan 8h and Lily 8h, not 40h each. Editing Lily's arrival does not change Ryan's participation.

## A02 — Holiday outside travel (C18)

Lily has an entered required 8h holiday on a weekday with no trip. Deduct 8h. Put that date inside a PTO trip: still deduct exactly 8h. Remove the trip: holiday deduction remains. Do not make any assertion about Ryan without his holiday configuration.

## A03 — Later commitments restrict February (C09)

Ryan starts Jan 1 with 40h. Explicit credits: 8h on the first day of each month February–December (88h). Existing leave: 48h on Nov 1 and 40h on Dec 1, applied after same-day credits. Before adding February, the minimum from Feb onward is 40h at year end. Add 48h on Feb 15 in this aggregate event fixture: balance is 0h after the February debit; Nov closing is 24h and Dec closing is -8h. Report the first shortfall as Dec 1, 8h. His February balance alone must not yield a feasible verdict. This is an aggregate ledger test; UI fixtures must distribute multi-day leave over valid workdays.

## A04 — Later cuts cannot repair an early shortfall (C10)

Start with 8h; take 16h on Feb 15; receive 40h on March 1; have 8h flexible leave in November. Removing November leave does not fix February's -8h. Do not present it as a feasible solution.

## A05 — Multiple donor trips (C10)

A candidate plan first falls to -16h on Nov 20. An unlocked 8h day in a September trip and an unlocked 8h day in an October trip are both valid cuts; all other balances remain nonnegative after both changes. Neither cut alone suffices. Offer a combined option identifying both dates/trips and 8h each. Validate the final complete timeline, not only Nov 20.

## A06 — Personal balances (C02)

Ryan is 8h short and Lily has 80h spare. Ryan remains short. No combined-balance green check or cross-person donor option.

## A07 — Locks (C08)

Lock an entire trip; attempted drag, date edit, deletion, or generated donor cut cannot silently alter it. Unlock is explicit. Lock a zero-PTO remote-work day; a shortened trip cannot discard it. Lock only one day; other unlocked boundary days remain eligible where the resulting dates are valid.

## A08 — Pay dates (C03)

No credit until the actual configured date. Verify biweekly and twice-monthly calendars differ, including three-paycheck months and leap-year handling. No smooth daily accrual. Precision test: three 7.6923h credits sum to 23.0769h at stored precision, not 24h or 21h.

## A09 — Reconciliation and actual usage (C04–C05)

A closing anchor on March 31 says 24h and already includes prior leave. Future forecasts start April 1; do not deduct March leave again. Marking planned leave actual does not add a debit; cancelling future leave restores the forecast. An unrelated appointment reduces PTO without creating a trip.

## A10 — Scenarios (C11)

Clone baseline into “Long February.” Change dates, locks, and leave there. Baseline stays unchanged. Compare both with separate per-person results. Apply a global balance correction: both forecasts recompute using it, with an indication that shared inputs changed.

## A11 — Persistence and sharing (C17)

User A saves a trip; User B in a separate browser/profile/device opens the same workspace and sees it. B edits; A reloads and sees the saved result. Close/reopen both sessions: plan and alternatives remain. Simulate a failed save: UI does not claim saved. Overlapping stale edits surface a conflict or merge without silent loss. Unauthorized user C cannot read or mutate any household record by guessing an ID.

## A12 — Discovery evidence (C13–C16)

Map/list select a destination and dates from MSP. Estimate clearly identifies flight traveler/date scope, lodging nights/occupancy, currency, taxes known/unknown, source and retrieved time. Different arrivals do not get one false common itinerary. Shared lodging is not double-counted. Date change marks estimate stale. Provider failure shows unavailable, not a generated price. Far-future weather is labeled seasonal climate, not a precise forecast.

## A13 — Calendar/horizon (C01, C12)

School breaks highlight opportunities but do not block other dates. No custody restriction appears. Year-end screen says which year is checked. A future-year forecast requires an explicit opening anchor or an intervening-year calculation with rollover inputs. A trip crossing December retains both parts and clearly scopes the checked year.

## A14 — Unknowns and presentation (C19, P01–P03)

Missing Ryan holiday policy or accrual date is visible. Demo values are labeled. PTO cards distinguish actual/as-of, projected, and safe extra leave. Keyboard users can enter dates and inspect conflicts. On a laptop, users can understand the next trip and any shortage without opening a dense raw data table.

## A15 — Mandatory holidays are not donor days

An unlocked trip includes a Lily holiday that costs 8h whether home or away. Shortening that trip across the holiday saves 0h of PTO for that date. Do not offer the day as 8h of funding.

## A16 — Source estimates do not enforce affordability

A cost is displayed with provenance. No annual-budget rejection is applied and no claim of affordability is made. Users can save a plan even with estimates unavailable; PTO feasibility stays separately meaningful.

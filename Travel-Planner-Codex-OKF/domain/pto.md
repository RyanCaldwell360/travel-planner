---
type: Calculation Specification
title: PTO ledger and forecasting
description: Proposed deterministic accounting rules for trustworthy forecasts.
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

# Authority

Confirmed: individual balances; paycheck accrual; manual corrections; non-trip leave; holidays requiring PTO for Lily; full-year feasibility and tracking usage. The precise ledger mechanics below are **proposed technical semantics**, not confirmed employer rules. Keep them explicit and testable.

## Terms

- **Anchor**: known balance for one person at a specified effective time.
- **Accrual**: credit on an actual configured pay-period date, not smooth daily earning.
- **Allocation**: planned or actual PTO hours for one person-date, attributable to a trip, non-trip obligation, or holiday.
- **Projected balance**: running ledger after anchor, credits, and unique debits.
- **Safe extra leave on date d**: hours that can be added on d while keeping all later balances nonnegative through the horizon.

## Formula

For person p after the anchor, Bp(t) = anchor + credits through t − unique PTO debits through t, subject to any explicitly configured policy cap. Feasible means **every evaluated balance** is nonnegative, not just December's ending value.

Without caps or discontinuities, safe extra leave at d is max(0, min of Bp(t) for all event points t from d through December 31). If the baseline is already infeasible, show that condition rather than promise zero as a complete diagnosis. For a proposed multi-day trip, simulate all of its dated debits; do not multiply a displayed scalar without checking timing. With balance caps, carryover, or corrections, use actual resimulation.

## Event sequence — proposed convention

1. Anchors are closing balances as of the chosen date: all activity on that date is already included. Future simulation starts the following day.
2. Accrual credits occur at start of their configured credit date.
3. Unique leave debits occur during that date; test the resulting closing balance.
4. Show this convention in setup/help. If payroll policy requires a different order, model it explicitly.
5. A known balance later in time supersedes the forecast up to that moment. Retain past records for history but do not subtract them a second time after the new anchor.

## Reliable counting

- Store exact fractional hours using a decimal or integer sub-hour unit; avoid binary floating-point drift and integer rounding of each accrual.
- Maintain one effective PTO debit per person-date (or bounded nonoverlapping segments if partial days are implemented).
- Holiday plus trip leave on the same day has one effective debit, with both reasons available for explanation.
- By default no debit exceeds scheduled hours that day. A weekend debit needs an explicit schedule/leave exception.
- Credits come from a configured pay schedule; show the actual generated dates. Distinguish every-two-weeks from twice-monthly.
- Never borrow between people. Show deficits independently.

## Actual usage and corrections — proposed

Retain planned/actual/cancelled status. Past planned leave can be shown as assumed-used until reconciled rather than silently claiming confirmed usage. Changing planned to actual does not create a second debit. Cancelling restores hours in the forecast. A correction records a new authoritative anchor with timestamp and editor; it is not an unexplained adjustment repeated into every subsequent period.

## Year boundaries

The visible horizon ends December 31 of the selected year. Today's known balance can project into the selected next year only if the intervening credits/debits and rollover policy are configured. Distinguish carryover limit from maximum balance cap. No cap is confirmed. Year-spanning trips should retain all travel dates, show only the selected year's deductions in that year's totals, and warn that next-year feasibility has not been checked unless a next-year forecast is configured.

## Display

Show current known balance with as-of date, projected balance at a selected date, year-end projection, and any first deficit. Distinguish “balance that day” from “available without disrupting later plans.” Unknown inputs yield an incomplete forecast, not a reassuring green check.

See [acceptance cases](/quality/acceptance.md) and [tradeoff semantics](/domain/tradeoffs.md).

## Implemented details — 2026-10-17

See `src/core/pto.ts` and `tests/pto.test.ts` in the repository root. Precision is 0.0001 hour. The current weekday schedule is M–F/8h; weekend PTO exceptions are rejected rather than inferred. Explicit paid-holiday entries (0h) are already-off days; required holiday PTO and trip leave resolve to one maximum debit with both reasons. Recurring semimonthly dates clamp to month end and do not infer bank/weekend shifts; explicit dated credits support exceptions.

The year view checks all ledger closings after the anchor, plus the authoritative anchor itself. A next-year forecast needs an explicit prior-Dec-31 opening anchor; an earlier prior-year anchor produces an incomplete result because intervening usage bridging is not yet implemented. Full travel membership crossing December is retained with a checked-year warning. Actual/planned are one debit, cancellation restores leave, and earlier entries are superseded by a new anchor. Unknown or malformed draft inputs never yield a complete forecast.

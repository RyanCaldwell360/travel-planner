---
type: Algorithm Specification
title: Tradeoff explanations
description: Find and explain feasible reallocations without treating leave as transferable
  money.
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

# Desired behavior — confirmed

When adding or extending a trip does not work, explain **where the time would need to come from**. Show alternatives drawing from one or multiple flexible trips. Locked trips/days cannot budge. Users decide whether the resulting trip is still worthwhile; no minimum trip length or priority system is required initially.

## Required explanation

For each alternative show: affected person, exact donor trip and dates, hours freed per donor, target trip change, first original shortfall, resulting minimum and year-end balances, and any unresolved deficit. Examples must use real ledger output, never generated plausibility.

## Critical temporal rule

PTO is not physically transferred. Removing leave changes the balance from the donor date forward. A November cut cannot fix a February deficit, though it can fix a November shortfall caused by taking February leave. Recompute the complete event timeline for each option. Never use annual sums alone.

## Proposed deterministic search

1. Copy the selected scenario and apply the user's proposed trip change in preview.
2. Simulate both people. Locate the first shortfall, its person/date/hours, and all later shortfalls.
3. Gather that person's unlocked PTO allocations belonging to flexible trips whose removal can affect the failing interval. Exclude locked dates, already-zero days, and mandatory holiday PTO that would be required even if not traveling.
4. Consider single-trip and multi-trip day-removal combinations. Removing a day means a concrete travel/leave edit, not a hidden deletion of a debit while leaving the person on vacation.
5. Re-simulate every candidate across the whole horizon and all participants. Recalculate dependent flight/lodging estimates as stale when dates change.
6. Present a small diverse set of valid options (proposed ranking: fewer changed trips, fewer changed days, less excess leave released). Ranking is not a user preference established by the interview.
7. Preview before applying; preserve the original scenario and allow saving a named alternative.

Bound combinatorial search for UI responsiveness. If search is truncated, say suggestions are examples, not exhaustive. A small search can enumerate subsets; larger inputs can use pruning or constrained search. No AI service is necessary.

## Semantic validity

Interior-day cuts may split participation or create disjoint travel. Prefer explainable boundary edits first. If an interior cut is offered, show the resulting participation explicitly; never assume work, free return travel, or cost savings. A person-date lock cannot be bypassed by deleting the trip container. Leave that disappears only because a calendar obligation was deleted is not a valid funding source.

## No solution

State “No feasible adjustment found among the flexible trip days checked,” name remaining shortfalls, and allow the user to change dates or unlock a commitment explicitly. Do not recommend consuming Lily's PTO to cover Ryan, skipping required holidays, or using accrual before it is earned. If only non-travel leave is flexible, initial search may exclude it and state that scope; user flexibility for such obligations was not established.

## Implemented search — 2026-10-17

`src/core/tradeoffs.ts` performs bounded breadth-first boundary shortening and resimulates the full ledger for both participants on every accepted state. Whole trips, individual days (including zero-hour days), and actual-used days are protected from generated removal. Removing mandatory holiday presence frees zero PTO and cannot fund an option. The target trip is excluded from donors. No remote work is assumed. No non-trip obligation is searched. At most four examples are displayed, with explicit search/truncation scope. User actions first select a preview, then explicitly save it, usually as a named alternative preserving the original.

## Free hosting execution — 2026-10-17

The same deterministic search now runs in a dedicated browser worker (`src/core/tradeoff-worker.ts`), keeping the laptop UI responsive and avoiding Cloudflare Free's 10-ms server CPU budget. Suggestions still require preview and explicit save. The server validates the resulting scenario and enforces current locks/revisions. The Node API remains compatible, but the interface no longer needs a server search call. Browser tests exercise this path against both backends.

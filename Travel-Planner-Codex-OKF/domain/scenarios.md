---
type: Domain Concept
title: Shared plans and alternatives
description: Keep options comparable and edits durable across both users.
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

# Confirmed behavior

One shared plan with named alternatives is accepted as a starting point. Both Ryan and Lily must edit from separate laptops and return to saved changes after closing. Separate private personal drafts are not required.

## Proposed model

A household contains people, employment inputs, school-break dates, and a planning-year workspace. A workspace has a baseline and saved scenarios. Scenarios contain trip participation and planned leave variations. Global balance corrections and employer policy fixes are shared facts, not alternate realities.

When a shared fact changes, recompute every affected scenario and display its new status. Scenario cloning makes independent trip/leave records; editing one must not mutate siblings. Each comparison identifies the scenarios and current input revision used.

## Comparison view

At minimum compare travel dates per person, PTO totals per person, minimum projected balance/date, first shortfall, year-end balance, fixed commitments preserved, and estimates where available. Cost deltas compare only compatible quote scopes; do not subtract a per-person fare from a household total.

## Saving and concurrency

Proposed: save trip edits as a transaction, provide visible saving/saved/error state, track revision and editor. A stale edit must trigger an explicit conflict/reload/merge flow instead of silently overwriting the other user's change. Real-time cursors are unnecessary; another laptop must be able to refresh and see committed data. Maintain a recoverable previous version or undo for significant edits and scenario replacement.

Authentication must allow both users to access one private household, with server-side authorization. A mock login or localStorage-only app is not sufficient. Cache and optimistic rendering may improve responsiveness but are not the system of record.

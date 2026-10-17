---
type: Domain Concept
title: Trips and day-level leave
description: Separate shared destinations from each traveler’s actual leave.
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

# Trip semantics

A trip is a shared container with destination and descriptive information. Participation belongs to a person. A person can travel on different dates, work remotely while away, or not participate at all. Greece is Lily's trip. Cozumel includes both with different likely arrival dates. Conferences can have mixed work/PTO treatment; exact details are unknown.

## Suggested editing flow

1. Select a destination on the map or by search.
2. Enter Ryan's and/or Lily's date ranges; one can be absent.
3. Display the resulting travel span and calendar days per person.
4. Default scheduled working days to PTO for review, while making remote work and off days easy to set explicitly. This default is proposed, not employer policy.
5. Set per-person PTO hours and any protected dates; see live yearly impact before saving.

## Day classification proposal

Travel presence, PTO hours, and lock state are distinct fields. Useful editor choices: PTO, working remotely, working/on business, already off. Weekends generally cost zero for an M–F schedule. Lily's mandatory PTO holidays still cost hours even if labeled as a holiday. A UI shortcut must not override that accounting.

## Locks

Confirmed: entire trips and specific days can be unalterable. Proposed representation supports a trip lock plus participant-day locks. A protected travel day can be a zero-PTO remote-work day; it must still be protected against date changes. Protect both the presence and leave classification unless the user explicitly unlocks it. Making a trip shorter must not implicitly drop protected interior dates. Moving an entire trip respects every locked component.

## Overlap

Two trips on one person's same calendar day must not consume 16 hours. Recommended behavior: flag the conflict and request an explicit resolution, retaining one canonical person-date PTO allocation. Do not silently hide incompatible locations. Different people may be in different places on the same date.

Changing a PTO day to remote work may be a user action; the app must not assume remote work is feasible merely to make a suggestion pass.

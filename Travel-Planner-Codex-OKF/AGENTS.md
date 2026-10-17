---
type: Playbook
title: Agent entry point
description: Instructions for the implementing coding agent.
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

# Agent instructions

Read [README](/README.md), [vision](/product/vision.md), [requirements](/product/requirements.md), and [open decisions](/product/decisions.md) before choosing architecture. Then read the relevant domain and acceptance documents. This directory is a knowledge bundle, not existing application source.

## Build intent

Create a laptop-first shared travel planner for Ryan and Lily. The central workflow is exploring a calendar year of travel while seeing separate PTO forecasts, protected commitments, and concrete alternatives. Both users must be able to edit durable shared data from different laptops.

## Working rules

- Preserve confirmed user requirements. Treat technical architecture and algorithm choices in this bundle as proposals.
- Inspect the target repository and its instructions before introducing a stack. Prefer its established conventions. If greenfield, choose and explain a small maintainable stack that supports authenticated server persistence.
- Do not repeat the whole discovery interview. Gather exact employment inputs during setup. Never imply that missing data yields a reliable forecast.
- Implement PTO and tradeoff logic deterministically and independently from UI. An LLM is not required for this app.
- Do not fabricate current prices, historical weather, real school calendars, employer holidays, or real bookings. Label demo data and degraded integrations.
- Do not substitute a frontend-only demo for the shared working app. Verify cross-session and cross-device behavior.
- Do not change locked days through suggestions or apply suggestions without a user's action. Preview consequences before saving a scenario change.
- Keep scenarios isolated. One active scenario's totals must never include leave from another.
- Report implemented behavior, tests, remaining provider/configuration needs, and material limitations candidly.
- Update relevant knowledge documents and [log](/log.md) as product decisions are resolved. Do not mark generated recommendations as human-verified without review.

## Completion

Use [acceptance scenarios](/quality/acceptance.md). The key demonstration is: plan February, protect fixed fall trips, explain any downstream deficit, compare a repair drawing from multiple flexible trips, save it, and open the same result as the other user.

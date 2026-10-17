---
type: Guide
title: Travel planner handoff
description: How to use this bundle in Codex.
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

# Start here

This is a product context handoff, not an implemented app. Working name: **Travel Planner**; no brand name was chosen. The intended users are Ryan and Lily. The source is their product discovery interview, represented in [interview evidence](/references/interview.md).

## Transfer to Codex

1. Extract this archive into the app repository root. Keep the directory as `Travel-Planner-Codex-OKF/`.
2. Give Codex the prompt in [START-HERE.txt](START-HERE.txt). The supplied [AGENTS.md](/AGENTS.md) routes an agent that opens this directory; copy its guidance into an existing repository's AGENTS.md only after preserving any existing instructions.
3. Begin with [product vision](/product/vision.md), [requirements](/product/requirements.md), [PTO semantics](/domain/pto.md), and [tradeoffs](/domain/tradeoffs.md).
4. Follow [delivery plan](/implementation/delivery.md). Use [acceptance scenarios](/quality/acceptance.md) to assess behavior, not just screenshots.

## Evidence and authority

- **Confirmed**: explicitly requested or answered by Ryan in this interview.
- **Tentative**: Ryan expressed uncertainty; must become setup data, not a hidden constant.
- **Proposed**: this handoff's implementation recommendation; Codex may adjust while preserving confirmed behavior.
- **Open**: no answer was established; use safe, explicit defaults where possible and ask only when necessary.

All generated concept documents remain `status: draft`. No `verified` field is claimed: Ryan has not reviewed this written synthesis. `evidence_class` is a producer extension, not an OKF standard field. Detailed requirements label their authority in the body. Synthetic examples are not actual bookings or employer policies.

## Organization

Use [index.md](index.md) for progressive navigation. Links beginning `/` resolve from this bundle root under OKF, not from the filesystem or web app root. The structure follows [Google's OKF reference](/references/okf.md). No external service, programming framework, hosting product, map provider, or AI runtime has been selected.

## Most costly misunderstandings to avoid

- A trip's travel dates are not its PTO days, and the two travelers can differ.
- An annual positive ending balance does not prove a trip is feasible earlier in the year.
- A spouse's unused hours cannot fund the other person's leave.
- Future cuts cannot fix a shortage that already happened before those cuts.
- Shared persistent access is a first-version requirement; local browser storage alone is insufficient.
- Attractive discovery matters, but reliable year planning and clear PTO tradeoffs come first.

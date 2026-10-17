---
type: Design Brief
title: Visual and interaction direction
description: Laptop-first travel discovery with legible calendar and PTO consequences.
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

# Confirmed direction

Use all three influences: polished destination photography, map-led exploration, and an illustrated travel-journal feel. Planning should feel exciting and invite a conversation. PTO should be immediately readable without becoming the entire interface.

## Proposed composition

- Header: selected year, scenario name/switcher, compare action, shared save state.
- Compact Ryan/Lily cards: clearly labeled balances and projection context; first shortfall if present.
- Main canvas: readable year/month travel overview with person-specific lanes and school-break highlights.
- Explore mode: interactive map, destination search/cards, weather and sourced estimate snippets, date selection.
- Trip drawer: destination, each person's date range, day classifications, locks, impact preview, save/cancel.
- Tradeoff panel: exact consequences and alternative cards, followed by a calendar preview.
- Compare view: two named plans with aligned dates and measurable deltas.

These layouts are recommendations to prototype. The user explicitly wanted to see views before deciding which comparison layout works best.

## Visual principles

Use generous whitespace, warm restrained journal accents, strong travel imagery, and consistent person colors supplemented by names. Lock icons and text explain protected days. Calendar density should remain legible on an ordinary laptop. Images and maps must not obscure deficits or save state. Keep maps navigable with search and list alternatives.

## Important states

Empty first year; missing PTO setup; no trips; partial estimate; provider unavailable; stale estimate; unsaved draft; save conflict; invalid date range; locked edit; no feasible tradeoff; shortfall; fully feasible plan; incomplete forecast; viewing an alternative rather than the baseline.

## Accessibility and performance proposals

Keyboard-accessible date/day editing, labeled controls, contrast, reduced-motion support, and text alternatives for color/photography. Lazy-load discovery imagery and maps; editing a trip and reading balances should remain fast without external providers. Include a usable smaller-screen fallback, while optimizing the planning session for laptops.

## Product language

Prefer “Ryan is 16 hours short on Nov 12” to “invalid budget.” Prefer “Shorten [trip] by these dates” to “optimize resources.” Distinguish “Saved” from “Saving.” Show hours and an eight-hour-day equivalent where helpful. Do not say “You can afford this trip”; the app only estimates costs and checks PTO.

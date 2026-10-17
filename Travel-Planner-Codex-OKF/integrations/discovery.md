---
type: Integration Requirements
title: Maps, weather, and travel estimates
description: Sourced discovery without invented accuracy or costs.
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

# Confirmed scope

Interactive destination exploration on a map; users then enter date ranges. All travel estimates assume MSP as origin. Initial cost scope is flights plus lodging. Weather context helps discovery. Users decide what they can afford; no budget gate is needed.

## Provider-independent requirements

Codex must research current provider capabilities, licensing, cost, and access in the implementation environment before selecting services. No provider or key is supplied by this handoff. Use adapters so inability to obtain a flight quote does not prevent trip/PTO editing. No LLM API is needed to implement the core app.

## Estimate contract — proposed

Record source/provider, source URL where supported, retrieval timestamp, travel dates, travelers, currency, flight origin/destination and round-trip status, fare assumptions, lodging location/dates/occupancy, nights, per-person versus group basis, taxes/fees included or unknown, and estimated total/range. Price estimates are not reservations or guarantees.

Different arrival dates require separate flight queries. Lodging occupancy can change within the trip; do not multiply a shared room cost by traveler count or assume both travelers stay all nights. If exact split-stay inventory is unavailable, state the approximation. Mark estimates stale after date, traveler, destination, or lodging assumption changes. Refresh only on intentional actions or a sensible documented cache policy.

If only historical or regional averages are available, label them as such and preserve their evidence, date/season, and limitations. They must not appear as current availability. If no reliable source exists, show unavailable plus a source/search link rather than fabricate a price. Sample fixtures must carry a prominent demo label.

## Weather

Next-year date ranges generally need seasonal historical climate context, not a precise daily forecast. Label climate normals versus near-term forecast; show units, source, location, period, and retrieval/update time. Do not present historical rainfall as a prediction for the trip's actual dates. No weather preference constraints were established.

## Map and imagery

Enable search, select, zoom/pan, trip markers, and a list/card route to the same destinations. Respect map/photography attribution and usage terms. No offline maps, route optimization, or itinerary geocoding is required initially.

## Operational behavior

Keep keys server-side where required; restrict browser tokens according to provider policy. Respect quotas, cache valid results, bound retries, and show honest degraded states. Document provider setup and estimated operating costs before production activation. Reuse a repository's established integrations where appropriate.

## Adapter implementation and validation limits — 2026-10-17

Implemented replaceable `TravelAdapter` (Amadeus OAuth, per-traveler MSP flight search, shared-room hotel search) and `WeatherAdapter` (Open-Meteo archive sample). Quotes retain scope, source URLs, retrieval/expiry, currency and tax caveats. Different arrivals have separate flight requests; lodging uses one room at maximum occupancy across the combined stay, explicitly approximate for split arrivals. Fingerprint changes make results stale, and cached evidence expires after 30 minutes. Missing components do not become a fabricated total.

Provider documentation requests and external image endpoints were denied by the runtime proxy. Consequently current capabilities/licensing/cost have not been independently researched successfully. No keys were injected under relevant provider names. API schemas and cache behavior are tested with clearly synthetic adapter fixtures; production responses, inventory/date coverage, quotas, terms, and commercial rights remain unverified. The UI demonstrates unavailable states without blocking saving.

The app bundles offline Natural Earth geography and attributed travel moodboard photos. Six curated destinations are selectable/searchable. Destination-specific photography and worldwide geocoding remain extensions. Historical weather is a prior completed year's matching arrival month: it is neither a climate normal nor a future forecast. Required domains and provider configuration are in the root README.

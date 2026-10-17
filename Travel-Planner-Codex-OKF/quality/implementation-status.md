---
type: Verification Report
title: First implementation verification
status: draft
evidence_class: implementation-observed
generated:
  by: codex/implementer
  at: '2026-10-17T18:40:55Z'
---

# Implemented workflow

- Separate authenticated Ryan/Lily identities edit the same durable SQLite journal, with reload visibility, persisted sessions, transactional revisions, explicit stale conflicts, and history.
- Selectable planning year; opt-in labeled synthetic demo; empty real setup; exact per-person employer inputs and actual generated credit dates; global corrections update every alternative.
- Individual continuous participation, per-day remote/business/off/PTO, fractional hours, planned/actual/cancelled usage, whole-trip and individual-day locks enforced by the server, explicit unlock actions, non-trip leave, and school-break opportunities.
- Full-horizon per-person forecasts, first/minimum/year-end balances, inspectable dated ledgers, safe-extra resimulation, missing-input states, previewed scenario edits, named alternatives, and aligned comparisons.
- Deterministic combined donor suggestions remove concrete unlocked boundary dates and recheck both participants' complete timelines. Locked fall commitments remain intact; later cuts cannot cure earlier deficits.
- Bundled interactive geographic map, searchable curated destination list, moodboard photography, warm journal interface, laptop layout and smaller-screen fallback.
- Replaceable Amadeus/Open-Meteo adapters, explicit provenance/scope/expiry, split flights, one approximate shared-room quote, stale/unavailable states, and intentional refresh.

# Evidence

See the root `tests/` files for executable assertions, not just screenshots. `npm test` covers numerical acceptance A01–A10/A13/A15 edge cases and authenticated API persistence/concurrency (A11), plus synthetic adapter scope/cache tests (A12). `npm run build` runs strict TypeScript checking and the production bundle. `npm run test:browser` exercises the end-to-end year-planning workflow in two independent Chromium contexts, locks, map/list navigation, unavailable providers, setup visibility and mobile overflow. Screenshots are generated into `test-results/`.

The demonstration starts from 40 synthetic Ryan opening hours, explicit 8-hour credits on Feb–Dec 1, and protected November/December leave. Adding five February weekdays yields a first 8-hour deficit on Dec 6 and a 16-hour ending deficit. Removing Sep 10 and Oct 8 flexible participation frees 8 hours each, ending at 0 hours without any negative closing balance. The original plan remains unchanged; Lily can open the saved named alternative and save non-trip leave visible to Ryan after reload.

Verified in the cloud workspace on 2026-10-17:

- `npm ci --cache /tmp/travel-planner-npm-cache`: passed, frozen lockfile installation.
- `npm test`: **17 passed**, 0 failed/skipped/cancelled (core, API/auth/restart/concurrency and adapter contracts).
- `npm run build`: passed strict TypeScript and production bundling.
- `npm run test:browser`: **2 passed**, including independent Ryan/Lily browser sessions, the full February repair, real setup for 2028, holiday treatment, exact credit precision and a visible stale-save conflict.
- Bundle validator: **18 concepts, 51 internal links, 0 errors**.
- `npm run backup` against an isolated synthetic test database: passed; backup `PRAGMA integrity_check` returned `ok`, retaining one planner row and two accounts.

Test fixtures and browser credentials are synthetic and never initialize the real database. Screenshots are also copied into `docs/screenshots/` in the repository root. No separate physical-laptop or hosted deployment verification is claimed.

# Incomplete / not claimed

- No external hosted HTTPS deployment or physical second-laptop session was provisioned. Separate real browser sessions and restart durability are tested locally. Both laptops must connect to one deployed server with a persistent volume, configured TLS and private credentials.
- Provider hosts are blocked and no credentials are configured. No real flight/hotel quote or historical weather response was validated. A12 live-provider behavior remains incomplete, even though contract, cache, and unavailable states are tested.
- Current provider capabilities, production licenses and operating costs still require official account/documentation access. No current price or forecast is fabricated.
- Six destinations; no global geocoder, calendar import, itinerary/booking or payroll sync.
- Weekday schedule only; weekend work exceptions and prior-year usage bridging are not implemented. Earlier prior-year anchors stay incomplete; enter an explicit opening anchor instead.
- Tradeoff suggestions are bounded examples of boundary cuts, not an exhaustive/global optimization. Non-trip leave, interior-day removal and automatic remote work are excluded.
- First-participant arrival-month historical sample is limited weather context, not a multi-year climate normal or prediction. Shared-room maximum occupancy is a disclosed approximation for split stays.
- No real-time push, self-service password email reset, multi-household tenancy or general membership UI.

Generated context remains draft and is not labeled human-verified.

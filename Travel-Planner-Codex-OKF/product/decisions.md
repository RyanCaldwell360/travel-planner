---
type: Decision Register
title: Decisions and unknowns
description: Separate settled choices from setup inputs and implementation proposals.
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

# Settled choices

Confirmed: laptop-first; both can edit; persistent shared storage; one shared plan plus named alternatives; individual day treatment; year-end horizon; no mandatory PTO cushion; manual balance correction; MSP origin; sourced flight/lodging estimates; weather; maps; family break highlights; user judges affordability and trip worth.

## Tentative employer information

Ryan believes both receive about five weeks per year and can roll over 40 hours. This is **not verified**. Five 40-hour weeks would be 200 hours annually, but annual hours do not determine an exact payroll credit schedule. Do not hardcode 200/26 or assume biweekly payroll.

## Setup data, not product interview blockers

| Needed input | Handling |
|---|---|
| Planning year | User selects. Conversation on 2026-10-17 refers to “next year”; 2027 is an inference, not a confirmed trip year. |
| Current balance and effective time | Require per person; use an explicit as-of convention. |
| Accrual hours and next credit date/cadence | Require per person; preview credit dates, allow overrides. |
| Ryan holiday policy/calendar | Unknown; do not assume all federal holidays are paid. |
| Lily holidays/observed days | Uses PTO, but exact calendar and exceptions unknown; collect dates. |
| Rollover policy and caps | 40 hours tentative; distinguish year-end carryover limit from balance accrual cap. |
| Future year's opening balance | Must be calculated transparently from an anchored year or explicitly entered; never equate to today's balance. |
| Trip dates and locks | Greece, Cozumel, conferences, February have no confirmed dates. |
| Kaia school breaks | User-entered/imported dates; no district/calendar established in this interview. |
| Actual usage | Proposed approach: future allocations become past usage unless reconciled; make confirmation visible. |

## Implementation choices left to Codex

Stack, authentication, database, hosting, mapping provider, images, flight/lodging/weather sources, refresh policy, backup mechanics, and UI comparison layout. Evaluate existing repo first. Do not present a recommendation as a user-selected vendor.

## Open design details with proposed defaults

- Calendar whole-year view, drawer for trip editing, two-scenario comparison: prototype and refine through use.
- Partial-day entry: recommended in hours, although not explicitly requested; eight hours is default for a full workday.
- Holiday deductions: explicit person-date calendar entries can be generated in setup with review; never infer PTO solely from a national calendar.
- Scenario settings: global shared facts (balances/policies) versus scenario-specific trip/leave allocations; show when global corrections update every alternative.
- Privacy/auth: small private household workspace, distinct identities, no public access by default.
- Same-day credits/debits: proposed explicit opening/closing conventions in [PTO](/domain/pto.md); employer treatment remains configurable if necessary.

Ask only a targeted question if a genuinely blocking decision remains. Most numerical uncertainty belongs in setup, not another broad interview.

## Implementation decisions — 2026-10-17 (agent-authored, not human-verified)

The repository was empty. The implementation now uses Node 24, TypeScript, Express, React/Vite, and server-side SQLite WAL. One private household has two separate password identities, Ryan and Lily. There is no public signup. A private server setup code gates initial creation. The same Node server serves the UI and API; a persistent volume and HTTPS deployment are still required for external laptop access.

PTO is stored as integer 0.0001-hour units. Closing anchors, start-of-date credits, capped/rollover ledger events, and one effective person-date debit are implemented. Paid holidays are zero-cost; required holiday/trip PTO uses the maximum single daily debit. Unknown inputs stay incomplete. Future years require an explicit opening anchor at prior December 31 or an anchor within that year; bridging earlier-year usage is deferred and explicitly marks forecasts incomplete.

Whole-journal optimistic revisions are atomic database transactions with previous snapshots. Separate explicit unlock actions protect whole trips and zero-hour days. Trip edits and global corrections use a consequence preview. Named alternatives clone scenario-specific records while retaining global facts. A bounded deterministic boundary-shortening search resimulates both people, including later deficits, and excludes actual-used days, locked days, mandatory holiday savings, and non-trip leave.

The interactive map uses bundled Natural Earth geography via Leaflet, with six curated destinations and a keyboard list; no map provider key is needed. Bundled photography is labeled as moodboard inspiration. Amadeus flight/hotel and Open-Meteo historical weather adapters are implemented behind replaceable interfaces. No live prices/weather have been verified: keys are absent and provider hosts are blocked in the current runtime. Sandbox offers are labeled as non-live. Historical context uses a prior-year arrival-month sample, not a forecast or climate normal. Current commercial terms and operating cost remain unresolved pending provider access.

No employer balances, five-week allowance, rollover cap, holiday calendar, school break, or trip booking has become a known fact. Demo inputs are opt-in, synthetic, and visibly labeled; an explicit action archives the demo before real planning starts.

## Free-only production hosting — 2026-10-17 (confirmed user constraint)

The user explicitly rejected paid Render hosting: deployment **must be free**. The implementation now includes Cloudflare Workers Free, a durable D1 Free database, and Cloudflare Access / Zero Trust Free sign-in on an included HTTPS `workers.dev` address. The Node/SQLite backend remains a local development option. No paid hosting resources have been created.

The free backend independently validates Access JWT signatures, issuer, audience, expiry and the exact configured Ryan/Lily email identities. Do not trust an email header alone. Cloudflare's Static Assets router does not forward `ctx.access`, so that context-only shortcut was rejected after reading current official docs. Actual sign-in emails, Access team domain/audience and account authorization remain setup inputs, not known facts. Access's Free signup currently requires payment details, despite not charging the Free plan; this prerequisite was disclosed to the user.

D1 saves use an atomic conditional revision update and an archive trigger. Deterministic tradeoff search moved into a browser background worker to respect the free server CPU allowance; shared edits still require server validation and authorization. No PTO accounting semantics were relaxed. Source adapters now accept a storage-neutral evidence cache.

Local D1/workerd and browser fixtures exercise the free deployment path. No Cloudflare account is authenticated here, so live hosting, privacy policies, production quota behavior and two physical laptops remain unverified until the owner connects the account. See the repository's `docs/FREE-DEPLOYMENT.md` for tested configuration and exact account steps. Provider access is optional and must not require a paid service to use the planning loop.

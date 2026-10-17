# Travel Planner

A private, laptop-first shared travel journal for Ryan and Lily. The app is implemented in this repository; the supplied product context is preserved in [Travel-Planner-Codex-OKF/](Travel-Planner-Codex-OKF/index.md).

## Free shared hosting

The selected production path is **Cloudflare Workers Free + D1 Free + Cloudflare Access Free**, with one HTTPS address for both laptops. See [the free deployment guide](docs/FREE-DEPLOYMENT.md) for the exact GitHub build, durable database, private sign-in and backup steps. Hosting must remain free; do not provision paid Render resources. Cloudflare Access's free signup currently asks for payment details, though the provider says Free is not charged.

The Cloudflare backend is implemented and locally tested. An owner still needs to create/connect a free Cloudflare account, authorize this GitHub repository, and configure the two sign-in emails. **It is not deployed yet.** GitHub source synchronization alone does not host the app. The Node server below remains the local development workflow.

## Run

Use Node **24+** (the server uses built-in `node:sqlite`). From this directory:

```sh
npm ci
npm run dev
```

The server listens on port 3000, serves Vite in development, and writes to `.data/planner.sqlite`. `DATA_DIR`, `PORT`, and `HOST` override those defaults. Read the first-run code privately from `DATA_DIR/setup-code.txt`, enter it in the app, and choose **different passwords of at least 12 characters** for Ryan and Lily. There are no pre-created users or default passwords. The code is never returned by an API. No employer or booking data is seeded.

For a production build:

```sh
npm run build
npm start
```

One server serves both the frontend and authenticated API. Both laptops must connect to **the same deployed backend**, not run separate local copies. The free Cloudflare path is documented above. If using the optional Node self-hosting mode instead, run one Node process behind an HTTPS reverse proxy, with a private persistent disk mounted at `DATA_DIR` and `COOKIE_SECURE=true`. Keep the service supervised and the volume backed up. There is no hosted deployment or public URL provisioned by this repository. For a private network installation, bind to its interface and use a TLS-capable reverse proxy. Do not expose the development server publicly.

SQLite WAL is suitable for this small household, single-server workload. Network filesystems and multiple independently replicated SQLite files are not a supported deployment. Retain the database and WAL together; never treat a frontend export as the authentication/session backup.

## First planning session

1. Choose a year; 2027 is the initial UI selection, not a confirmed trip year. Create an empty plan, or explicitly open the **synthetic demo journal**.
2. In **PTO & setup**, enter each person's actual closing balance and date, payroll credit schedule and precision, observed holiday dates/PTO hours, balance cap if any, and carryover rule. Preview the generated credit dates. Explicit dates support payroll exceptions and intentionally zero credits. Inputs are global shared facts and update all alternatives.
3. For a future year, use an **explicit opening anchor at the prior December 31** (or a closing anchor within the chosen year). Earlier-year usage bridging is not implemented; those forecasts remain incomplete even if a provisional ledger can be displayed. A future opening value is your explicit input, never today's balance silently copied forward.
4. Add a trip. Ryan and Lily have independent continuous travel date ranges, per-day remote/business/off/PTO treatment, fractional hours, planned/actual/cancelled PTO status, and day locks. The whole trip can be protected. Remote work must be a conscious user choice.
5. Review the full year before saving. Add non-trip leave and school-break opportunities. A Lily holiday is charged even without a trip. Paid holiday entries cost zero; required holiday and trip leave use a single larger debit. Overlapping trips or non-trip leave require explicit resolution.
6. If a trip causes a shortage, find boundary-day tradeoffs. See exact person/trip/dates/hours, the first original deficit, resulting minimum and year-end balances. Preview an option, name it, and save without overwriting the baseline. Both people must pass the full ledger; later cuts cannot repair earlier deficits.
7. Sign in as the other person in another browser/laptop. Reload shared changes; stale saves produce a conflict rather than overwrite. A failed save preserves the preview, with an unsaved-draft download. Revision history can restore past states explicitly, subject to current locks.

The demo has synthetic balances/credit dates and unbooked sample trips. In it, adding **Ryan Feb 15–19, 2027, 8h/day** creates a first 8h shortfall on Dec 6 and a 16h ending shortfall. Removing his Sep 10 and Oct 8 flexible escapes repairs the timeline while the protected November and December trips remain. Save that as an alternative. **Start a real journal** explicitly archives the demo, retaining its revision history and starting with no employer/trip data.

## Accounting and integrity

- Integer units of 0.0001 hour; no rounded per-paycheck accrual or pooled balances.
- Date-only UTC arithmetic. Closing anchors already include their own date. Credits precede leave; cap/carryover effects are visible in the ledger. Every subsequent closing balance is checked, including the anchor itself.
- Positive December balances cannot excuse an earlier negative balance. Safe-extra leave uses resimulation, is capped to the available part of one 8-hour working day, and is unavailable on a broken/incomplete baseline.
- One effective debit per person/date, with all reasons retained. Current M–F/8h schedule rejects weekend PTO; custom schedule exceptions are a documented remaining feature.
- Anchors supersede previous allocations; marking planned leave actual never charges it twice. Past planned entries are described as assumed used until reconciled.
- Scenarios isolate trips/leave/locks; employment facts and school breaks are shared. Restorable revisions retain the prior authoritative anchor, editor, and timestamp.
- The server enforces schema/range/overlap validation and locks. Unlocking is a separate explicit action. Deletion, date shortening, destination changes, and zero-hour protected days cannot bypass locks.
- Optimistic whole-journal revisions commit atomically in SQLite transactions. Passwords use salted scrypt; random server-side sessions have HttpOnly/SameSite cookies, seven-day expiry, server authorization, cross-origin/custom-header defenses, and login throttling. This is a single private household with exactly two authorized accounts, not a public registration or multi-tenant service.

## Maps, photos, providers

The interactive Leaflet map uses bundled **Natural Earth** geography (public domain), with pan/zoom, six selectable destinations, and a searchable keyboard-accessible list. No map key, remote tiles, or AI service is needed. The initial catalog is curated rather than global geocoding. Photos are bundled **moodboards**, labeled as inspiration rather than destination-specific evidence. Attribution and licenses are in [public/ATTRIBUTION.md](public/ATTRIBUTION.md). Fonts are bundled too.

Provider contracts live in [server/providers.ts](server/providers.ts), independently replaceable through `TravelAdapter` and `WeatherAdapter`:

- **Amadeus**: separate MSP round-trip Flight Offers Search queries per person's actual arrival/departure. Hotel list + hotel offers search uses one shared room for the combined stay, maximum occupancy for unequal arrivals, explicitly labeled approximate. Airport/city hotel coverage may differ. Prices include source, retrieval time, dates, scope, currency and known/unknown tax treatment. Search samples up to three flight offers/hotels, not an exhaustive market search. No unsupported affordability verdict or missing-component total.
- **Open-Meteo archive / ERA5**: the most recent completed year's matching arrival-month sample, with mean daily high/low and precipitation in °C/mm. This is **historical context**, not a climate normal, current forecast, or weather prediction for next year. It covers the first participant's arrival month; cross-month trips need broader context in a later adapter.
- Thirty-minute query-fingerprint cache. Changing dates, destination, participation or freshness marks displayed evidence stale; keys never go to the browser. Intentional source checks only; provider failures are shown as unavailable.

No provider credentials exist in this environment, and the current proxy blocks Amadeus/Open-Meteo domains. No live price or weather result has been validated. Adapter fixture tests only prove contract/cache behavior. The source-check UI honestly displays unavailable states. Official capabilities, production license/commercial rights, quotas and pricing must be rechecked with the providers before enabling production. Amadeus sandbox data is labeled **not live inventory**; broad date coverage is not guaranteed. Open-Meteo's free endpoint is for noncommercial use and its data requires attribution; commercial use needs a suitable plan/adapter. No numerical operating-price claim is made without current provider evidence.

To enable optional discovery, securely configure `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, and `AMADEUS_ENV=test` (or `production` only after obtaining production access). Allow HTTPS to `test.api.amadeus.com`, `api.amadeus.com`, `archive-api.open-meteo.com`; documentation links use `developers.amadeus.com` and `open-meteo.com`. Credentials belong in the server environment/secret store, not Git or chat. API provider errors never block trip saving. The full live discovery scope remains incomplete until real provider/configuration validation succeeds.

## Verification

```sh
npm test                 # deterministic core, API/auth/concurrency/restart, adapter contract tests
npm run build            # strict TypeScript + production bundle
npm run test:browser     # real Chromium, synthetic demo only, separate isolated server on 3100
```

Browser tests use `/usr/bin/chromium` by default; set `CHROMIUM_PATH` if needed. They create a unique `/tmp/travel-planner-e2e-*` database, distinct synthetic passwords, two browser contexts, and screenshots in `test-results/`. No production data is touched. The initial run passed **17 core/API tests and 2 browser workflows**, plus the production build and a consistent backup integrity check. Browse the [year overview](docs/screenshots/year-overview.png), [tradeoff preview](docs/screenshots/tradeoff-preview.png), and [destination map](docs/screenshots/explore-map.png). See [quality/implementation-status.md](Travel-Planner-Codex-OKF/quality/implementation-status.md) for exact coverage and limitations. A real external second laptop and hosted HTTPS deployment still require deployment validation; separate browser sessions and server-restart durability are verified locally.

## Backup and recovery

`npm run backup` creates a consistent `VACUUM INTO` snapshot in `DATA_DIR/backups/` with mode 0600. Copy that snapshot to encrypted/private off-server storage. Backups contain household plans, password hashes and sessions: protect them. Test restoration on a separate stopped instance. To restore, stop the destination service, preserve its current data directory, and install the snapshot as `planner.sqlite` in a fresh private data directory, then restart with that `DATA_DIR`. Do not overwrite a live SQLite file or copy mismatched WAL files. Revoke sessions/reset passwords if a backup has been exposed.

For a password reset, set `NEW_PASSWORD` securely in an administrator's process environment (never put it in shell history) and run `npm run reset-password -- ryan` or `-- lily` against the correct `DATA_DIR`. The command revokes that person's sessions and never prints the password. There is no email reset or identity-provider integration yet.

## Remaining limits

Live providers and deployment are not configured; six destinations only; no custom weekend schedules or prior-year usage bridge; no household-membership UI, real-time push, detailed itinerary, booking, calendar import, or automatic payroll sync. Tradeoffs run in a browser background worker and search only unlocked trip boundaries with a bounded deterministic search, never non-trip obligations. They are examples, not a claim of global optimality. Travel-date edits require newly matching evidence, and crossing December explicitly scopes which year was checked. These limits are surfaced without replacing the core shared planner with browser-local storage.

# Free shared deployment

Hosting must remain **$0**. The deployment target is **Cloudflare Workers Free + D1 Free + Cloudflare Access / Zero Trust Free**, on the included `workers.dev` HTTPS address. No paid hosting, paid compute plan, purchased domain, or paid travel provider is required to use the shared planning loop. Do not upgrade the account to enable this app. This repository does not create a paid subscription.

The production backend is `cloudflare/worker.ts`. It uses the same deterministic PTO/domain validation and React interface as local development, with durable D1 storage instead of a container's filesystem. Both people use **the same deployed URL and D1 database**. The Node/SQLite server remains available for local development.

## Account step (owner action)

A Cloudflare account is required. None is connected to this workspace, so the public deployment and its live URL have **not** been created or verified.

1. [Create/sign in to a Cloudflare account](https://dash.cloudflare.com/sign-up) and keep **Workers Free**.
2. In **Workers & Pages**, create an application by connecting GitHub. Authorize only `RyanCaldwell360/travel-planner`; choose its existing `main` branch. Use the existing repository rather than a template-cloning button so future changes keep deploying from the same repo.
3. Use the repository root, **build command** `npm run build`, and **deploy command** `npx wrangler deploy`. Cloudflare reads `wrangler.jsonc`, uploads the app and bundled assets, and can provision the declared D1 binding automatically. It must be a Worker, not a static-only Pages project. All relevant packages are in the lockfile.
4. Confirm the Worker is named `ryan-lily-travel-planner`, that `DB` points to one persistent D1 database, and that both Workers and D1 are on the free plan. If first deploy asks to create the declared database, approve that free D1 resource. No billing/subscription upgrade is needed. Record the actual database ID in `wrangler.jsonc` after provisioning to pin future deploys to that same database. Never create a fresh database for an update.

The API deliberately stays unavailable until private identity settings below are complete. A successful upload is not proof of a working/private planner.

## Private sign-in (owner action)

Cloudflare Access is the deployed app's login system. Local Node passwords do not become production accounts. Ryan and Lily each use their own configured email identity; no employer balances or trips are invented.

**Signup detail:** Cloudflare's [current Zero Trust setup instructions](https://developers.cloudflare.com/cloudflare-one/setup/) say payment details are required even for **Zero Trust Free**, and that the free plan is not charged. Select Free. If providing payment details is unacceptable, stop here: that is a separate account prerequisite, and another free identity provider would need to replace Access. Do not switch to a paid plan.

1. Enable **Zero Trust Free** for the account; choose a team name. Its team domain ends in `.cloudflareaccess.com`.
2. Enable **one-time PIN** as an identity provider if you want email-code sign-in. The app does not send emails, handle mailbox passwords, or store Cloudflare account credentials. Both people do not need access to the Cloudflare administration dashboard.
3. On the Worker, open **Access** → **Protect this Worker behind Access** → **All traffic**. Create/edit its self-hosted Access application under Zero Trust as necessary. The **Allow** policy must include **exactly Ryan's and Lily's actual email addresses**. Do not use an entire email domain, Everyone, or a Bypass policy. Use a session duration of 24 hours (the backend refuses tokens older than seven days in all cases). Preview URLs are disabled in the committed config.
4. In the Worker's runtime **Settings → Variables and Secrets**, set:

   | Name | Value to enter privately |
   | --- | --- |
   | `RYAN_EMAIL` | Ryan's actual sign-in email |
   | `LILY_EMAIL` | Lily's distinct actual sign-in email |
   | `CF_ACCESS_TEAM_DOMAIN` | Your actual `team.cloudflareaccess.com` hostname, without scheme/path |
   | `CF_ACCESS_AUD` | The application's **Application Audience (AUD) Tag** from Access |

   These belong to the **runtime Worker**, not just build-time environment variables. Keep actual personal addresses out of Git; use Cloudflare's dashboard/secret store. `keep_vars: true` preserves dashboard variables on updates. Do not paste credentials or Access session tokens into chat.
5. Open the assigned HTTPS `workers.dev` address, sign in via Access, and create an empty real year. D1 initializes an empty household after the first verified authorized identity. The app never seeds real employment facts or bookings. Demo is an explicit, prominently labeled option.

The Worker independently checks the Access JWT signature against the team's HTTPS signing keys, issuer, audience, expiry, issued-at time, and exact household email allowlist. It does not trust a plain identity header. This is necessary because Cloudflare's Static Assets router does not forward `ctx.access`; relying only on that new context API would break authentication for this application. A missing or incomplete configuration fails closed.

## Validate before relying on it

- Open the deployed URL signed out: Access must require sign-in. A third email must be denied, even with a valid sign-in from that Access organization.
- Ryan saves a test trip in a clearly named test alternative. Lily signs in from the other laptop and sees it, edits it, and Ryan reloads. Try two stale edits: one must show a conflict.
- Redeploy from the same GitHub repo and confirm the same plan is present. D1 must stay bound to the same actual database ID.
- Check Worker metrics for errors and CPU-limit overruns during real setup, trip saves and alternative changes. Free requests have a 10 ms CPU budget. Native-runtime tests do not prove production CPU usage.
- Export a copy of the journal to private storage and confirm recovery before entering substantial real planning data.

No live deployment is considered verified until these remote checks succeed. Neither a local test nor a build produces a real public URL automatically.

## Free-tier limits and behavior

Official sources checked **October 17, 2026**:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): 100,000 dynamic requests/day, 10 ms CPU per invocation. Static assets are served separately. A quota/CPU failure must remain visible; it must never be reported as a successful save. Staying on Free does not automatically turn quota overruns into a paid upgrade.
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): 5 million rows read/day and 100,000 rows written/day. Exceeding Free read/write allowances causes errors until reset; it does not silently enable paid usage.
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/): 500 MB per free database, 5 GB total free storage, 7-day Time Travel recovery. This app uses one database. History consumes storage; monitor it and export old plans when appropriate.
- [Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/): builds also have a free allowance. Recheck the dashboard's current quota before frequent deployments. Do not enable paid build usage to work around a quota.
- [Workers routing / Access](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) and [private application protection](https://developers.cloudflare.com/workers/configuration/cloudflare-access/): the included hostname supports this personal household use; no domain purchase is needed.

Tradeoff search runs in a browser background worker using the same deterministic tested algorithm. It does not consume the small server CPU allowance. The server still authorizes/validates every save, enforces locks, and rejects stale revisions. It never trusts a client claim that PTO is feasible. Users can deliberately save an infeasible scenario after preview, as in local mode. The server caps a journal at 256 KiB and rejects oversized requests visibly, to bound parsing/validation work on the free tier. This is not an unlimited-storage or availability guarantee.

## Persistence, updates and backups

D1 uses a single conditional `UPDATE ... WHERE revision=? RETURNING ...`; a database trigger archives the replaced revision in that same transaction. Concurrent writers cannot silently overwrite or archive the wrong snapshot. Access handles identity sessions; local SQLite password/session tables are not copied to D1.

After the initial deployment, pushes to the connected GitHub `main` branch deploy changes through Workers Builds. Use the same Worker name and D1 binding. Do not recreate/delete the database. Frontend reloads do not clear it. Keep the existing Node `.data` directory intact; a local app and a deployed app are separate databases unless a deliberate migration is performed.

The UI exports planner JSON to your laptop. Cloudflare provides D1 Time Travel for seven days on Free. An authenticated administrator can also run `npm run cf:export` to create a SQL export in the ignored private `.data` directory; retain it in private off-account storage. The command needs Cloudflare authentication and the real database binding. Do not publish a SQL export or overwrite a live database casually. For recovery, use an isolated restored database and verify it before rebinding production.

## Developer checks

```sh
npm ci
npm test
npm run cf:check
npm run test:browser
```

`cf:check` builds the frontend and performs an actual Wrangler upload dry run; it does not create a service or database. In this managed cloud workspace, give Wrangler a writable config location with `XDG_CONFIG_HOME=/tmp/travel-planner-cf-config npm run cf:check`. No hosting token is needed for local tests/dry runs.

`npm test` includes real D1-engine persistence/concurrent-write tests, forged/expired/wrong-audience/wrong-issuer/unauthorized identity tests, and the bundled Worker running in `workerd` with real signed synthetic tokens and a fixture JWKS endpoint. Browser tests run both local Node and Cloudflare runtimes with independent synthetic Ryan/Lily sessions. Their test-only login bridge is never imported into the deployed Worker. There is no deployed auth bypass flag.

No Cloudflare account or credentials are connected here. The remaining go-live prerequisite is the account/GitHub/Access configuration above; until then, this is tested deployment preparation, not a hosted application.

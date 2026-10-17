# Travel Planner development

Read `README.md` and `Travel-Planner-Codex-OKF/index.md`; confirmed product requirements in that knowledge bundle take precedence over its architecture proposals. Keep context documents updated when behavior changes. Use the existing checkout: each cloud task is already isolated; do not create worktrees unless requested.

Stack: Node 24 built-in SQLite, Express, TypeScript, React/Vite. `npm ci`; `npm run dev` (port 3000). `npm test`, `npm run build`, `npm run test:browser` are required after accounting/persistence/UI changes. Chromium is available at `/usr/bin/chromium` in this environment. Use separate temporary databases for tests; never mutate `.data` in tests. Check names/presence of configured secrets without printing their values.

Keep integer 0.0001-hour arithmetic, actual dated credits, closing-anchor convention, per-person ledgers, every-future-balance checks, independent scenarios, canonical daily deductions, explicit previews, and server lock/revision checks. Never hardcode tentative employer policies or manufacture prices, forecasts, bookings, or saved-state claims. Source-backed integrations may degrade honestly; they must not block core planning. Synthetic data must remain prominently labeled. Whole-household backups/recovery must preserve privacy and avoid live SQLite file overwrites.

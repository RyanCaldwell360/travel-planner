import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorker } from '../cloudflare/worker';
import type { Env, Database } from '../cloudflare/types';
import { D1Store } from '../cloudflare/store';
import { demoState } from '../src/core/demo';
const aud = 'a'.repeat(64),
  team = 'synthetic-household.cloudflareaccess.com';
const mfOptions = {
  modules: true as const,
  script: 'export default {fetch(){return new Response("D1 test host")}}',
  d1Databases: ['DB'],
};
test('Cloudflare signed identities, durable D1, atomic concurrent saves, locks, history and restore', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'travel-d1-test-'));
  let mf = new Miniflare({ ...mfOptions, d1Persist: dir });
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'synthetic-test-key';
  const worker = createWorker(createLocalJWKSet({ keys: [jwk] }));
  const token = async (
    email: string,
    overrides: { aud?: string; iss?: string; expires?: string } = {},
  ) =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuedAt()
      .setIssuer(overrides.iss ?? `https://${team}`)
      .setAudience(overrides.aud ?? aud)
      .setExpirationTime(overrides.expires ?? '1h')
      .sign(privateKey);
  const a = await token('ryan@example.test'),
    b = await token('lily@example.test'),
    c = await token('stranger@example.test');
  let env: Env = {
    DB: (await mf.getD1Database('DB')) as unknown as Database,
    ASSETS: {
      async fetch() {
        return new Response('fixture assets');
      },
    },
    CF_ACCESS_TEAM_DOMAIN: team,
    CF_ACCESS_AUD: aud,
    RYAN_EMAIL: 'ryan@example.test',
    LILY_EMAIL: 'lily@example.test',
  };
  const call = (
    path: string,
    t?: string,
    body?: unknown,
    method?: string,
    extra: Record<string, string> = {},
  ) =>
    worker.fetch(
      new Request('https://planner.example.test' + path, {
        method: method ?? (body ? 'POST' : 'GET'),
        headers: {
          'Content-Type': 'application/json',
          'X-Planner-Request': '1',
          ...(t ? { 'Cf-Access-Jwt-Assertion': t } : {}),
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
    );
  try {
    assert.equal((await call('/healthz')).status, 200);
    assert.equal((await call('/api/state')).status, 401);
    assert.equal(
      (
        await call('/api/state', undefined, undefined, undefined, {
          'Cf-Access-Authenticated-User-Email': 'ryan@example.test',
        })
      ).status,
      401,
    );
    assert.equal((await call('/api/state', 'forged-token')).status, 401);
    assert.equal((await call('/api/state', c)).status, 403);
    assert.equal(
      (await call('/api/state', await token('ryan@example.test', { aud: 'b'.repeat(64) }))).status,
      401,
    );
    assert.equal(
      (
        await call(
          '/api/state',
          await token('ryan@example.test', { iss: 'https://other.cloudflareaccess.com' }),
        )
      ).status,
      401,
    );
    assert.equal(
      (await call('/api/state', await token('ryan@example.test', { expires: '-1m' }))).status,
      401,
    );
    assert.equal((await (await call('/api/session', a)).json()).user, 'ryan');
    assert.equal((await (await call('/api/session', b)).json()).user, 'lily');
    const absent = { ...env, CF_ACCESS_AUD: undefined };
    assert.equal(
      (await worker.fetch(new Request('https://planner.example.test/api/session'), absent)).status,
      503,
    );
    const repeated = { ...env, LILY_EMAIL: env.RYAN_EMAIL };
    assert.equal(
      (await worker.fetch(new Request('https://planner.example.test/api/session'), repeated))
        .status,
      503,
    );
    const initial = await (await call('/api/state', a)).json();
    assert.equal(initial.revision, 0);
    assert.equal(initial.state.scenarios.length, 0);
    const state = demoState();
    assert.equal((await call('/api/state', a, { state, revision: 0 }, 'PUT')).status, 200);
    const fromLily = await (await call('/api/state', b)).json();
    assert.equal(fromLily.state.scenarios[0].trips.length, 4);
    const copy = structuredClone(state);
    copy.scenarios[0].trips[0].note = 'Synthetic race winner';
    const race = await Promise.all([
      call('/api/state', a, { state: copy, revision: 1 }, 'PUT'),
      call('/api/state', b, { state, revision: 1 }, 'PUT'),
    ]);
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
    const history = await (await call('/api/history', a)).json();
    assert.deepEqual(
      history.map((h: { revision: number }) => h.revision),
      [1, 0],
    );
    const current = await (await call('/api/state', a)).json();
    const bad = structuredClone(current.state);
    bad.scenarios[0].trips.pop();
    assert.equal((await call('/api/state', a, { state: bad, revision: 2 }, 'PUT')).status, 400);
    assert.equal(
      (await call('/api/unlock', b, { revision: 2, scenarioId: 'baseline', tripId: 'winter' }))
        .status,
      200,
    );
    assert.equal(
      (
        await call('/api/state', a, { state, revision: 3 }, 'PUT', {
          Origin: 'https://attacker.example.test',
        })
      ).status,
      403,
    );
    const noHeader = await worker.fetch(
      new Request('https://planner.example.test/api/state', {
        method: 'PUT',
        headers: { 'Cf-Access-Jwt-Assertion': a },
        body: '{}',
      }),
      env,
    );
    assert.equal(noHeader.status, 403);
    // New runtime + same persisted D1 data: neither user nor app state comes from memory.
    await mf.dispose();
    mf = new Miniflare({ ...mfOptions, d1Persist: dir });
    env = { ...env, DB: (await mf.getD1Database('DB')) as unknown as Database };
    const reopened = await (await call('/api/state', b)).json();
    assert.equal(reopened.revision, 3);
    assert.equal(reopened.state.scenarios[0].trips.at(-1).locked, false);
    assert.equal((await call('/api/restore', a, { revision: 3, restoreRevision: 1 })).status, 200);
    assert.equal((await (await call('/api/state', b)).json()).revision, 4);
    assert.equal((await call('/api/state', a, { state, revision: 3 }, 'PUT')).status, 409);
    const store = new D1Store(env.DB);
    await store.initialize('ryan');
    const huge = structuredClone(state);
    huge.scenarios[0].trips[0].note = 'x'.repeat(270000);
    await assert.rejects(store.write(huge, 4, 'ryan'), /size limit/);
    const saved = await store.read();
    assert.equal(saved.revision, 4);
    assert.equal((await call('/api/logout', a, {})).status, 200);
  } finally {
    await mf.dispose();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('production Worker bundle runs in workerd and verifies remote JWKS before sharing D1 records', async () => {
  const { cloudflareFixture } = await import('./cloudflare-fixture');
  const f = await cloudflareFixture();
  const call = (token?: string, body?: unknown) =>
    f.mf.dispatchFetch('https://planner.example.test/api/state', {
      method: body ? 'PUT' : 'GET',
      headers: {
        'X-Planner-Request': '1',
        'Content-Type': 'application/json',
        ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    assert.equal((await call()).status, 401);
    assert.equal((await call(f.tokens.stranger)).status, 403);
    assert.equal((await call('bad-token')).status, 401);
    const start = (await (await call(f.tokens.ryan)).json()) as { revision: number };
    assert.equal(start.revision, 0);
    assert.equal((await call(f.tokens.ryan, { state: demoState(), revision: 0 })).status, 200);
    const seen = (await (await call(f.tokens.lily)).json()) as {
      revision: number;
      state: { demo: boolean };
    };
    assert.equal(seen.revision, 1);
    assert.equal(seen.state.demo, true);
    assert.equal((await call(f.tokens.lily, { state: demoState(), revision: 0 })).status, 409);
  } finally {
    await f.dispose();
  }
});

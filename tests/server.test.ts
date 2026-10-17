import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app';
import { demoState } from '../src/core/demo';
import {
  getDiscovery,
  fingerprint,
  type TravelAdapter,
  type WeatherAdapter,
} from '../server/providers';
const requestHeaders = { 'Content-Type': 'application/json', 'X-Planner-Request': '1' };
test('A11 two identities, durable server persistence, unauthorized requests, failed saves and stale conflicts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'planner-api-'));
  const code = 'synthetic-test-only-setup';
  let runtime = createApp({ dataDir: dir, setupToken: code });
  let server = runtime.app.listen(0);
  await new Promise<void>((r) => server.once('listening', r));
  let port = (server.address() as { port: number }).port;
  const call = async (path: string, body?: unknown, cookie?: string, method?: string) => {
    const r = await fetch(`http://127.0.0.1:${port}/api/` + path, {
      method: method ?? (body ? 'POST' : 'GET'),
      headers: { ...requestHeaders, ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return r;
  };
  try {
    assert.equal((await call('state')).status, 401);
    assert.equal(
      (await call('state', { state: demoState(), revision: 0 }, undefined, 'PUT')).status,
      401,
    );
    assert.equal(
      (
        await call('setup', {
          code,
          ryanPassword: 'Ryan synthetic test 2027',
          lilyPassword: 'Lily synthetic test 2027',
        })
      ).status,
      200,
    );
    const a = await call('login', { user: 'ryan', password: 'Ryan synthetic test 2027' }),
      b = await call('login', { user: 'lily', password: 'Lily synthetic test 2027' });
    const ca = a.headers.get('set-cookie')!.split(';')[0],
      cb = b.headers.get('set-cookie')!.split(';')[0];
    assert.match(a.headers.get('set-cookie')!, /HttpOnly/);
    assert.notEqual(ca, cb);
    assert.equal((await call('login', { user: 'stranger', password: 'guess' })).status, 401);
    assert.equal((await call('state', undefined, 'planner_session=guessed')).status, 401);
    const state = demoState();
    assert.equal((await call('state', { state, revision: 0 }, ca, 'PUT')).status, 200);
    const seen = await (await call('state', undefined, cb)).json();
    assert.equal(seen.revision, 1);
    assert.equal(seen.state.scenarios[0].trips.length, 4);
    const next = structuredClone(state);
    next.scenarios[0].trips[0].note = 'Lily saved this from a second laptop';
    assert.equal((await call('state', { state: next, revision: 1 }, cb, 'PUT')).status, 200);
    assert.equal((await call('state', { state, revision: 1 }, ca, 'PUT')).status, 409);
    assert.equal(
      (await (await call('state', undefined, ca)).json()).state.scenarios[0].trips[0].note,
      next.scenarios[0].trips[0].note,
    );
    const bad = structuredClone(next);
    bad.scenarios[0].trips.pop();
    assert.equal((await call('state', { state: bad, revision: 2 }, ca, 'PUT')).status, 400);
    assert.equal(
      (await call('state', { state: { nonsense: true }, revision: 2 }, ca, 'PUT')).status,
      400,
    );
    const csrf = await fetch(`http://127.0.0.1:${port}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: ca },
      body: JSON.stringify({ state, revision: 2 }),
    });
    assert.equal(csrf.status, 403);
    assert.equal(
      (await call('unlock', { revision: 2, scenarioId: 'baseline', tripId: 'winter' }, cb)).status,
      200,
    );
    const unlocked = await (await call('state', undefined, ca)).json();
    assert.equal(unlocked.state.scenarios[0].trips.at(-1).locked, false);
    await new Promise<void>((r) => server.close(() => r()));
    runtime.store.db.close();
    runtime = createApp({ dataDir: dir, setupToken: code });
    server = runtime.app.listen(0);
    await new Promise<void>((r) => server.once('listening', r));
    port = (server.address() as { port: number }).port;
    const reopened = await (await call('state', undefined, cb)).json();
    assert.equal(reopened.revision, 3);
    assert.equal(reopened.state.scenarios[0].trips[0].note, next.scenarios[0].trips[0].note);
    const history = await (await call('history', undefined, ca)).json();
    assert.equal(history.length, 3);
    await call('logout', {}, cb);
    assert.equal((await call('state', undefined, cb)).status, 401);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    runtime.store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('A12 provider adapter preserves scope, deduplicates shared lodging, caches evidence and invalidates changed dates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'planner-evidence-')),
    runtime = createApp({ dataDir: dir });
  const t = demoState().scenarios[0].trips[0];
  let calls = 0;
  const travel: TravelAdapter = {
    async flights(trip) {
      calls++;
      return trip.participants.map((p) => ({
        status: 'available',
        label: 'Synthetic adapter fixture',
        source: 'test fixture',
        sourceUrl: 'https://example.com',
        detail: p.person,
        amount: 123,
        currency: 'USD',
        taxes: 'unknown',
        scope: p.days[0].date,
      }));
    },
    async lodging() {
      return {
        status: 'available',
        label: 'Synthetic shared room fixture',
        source: 'test fixture',
        sourceUrl: 'https://example.com',
        detail: 'one room, not per traveler',
        amount: 456,
        currency: 'USD',
      };
    },
  };
  const weather: WeatherAdapter = {
    async context() {
      return {
        status: 'unavailable',
        label: 'Weather',
        source: 'test fixture',
        sourceUrl: 'https://example.com',
        detail: 'No forecast inferred',
      };
    },
  };
  try {
    const a = await getDiscovery(runtime.store, t, travel, weather),
      b = await getDiscovery(runtime.store, t, travel, weather);
    assert.equal(a.flights.length, 1);
    assert.equal(a.lodging.amount, 456);
    assert.equal(b.cached, true);
    assert.equal(calls, 1);
    const next = structuredClone(t);
    next.participants[0].days[0].date = '2027-09-09';
    assert.notEqual(fingerprint(next), a.fingerprint);
    await getDiscovery(runtime.store, next, travel, weather);
    assert.equal(calls, 2);
  } finally {
    runtime.store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

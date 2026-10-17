import { ZodError } from 'zod';
import type { JWTVerifyGetKey } from 'jose';
import { type Env, RequestError } from './types';
import { identity, authConfig } from './auth';
import { D1Store } from './store';
import { validateState } from '../server/schema';
import { assertLocks } from '../src/core/pto';
import { demoState } from '../src/core/demo';
import { emptyState } from '../src/core/model';
import { getDiscovery } from '../server/providers';
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers });
// The optional key resolver exists for signed-token tests; production never receives one.
// There is no environment flag, cookie, or request header that bypasses verification.
export function createWorker(testKey?: JWTVerifyGetKey) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url),
        path = url.pathname;
      try {
        if (path === '/healthz') {
          try {
            await env.DB.prepare('SELECT 1 AS ok').first();
            return json({ ok: true });
          } catch {
            return json({ ok: false }, 503);
          }
        }
        if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
        if (!['GET', 'HEAD'].includes(request.method)) {
          if (request.headers.get('X-Planner-Request') !== '1')
            throw new RequestError('Same-origin request header required.', 403);
          const origin = request.headers.get('Origin');
          if (origin && new URL(origin).origin !== url.origin)
            throw new RequestError('Cross-origin requests are not allowed.', 403);
        }
        const user = await identity(request, env, testKey);
        if (path === '/api/session' && request.method === 'GET') {
          authConfig(env);
          return json({ user, setupRequired: false, authMode: 'access' });
        }
        if (!user) throw new RequestError('Sign in to access the private planner.', 401);
        const store = new D1Store(env.DB);
        await store.initialize(user);
        if (path === '/api/logout' && request.method === 'POST')
          return json({ logoutUrl: '/cdn-cgi/access/logout' });
        if (path === '/api/state' && request.method === 'GET') return json(await store.read());
        if (path === '/api/history' && request.method === 'GET') return json(await store.history());
        if (path === '/api/health' && request.method === 'GET')
          return json({ ok: true, storage: 'd1' });
        if (!['POST', 'PUT'].includes(request.method))
          throw new RequestError('Endpoint not found.', 404);
        const length = Number(request.headers.get('Content-Length') ?? 0);
        if (length > 300 * 1024)
          throw new RequestError('Request is too large for this free deployment.', 413);
        const bodyText = await request.text();
        if (new TextEncoder().encode(bodyText).length > 300 * 1024)
          throw new RequestError('Request is too large for this free deployment.', 413);
        const body = JSON.parse(bodyText);
        const current = await store.read();
        if (path === '/api/state' && request.method === 'PUT') {
          const state = validateState(body.state);
          assertLocks(current.state, state);
          return json(await store.write(state, body.revision, user));
        }
        if (path === '/api/unlock') {
          const trip = current.state.scenarios
            .find((s) => s.id === body.scenarioId)
            ?.trips.find((t) => t.id === body.tripId);
          if (!trip) throw new RequestError('Trip not found.', 404);
          if (body.person && body.date) {
            const day = trip.participants
              .find((p) => p.person === body.person)
              ?.days.find((d) => d.date === body.date);
            if (!day) throw new RequestError('Protected day not found.', 404);
            day.locked = false;
          } else trip.locked = false;
          return json(await store.write(current.state, body.revision, user));
        }
        if (path === '/api/demo') {
          if (current.state.scenarios.length)
            throw new RequestError('Demo can only start in an empty journal.');
          return json(await store.write(validateState(demoState()), body.revision, user));
        }
        if (path === '/api/start-real') {
          if (!current.state.demo || body.confirmation !== 'START REAL JOURNAL')
            throw new RequestError(
              'This action only archives the synthetic demo, with explicit confirmation.',
            );
          return json(await store.write(emptyState(), body.revision, user));
        }
        if (path === '/api/restore') {
          const state = validateState(await store.past(body.restoreRevision));
          assertLocks(current.state, state);
          return json(await store.write(state, body.revision, user));
        }
        if (path === '/api/discovery') {
          const state = validateState(body.state);
          const trip = state.scenarios
            .find((s) => s.id === body.scenarioId)
            ?.trips.find((t) => t.id === body.tripId);
          if (!trip) throw new RequestError('Select a valid trip first.');
          return json(await getDiscovery(store, trip));
        }
        throw new RequestError('Endpoint not found.', 404);
      } catch (error) {
        if (error instanceof RequestError) return json({ error: error.message }, error.status);
        if (error instanceof ZodError)
          return json(
            { error: [...new Set(error.issues.map((i) => i.message))].slice(0, 4).join(' ') },
            400,
          );
        if (error instanceof SyntaxError) return json({ error: 'Send valid JSON.' }, 400);
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'The shared planner is temporarily unavailable.',
          },
          400,
        );
      }
    },
  };
}
export default createWorker();

import { ZodError } from 'zod';
import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { openStore, digest, verifyPassword } from './store';
import { validateState } from './schema';
import { assertLocks, forecast } from '../src/core/pto';
import { demoState } from '../src/core/demo';
import { findTradeoffs } from '../src/core/tradeoffs';
import { PEOPLE, emptyState } from '../src/core/model';
import { getDiscovery } from './providers';
export function createApp(options: {
  dataDir: string;
  setupToken?: string;
  secureCookies?: boolean;
}) {
  const store = openStore(options.dataDir, options.setupToken),
    app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
    });
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Planner-Request') !== '1')
      return res.status(403).json({ error: 'Same-origin request header required.' });
    if (req.get('Origin') && new URL(req.get('Origin')!).host !== req.get('host'))
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    next();
  });
  const attempts = new Map<string, { n: number; at: number }>();
  app.use(['/api/login', '/api/setup'], (req, res, next) => {
    const key = req.ip ?? 'unknown',
      old = attempts.get(key);
    if (!old || Date.now() - old.at > 15 * 60_000) attempts.set(key, { n: 1, at: Date.now() });
    else {
      old.n++;
      if (old.n > 30)
        return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }
    next();
  });
  const cookie = (res: express.Response, token: string, clear = false) =>
    res.setHeader(
      'Set-Cookie',
      `planner_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 604800}${options.secureCookies ? '; Secure' : ''}`,
    );
  function session(req: express.Request) {
    const token = req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('planner_session='))
      ?.slice(16);
    if (!token) return null;
    return store.db
      .prepare('SELECT user_id FROM sessions WHERE hash=? AND expires>?')
      .get(digest(token), Date.now()) as { user_id: string } | undefined;
  }
  app.get('/api/session', (req, res) => {
    const user = session(req);
    res.json({ setupRequired: store.setupRequired(), user: user?.user_id ?? null });
  });
  app.post('/api/setup', (req, res, next) => {
    try {
      const { code, ryanPassword, lilyPassword } = req.body;
      if (
        typeof code !== 'string' ||
        !timingSafeEqual(Buffer.from(digest(code)), Buffer.from(digest(store.setupToken)))
      )
        return res.status(403).json({ error: 'Incorrect setup code.' });
      if (
        typeof ryanPassword !== 'string' ||
        typeof lilyPassword !== 'string' ||
        ryanPassword.length < 12 ||
        lilyPassword.length < 12 ||
        ryanPassword.length > 200 ||
        lilyPassword.length > 200
      )
        throw new Error('Each person needs a password of 12–200 characters.');
      if (ryanPassword === lilyPassword)
        throw new Error('Choose distinct passwords for Ryan and Lily.');
      store.setup(ryanPassword, lilyPassword);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/login', (req, res, next) => {
    try {
      const { user, password } = req.body;
      if (typeof user !== 'string' || typeof password !== 'string' || password.length > 200)
        return res.status(401).json({ error: 'Incorrect name or password.' });
      const row = store.db.prepare('SELECT password FROM users WHERE id=?').get(user) as
        { password: string } | undefined;
      const valid = verifyPassword(
        password,
        row?.password ??
          'invalid:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      );
      if (!row || !valid) return res.status(401).json({ error: 'Incorrect name or password.' });
      const token = randomBytes(32).toString('base64url');
      store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
      store.db
        .prepare('INSERT INTO sessions VALUES (?,?,?)')
        .run(digest(token), user, Date.now() + 604800000);
      cookie(res, token);
      res.json({ user });
    } catch (e) {
      next(e);
    }
  });
  app.use('/api', (req, res, next) => {
    const user = session(req);
    if (!user) return res.status(401).json({ error: 'Sign in to access the private planner.' });
    res.locals.user = user.user_id;
    next();
  });
  app.post('/api/logout', (req, res) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('planner_session='))
      ?.slice(16);
    if (token) store.db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token));
    cookie(res, '', true);
    res.json({ ok: true });
  });
  app.get('/api/state', (_req, res) => res.json(store.read()));
  app.put('/api/state', (req, res, next) => {
    try {
      const state = validateState(req.body.state);
      const old = store.read()!;
      if (old.revision !== req.body.revision)
        return res.status(409).json({
          error:
            'Another person saved changes. Your draft is still open; reload and reconcile before saving.',
        });
      assertLocks(old.state, state);
      res.json(store.write(state, old.revision, res.locals.user));
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/unlock', (req, res, next) => {
    try {
      const current = store.read()!;
      const { revision, scenarioId, tripId, person, date } = req.body;
      if (revision !== current.revision)
        return res.status(409).json({ error: 'Planner changed. Reload before unlocking.' });
      const trip = current.state.scenarios
        .find((s) => s.id === scenarioId)
        ?.trips.find((t) => t.id === tripId);
      if (!trip) throw new Error('Trip not found');
      if (person && date) {
        const d = trip.participants
          .find((p) => p.person === person)
          ?.days.find((d) => d.date === date);
        if (!d) throw new Error('Protected day not found');
        d.locked = false;
      } else trip.locked = false;
      res.json(store.write(current.state, revision, res.locals.user));
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/demo', (req, res, next) => {
    try {
      const current = store.read()!;
      if (current.state.scenarios.length)
        throw new Error(
          'Demo can only start in an empty journal. Archive a demo explicitly before starting again.',
        );
      res.json(store.write(validateState(demoState()), req.body.revision, res.locals.user));
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/start-real', (req, res, next) => {
    try {
      const current = store.read()!;
      if (!current.state.demo || req.body.confirmation !== 'START REAL JOURNAL')
        throw new Error(
          'This action only archives the synthetic demo, with explicit confirmation.',
        );
      res.json(store.write(emptyState(), req.body.revision, res.locals.user));
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/tradeoffs', (req, res, next) => {
    try {
      const state = validateState(req.body.state);
      const s = state.scenarios.find((s) => s.id === req.body.scenarioId);
      if (!s) throw new Error('Scenario not found');
      res.json(findTradeoffs(state, s, req.body.targetId));
    } catch (e) {
      next(e);
    }
  });
  app.get('/api/history', (_req, res) =>
    res.json(
      store.db
        .prepare('SELECT revision,editor,saved_at FROM history ORDER BY revision DESC LIMIT 20')
        .all(),
    ),
  );
  app.post('/api/restore', (req, res, next) => {
    try {
      const current = store.read()!;
      const old = store.db
        .prepare('SELECT state FROM history WHERE revision=?')
        .get(req.body.restoreRevision) as { state: string } | undefined;
      if (!old) throw new Error('Revision not found');
      const state = validateState(JSON.parse(old.state));
      assertLocks(current.state, state);
      res.json(store.write(state, req.body.revision, res.locals.user));
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/discovery', async (req, res, next) => {
    try {
      const state = validateState(req.body.state);
      const s = state.scenarios.find((s) => s.id === req.body.scenarioId);
      const t = s?.trips.find((t) => t.id === req.body.tripId);
      if (!t) throw new Error('Save a trip first to retrieve scoped evidence.');
      res.json(await getDiscovery(store, t));
    } catch (e) {
      next(e);
    }
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'sqlite', people: PEOPLE }));
  app.use(
    '/api',
    (
      err: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.status ?? 400).json({
        error:
          err instanceof ZodError
            ? [...new Set(err.issues.map((issue) => issue.message))].slice(0, 4).join(' ')
            : err.message,
      });
    },
  );
  return { app, store };
}

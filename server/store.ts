import type { Evidence } from './providers';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { emptyState, type State } from '../src/core/model';
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  return (
    actual.length === Buffer.from(hash, 'hex').length &&
    timingSafeEqual(actual, Buffer.from(hash, 'hex'))
  );
}
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export function openStore(dir: string, providedToken?: string) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, 'planner.sqlite');
  const db = new DatabaseSync(path);
  chmodSync(path, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS planner (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, state TEXT NOT NULL, editor TEXT NOT NULL, saved_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, state TEXT NOT NULL, editor TEXT NOT NULL, saved_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS evidence (fingerprint TEXT PRIMARY KEY, result TEXT NOT NULL, saved_at TEXT NOT NULL);`);
  const tokenPath = join(dir, 'setup-code.txt');
  if (!existsSync(tokenPath))
    writeFileSync(tokenPath, providedToken ?? randomBytes(24).toString('base64url'), {
      mode: 0o600,
    });
  const setupToken = providedToken ?? readFileSync(tokenPath, 'utf8').trim();
  const setupRequired = () =>
    Number((db.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n) === 0;
  const read = () => {
    const r = db.prepare('SELECT * FROM planner WHERE id=1').get() as
      { revision: number; state: string; editor: string; saved_at: string } | undefined;
    return r
      ? {
          revision: r.revision,
          state: JSON.parse(r.state) as State,
          editor: r.editor,
          savedAt: r.saved_at,
        }
      : null;
  };
  function write(state: State, revision: number, editor: string) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const old = read();
      if (old?.revision !== revision)
        throw Object.assign(
          new Error('Another person saved changes. Reload to compare before saving your draft.'),
          { status: 409 },
        );
      const savedAt = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO history VALUES (?,?,?,?)').run(
        old.revision,
        JSON.stringify(old.state),
        old.editor,
        old.savedAt,
      );
      db.prepare('UPDATE planner SET revision=?,state=?,editor=?,saved_at=? WHERE id=1').run(
        revision + 1,
        JSON.stringify(state),
        editor,
        savedAt,
      );
      db.exec('COMMIT');
      return read()!;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  function setup(ryan: string, lily: string) {
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!setupRequired()) throw new Error('Planner already initialized.');
      for (const [name, pw] of [
        ['ryan', ryan],
        ['lily', lily],
      ])
        db.prepare('INSERT INTO users VALUES (?,?)').run(name, hashPassword(pw));
      db.prepare('INSERT INTO planner VALUES (1,0,?,?,?)').run(
        JSON.stringify(emptyState()),
        'ryan',
        new Date().toISOString(),
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  async function readEvidence(key: string) {
    const r = db.prepare('SELECT result FROM evidence WHERE fingerprint=?').get(key) as
      { result: string } | undefined;
    return r ? (JSON.parse(r.result) as Evidence) : undefined;
  }
  async function saveEvidence(key: string, result: Evidence) {
    db.prepare('INSERT OR REPLACE INTO evidence VALUES (?,?,?)').run(
      key,
      JSON.stringify(result),
      result.retrievedAt,
    );
  }
  return { db, read, write, setup, setupRequired, setupToken, dir, readEvidence, saveEvidence };
}

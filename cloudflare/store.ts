import { emptyState, type State } from '../src/core/model';
import type { Snapshot } from '../src/api';
import type { Evidence, EvidenceCache } from '../server/providers';
import { type Database, RequestError } from './types';
export const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS planner (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, state TEXT NOT NULL, editor TEXT NOT NULL, saved_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, state TEXT NOT NULL, editor TEXT NOT NULL, saved_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS evidence (fingerprint TEXT PRIMARY KEY, result TEXT NOT NULL, saved_at TEXT NOT NULL)',
  `CREATE TRIGGER IF NOT EXISTS archive_planner BEFORE UPDATE ON planner BEGIN INSERT INTO history (revision,state,editor,saved_at) VALUES (OLD.revision,OLD.state,OLD.editor,OLD.saved_at); END`,
];
interface Row {
  revision: number;
  state: string;
  editor: string;
  saved_at: string;
}
const snapshot = (r: Row): Snapshot => ({
  revision: r.revision,
  state: JSON.parse(r.state),
  editor: r.editor,
  savedAt: r.saved_at,
});
const initialized = new WeakMap<Database, Promise<void>>();
export class D1Store implements EvidenceCache {
  constructor(public db: Database) {}
  async initialize(editor: string) {
    let pending = initialized.get(this.db);
    if (!pending) {
      pending = this.db.batch(SCHEMA.map((sql) => this.db.prepare(sql))).then(() => {});
      initialized.set(this.db, pending);
      pending.catch(() => initialized.delete(this.db));
    }
    await pending;
    await this.db
      .prepare('INSERT OR IGNORE INTO planner VALUES (1,0,?,?,?)')
      .bind(JSON.stringify(emptyState()), editor, new Date().toISOString())
      .run();
  }
  async read() {
    const row = await this.db
      .prepare('SELECT revision,state,editor,saved_at FROM planner WHERE id=1')
      .first<Row>();
    if (!row) throw new RequestError('Shared storage is not initialized.', 503);
    return snapshot(row);
  }
  async write(state: State, revision: number, editor: string) {
    if (!Number.isInteger(revision) || revision < 0)
      throw new RequestError('A current shared-plan revision is required.');
    const text = JSON.stringify(state);
    if (new TextEncoder().encode(text).length > 256 * 1024)
      throw new RequestError(
        'This journal exceeds the free deployment size limit (256 KiB). Export and archive older plans before adding more.',
        413,
      );
    // A single conditional SQL write is atomic. The trigger archives exactly the replaced revision
    // in the same transaction. A racing writer cannot archive or overwrite a newer version.
    const row = await this.db
      .prepare(
        'UPDATE planner SET revision=revision+1,state=?,editor=?,saved_at=? WHERE id=1 AND revision=? RETURNING revision,state,editor,saved_at',
      )
      .bind(text, editor, new Date().toISOString(), revision)
      .first<Row>();
    if (!row)
      throw new RequestError(
        'Another person saved changes. Your preview is still open; reload and reconcile before saving.',
        409,
      );
    return snapshot(row);
  }
  async history() {
    return (
      await this.db
        .prepare('SELECT revision,editor,saved_at FROM history ORDER BY revision DESC LIMIT 20')
        .all<{ revision: number; editor: string; saved_at: string }>()
    ).results;
  }
  async past(revision: number) {
    const r = await this.db
      .prepare('SELECT state FROM history WHERE revision=?')
      .bind(revision)
      .first<{ state: string }>();
    if (!r) throw new RequestError('Revision not found.', 404);
    return JSON.parse(r.state) as State;
  }
  async readEvidence(key: string) {
    const r = await this.db
      .prepare('SELECT result FROM evidence WHERE fingerprint=?')
      .bind(key)
      .first<{ result: string }>();
    return r ? (JSON.parse(r.result) as Evidence) : undefined;
  }
  async saveEvidence(key: string, result: Evidence) {
    await this.db
      .prepare('INSERT OR REPLACE INTO evidence VALUES (?,?,?)')
      .bind(key, JSON.stringify(result), result.retrievedAt)
      .run();
  }
}

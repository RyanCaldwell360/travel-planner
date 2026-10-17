import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { chmodSync, mkdirSync } from 'node:fs';
process.umask(0o077);
const dir = resolve(process.env.DATA_DIR ?? '.data');
const db = new DatabaseSync(resolve(dir, 'planner.sqlite'));
mkdirSync(resolve(dir, 'backups'), { recursive: true, mode: 0o700 });
const dest = resolve(
  dir,
  'backups',
  `planner-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
);
db.prepare('VACUUM INTO ?').run(dest);
db.close();
chmodSync(dest, 0o600);
console.log(`Consistent SQLite backup saved: ${dest}. Copy it to private off-server storage.`);

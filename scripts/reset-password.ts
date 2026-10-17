import { openStore, hashPassword, verifyPassword } from '../server/store';
import { resolve } from 'node:path';
const user = process.argv[2],
  password = process.env.NEW_PASSWORD;
if (!['ryan', 'lily'].includes(user) || !password || password.length < 12 || password.length > 200)
  throw new Error(
    'Use npm run reset-password -- ryan|lily with NEW_PASSWORD set securely (12–200 characters).',
  );
process.umask(0o077);
const store = openStore(resolve(process.env.DATA_DIR ?? '.data'));
const other = store.db.prepare('SELECT id,password FROM users WHERE id!=?').get(user);
if (!other) throw new Error('Initialize the private household first.');
if (verifyPassword(password, String(other.password))) {
  store.db.close();
  throw new Error('Choose a different password from the other household member.');
}
store.db.exec('BEGIN IMMEDIATE');
try {
  store.db.prepare('UPDATE users SET password=? WHERE id=?').run(hashPassword(password), user);
  store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user);
  store.db.exec('COMMIT');
  console.log(`Password reset for ${user}; existing sessions revoked.`);
} catch (e) {
  store.db.exec('ROLLBACK');
  throw e;
} finally {
  store.db.close();
}

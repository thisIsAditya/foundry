import { createSql, getUserByEmail, insertUser } from '@foundry/db';
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAuth } from '../lib/auth';
import { getEnv } from '../lib/env';

const email = process.argv[2] ?? 'admin@localhost.dev';
const pinPath = join(dirname(fileURLToPath(import.meta.url)), '../../../.local-admin-pin');

const sql = createSql(getEnv().DATABASE_URL);
try {
  let user = await getUserByEmail(sql, email);
  if (user === null) {
    user = await insertUser(sql, {
      name: 'Local Admin',
      email,
      role: 'admin',
      emailVerified: true,
    });
  }
  if (user.role !== 'admin' && user.role !== 'test') {
    throw new Error(`Refusing to issue an API key for role ${user.role}`);
  }

  const created = await getAuth().api.createApiKey({
    body: {
      userId: user.id,
      name: 'local-admin',
    },
  });

  const key = 'key' in created && typeof created.key === 'string' ? created.key : undefined;
  if (key === undefined) {
    throw new Error('Better Auth did not return a raw API key');
  }

  const pin = String(randomInt(100_000, 1_000_000));
  writeFileSync(pinPath, `PIN=${pin}\nACCESS_KEY=${key}\nEMAIL=${email}\n`, { encoding: 'utf8' });
  process.stdout.write(`${pin}\n`);
} finally {
  await sql.end({ timeout: 5 });
}

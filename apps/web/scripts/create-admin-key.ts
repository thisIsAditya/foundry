import { createSql, getUserByEmail, insertUser } from '@foundry/db';

import { getAuth } from '../lib/auth';
import { getEnv } from '../lib/env';

const email = process.argv[2] ?? 'admin@localhost';

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

  process.stdout.write(`${key}\n`);
} finally {
  await sql.end({ timeout: 5 });
}

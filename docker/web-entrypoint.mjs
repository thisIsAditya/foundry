import { spawn } from 'node:child_process';

function composeDatabaseUrl(raw) {
  const secret = JSON.parse(raw);
  const username = encodeURIComponent(String(secret.username));
  const password = encodeURIComponent(String(secret.password));
  const host = String(secret.host);
  const port = String(secret.port ?? 5432);
  const dbname = String(secret.dbname ?? 'foundry');
  return `postgres://${username}:${password}@${host}:${port}/${dbname}?sslmode=require`;
}

if (process.env.RDS_SECRET && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = composeDatabaseUrl(process.env.RDS_SECRET);
}

if (process.env.REDIS_HOST && !process.env.REDIS_URL) {
  const port = process.env.REDIS_PORT ?? '6379';
  process.env.REDIS_URL = `rediss://${process.env.REDIS_HOST}:${port}`;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  args.push('node', 'apps/web/server.js');
}

const child = spawn(args[0], args.slice(1), { stdio: 'inherit', env: process.env });

function forward(signal) {
  child.kill(signal);
}

process.on('SIGTERM', () => forward('SIGTERM'));
process.on('SIGINT', () => forward('SIGINT'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

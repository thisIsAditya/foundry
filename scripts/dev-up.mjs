#!/usr/bin/env node
/**
 * One-command local stack for Windows, macOS, and Linux.
 *
 *   pnpm dev:up          install, start infra, migrate, mint PIN, run web + worker
 *   pnpm dev:reset       same, after wiping Docker volumes, app processes, and the PIN
 *
 * Does not start or require Ollama.
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const reset = process.argv.includes('--reset');
const pinPath = join(root, '.local-admin-pin');
const envPath = join(root, '.env');
const envExamplePath = join(root, '.env.example');
const appPorts = [3210, 3211, 8689];

function log(message) {
  process.stdout.write(`\n==> ${message}\n`);
}

function fail(message) {
  process.stderr.write(`\nerror: ${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.capture === true ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: isWin,
    env: process.env,
  });
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  }
  return result.stdout ?? '';
}

function which(command) {
  const probe = isWin ? 'where' : 'which';
  const result = spawnSync(probe, [command], { encoding: 'utf8', shell: isWin });
  return result.status === 0;
}

function requireTools() {
  if (!which('node')) {
    fail('Node.js is required (this repo needs Node 24).');
  }
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 24) {
    fail(`Node 24+ is required (found ${process.versions.node}).`);
  }
  if (!which('pnpm')) {
    fail('pnpm is required. Run: corepack enable && corepack prepare pnpm@10.33.0 --activate');
  }
  if (!which('docker')) {
    fail('Docker is required and must be running.');
  }
}

function killPort(port) {
  if (isWin) {
    const listed = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
    const pids = new Set();
    for (const line of (listed.stdout ?? '').split(/\r?\n/)) {
      if (!line.includes('LISTENING') || !line.includes(`:${port} `)) {
        continue;
      }
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid !== undefined && /^\d+$/.test(pid) && pid !== '0') {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore', shell: true });
    }
    return;
  }
  const listed = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
  const pids = (listed.stdout ?? '')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value));
  for (const pid of pids) {
    spawnSync('kill', ['-9', pid], { stdio: 'ignore' });
  }
}

function waitForPostgres(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', 'foundry', '-d', 'foundry'],
      { cwd: root, encoding: 'utf8', shell: isWin },
    );
    if (result.status === 0) {
      return;
    }
    spawnSync(isWin ? 'timeout' : 'sleep', isWin ? ['/t', '2', '/nobreak'] : ['2'], {
      stdio: 'ignore',
      shell: isWin,
    });
  }
  fail('Postgres did not become ready. Check `docker compose logs postgres`.');
}

function startChild(command, args, name) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    process.stderr.write(`\n${name} exited (${signal ?? code})\n`);
    shutdown(code === 0 ? 0 : 1);
  });
  return child;
}

let shuttingDown = false;
const children = [];

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

requireTools();

if (reset) {
  log('Stopping local web/worker processes');
  for (const port of appPorts) {
    killPort(port);
  }
  log('Stopping Docker and deleting volumes');
  run('docker', ['compose', 'down', '-v']);
  if (existsSync(pinPath)) {
    rmSync(pinPath);
    log('Removed .local-admin-pin');
  }
}

if (!existsSync(envPath)) {
  if (!existsSync(envExamplePath)) {
    fail('.env.example is missing; cannot create .env');
  }
  copyFileSync(envExamplePath, envPath);
  log('Created .env from .env.example');
}

log('Installing dependencies');
run('pnpm', ['install']);

log('Starting Postgres, Valkey, MinIO, and Mailpit');
run('docker', ['compose', 'up', '-d', 'postgres', 'valkey', 'minio', 'minio-init', 'mailpit']);
waitForPostgres();

log('Running database migrations');
run('pnpm', ['db:migrate']);

log('Creating a fresh local admin PIN');
const pin = run('pnpm', ['create-admin-key'], { capture: true }).trim().split(/\r?\n/).at(-1) ?? '';
if (!/^\d{6}$/.test(pin)) {
  fail('create-admin-key did not return a 6-digit PIN');
}

process.stdout.write(`
Local stack is ready.

  Web:     http://localhost:3210
  Worker:  http://localhost:8689
  Mailpit: http://localhost:8025
  MinIO:   http://localhost:9001

  Sign-in PIN: ${pin}
  (also written to .local-admin-pin — do not commit it)

Starting web and worker. Ctrl+C stops both.
`);

children.push(startChild('pnpm', ['dev:web'], 'web'));
children.push(startChild('pnpm', ['dev:worker'], 'worker'));

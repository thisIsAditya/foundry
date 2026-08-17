import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

import type { PoolSql } from '@foundry/db';

export type RedisPing = {
  ping(): Promise<string>;
  quit(): Promise<unknown>;
};

export type HealthDeps = {
  port: number;
  sql: PoolSql;
  redis: RedisPing;
};

export function startHealthServer(deps: HealthDeps): Server {
  const server = createServer((req, res) => {
    void handle(req, res, deps);
  });
  server.listen(deps.port);
  return server;
}

async function handle(req: IncomingMessage, res: ServerResponse, deps: HealthDeps): Promise<void> {
  const url = req.url ?? '/';
  if (req.method === 'GET' && url.startsWith('/healthz')) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (req.method === 'GET' && url.startsWith('/readyz')) {
    try {
      await deps.sql`select 1`;
      const pong = await deps.redis.ping();
      if (pong !== 'PONG') {
        throw new Error('redis ping failed');
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ready');
    } catch {
      res.writeHead(503, { 'content-type': 'text/plain' });
      res.end('not ready');
    }
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
}

import type { Server } from 'node:http';

import type { PoolSql } from '@foundry/db';
import type { Worker } from 'bullmq';

import type { RedisPing } from './health.js';

export type ShutdownDeps = {
  worker: Worker;
  sql: PoolSql;
  redis: RedisPing;
  health: Server;
};

export function registerShutdown(deps: ShutdownDeps): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    try {
      await deps.worker.pause(true);
      await deps.worker.close();
      await deps.redis.quit();
      await deps.sql.end({ timeout: 5 });
      await new Promise<void>((resolve, reject) => {
        deps.health.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    } finally {
      process.exit(signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

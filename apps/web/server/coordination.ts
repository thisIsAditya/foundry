import Redis from 'ioredis';

import { getEnv } from '../lib/env';

export type CoordinationStore = {
  incrWithExpire(key: string, ttlSeconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  setNx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  ping(): Promise<boolean>;
};

export function createMemoryCoordinationStore(): CoordinationStore {
  const values = new Map<string, { value: string; expiresAt: number }>();

  function read(key: string): string | null {
    const entry = values.get(key);
    if (entry === undefined) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      values.delete(key);
      return null;
    }
    return entry.value;
  }

  return {
    async incrWithExpire(key, ttlSeconds) {
      const current = Number(read(key) ?? '0') + 1;
      const existing = values.get(key);
      const expiresAt =
        existing === undefined || existing.expiresAt <= Date.now()
          ? Date.now() + ttlSeconds * 1000
          : existing.expiresAt;
      values.set(key, { value: String(current), expiresAt });
      return current;
    },
    async get(key) {
      return read(key);
    },
    async set(key, value, ttlSeconds) {
      values.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async setNx(key, value, ttlSeconds) {
      if (read(key) !== null) {
        return false;
      }
      values.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return true;
    },
    async ping() {
      return true;
    },
  };
}

export function createRedisCoordinationStore(url: string): CoordinationStore {
  const redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });

  return {
    async incrWithExpire(key, ttlSeconds) {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return count;
    },
    async get(key) {
      return redis.get(key);
    },
    async set(key, value, ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    },
    async setNx(key, value, ttlSeconds) {
      const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    },
    async ping() {
      return (await redis.ping()) === 'PONG';
    },
  };
}

const globalForCoordination = globalThis as typeof globalThis & {
  foundryCoordination?: CoordinationStore;
};

export function getCoordinationStore(): CoordinationStore {
  if (globalForCoordination.foundryCoordination !== undefined) {
    return globalForCoordination.foundryCoordination;
  }
  const redisUrl = getEnv().REDIS_URL;
  globalForCoordination.foundryCoordination =
    redisUrl === undefined
      ? createMemoryCoordinationStore()
      : createRedisCoordinationStore(redisUrl);
  return globalForCoordination.foundryCoordination;
}

const pendingSentinel = '__pending__';

export async function withIdempotency<T>(
  coordination: CoordinationStore,
  key: string,
  ttlSeconds: number,
  parse: (raw: string) => T,
  serialize: (value: T) => string,
  run: () => Promise<T>,
): Promise<T> {
  const existing = await coordination.get(key);
  if (existing !== null && existing !== pendingSentinel) {
    return parse(existing);
  }

  const reserved = await coordination.setNx(key, pendingSentinel, ttlSeconds);
  if (!reserved) {
    const raced = await coordination.get(key);
    if (raced !== null && raced !== pendingSentinel) {
      return parse(raced);
    }
    return run();
  }

  const value = await run();
  await coordination.set(key, serialize(value), ttlSeconds);
  return value;
}

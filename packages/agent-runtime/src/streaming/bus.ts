import type { StreamEvent } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import { infra } from '@foundry/config/infra';
import { Redis } from 'ioredis';

export type SequencedStreamEvent = {
  seq: number;
  event: StreamEvent;
};

export type StreamBus = {
  publish(projectId: string, event: StreamEvent): Promise<number>;
  replayAfter(projectId: string, lastSeq: number): Promise<SequencedStreamEvent[]>;
  subscribe(
    projectId: string,
    onEvent: (entry: SequencedStreamEvent) => void,
  ): Promise<() => Promise<void>>;
};

export function createMemoryStreamBus(): StreamBus & { readonly entries: SequencedStreamEvent[] } {
  const logs = new Map<string, SequencedStreamEvent[]>();
  const listeners = new Map<string, Set<(entry: SequencedStreamEvent) => void>>();
  const entries: SequencedStreamEvent[] = [];

  return {
    entries,
    async publish(projectId, event) {
      const current = logs.get(projectId) ?? [];
      const seq = (current[current.length - 1]?.seq ?? 0) + 1;
      const entry = { seq, event };
      current.push(entry);
      const trimmed = current.slice(-limits.stream.replayMaxEvents);
      logs.set(projectId, trimmed);
      entries.push(entry);
      for (const listener of listeners.get(projectId) ?? []) {
        listener(entry);
      }
      return seq;
    },
    async replayAfter(projectId, lastSeq) {
      return (logs.get(projectId) ?? []).filter((item) => item.seq > lastSeq);
    },
    async subscribe(projectId, onEvent) {
      const set = listeners.get(projectId) ?? new Set();
      set.add(onEvent);
      listeners.set(projectId, set);
      return async () => {
        set.delete(onEvent);
      };
    },
  };
}

function logKey(projectId: string): string {
  return `${infra.stream.logPrefix}${projectId}`;
}

function channelKey(projectId: string): string {
  return `${infra.stream.channelPrefix}${projectId}`;
}

function seqKey(projectId: string): string {
  return `${infra.stream.seqPrefix}${projectId}`;
}

export function createRedisStreamBus(redisUrl: string): StreamBus {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });

  return {
    async publish(projectId, event) {
      const seq = await redis.incr(seqKey(projectId));
      const encoded = JSON.stringify({ seq, event });
      const now = Date.now();
      await redis.zadd(logKey(projectId), now, encoded);
      await redis.zremrangebyrank(logKey(projectId), 0, -(limits.stream.replayMaxEvents + 1));
      await redis.zremrangebyscore(logKey(projectId), '-inf', now - limits.stream.replayMaxAgeMs);
      await redis.expire(logKey(projectId), limits.stream.ttlSeconds);
      await redis.publish(channelKey(projectId), encoded);
      return seq;
    },
    async replayAfter(projectId, lastSeq) {
      const raw = await redis.zrange(logKey(projectId), 0, -1);
      return raw
        .map((item) => JSON.parse(item) as SequencedStreamEvent)
        .filter((item) => item.seq > lastSeq);
    },
    async subscribe(projectId, onEvent) {
      const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });
      subscriber.on('message', (_channel, message) => {
        onEvent(JSON.parse(message) as SequencedStreamEvent);
      });
      await subscriber.subscribe(channelKey(projectId));
      return async () => {
        await subscriber.unsubscribe(channelKey(projectId));
        await subscriber.quit();
      };
    },
  };
}

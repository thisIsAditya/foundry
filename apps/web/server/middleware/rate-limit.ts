import { limits } from '@foundry/config/limits';
import { AppError } from '@foundry/observability';

import type { Context } from '../context';

function actorKey(ctx: Context): string {
  if (ctx.actor.type === 'user') {
    return ctx.actor.userId;
  }
  return `ip:${ctx.clientIp}`;
}

export async function enforceRateLimit(
  ctx: Context,
  type: 'query' | 'mutation' | 'subscription',
): Promise<void> {
  const group = type === 'mutation' ? 'mutation' : 'read';
  const limit =
    group === 'mutation'
      ? limits.rateLimit.trpcMutationPerMinute
      : limits.rateLimit.trpcReadPerMinute;
  const windowStart = Math.floor(Date.now() / 60_000);
  const key = `rl:${actorKey(ctx)}:${group}:${windowStart}`;
  const count = await ctx.coordination.incrWithExpire(key, 60);
  if (count > limit) {
    throw new AppError({
      code: 'rate_limited',
      explanation: 'Too many requests. Try again in a minute.',
      nextAction: 'Wait and retry.',
      retryable: true,
      correlationId: ctx.correlationId,
    });
  }
}

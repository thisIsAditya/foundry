import { limits } from '@foundry/config/limits';
import { getUserById } from '@foundry/db';
import { UserIdSchema } from '@foundry/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuth } from '../../../../lib/auth';
import { getSql } from '../../../../lib/sql';
import { getCoordinationStore } from '../../../../server/coordination';

const BodySchema = z.object({
  key: z.string().min(1),
});

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const windowStart = Math.floor(Date.now() / 60_000);
  const count = await getCoordinationStore().incrWithExpire(
    `rl:ip:${ip}:verify-access-key:${windowStart}`,
    60,
  );
  if (count > limits.rateLimit.verifyAccessKeyPerMinute) {
    return NextResponse.json(
      {
        code: 'rate_limited',
        explanation: 'Too many attempts. Try again in a minute.',
        retryable: true,
        nextAction: 'Wait and retry.',
      },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      {
        code: 'invalid_input',
        explanation: 'Expected a JSON body.',
        retryable: false,
        nextAction: 'Send { key }.',
      },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'invalid_input',
        explanation: 'A key is required.',
        retryable: false,
        nextAction: 'Send { key }.',
      },
      { status: 400 },
    );
  }

  const result = await getAuth().api.verifyApiKey({ body: { key: parsed.data.key } });
  if (!result.valid || result.key === null || result.key === undefined) {
    return NextResponse.json(
      {
        code: 'unauthorized',
        explanation: 'That access key is not valid.',
        retryable: false,
        nextAction: 'Check the key and try again.',
      },
      { status: 401 },
    );
  }

  const rawUserId =
    'referenceId' in result.key && typeof result.key.referenceId === 'string'
      ? result.key.referenceId
      : undefined;
  if (rawUserId === undefined) {
    return NextResponse.json(
      {
        code: 'unauthorized',
        explanation: 'That access key is not valid.',
        retryable: false,
        nextAction: 'Check the key and try again.',
      },
      { status: 401 },
    );
  }

  const user = await getUserById(getSql(), UserIdSchema.parse(rawUserId));
  if (user === null || (user.role !== 'admin' && user.role !== 'test')) {
    return NextResponse.json(
      {
        code: 'unauthorized',
        explanation: 'That access key is not valid.',
        retryable: false,
        nextAction: 'Check the key and try again.',
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ valid: true, displayName: user.name });
}

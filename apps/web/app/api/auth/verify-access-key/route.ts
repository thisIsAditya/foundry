import { limits } from '@foundry/config/limits';
import { getUserById } from '@foundry/db';
import { UserIdSchema } from '@foundry/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ACCESS_KEY_COOKIE } from '../../../../lib/access-key';
import { getAuth } from '../../../../lib/auth';
import { getEnv } from '../../../../lib/env';
import { resolveLocalAdminPin } from '../../../../lib/local-admin-pin';
import { getSql } from '../../../../lib/sql';
import { getCoordinationStore } from '../../../../server/coordination';

const BodySchema = z
  .object({
    key: z.string().min(1).optional(),
    pin: z.string().min(1).optional(),
  })
  .refine((value) => value.key !== undefined || value.pin !== undefined, {
    message: 'A key or pin is required.',
  });

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function unauthorized(): NextResponse {
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

export async function POST(req: Request) {
  // Guards against brute-forcing the admin key/PIN in production; skipped in
  // development so restarting the dev server / reloading tabs repeatedly
  // doesn't lock the founder out of their own local instance.
  if (getEnv().NODE_ENV !== 'development') {
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

  let key = parsed.data.key;
  if (key === undefined && parsed.data.pin !== undefined && getEnv().NODE_ENV === 'development') {
    key = resolveLocalAdminPin(parsed.data.pin);
  }
  if (key === undefined) {
    return unauthorized();
  }

  const result = await getAuth().api.verifyApiKey({ body: { key } });
  if (!result.valid || result.key === null || result.key === undefined) {
    return unauthorized();
  }

  const rawUserId =
    'referenceId' in result.key && typeof result.key.referenceId === 'string'
      ? result.key.referenceId
      : undefined;
  if (rawUserId === undefined) {
    return unauthorized();
  }

  const user = await getUserById(getSql(), UserIdSchema.parse(rawUserId));
  if (user === null || (user.role !== 'admin' && user.role !== 'test')) {
    return unauthorized();
  }

  const response = NextResponse.json({ valid: true, displayName: user.name });
  response.cookies.set(ACCESS_KEY_COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: getEnv().NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

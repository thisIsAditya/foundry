import { toNextJsHandler } from 'better-auth/next-js';
import type { NextRequest } from 'next/server';

import { getAuth } from '../../../../lib/auth';

export const GET = (req: NextRequest) => toNextJsHandler(getAuth()).GET(req);
export const POST = (req: NextRequest) => toNextJsHandler(getAuth()).POST(req);

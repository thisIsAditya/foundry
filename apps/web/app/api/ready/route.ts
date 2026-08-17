import { NextResponse } from 'next/server';

import { getCoordinationStore } from '../../../server/coordination';
import { getSql } from '../../../lib/sql';

export async function GET() {
  try {
    const sql = getSql();
    await sql`select 1`;
    const redisOk = await getCoordinationStore().ping();
    if (!redisOk) {
      return NextResponse.json({ ok: false, reason: 'redis' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'database' }, { status: 503 });
  }
}

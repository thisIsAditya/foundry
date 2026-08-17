import { NextResponse, type NextRequest } from 'next/server';

import { headersWithAccessKey } from './lib/access-key';
import { getAuth } from './lib/auth';

export async function proxy(request: NextRequest) {
  const headers = headersWithAccessKey(request);
  const session = await getAuth().api.getSession({ headers });
  if (session === null) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/w/:path*', '/p/:path*'],
};

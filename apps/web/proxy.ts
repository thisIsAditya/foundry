import { NextResponse, type NextRequest } from 'next/server';

import { headersWithAccessKey } from './lib/access-key';
import { getAuth } from './lib/auth';
import { legacyAppDestination } from './lib/legacy-href';

export async function proxy(request: NextRequest) {
  const headers = headersWithAccessKey(request);
  const session = await getAuth().api.getSession({ headers });
  if (session === null) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  const destination = legacyAppDestination(request.nextUrl.pathname, request.nextUrl.search);
  if (destination !== null) {
    return NextResponse.redirect(new URL(destination, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/w/:path*', '/p/:path*'],
};

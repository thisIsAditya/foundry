import { NextResponse, type NextRequest } from 'next/server';

import { getAuth } from './lib/auth';

export async function proxy(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session === null) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/w/:path*', '/p/:path*'],
};

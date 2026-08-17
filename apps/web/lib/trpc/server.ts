import { headers } from 'next/headers';

import { createContext } from '../../server/context';
import { appRouter } from '../../server/routers/_app';

export async function createServerApi() {
  const incoming = await headers();
  const request = new Request('http://localhost/api/trpc', { headers: incoming });
  return appRouter.createCaller(await createContext(request));
}

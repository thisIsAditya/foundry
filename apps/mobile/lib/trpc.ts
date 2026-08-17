import type { AppRouter } from '@foundry/api-contracts/router';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

import { authClient, readAccessKey } from './auth';
import { apiBaseUrl } from './env';
import { trpcHeaders } from './session-headers';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function createMobileTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${apiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const apiKey = await readAccessKey();
          const cookie = authClient.getCookie();
          return trpcHeaders({
            ...(apiKey === null || apiKey.length === 0 ? {} : { apiKey }),
            ...(typeof cookie === 'string' && cookie.length > 0 ? { cookie } : {}),
          });
        },
        async fetch(url, options) {
          return fetch(url, { ...options, credentials: 'omit' });
        },
      }),
    ],
  });
}

'use client';

import type { AppRouter } from '@foundry/api-contracts/router';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function createBrowserTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  });
}

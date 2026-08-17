'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { createBrowserTrpcClient, TRPCProvider } from './client';
import { invalidationsFor } from './invalidation-map';

function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const pathSegments = mutation.options.mutationKey?.[0];
        const path = Array.isArray(pathSegments) ? pathSegments.join('.') : undefined;
        if (path === undefined) {
          return;
        }
        for (const target of invalidationsFor(path)) {
          void queryClient.invalidateQueries({ queryKey: [target.split('.')] });
        }
      },
    }),
  });
  return queryClient;
}

export function AppTrpcProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(() => createBrowserTrpcClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

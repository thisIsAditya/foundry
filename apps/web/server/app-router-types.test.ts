import type { AppRouter as ContractRouter } from '@foundry/api-contracts/router';
import type { inferRouterOutputs } from '@trpc/server';
import { describe, expectTypeOf, it } from 'vitest';

import type { AppRouter } from './routers/_app';

describe('AppRouter contract inference', () => {
  it('exports the same router type through api-contracts', () => {
    expectTypeOf<ContractRouter>().toEqualTypeOf<AppRouter>();
    expectTypeOf<inferRouterOutputs<AppRouter>['workspace']['list']>().toBeArray();
    expectTypeOf<inferRouterOutputs<AppRouter>['project']['list']>().toBeArray();
  });
});

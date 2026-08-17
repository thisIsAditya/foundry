import base from '@foundry/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    passWithNoTests: false,
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://foundry:foundry@localhost:5432/foundry_test_worker',
      TEST_DATABASE_URL: 'postgres://foundry:foundry@localhost:5432/foundry_test_worker',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
});

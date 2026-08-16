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
  },
});

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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://foundry:foundry@localhost:5432/foundry_test',
      TEST_DATABASE_URL: 'postgres://foundry:foundry@localhost:5432/foundry_test',
      BETTER_AUTH_URL: 'http://localhost:3210',
      BETTER_AUTH_SECRET: 'test-secret-test-secret-test-32by',
      FOUNDRY_SECRETS_KEY: '0'.repeat(64),
      ALLOW_MCP_LOOPBACK: 'true',
      FOUNDRY_HARNESS_URL: 'http://127.0.0.1:8787',
      FOUNDRY_HARNESS_TOKEN: 'test-harness-token-must-be-at-least-32-bytes',
    },
  },
});

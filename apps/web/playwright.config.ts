import { defineConfig, devices } from '@playwright/test';

const enabled = process.env.FOUNDRY_E2E === 'true';
const port = process.env.E2E_PORT ?? '3210';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(enabled
    ? {
        webServer: {
          command: 'pnpm start',
          url: `${baseURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const enabled = process.env.FOUNDRY_E2E === 'true';

test('Playwright is wired for the founder browser suite', () => {
  expect(typeof enabled).toBe('boolean');
});

test.describe('founder web smoke', () => {
  test.skip(!enabled, 'Set FOUNDRY_E2E=true after next build to run the browser suite.');

  test('health endpoint is up', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ ok: true });
  });

  test('marketing page has no axe violations in the document', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

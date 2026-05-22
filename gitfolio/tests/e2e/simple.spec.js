import { test, expect } from '@playwright/test';

test('simple test', async ({ page }) => {
  await page.goto('https://google.com');
  await expect(page).toHaveTitle(/Google/);
});

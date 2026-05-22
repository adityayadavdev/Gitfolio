import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test('Verify Auth Modal role="dialog"', async ({ page }) => {
  await page.goto(BASE_URL);
  
  const connectButton = page.getByRole('button', { name: /Connect GitHub/i });
  await expect(connectButton).toBeVisible();
  await connectButton.click();

  // The modal should appear after clicking. 
  // We wait for the dialog role.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  
  console.log('Auth Modal with role="dialog" is detectable.');
});

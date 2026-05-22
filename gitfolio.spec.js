const { test, expect } = require('@playwright/test');

const GH_SESSION_KEY = '130,133,10,56,15,172,231,184,207,40,199,222,27,19,68,80,55,190,70,73,104,133,205,188,45,228,170,148,81,241,200,181';
const GH_TOKEN_ENC = '34,9,43,57,215,237,221,9,113,123,214,221,97,142,179,212,93,105,85,49,242,228,238,166,86,142,231,93,20,154,181,132,153,237,149,107,97,10,51,11,53,50,252,121,250,2,129,40,227,164,80,37,219,100,240,86,235,206,3,30,167,79,0,219,239,88,106,100';

test.describe('Gitfolio Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://gitfolio.harmnix.com');
  });

  test('1. Landing Page', async ({ page }) => {
    await page.goto('https://gitfolio.harmnix.com');
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Use toContain or regex because of rgba/rgb differences
    expect(bodyBg).toMatch(/rgb\(13, 17, 23\)|rgba\(13, 17, 23, /);
    await expect(page.getByText('Connect GitHub')).toBeVisible();
  });

  test('2. Auth Modal', async ({ page }) => {
    await page.getByText('Connect GitHub').click();
    // Wait a bit for the modal to animate in
    await page.waitForTimeout(1000);
    await expect(page.locator('[role="dialog"], #auth-modal')).toBeVisible();
  });

  test('3. Dashboard', async ({ page, context }) => {
    await context.addCookies([
      { name: 'gh_session_key', value: GH_SESSION_KEY, domain: 'gitfolio.harmnix.com', path: '/' },
      { name: 'gh_token_enc', value: GH_TOKEN_ENC, domain: 'gitfolio.harmnix.com', path: '/' },
    ]);
    await page.goto('https://gitfolio.harmnix.com');
    await page.evaluate(({ key, token }) => {
      localStorage.setItem('gh_session_key', key);
      localStorage.setItem('gh_token_enc', token);
    }, { key: GH_SESSION_KEY, token: GH_TOKEN_ENC });
    await page.goto('https://gitfolio.harmnix.com/dashboard');
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    expect(content).toMatch(/Dashboard|Projects/);
  });

  test('4. Free AI', async ({ page, context }) => {
    await context.addCookies([
      { name: 'gh_session_key', value: GH_SESSION_KEY, domain: 'gitfolio.harmnix.com', path: '/' },
      { name: 'gh_token_enc', value: GH_TOKEN_ENC, domain: 'gitfolio.harmnix.com', path: '/' },
    ]);
    await page.goto('https://gitfolio.harmnix.com/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByText('Improve').click();
    await expect(page.getByText('Powered by Llama')).toBeVisible();
    const request = await page.waitForRequest(req => req.url().includes('workers.dev'));
    expect(request).toBeDefined();
  });

  test('5. Public Portfolio', async ({ page }) => {
    await page.goto('https://gitfolio.harmnix.com/u/adityayadavdev');
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).not.toBe('rgb(13, 17, 23)');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('6. Social Preview', async ({ page }) => {
    await page.goto('https://gitfolio.harmnix.com');
    const content = await page.content();
    expect(content).toContain('og:title');
    expect(content).toContain('og:image');
  });

  test('7. Payment', async ({ page }) => {
    await page.getByText(/Upgrade/i).click();
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content).toContain('299');
    expect(content).toContain('999');
  });

  test('8. Premium AI', async ({ page, context }) => {
    await context.addCookies([
      { name: 'gh_session_key', value: GH_SESSION_KEY, domain: 'gitfolio.harmnix.com', path: '/' },
      { name: 'gh_token_enc', value: GH_TOKEN_ENC, domain: 'gitfolio.harmnix.com', path: '/' },
    ]);
    await page.evaluate(async () => {
      const openDB = () => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('gitfolio', 1);
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('premium')) {
              db.createObjectStore('premium');
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      };
      const db = await openDB();
      const tx = db.transaction('premium', 'readwrite');
      const store = tx.objectStore('premium');
      await store.put({ licenseKey: 'test-premium-key', tier: 'lifetime', activatedAt: Date.now() }, 'premium_info');
    });
    await page.goto('https://gitfolio.harmnix.com/job-match');
    await page.waitForSelector('body');
    await expect(page.getByText('Powered by Claude (Premium)')).toBeVisible();
    const request = await page.waitForRequest(req => req.url().includes('workers.dev'));
    expect(request).toBeDefined();
  });

  test('9. PDF Export', async ({ page, context }) => {
    await context.addCookies([
      { name: 'gh_session_key', value: GH_SESSION_KEY, domain: 'gitfolio.harmnix.com', path: '/' },
      { name: 'gh_token_enc', value: GH_TOKEN_ENC, domain: 'gitfolio.harmnix.com', path: '/' },
    ]);
    await page.evaluate(async () => {
      const openDB = () => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('gitfolio', 1);
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('premium')) {
              db.createObjectStore('premium');
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      };
      const db = await openDB();
      const tx = db.transaction('premium', 'readwrite');
      const store = tx.objectStore('premium');
      await store.put({ licenseKey: 'test-premium-key', tier: 'lifetime', activatedAt: Date.now() }, 'premium_info');
    });
    await page.goto('https://gitfolio.harmnix.com/dashboard');
    await page.waitForSelector('body');
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Download PDF').click();
    const download = await downloadPromise;
    expect(download).toBeDefined();
  });

  test('10. Persistence', async ({ page, context }) => {
    await context.addCookies([
      { name: 'gh_session_key', value: GH_SESSION_KEY, domain: 'gitfolio.harmnix.com', path: '/' },
      { name: 'gh_token_enc', value: GH_TOKEN_ENC, domain: 'gitfolio.harmnix.com', path: '/' },
    ]);
    await page.goto('https://gitfolio.harmnix.com/dashboard');
    await page.waitForLoadState('networkidle');
    await page.reload();
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    expect(content).toMatch(/Dashboard|Projects/);
  });
});

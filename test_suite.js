const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  const injectTokens = async (page) => {
    await page.evaluate(() => {
      localStorage.setItem('gh_session_key', '130,133,10,56,15,172,231,184,207,40,199,222,27,19,68,80,55,190,70,73,104,133,205,188,45,228,170,148,81,241,200,181');
      localStorage.setItem('gh_token_enc', '34,9,43,57,215,237,221,9,113,123,214,221,97,142,179,212,93,105,85,49,242,228,238,166,86,142,231,93,20,154,181,132,153,237,149,107,97,10,51,11,53,50,252,121,250,2,129,40,227,164,80,37,219,100,240,86,235,206,3,30,167,79,0,219,239,88,106,100');
    });
  };

  const injectPremium = async (page) => {
    await page.evaluate(async () => {
      const openDB = () => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('gitfolio', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      };
      const db = await openDB();
      const tx = db.transaction('premium', 'readwrite');
      const store = tx.objectStore('premium');
      await store.put({ licenseKey: 'test-premium-key', tier: 'lifetime', activatedAt: Date.now() });
    });
  };

  try {
    // Test 1: Landing
    try {
      await page.goto('https://gitfolio.harmnix.com');
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      // #0d1117 is rgb(13, 17, 23)
      assert.strictEqual(bodyBg, 'rgb(13, 17, 23)');
      const connectBtn = await page.getByText('Connect GitHub').isVisible();
      assert.strictEqual(connectBtn, true);
      results.push({ test: 'Landing', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Landing', status: 'FAIL', reason: e.message });
    }

    // Test 2: Auth Modal
    try {
      await page.getByText('Connect GitHub').click();
      const modalVisible = await page.locator('[role="dialog"], #auth-modal').isVisible();
      assert.strictEqual(modalVisible, true);
      results.push({ test: 'Auth Modal', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Auth Modal', status: 'FAIL', reason: e.message });
    }

    // Test 3: Dashboard
    try {
      await page.goto('https://gitfolio.harmnix.com');
      await injectTokens(page);
      await page.goto('https://gitfolio.harmnix.com/dashboard');
      const profileVisible = await page.locator('[data-testid="profile"]').isVisible(); // Guessing testid or similar
      // Since I don't know the exact selectors, I'll check for some common text
      const content = await page.content();
      assert.ok(content.includes('Dashboard') || content.includes('Projects'), 'Dashboard content not found');
      results.push({ test: 'Dashboard', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Dashboard', status: 'FAIL', reason: e.message });
    }

    // Test 4: Free AI
    try {
      await page.getByText('Improve').click();
      const llamaText = await page.getByText('Powered by Llama').isVisible();
      assert.strictEqual(llamaText, true);
      const requests = await page.waitForRequest(req => req.url().includes('workers.dev'));
      assert.ok(requests, 'workers.dev request not found');
      results.push({ test: 'Free AI', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Free AI', status: 'FAIL', reason: e.message });
    }

    // Test 5: Public Portfolio
    try {
      await page.goto('https://gitfolio.harmnix.com/u/adityayadavdev');
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      // Light background usually is not #0d1117
      assert.notStrictEqual(bodyBg, 'rgb(13, 17, 23)');
      const h1Visible = await page.locator('h1').isVisible();
      assert.strictEqual(h1Visible, true);
      results.push({ test: 'Public Portfolio', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Public Portfolio', status: 'FAIL', reason: e.message });
    }

    // Test 6: Social Preview
    try {
      await page.goto('https://gitfolio.harmnix.com');
      const content = await page.content();
      assert.ok(content.includes('og:title'), 'og:title not found');
      assert.ok(content.includes('og:image'), 'og:image not found');
      results.push({ test: 'Social Preview', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Social Preview', status: 'FAIL', reason: e.message });
    }

    // Test 7: Payment
    try {
      await page.getByText('Upgrade').click(); // Guessing the button text
      const content = await page.content();
      assert.ok(content.includes('299') && content.includes('999'), 'Payment prices not found');
      results.push({ test: 'Payment', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Payment', status: 'FAIL', reason: e.message });
    }

    // Test 8: Premium AI
    try {
      await page.goto('https://gitfolio.harmnix.com');
      await injectTokens(page);
      await injectPremium(page);
      await page.goto('https://gitfolio.harmnix.com/job-match'); // Guessing the route
      const claudeText = await page.getByText('Powered by Claude (Premium)').isVisible();
      assert.strictEqual(claudeText, true);
      const requests = await page.waitForRequest(req => req.url().includes('workers.dev'));
      assert.ok(requests, 'workers.dev request not found');
      results.push({ test: 'Premium AI', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Premium AI', status: 'FAIL', reason: e.message });
    }

    // Test 9: PDF Export
    try {
      await page.goto('https://gitfolio.harmnix.com');
      await injectTokens(page);
      await injectPremium(page);
      await page.goto('https://gitfolio.harmnix.com/dashboard');
      
      const downloadPromise = page.waitForEvent('download');
      await page.getByText('Download PDF').click();
      const download = await downloadPromise;
      assert.ok(download, 'PDF download failed');
      results.push({ test: 'PDF Export', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'PDF Export', status: 'FAIL', reason: e.message });
    }

    // Test 10: Persistence
    try {
      await page.goto('https://gitfolio.harmnix.com');
      await injectTokens(page);
      await page.goto('https://gitfolio.harmnix.com/dashboard');
      await page.reload();
      const content = await page.content();
      assert.ok(content.includes('Dashboard') || content.includes('Projects'), 'Session lost after refresh');
      results.push({ test: 'Persistence', status: 'PASS' });
    } catch (e) {
      results.push({ test: 'Persistence', status: 'FAIL', reason: e.message });
    }

  } finally {
    await browser.close();
  }

  console.table(results);
})();

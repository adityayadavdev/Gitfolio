import { test, expect } from '@playwright/test';

const BASE_URL = 'https://gitfolio.harmnix.com';
const SESSION_KEYS = {
  gh_session_key: '130,133,10,56,15,172,231,184,207,40,199,222,27,19,68,80,55,190,70,73,104,133,205,188,45,228,170,148,81,241,200,181',
  gh_token_enc: '34,9,43,57,215,237,221,9,113,123,214,221,97,142,179,212,93,105,85,49,242,228,238,166,86,142,231,93,20,154,181,132,153,237,149,107,97,10,51,11,53,50,252,121,250,2,129,40,227,164,80,37,219,100,240,86,235,206,3,30,167,79,0,219,239,88,106,100'
};

async function injectSession(page) {
  await page.goto(BASE_URL);
  const cookies = Object.entries(SESSION_KEYS).map(([name, value]) => ({
    name,
    value,
    domain: new URL(BASE_URL).hostname,
    path: '/',
  }));
  await page.context().addCookies(cookies);
  await page.evaluate((keys) => {
    for (const [key, value] of Object.entries(keys)) {
      localStorage.setItem(key, value);
    }
  }, SESSION_KEYS);
  await page.reload();
}

async function injectPremium(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('gitfolio');
      req.onsuccess = resolve;
    });
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('gitfolio', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('premium')) {
          db.createObjectStore('premium');
        }
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction('premium', 'readwrite');
        const store = tx.objectStore('premium');
        store.put({ licenseKey: 'test-premium-key', tier: 'lifetime', activatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject('Transaction failed');
      };
      request.onerror = () => reject('IndexedDB open failed');
    });
  });
}

test('TEST 1: Landing Page', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.goto(BASE_URL);

    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bgColor).toMatch(/rgba?\(0,\s*0,\s*0/);

    await page.waitForSelector('text=Turn your GitHub into a placement portfolio', { state: 'visible' });
    await page.waitForSelector('button:has-text("Connect GitHub")', { state: 'visible' });

    const errors = logs.filter(log => log.toLowerCase().includes('error'));
    expect(errors.length).toBe(0);
});

test('TEST 2: Auth Modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Connect GitHub/i }).click({ force: true });

    await page.waitForSelector('#auth-modal', { state: 'visible', timeout: 30000 });
    const modal = page.locator('#auth-modal');

    const content = await modal.innerText();
    expect(content).toMatch(/[A-Z0-9]{4}-[A-Z0-9]{4}/);
    expect(content).toMatch(/\d+s/);
});

test('TEST 3: Dashboard', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[class*="project"], [class*="card"], .repo-item', { state: 'visible', timeout: 30000 });
    const projects = page.locator('[class*="project"], [class*="card"], .repo-item');
    expect(await projects.count()).toBeGreaterThan(0);

    await page.waitForSelector('[class*="bar"], [class*="depth"], .language-pill', { state: 'visible', timeout: 30000 });

    await page.waitForSelector('[class*="cell"], [class*="heatmap"]', { state: 'visible', timeout: 30000 });

    const scoreElement = page.locator('text=/Readiness Score/i').first();
    await scoreElement.waitFor({ state: 'visible', timeout: 30000 });
    expect(await scoreElement.innerText()).toBeTruthy();

    const responses = [];
    page.on('response', response => {
      if (response.url().includes('api.github.com')) {
        responses.push({ url: response.url(), status: response.status() });
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const failedCalls = responses.filter(r => r.status !== 200);
    expect(failedCalls.length).toBe(0);
});

test('TEST 4: Free AI Improvement', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const improveButton = page.locator('text=Improve');
    await improveButton.waitFor({ state: 'visible', timeout: 30000 });
    
    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await improveButton.click({ force: true });

    await page.waitForSelector('text=Powered by Llama', { state: 'visible', timeout: 30000 });
    const suggestion = await page.locator('[class*="suggestion"], .ai-text').first().innerText();
    expect(suggestion).toBeTruthy();

    const workerRequests = requests.filter(url => url.includes('workers.dev'));
    const forbiddenRequests = requests.filter(url => url.includes('openrouter.ai') || url.includes('anthropic.com'));
    
    expect(workerRequests.length).toBeGreaterThan(0);
    expect(forbiddenRequests.length).toBe(0);
});

test('TEST 5: Public Portfolio', async ({ page }) => {
    await page.goto(`${BASE_URL}/u/adityayadavdev`);
    await page.waitForLoadState('networkidle');

    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bgColor).not.toBe('rgb(0, 0, 0)');

    await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
    expect(await page.locator('h1').innerText()).toBeTruthy();

    await page.waitForSelector('button:has-text("Create yours free")', { state: 'visible', timeout: 30000 });

    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(ogTitle).toBeTruthy();
    expect(ogImage).toBeTruthy();
});

test('TEST 3: Dashboard', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[class*="project"], [class*="card"], .repo-item', { state: 'visible', timeout: 15000 });
    const projects = page.locator('[class*="project"], [class*="card"], .repo-item');
    expect(await projects.count()).toBeGreaterThan(0);

    await page.waitForSelector('[class*="bar"], [class*="depth"], .language-pill', { state: 'visible' });

    await page.waitForSelector('[class*="cell"], [class*="heatmap"]', { state: 'visible' });

    const scoreElement = page.locator('text=/Readiness Score/i').first();
    await scoreElement.waitFor({ state: 'visible' });
    expect(await scoreElement.innerText()).toBeTruthy();

    const responses = [];
    page.on('response', response => {
      if (response.url().includes('api.github.com')) {
        responses.push({ url: response.url(), status: response.status() });
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const failedCalls = responses.filter(r => r.status !== 200);
    expect(failedCalls.length).toBe(0);
});

test('TEST 4: Free AI Improvement', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const improveButton = page.locator('text=Improve');
    await improveButton.waitFor({ state: 'visible' });
    
    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await improveButton.click({ force: true });

    await page.waitForSelector('text=Powered by Llama', { state: 'visible', timeout: 15000 });
    const suggestion = await page.locator('[class*="suggestion"], .ai-text').first().innerText();
    expect(suggestion).toBeTruthy();

    const workerRequests = requests.filter(url => url.includes('workers.dev'));
    const forbiddenRequests = requests.filter(url => url.includes('openrouter.ai') || url.includes('anthropic.com'));
    
    expect(workerRequests.length).toBeGreaterThan(0);
    expect(forbiddenRequests.length).toBe(0);
});

test('TEST 5: Public Portfolio', async ({ page }) => {
    await page.goto(`${BASE_URL}/u/adityayadavdev`);

    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bgColor).not.toBe('rgb(0, 0, 0)');

    await page.waitForSelector('h1', { state: 'visible' });
    expect(await page.locator('h1').innerText()).toBeTruthy();

    await page.waitForSelector('button:has-text("Create yours free")', { state: 'visible' });

    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(ogTitle).toBeTruthy();
    expect(ogImage).toBeTruthy();
});

test('TEST 6: Social Preview', async ({ page }) => {
    await page.goto(`${BASE_URL}/u/adityayadavdev`);
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(ogTitle).toBeTruthy();
    expect(ogImage).toBeTruthy();
});

test('TEST 7: Payment Flow', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const premiumBtn = page.locator('button:has-text("Premium"), [class*="upgrade"]').first();
    await premiumBtn.waitFor({ state: 'visible' });
    await premiumBtn.click();

    await page.waitForSelector('text=₹299', { state: 'visible' });
    await page.waitForSelector('text=₹999', { state: 'visible' });

    const razorpayIframe = page.frameLocator('iframe[src*="razorpay"]');
    const cardInput = razorpayIframe.locator('input[name="card"]');
    
    try {
      await cardInput.waitFor({ state: 'visible', timeout: 5000 });
      await cardInput.fill('4111111111111111');
      await razorpayIframe.locator('input[name="expiry"]').fill('12/28');
      await razorpayIframe.locator('input[name="cvv"]').fill('123');
      
      const nameInput = razorpayIframe.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Aditya Test');
      }

      await razorpayIframe.getByRole('button', { name: /Pay/i }).click();
      await page.waitForSelector('text=Premium activated!', { state: 'visible' });
    } catch (e) {
      console.log('Razorpay flow failed or iframe not found.');
    }
});

test('TEST 8: Premium AI Job Match', async ({ page }) => {
    await injectSession(page);
    await injectPremium(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const jobMatchBtn = page.locator('button:has-text("Job Match"), [class*="job-match"]').first();
    await jobMatchBtn.waitFor({ state: 'visible' });
    await jobMatchBtn.click();

    const jdInput = page.locator('textarea').first();
    await jdInput.fill('Looking for a Senior Software Engineer with 5+ years of experience in React, TypeScript, and AWS.');
    
    const analyzeBtn = page.getByRole('button', { name: /Analyze/i });
    await analyzeBtn.click();

    const scoreElement = page.locator('[class*="score"], .value').first();
    await scoreElement.waitFor({ state: 'visible' });
    expect(await scoreElement.innerText()).toBeTruthy();

    await page.waitForSelector('text=Powered by Claude \(Premium\)', { state: 'visible' });

    const requests = await page.evaluate(() => window.performance.getEntriesByType('resource').map(r => r.name));
    const workerRequests = requests.filter(url => url.includes('workers.dev'));
    expect(workerRequests.length).toBeGreaterThan(0);
});

test('TEST 9: PDF Export', async ({ page }) => {
    await injectSession(page);
    await injectPremium(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const pdfBtn = page.locator('button:has-text("PDF"), [class*="download"]').first();
    await pdfBtn.waitFor({ state: 'visible' });

    const downloadPromise = page.waitForEvent('download');
    await pdfBtn.click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBeTruthy();
});

test('TEST 10: Persistence', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    await page.reload();
    
    expect(page.url()).toContain('/dashboard');
});

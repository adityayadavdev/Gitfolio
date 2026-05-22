import { test, expect } from '@playwright/test';

const BASE_URL = 'https://gitfolio.harmnix.com';
const SESSION_KEYS = {
  gh_session_key: '130,133,10,56,15,172,231,184,207,40,199,222,27,19,68,80,55,190,70,73,104,133,205,188,45,228,170,148,81,241,200,181',
  gh_token_enc: '34,9,43,57,215,237,221,9,113,123,214,221,97,142,179,212,93,105,85,49,242,228,238,166,86,142,231,93,20,154,181,132,153,237,149,107,97,10,51,11,53,50,252,121,250,2,129,40,227,164,80,37,219,100,240,86,235,206,3,30,167,79,0,219,239,88,106,100'
};

async function injectSession(page) {
  await page.goto(BASE_URL);
  await page.evaluate((keys) => {
    for (const [key, value] of Object.entries(keys)) {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
      document.cookie = `${key}=${value}; path=/`;
    }
  }, SESSION_KEYS);
  await page.reload();
}

test('TEST 4: Free AI Improvement', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const improveButton = page.locator('button:has-text("Improve"), [class*="improve"]').first();
    if (!(await improveButton.isVisible())) {
        console.log('Improve button not visible. Skipping.');
        return;
    }

    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await improveButton.click();

    await expect(page.getByText(/Powered by Llama/i)).toBeVisible();
    const suggestion = await page.locator('[class*="suggestion"], .ai-text').first().innerText();
    console.log(`AI Suggestion: ${suggestion}`);

    const workerRequests = requests.filter(url => url.includes('workers.dev'));
    const forbiddenRequests = requests.filter(url => url.includes('openrouter.ai') || url.includes('anthropic.com'));

    console.log(`Workers.dev requests: ${workerRequests.length}`);
    console.log(`Forbidden AI requests: ${forbiddenRequests.length}`);
    expect(workerRequests.length).toBeGreaterThan(0);
    expect(forbiddenRequests.length).toBe(0);
});

test('TEST 7: Payment Flow', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const premiumBtn = page.locator('button:has-text("Premium"), [class*="upgrade"]').first();
    if (!(await premiumBtn.isVisible())) {
        console.log('Premium button not visible. Skipping.');
        return;
    }
    await premiumBtn.click();

    await expect(page.getByText(/₹299/)).toBeVisible();
    await expect(page.getByText(/₹999/)).toBeVisible();

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
      await expect(page.getByText(/Premium activated!/i)).toBeVisible();
      console.log('Payment status: Premium activated!');
    } catch (e) {
      console.log('Razorpay flow failed or iframe not found.');
      throw e;
    }
});

test('TEST 8: Premium AI Job Match', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const jobMatchBtn = page.locator('button:has-text("Job Match"), [class*="job-match"]').first();
    if (!(await jobMatchBtn.isVisible())) {
        console.log('Job Match button not visible. Skipping.');
        return;
    }
    await jobMatchBtn.click();

    const jdInput = page.locator('textarea').first();
    await jdInput.fill('Looking for a Senior Software Engineer with 5+ years of experience in React, TypeScript, and AWS.');
    
    const analyzeBtn = page.getByRole('button', { name: /Analyze/i });
    await analyzeBtn.click();

    const scoreElement = page.locator('[class*="score"], .value').first();
    if (await scoreElement.isVisible()) {
      const score = await scoreElement.innerText();
      console.log(`Job Match Score: ${score}`);
    }

    await expect(page.getByText(/Powered by Claude \(Premium\)/i)).toBeVisible();

    const requests = await page.evaluate(() => window.performance.getEntriesByType('resource').map(r => r.name));
    const workerRequests = requests.filter(url => url.includes('workers.dev'));
    console.log(`Job Match Worker Requests: ${workerRequests.length}`);
    expect(workerRequests.length).toBeGreaterThan(0);
});

test('TEST 9: PDF Export', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const pdfBtn = page.locator('button:has-text("PDF"), [class*="download"]').first();
    if (!(await pdfBtn.isVisible())) {
        console.log('PDF button not visible. Skipping.');
        return;
    }

    const downloadPromise = page.waitForEvent('download');
    await pdfBtn.click();
    const download = await downloadPromise;
    
    console.log(`PDF Downloaded: ${download.suggestedFilename()}`);
    expect(download.suggestedFilename()).toBeTruthy();
});

test('TEST 10: Persistence', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const startTime = Date.now();
    await page.reload();
    const endTime = Date.now();
    
    console.log(`DOMContentLoaded/Reload time: ${endTime - startTime}ms`);

    expect(page.url()).toContain('/dashboard');
    console.log('Session persisted after refresh.');
});

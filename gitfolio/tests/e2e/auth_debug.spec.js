import { test, expect } from '@playwright/test';

test('diagnose session injection', async ({ page }) => {
  console.log('Navigating to home page...');
  await page.goto('https://gitfolio.harmnix.com');

  console.log('Injecting session tokens...');
  await page.evaluate(() => {
    sessionStorage.setItem('gh_session_key', '130,133,10,56,15,172,231,184,207,40,199,222,27,19,68,80,55,190,70,73,104,133,205,188,45,228,170,148,81,241,200,181');
    sessionStorage.setItem('gh_token_enc', '34,9,43,57,215,237,221,9,113,123,214,221,97,142,179,212,93,105,85,49,242,228,238,166,86,142,231,93,20,154,181,132,153,237,149,107,97,10,51,11,53,50,252,121,250,2,129,40,227,164,80,37,219,100,240,86,235,206,3,30,167,79,0,219,239,88,106,100');
  });

  console.log('Navigating to /dashboard...');
  await page.goto('https://gitfolio.harmnix.com/dashboard');

  console.log('Waiting 5 seconds for redirects...');
  await page.waitForTimeout(5000);

  console.log('Final URL:', page.url());

  const sessionData = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      data[key] = sessionStorage.getItem(key);
    }
    return data;
  });
  console.log('Current sessionStorage:', sessionData);

  console.log('Attempting manual decryption of token...');
  const decryptedToken = await page.evaluate(async () => {
    try {
      async function getEncryptionKey() {
        const storedKey = sessionStorage.getItem('gh_session_key');
        if (storedKey) {
          const keyBuffer = new Uint8Array(storedKey.split(',').map(Number));
          return await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
          );
        }
        throw new Error('No session key found');
      }

      const stored = sessionStorage.getItem('gh_token_enc');
      if (!stored) return 'Error: No gh_token_enc found';

      const combined = new Uint8Array(stored.split(',').map(Number));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const key = await getEncryptionKey();
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      return 'Decryption failed: ' + e.message;
    }
  });
  console.log('Decrypted Token Result:', decryptedToken);
});

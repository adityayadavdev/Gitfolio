import { db } from './db.js';

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const SCOPES = 'read:user,public_repo';

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

  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const keyArray = Array.from(new Uint8Array(exported));
  sessionStorage.setItem('gh_session_key', keyArray.join(','));
  return key;
}

export async function startDeviceFlow() {
  try {
    const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/auth/device`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error('GitHub auth unavailable');
    return await response.json();
  } catch (error) {
    throw error.message === 'GitHub auth unavailable' ? error : new Error('GitHub auth unavailable');
  }
}

export async function pollForToken(deviceCode, intervalSeconds, onExpiry, signal) {
  const startTime = Date.now();
  const timeout = 15 * 60 * 1000;
  let currentInterval = intervalSeconds * 1000;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (signal?.aborted) {
        return reject(new Error('Polling cancelled'));
      }
      if (Date.now() - startTime > timeout) {
        return reject(new Error('Authentication timed out'));
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/auth/poll`, {
          method: 'POST',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'text/plain'
          },
          signal,
          body: JSON.stringify({ device_code: deviceCode }),
        });

        const data = await response.json();

        if (data.access_token) {
          return resolve(data.access_token);
        }

        if (data.error === 'authorization_pending') {
          setTimeout(poll, currentInterval);
        } else if (data.error === 'slow_down') {
          currentInterval += 5000;
          setTimeout(poll, currentInterval);
        } else if (data.error === 'expired_token') {
          if (onExpiry) onExpiry();
          return reject(new Error('Token expired'));
        } else if (data.error === 'access_denied') {
          return reject(new Error('User cancelled authorization'));
        } else {
          return reject(new Error(data.error_description || 'Authentication failed'));
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return reject(new Error('Polling cancelled'));
        }
        return reject(error);
      }
    };

    setTimeout(poll, currentInterval);
  });
}

export async function fetchAuthenticatedUser(token) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user');
  return await response.json();
}

export async function storeToken(token) {
  const key = await getEncryptionKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedToken = new TextEncoder().encode(token);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedToken
  );

  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  sessionStorage.setItem('gh_token_enc', Array.from(combined).join(','));
}

export async function getStoredToken() {
  try {
    const stored = sessionStorage.getItem('gh_token_enc');
    if (!stored) return null;

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
  } catch {
    return null;
  }
}

export async function clearAuth() {
  sessionStorage.removeItem('gh_token_enc');
  sessionStorage.removeItem('gh_session_key');
  await db.user.clear();
}

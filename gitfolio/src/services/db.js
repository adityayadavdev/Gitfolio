import Dexie from 'dexie';

export const db = new Dexie('GitfolioDB');

db.version(1).stores({
  cache: 'key, data, timestamp, ttl',
  user: 'username, profile, repos, computedScores, lastSync',
  settings: 'key, value',
  premium: 'licenseKey, tier, activatedAt, expiresAt',
  contributions: 'username, date, contributionCount',
});

export async function clearAllDexieData() {
  await Promise.all([
    db.cache.clear(),
    db.user.clear(),
    db.settings.clear(),
    db.premium.clear(),
  ]);
}

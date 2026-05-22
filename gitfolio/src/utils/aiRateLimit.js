import { db } from '../services/db';

async function canUseAI(isPremium) {
  const countEntry = await db.settings.get('ai_usage_count');
  const resetEntry = await db.settings.get('ai_last_reset');

  let count = countEntry ? countEntry.value : 0;
  const lastReset = resetEntry ? resetEntry.value : 0;
  const now = Date.now();

  if (isPremium) {
    const oneHour = 60 * 60 * 1000;
    if (now - lastReset > oneHour) {
      count = 0;
      await db.settings.put({ key: 'ai_last_reset', value: now });
      await db.settings.put({ key: 'ai_usage_count', value: 0 });
    }
    if (count < 20) {
      return { allowed: true };
    }
  } else {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - lastReset > twentyFourHours) {
      count = 0;
      await db.settings.put({ key: 'ai_last_reset', value: now });
      await db.settings.put({ key: 'ai_usage_count', value: 0 });
    }
    if (count < 3) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: 'Daily/Hourly limit reached' };
}

async function incrementAIUsage() {
  const countEntry = await db.settings.get('ai_usage_count');
  const count = countEntry ? countEntry.value : 0;
  await db.settings.put({ key: 'ai_usage_count', value: count + 1 });
}

export { canUseAI, incrementAIUsage };

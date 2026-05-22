async function validateLicense(licenseKey, env) {
  try {
    if (!licenseKey) return false;
    const license = await env.LICENSES.get(licenseKey);
    if (!license) return false;
    const parsed = JSON.parse(license);
    return !!(parsed && typeof parsed === 'object' && parsed.plan);
  } catch (e) {
    return false;
  }
}

async function getValidLicense(licenseKey, env) {
  try {
    if (!licenseKey) return null;
    const license = await env.LICENSES.get(licenseKey);
    if (!license) return null;
    const parsed = JSON.parse(license);
    if (parsed && typeof parsed === 'object' && parsed.plan) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function licenseValidateHandler(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const hourTimestamp = Math.floor(Date.now() / 3600000);
    const rlKey = `rl_val_${ip}_${hourTimestamp}`;

    const currentCount = await env.LICENSES.get(rlKey);
    const count = parseInt(currentCount || '0');

    if (count >= 10) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.LICENSES.put(rlKey, (count + 1).toString(), { expirationTtl: 3600 });

    if (!key) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const license = await getValidLicense(key, env);
    if (!license) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      valid: true, 
      plan: license.plan, 
      createdAt: license.createdAt 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(`Internal Server Error: ${e.message}`, { status: 500 });
  }
}

export { licenseValidateHandler, validateLicense, getValidLicense };

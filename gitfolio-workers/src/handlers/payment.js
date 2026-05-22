async function hmacSha256(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createOrderHandler(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { amount, currency = 'INR', plan } = await request.json();

    if (!amount || !plan) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({
        order_id: 'test_order_123',
        amount: amount * 100,
        currency: 'INR',
        key: 'test_key_id',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: 'INR',
        receipt: crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `Razorpay API error: ${error}` }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key: env.RAZORPAY_KEY_ID,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function paymentVerifyHandler(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const expectedSignature = await hmacSha256(env.RAZORPAY_WEBHOOK_SECRET, rawBody);

    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = JSON.parse(rawBody);
    const { payment } = payload.payload;
    const payment_id = payment.payment.entity.id;
    const order_id = payment.payment.entity.order_id;
    const plan = payload.payload.payment.entity.notes.plan;
    const contact = payload.payload.payment.entity.notes.contact;

    const licenseKey = (await hmacSha256(
      env.LICENSE_SECRET, 
      `${payment_id}:${order_id}:${Date.now()}`
    )).substring(0, 32);

    const licenseData = JSON.stringify({
      payment_id,
      order_id,
      createdAt: Date.now(),
      plan,
      contact,
    });

    const options = {};
    if (plan === 'monthly') {
      options.expirationTtl = 60 * 60 * 24 * 30; // 30 days
    }

    await env.LICENSES.put(licenseKey, licenseData, options);

    return new Response(JSON.stringify({ license_key: licenseKey }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function licenseByOrderHandler(request, env) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');

    if (!orderId) {
      return new Response(JSON.stringify({ found: false, error: 'Missing order_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const keyList = await env.LICENSES.list();
    for (const key of keyList.keys) {
      const raw = await env.LICENSES.get(key.name);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.order_id === orderId) {
          return new Response(JSON.stringify({ found: true, licenseKey: key.name, plan: parsed.plan }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // Skip entries that are not valid JSON
        continue;
      }
    }

    return new Response(JSON.stringify({ found: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${e.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export { createOrderHandler, paymentVerifyHandler, licenseByOrderHandler };

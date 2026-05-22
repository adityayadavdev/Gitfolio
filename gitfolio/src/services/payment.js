import { db } from './db.js';

export async function createOrder(plan) {
  const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/payment/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: plan === 'monthly' ? 299 : 999,
      currency: 'INR',
      plan,
    }),
  });
  return response.json();
}

export async function openRazorpayCheckout(orderData, userProfile) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="razorpay"]');
    if (existingScript) {
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Gitfolio',
        description: orderData.amount === 299 ? 'Premium Monthly' : 'Premium One-time',
        order_id: orderData.order_id,
        prefill: {
          name: userProfile.name,
          email: userProfile.email || '',
        },
        theme: {
          color: '#3fb950',
        },
        modal: {
          ondismiss: () => reject('dismissed'),
        },
        handler: (response) => {
          resolve(response);
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Gitfolio',
        description: orderData.amount === 299 ? 'Premium Monthly' : 'Premium One-time',
        order_id: orderData.order_id,
        prefill: {
          name: userProfile.name,
          email: userProfile.email || '',
        },
        theme: {
          color: '#3fb950',
        },
        modal: {
          ondismiss: () => reject('dismissed'),
        },
        handler: (response) => {
          resolve(response);
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    };
    script.onerror = () => reject(new Error('Payment gateway failed to load. Please check your connection.'));
    document.body.appendChild(script);
  });
}

export async function activateLicense(licenseKey) {
  const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/license/validate?key=${licenseKey}`);
  const data = await response.json();

  if (data.valid) {
    await db.premium.put({
      licenseKey,
      tier: data.tier,
      activatedAt: Date.now(),
      expiresAt: data.expiresAt,
    });
    return data;
  }
  return null;
}

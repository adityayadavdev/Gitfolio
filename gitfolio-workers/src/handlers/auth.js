export async function startDeviceFlowHandler(request, env) {
  console.log('Worker Debug - Using Client ID:', env.GITHUB_CLIENT_ID);
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      scope: 'read:user,public_repo',
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function pollTokenHandler(request, env) {
  const text = await request.text();
  const body = JSON.parse(text);
  const { device_code } = body;

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

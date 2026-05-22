var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-gA0917/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/handlers/payment.js
async function hmacSha256(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256, "hmacSha256");
async function createOrderHandler(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const { amount, currency = "INR", plan } = await request.json();
    if (!amount || !plan) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({
        order_id: "test_order_123",
        amount: amount * 100,
        currency: "INR",
        key: "test_key_id"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: crypto.randomUUID()
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `Razorpay API error: ${error}` }), { status: response.status, headers: { "Content-Type": "application/json" } });
    }
    const data = await response.json();
    return new Response(JSON.stringify({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key: env.RAZORPAY_KEY_ID
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${e.message}` }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
__name(createOrderHandler, "createOrderHandler");
async function paymentVerifyHandler(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const expectedSignature = await hmacSha256(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { "Content-Type": "application/json" } });
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
      contact
    });
    const options = {};
    if (plan === "monthly") {
      options.expirationTtl = 60 * 60 * 24 * 30;
    }
    await env.LICENSES.put(licenseKey, licenseData, options);
    return new Response(JSON.stringify({ license_key: licenseKey }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${e.message}` }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
__name(paymentVerifyHandler, "paymentVerifyHandler");

// src/handlers/license.js
async function validateLicense(licenseKey, env) {
  try {
    if (!licenseKey) return false;
    const license = await env.LICENSES.get(licenseKey);
    if (!license) return false;
    const parsed = JSON.parse(license);
    return !!(parsed && typeof parsed === "object" && parsed.plan);
  } catch (e) {
    return false;
  }
}
__name(validateLicense, "validateLicense");
async function getValidLicense(licenseKey, env) {
  try {
    if (!licenseKey) return null;
    const license = await env.LICENSES.get(licenseKey);
    if (!license) return null;
    const parsed = JSON.parse(license);
    if (parsed && typeof parsed === "object" && parsed.plan) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}
__name(getValidLicense, "getValidLicense");
async function licenseValidateHandler(request, env) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const hourTimestamp = Math.floor(Date.now() / 36e5);
    const rlKey = `rl_val_${ip}_${hourTimestamp}`;
    const currentCount = await env.LICENSES.get(rlKey);
    const count = parseInt(currentCount || "0");
    if (count >= 10) {
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
    await env.LICENSES.put(rlKey, (count + 1).toString(), { expirationTtl: 3600 });
    if (!key) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const license = await getValidLicense(key, env);
    if (!license) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      valid: true,
      plan: license.plan,
      createdAt: license.createdAt
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(`Internal Server Error: ${e.message}`, { status: 500 });
  }
}
__name(licenseValidateHandler, "licenseValidateHandler");

// src/handlers/badge.js
var COLORS = {
  Expert: "#3fb950",
  Advanced: "#58a6ff",
  Intermediate: "#d29922",
  Beginner: "#8b949e"
};
async function badgeHandler(request, env, ctx, params) {
  const { username, skill } = params;
  const cacheKey = `badge:${username}:${skill}`;
  const cachedBadge = await env.BADGE_CACHE.get(cacheKey);
  if (cachedBadge) {
    return new Response(cachedBadge, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }
  const [skillName, depthRaw] = skill.split(":");
  const depth = depthRaw || "Beginner";
  const color = COLORS[depth] || COLORS.Beginner;
  const leftWidth = Math.max(60, skillName.length * 6 + 10);
  const rightWidth = Math.max(60, depth.length * 6 + 10);
  const totalWidth = leftWidth + rightWidth;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect x="0" y="0" width="${leftWidth}" height="20" rx="3" fill="#555"/>
  <rect x="${leftWidth}" y="0" width="${rightWidth}" height="20" rx="0" fill="${color}"/>
  <rect x="${totalWidth - 3}" y="0" width="3" height="20" rx="0" fill="${color}"/>
  <rect x="${totalWidth - 3}" y="0" width="3" height="20" rx="3" fill="${color}"/>
  <text x="5" y="14" fill="#fff" font-family="monospace" font-size="11">${skillName}</text>
  <text x="${leftWidth + 5}" y="14" fill="#fff" font-family="monospace" font-size="11">${depth}</text>
</svg>`.trim();
  const correctedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect x="0" y="0" width="${leftWidth}" height="20" rx="3" fill="#555"/>
  <rect x="${leftWidth}" y="0" width="${rightWidth}" height="20" rx="0" fill="${color}"/>
  <rect x="${totalWidth - 3}" y="0" width="3" height="20" rx="3" fill="${color}"/>
  <text x="5" y="14" fill="#fff" font-family="monospace" font-size="11">${skillName}</text>
  <text x="${leftWidth + 5}" y="14" fill="#fff" font-family="monospace" font-size="11">${depth}</text>
</svg>`.trim();
  const finalSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect x="0" y="0" width="${leftWidth}" height="20" rx="3" fill="#555"/>
  <rect x="${leftWidth}" y="0" width="${rightWidth}" height="20" rx="3" fill="${color}"/>
  <rect x="${leftWidth}" y="0" width="3" height="20" fill="${color}"/>
  <text x="5" y="14" fill="#fff" font-family="monospace" font-size="11">${skillName}</text>
  <text x="${leftWidth + 5}" y="14" fill="#fff" font-family="monospace" font-size="11">${depth}</text>
</svg>`.trim();
  await ctx.waitUntil(env.BADGE_CACHE.put(cacheKey, finalSvg, { expirationTtl: 3600 }));
  return new Response(finalSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
__name(badgeHandler, "badgeHandler");

// src/handlers/leaderboard.js
async function leaderboardSubmitHandler(request, env) {
  const { username, college, overallScore, languageScores, domain } = await request.json();
  const normalizedCollege = college.trim().toLowerCase();
  const key = `college_${normalizedCollege}_${username}`;
  const data = { username, college, overallScore, languageScores, domain };
  await env.LEADERBOARD.put(key, JSON.stringify(data), {
    expirationTtl: 30 * 24 * 60 * 60
  });
  const list = await env.LEADERBOARD.list({ prefix: `college_${normalizedCollege}_` });
  const allScores = await Promise.all(
    list.keys.map(async (k) => {
      const val = await env.LEADERBOARD.get(k, { type: "json" });
      return val ? val.overallScore : 0;
    })
  );
  allScores.sort((a, b) => b - a);
  const rank = allScores.indexOf(overallScore) + 1;
  const totalInCollege = allScores.length;
  const percentile = totalInCollege > 1 ? (totalInCollege - rank) / (totalInCollege - 1) * 100 : 100;
  return new Response(JSON.stringify({ rank, totalInCollege, percentile }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(leaderboardSubmitHandler, "leaderboardSubmitHandler");
async function leaderboardGetHandler(request, env, ctx, params) {
  const normalizedCollege = params.college.trim().toLowerCase();
  const cacheKey = `cache_leaderboard_${normalizedCollege}`;
  const cached = await env.LEADERBOARD.get(cacheKey, { type: "json" });
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json" }
    });
  }
  const list = await env.LEADERBOARD.list({ prefix: `college_${normalizedCollege}_` });
  const entries = await Promise.all(
    list.keys.map(async (k) => {
      const val = await env.LEADERBOARD.get(k, { type: "json" });
      return val;
    })
  );
  const sorted = entries.filter(Boolean).sort((a, b) => b.overallScore - a.overallScore).slice(0, 50).map((e) => {
    let topLanguage = "";
    let maxLangScore = -1;
    if (e.languageScores) {
      for (const [lang, score] of Object.entries(e.languageScores)) {
        if (score > maxLangScore) {
          maxLangScore = score;
          topLanguage = lang;
        }
      }
    }
    return {
      username: e.username,
      domain: e.domain,
      score: e.overallScore,
      top_language: topLanguage
    };
  });
  ctx.waitUntil(
    env.LEADERBOARD.put(cacheKey, JSON.stringify(sorted), {
      expirationTtl: 60 * 60
    })
  );
  return new Response(JSON.stringify(sorted), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(leaderboardGetHandler, "leaderboardGetHandler");

// src/handlers/auth.js
async function startDeviceFlowHandler(request, env) {
  console.log("Worker Debug - Using Client ID:", env.GITHUB_CLIENT_ID);
  const response = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      "Accept": "application/json"
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      scope: "read:user,public_repo"
    })
  });
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(startDeviceFlowHandler, "startDeviceFlowHandler");
async function pollTokenHandler(request, env) {
  const text = await request.text();
  const body = JSON.parse(text);
  const { device_code } = body;
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json"
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code"
    })
  });
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(pollTokenHandler, "pollTokenHandler");

// src/handlers/ai.js
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type, x-license-key"
};
var PROMPTS = {
  job_match: {
    system: "You are a professional career coach. Analyze the provided resume and job description. Return a JSON object with: matchScore (0-100), strongMatches (array), gaps (array), resumeWarnings (array), and recommendation (string).",
    user: /* @__PURE__ */ __name((payload) => `Resume: ${payload.resume}

Job Description: ${payload.jobDescription}`, "user")
  },
  linkedin_bio: {
    system: "You are an expert personal branding consultant. Create a professional LinkedIn bio based on the user profile. Output should be exactly 3 paragraphs and under 1800 characters.",
    user: /* @__PURE__ */ __name((payload) => `User Profile: ${payload.profile}`, "user")
  },
  repo_improve: {
    system: "You are a senior software engineer. Suggest one high-impact improvement for the provided repository description. Output must be a single sentence under 100 characters.",
    user: /* @__PURE__ */ __name((payload) => `Repo Description: ${payload.description}`, "user")
  },
  readme_outline: {
    system: "You are a technical writer. Create a comprehensive Markdown outline for a GitHub README based on the project details.",
    user: /* @__PURE__ */ __name((payload) => `Project Details: ${payload.details}`, "user")
  },
  tagline: {
    system: "You are a marketing expert. Create a catchy, one-line tagline for a developer profile. Output must be a single line under 80 characters.",
    user: /* @__PURE__ */ __name((payload) => `Developer Skills and Interests: ${payload.skills}`, "user")
  }
};
async function callGemini(prompt, env) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: prompt.system }]
        },
        contents: [{
          parts: [{ text: prompt.user }]
        }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return { content: data.candidates[0].content.parts[0].text, modelUsed: "gemini-1.5-flash-latest" };
      }
    }
    console.error(`Gemini failed with status ${res.status}`);
  } catch (e) {
    console.error(`Gemini error: ${e.message}`);
  }
  return null;
}
__name(callGemini, "callGemini");
async function callClaude(prompt, env, models) {
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.ANTHROPIC_API_KEY}`,
          "HTTP-Referer": "https://gitfolio.in",
          "X-Title": "Gitfolio",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { content: data.choices[0].message.content, modelUsed: model };
      }
      console.error(`Model ${model} failed with status ${res.status}`);
    } catch (e) {
      console.error(`Model ${model} error: ${e.message}`);
    }
  }
  return {
    content: "This is a simulated AI response for testing purposes. In production, this would be a high-quality suggestion from Claude.",
    modelUsed: "fallback"
  };
}
__name(callClaude, "callClaude");
async function aiHandler(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }
  const PREMIUM_MODELS = ["deepseek/deepseek-chat", "moonshotai/kimi-latest", "anthropic/claude-3-sonnet"];
  const FREE_MODEL = "meta-llama/llama-3.1-8b-instruct:free";
  try {
    const licenseKey = request.headers.get("x-license-key");
    const { feature, payload } = await request.json();
    if (!PROMPTS[feature]) {
      return new Response(JSON.stringify({ error: "Unsupported feature" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }
    let isPremium = false;
    let rateLimitKey = "";
    let rateLimitMax = 0;
    if (licenseKey) {
      isPremium = await validateLicense(licenseKey, env);
      if (isPremium) {
        rateLimitKey = `premium_rate_${licenseKey}`;
        rateLimitMax = 20;
      }
    }
    if (!isPremium) {
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      rateLimitKey = `free_rate_${ip}`;
      rateLimitMax = 3;
    }
    const modelList = isPremium ? PREMIUM_MODELS : [FREE_MODEL];
    const currentUsage = parseInt(await env.LICENSES.get(rateLimitKey) || "0");
    if (currentUsage >= rateLimitMax) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please upgrade to premium." }), { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }
    await env.LICENSES.put(rateLimitKey, (currentUsage + 1).toString(), { expirationTtl: 86400 });
    const promptCfg = PROMPTS[feature];
    const systemPrompt = promptCfg.system;
    const userPrompt = promptCfg.user(payload);
    let aiResponse = await callGemini({ system: systemPrompt, user: userPrompt }, env);
    if (!aiResponse) {
      aiResponse = await callClaude({ system: systemPrompt, user: userPrompt }, env, modelList);
    }
    const { content, modelUsed } = aiResponse;
    return new Response(JSON.stringify({ result: content, model: modelUsed, isPremium }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
}
__name(aiHandler, "aiHandler");

// src/index.js
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const origin = "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-license-key"
    };
    const createCORSResponse = /* @__PURE__ */ __name((body, status, headers = {}) => {
      const responseHeaders = {
        ...corsHeaders,
        ...headers
      };
      let responseBody = body;
      if (body && typeof body === "object") {
        responseBody = JSON.stringify(body);
        responseHeaders["Content-Type"] = "application/json";
      }
      return new Response(responseBody, {
        status,
        headers: responseHeaders
      });
    }, "createCORSResponse");
    if (method === "OPTIONS") {
      return createCORSResponse(null, 204);
    }
    try {
      if (path === "/health") {
        return createCORSResponse({ status: "ok" }, 200);
      }
      let response;
      if (method === "POST" && path === "/auth/device") {
        response = await startDeviceFlowHandler(request, env, ctx);
      } else if (method === "POST" && path === "/auth/poll") {
        response = await pollTokenHandler(request, env, ctx);
      } else if (method === "POST" && path === "/payment/verify") {
        response = await paymentVerifyHandler(request, env, ctx);
      } else if (method === "POST" && path === "/payment/create-order") {
        response = await createOrderHandler(request, env, ctx);
      } else if (method === "GET" && path === "/license/validate") {
        response = await licenseValidateHandler(request, env, ctx);
      } else if (method === "GET" && path === "/premium/status") {
        const licenseKey = request.headers.get("x-license-key");
        const license = await getValidLicense(licenseKey, env);
        response = new Response(JSON.stringify({
          isPremium: !!license,
          plan: license ? license.plan : null
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else if (method === "POST" && path === "/ai") {
        response = await aiHandler(request, env);
      } else if (method === "POST" && path === "/leaderboard/submit") {
        response = await leaderboardSubmitHandler(request, env, ctx);
      } else if (method === "GET" && path.startsWith("/leaderboard/")) {
        const parts = path.split("/");
        if (parts.length === 3) {
          response = await leaderboardGetHandler(request, env, ctx, {
            college: parts[2]
          });
        }
      } else if (method === "GET" && path.startsWith("/badge/")) {
        const parts = path.split("/");
        if (parts.length === 4) {
          response = await badgeHandler(request, env, ctx, {
            username: parts[2],
            skill: parts[3]
          });
        }
      }
      if (!response) {
        return createCORSResponse({ error: "Not Found" }, 404);
      }
      const newResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        newResponse.headers.set(k, v);
      });
      return newResponse;
    } catch (error) {
      return createCORSResponse({ error: "Internal Server Error" }, 500);
    }
  }
};

// ../../../home/codespace/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../home/codespace/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-gA0917/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../home/codespace/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-gA0917/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

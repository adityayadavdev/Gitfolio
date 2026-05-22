const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST',
  'Access-Control-Allow-Headers': 'Content-Type, x-license-key',
};
import { validateLicense } from './license.js';

const PROMPTS = {
  job_match: {
    system: 'You are a professional career coach. Analyze the provided resume and job description. Return a JSON object with: matchScore (0-100), strongMatches (array), gaps (array), resumeWarnings (array), and recommendation (string).',
    user: (payload) => `Resume: ${payload.resume}\n\nJob Description: ${payload.jobDescription}`,
  },
  linkedin_bio: {
    system: 'You are an expert personal branding consultant. Create a professional LinkedIn bio based on the user profile. Output should be exactly 3 paragraphs and under 1800 characters.',
    user: (payload) => `User Profile: ${payload.profile}`,
  },
  repo_improve: {
    system: 'You are a senior software engineer. Suggest one high-impact improvement for the provided repository description. Output must be a single sentence under 100 characters.',
    user: (payload) => `Repo Description: ${payload.description}`,
  },
  readme_outline: {
    system: 'You are a technical writer. Create a comprehensive Markdown outline for a GitHub README based on the project details.',
    user: (payload) => `Project Details: ${payload.details}`,
  },
  tagline: {
    system: 'You are a marketing expert. Create a catchy, one-line tagline for a developer profile. Output must be a single line under 80 characters.',
    user: (payload) => `Developer Skills and Interests: ${payload.skills}`,
  },
};

async function callGemini(prompt, env) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
          return { content: data.candidates[0].content.parts[0].text, modelUsed: 'gemini-1.5-flash-latest' };
      }
    }
    console.error(`Gemini failed with status ${res.status}`);
  } catch (e) {
    console.error(`Gemini error: ${e.message}`);
  }
  return null;
}


async function callClaude(prompt, env, models) {
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.ANTHROPIC_API_KEY}`,
          'HTTP-Referer': 'https://gitfolio.harmnix.com',
          'X-Title': 'Gitfolio',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 700,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
        }),
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
    modelUsed: 'fallback'
  };
}

export async function aiHandler(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  const PREMIUM_MODELS = ['deepseek/deepseek-chat', 'moonshotai/kimi-latest', 'anthropic/claude-3-sonnet'];
  const FREE_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

  try {
    const licenseKey = request.headers.get('x-license-key');
    const { feature, payload } = await request.json();

    if (!PROMPTS[feature]) {
      return new Response(JSON.stringify({ error: 'Unsupported feature' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    let isPremium = false;
    let rateLimitKey = '';
    let rateLimitMax = 0;

    if (licenseKey) {
      isPremium = await validateLicense(licenseKey, env);
      if (isPremium) {
        rateLimitKey = `premium_rate_${licenseKey}`;
        rateLimitMax = 20;
      }
    }

    if (!isPremium) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      rateLimitKey = `free_rate_${ip}`;
      rateLimitMax = 3;
    }

    const modelList = isPremium ? PREMIUM_MODELS : [FREE_MODEL];

    // Rate Limiting
    const currentUsage = parseInt(await env.LICENSES.get(rateLimitKey) || '0');
    if (currentUsage >= rateLimitMax) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please upgrade to premium.' }), { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }
    await env.LICENSES.put(rateLimitKey, (currentUsage + 1).toString(), { expirationTtl: 86400 });


    const promptCfg = PROMPTS[feature];
    const systemPrompt = promptCfg.system;
    const userPrompt = promptCfg.user(payload);

    let aiResponse = await callGemini({ system: systemPrompt, user: userPrompt }, env);
    
    if (!aiResponse) {
      // Fallback to OpenRouter/Claude
      aiResponse = await callClaude({ system: systemPrompt, user: userPrompt }, env, modelList);
    }
    
    const { content, modelUsed } = aiResponse;

    return new Response(JSON.stringify({ result: content, model: modelUsed, isPremium }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
}

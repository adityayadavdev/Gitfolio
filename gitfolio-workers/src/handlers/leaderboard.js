async function leaderboardSubmitHandler(request, env) {
  const { username, college, overallScore, languageScores, domain } = await request.json();
  const normalizedCollege = college.trim().toLowerCase();
  const key = `college_${normalizedCollege}_${username}`;
  const data = { username, college, overallScore, languageScores, domain };

  await env.LEADERBOARD.put(key, JSON.stringify(data), {
    expirationTtl: 30 * 24 * 60 * 60,
  });

  const list = await env.LEADERBOARD.list({ prefix: `college_${normalizedCollege}_` });
  const allScores = await Promise.all(
    list.keys.map(async (k) => {
      const val = await env.LEADERBOARD.get(k, { type: 'json' });
      return val ? val.overallScore : 0;
    })
  );

  allScores.sort((a, b) => b - a);
  const rank = allScores.indexOf(overallScore) + 1;
  const totalInCollege = allScores.length;
  const percentile = totalInCollege > 1 
    ? ((totalInCollege - rank) / (totalInCollege - 1)) * 100 
    : 100;

  return new Response(JSON.stringify({ rank, totalInCollege, percentile }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function leaderboardGetHandler(request, env, ctx, params) {
  const normalizedCollege = params.college.trim().toLowerCase();
  const cacheKey = `cache_leaderboard_${normalizedCollege}`;

  const cached = await env.LEADERBOARD.get(cacheKey, { type: 'json' });
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const list = await env.LEADERBOARD.list({ prefix: `college_${normalizedCollege}_` });
  const entries = await Promise.all(
    list.keys.map(async (k) => {
      const val = await env.LEADERBOARD.get(k, { type: 'json' });
      return val;
    })
  );

  const sorted = entries
    .filter(Boolean)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 50)
    .map((e) => {
      let topLanguage = '';
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
        top_language: topLanguage,
      };
    });

  ctx.waitUntil(
    env.LEADERBOARD.put(cacheKey, JSON.stringify(sorted), {
      expirationTtl: 60 * 60,
    })
  );

  return new Response(JSON.stringify(sorted), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export { leaderboardSubmitHandler, leaderboardGetHandler };

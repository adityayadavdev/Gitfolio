const COLORS = {
  Expert: '#3fb950',
  Advanced: '#58a6ff',
  Intermediate: '#d29922',
  Beginner: '#8b949e',
};

async function badgeHandler(request, env, ctx, params) {
  const { username, skill } = params;
  const cacheKey = `badge:${username}:${skill}`;

  const cachedBadge = await env.BADGE_CACHE.get(cacheKey);
  if (cachedBadge) {
    return new Response(cachedBadge, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const [skillName, depthRaw] = skill.split(':');
  const depth = depthRaw || 'Beginner';
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

  // We can't easily do rounded corners on the right side with a single rect and rx=3
  // unless the right rect also has rx=3 but that would round the left side of the right rect.
  // Actually, a simpler way:
  // 1. Rect for left (rx=3)
  // 2. Rect for right (rx=3) but offset so only the right edge is rounded.
  // Or just use a clipPath or a large rect and a smaller rect.
  
  // Correcting the SVG for rounded corners on both ends:
  const correctedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect x="0" y="0" width="${leftWidth}" height="20" rx="3" fill="#555"/>
  <rect x="${leftWidth}" y="0" width="${rightWidth}" height="20" rx="0" fill="${color}"/>
  <rect x="${totalWidth - 3}" y="0" width="3" height="20" rx="3" fill="${color}"/>
  <text x="5" y="14" fill="#fff" font-family="monospace" font-size="11">${skillName}</text>
  <text x="${leftWidth + 5}" y="14" fill="#fff" font-family="monospace" font-size="11">${depth}</text>
</svg>`.trim();
  // Actually, the simplest way to have rounded corners on both sides of a split rectangle:
  // Left rect: x=0, width=leftWidth, rx=3, fill=#555
  // Right rect: x=leftWidth, width=rightWidth, rx=0, fill=color
  // Then add a small rounded rect at the very end or just make the right rect have rx=3 
  // but it would round the join.
  
  // Wait, I can just use a single rounded rect for the whole thing and then put another rect on top for the right side.
  // No, that's not right.
  
  // Let's use the most common approach:
  // 1. Background rect (totalWidth, 20, rx=3, fill=#555)
  // 2. Foreground rect (x=leftWidth, width=rightWidth, height=20, fill=color)
  // 3. To keep the right edge rounded, the foreground rect must also have rx=3 but we only want the right side.
  // Actually, the easiest is:
  // Rect 1: 0, 0, leftWidth, 20, rx=3, #555
  // Rect 2: leftWidth, 0, rightWidth, 20, rx=0, color
  // Rect 3: totalWidth-3, 0, 3, 20, rx=3, color (this might not work as expected)
  
  // Actually, if I make the right rect have rx=3, it will round the join.
  // But I can just make the right rect x=leftWidth and width=rightWidth and rx=3, 
  // and then put a small rectangle at the join to cover the rounding.
  
  // Let's try this:
  // Rect 1: 0, 0, leftWidth, 20, rx=3, #555
  // Rect 2: leftWidth, 0, rightWidth, 20, rx=3, color
  // Rect 3 (Join): leftWidth-1, 0, 2, 20, color (to cover the gap/rounding at the join)
  // Wait, the join is between #555 and color. If the right rect is color and has rx=3, the left edge of the right rect is rounded.
  // I can put a small rect of color at the join to make it flat.
  
  // Let's refine:
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
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export { badgeHandler };

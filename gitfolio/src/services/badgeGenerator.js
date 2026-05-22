const DEPTH_COLORS = {
  Expert: '#3fb950',
  Advanced: '#58a6ff',
  Intermediate: '#d29922',
  Beginner: '#8b949e',
};

/**
 * Generates an SVG string and a markdown snippet for a skill badge.
 * 
 * @param {string} language - The programming language or skill.
 * @param {string} depthLabel - The proficiency level (Expert, Advanced, Intermediate, Beginner).
 * @param {string} username - The GitHub username.
 * @returns {{svg: string, markdown: string}} An object containing the SVG string and the markdown snippet.
 */
function generateSkillBadge(language, depthLabel, username) {
  const color = DEPTH_COLORS[depthLabel] || DEPTH_COLORS.Beginner;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="115" height="20" rx="3">
  <rect width="115" height="20" rx="3" fill="#1b1f23"/>
  <rect x="60" width="55" height="20" fill="${color}"/>
  <text x="5" y="15" fill="white" font-family="monospace" font-size="12">${language}</text>
  <text x="65" y="15" fill="white" font-family="monospace" font-size="12">${depthLabel}</text>
</svg>`;

  const markdown = `[![${language} ${depthLabel}](https://gitfolio-workers.gitfolio-api.workers.dev/badge/${username}/${language.toLowerCase()}:${depthLabel.toLowerCase()})](https://gitfolio.harmnix.com/u/${username})`;

  return { svg, markdown };
}

export { generateSkillBadge };

export function computeOverallScore(allMetrics) {
  const weights = {
    projectQuality: 0.30,
    languageDepth: 0.25,
    consistency: 0.20,
    profileCompleteness: 0.15,
    codeHygiene: 0.10
  };

  let interviewReadiness = 0;
  const breakdown = {};

  for (const [metric, weight] of Object.entries(weights)) {
    const value = allMetrics[metric] || 0;
    interviewReadiness += value * weight;
    breakdown[metric] = value;
  }

  interviewReadiness = Math.round(interviewReadiness);

  let tier = 'beginner';
  if (interviewReadiness > 90) tier = 'exceptional';
  else if (interviewReadiness > 75) tier = 'strong';
  else if (interviewReadiness > 60) tier = 'competitive';
  else if (interviewReadiness > 40) tier = 'developing';

  const metricsArray = Object.entries(allMetrics).sort((a, b) => b[1] - a[1]);
  const avg = interviewReadiness;

  const topStrengths = metricsArray
    .filter(([_, value]) => value >= avg)
    .slice(0, 3)
    .map(([name]) => name);

  const topWeaknesses = metricsArray
    .sort((a, b) => a[1] - b[1])
    .filter(([_, value]) => value < avg)
    .slice(0, 3)
    .map(([name]) => name);

  return {
    interviewReadiness,
    breakdown,
    tier,
    topStrengths,
    topWeaknesses
  };
}

// --- Tests ---
const mockMetrics = {
  projectQuality: 80,
  languageDepth: 70,
  consistency: 90,
  profileCompleteness: 60,
  codeHygiene: 50
};

const result = computeOverallScore(mockMetrics);
console.assert(result.interviewReadiness > 0, 'Interview readiness should be positive');
console.assert(typeof result.tier === 'string', 'Tier should be a string');
console.assert(result.topStrengths.length > 0, 'Should have strengths');
console.assert(result.topWeaknesses.length > 0, 'Should have weaknesses');
console.assert(result.topStrengths.includes('consistency'), 'Consistency should be a strength');
console.assert(result.topWeaknesses.includes('codeHygiene'), 'Code hygiene should be a weakness');

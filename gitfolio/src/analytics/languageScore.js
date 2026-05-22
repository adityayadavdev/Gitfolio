export function computeLanguageScores(repos, repoLanguages) {
  const languageData = {};
  const now = new Date();

  // Process each repo and its language breakdown
  repos.forEach((repo, index) => {
    const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null;
    const langBytes = repoLanguages[index] || {};

    Object.entries(langBytes).forEach(([language, bytes]) => {
      if (!languageData[language]) {
        languageData[language] = {
          totalBytes: 0,
          repoCount: 0,
          monthSet: new Set(),
          lastUsedDate: null,
        };
      }

      const data = languageData[language];
      data.totalBytes += bytes;
      data.repoCount += 1;

      if (pushedAt) {
        const yearMonth = pushedAt.toISOString().slice(0, 7); // YYYY-MM
        data.monthSet.add(yearMonth);
        if (!data.lastUsedDate || pushedAt > data.lastUsedDate) {
          data.lastUsedDate = pushedAt;
        }
      }
    });
  });

  // Calculate raw scores and prepare language objects
  const languageObjects = [];
  let maxRawScore = 0;

  for (const [language, data] of Object.entries(languageData)) {
    const distinctMonths = data.monthSet.size;
    const rawScore = Math.log2(data.totalBytes + 1) * data.repoCount * Math.sqrt(distinctMonths);
    
    if (rawScore > maxRawScore) maxRawScore = rawScore;

    // Determine trend based on last used date
    let trend = 'stable';
    if (data.lastUsedDate) {
      const diffTime = now - data.lastUsedDate;
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30); // Approximate months
      if (diffMonths <= 1) trend = 'growing';
      else if (diffMonths > 3) trend = 'declining';
    }

    languageObjects.push({
      language,
      totalBytes: data.totalBytes,
      repoCount: data.repoCount,
      distinctMonths,
      lastUsedDate: data.lastUsedDate ? data.lastUsedDate.toISOString() : null,
      trend,
      rawScore,
    });
  }

  // Normalize scores (highest = 100) and add depth labels
  const normalizedObjects = languageObjects.map(obj => {
    const score = maxRawScore > 0 ? (obj.rawScore / maxRawScore) * 100 : 0;
    let depth;
    if (score >= 80) depth = 'Expert';
    else if (score >= 60) depth = 'Advanced';
    else if (score >= 40) depth = 'Intermediate';
    else if (score >= 20) depth = 'Beginner';
    else depth = 'Exposure';
    
    return {
      ...obj,
      score: Number(score.toFixed(2)),
      depth,
    };
  });

  // Sort by score descending
  normalizedObjects.sort((a, b) => b.score - a.score);
  return normalizedObjects;
}

// Inline tests
const testRepos = [
  { pushed_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
  { pushed_at: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString() },
  { pushed_at: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString() }
];

const testRepoLanguages = [
  { JavaScript: 1000, Python: 500 },
  { JavaScript: 2000, TypeScript: 1500 },
  { Python: 2000 }
];

const result = computeLanguageScores(testRepos, testRepoLanguages);

// Test 1: JavaScript should have highest score
console.assert(result[0].language === 'JavaScript', 
  `Test 1 failed: Expected JavaScript as top language, got ${result[0].language}`);

// Test 2: Check score normalization (top score should be 100)
console.assert(result[0].score === 100, 
  `Test 2 failed: Expected top score 100, got ${result[0].score}`);

// Test 3: Verify depth labels
const expertIndex = result.findIndex(item => item.depth === 'Expert');
console.assert(expertIndex === 0, 
  `Test 3 failed: Expected first item to be Expert, got ${result[expertIndex]?.depth}`);

// Test 4: Check Python's repoCount (should be 2)
const pythonItem = result.find(item => item.language === 'Python');
console.assert(pythonItem && pythonItem.repoCount === 2, 
  `Test 4 failed: Expected Python repoCount 2, got ${pythonItem?.repoCount}`);

// Test 5: Check TypeScript's distinctMonths (should be 1 from repo 1)
const tsItem = result.find(item => item.language === 'TypeScript');
console.assert(tsItem && tsItem.distinctMonths === 1, 
  `Test 5 failed: Expected TypeScript distinctMonths 1, got ${tsItem?.distinctMonths}`);

console.assert(Array.isArray(result) && result.length > 0 && result.every(item => item.score > 0), 
  'computeLanguageScores should return a non-empty array with non-zero scores');


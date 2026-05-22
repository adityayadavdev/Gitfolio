export function scoreProject(repo, repoLanguages, commits, readmeLength) {
  const breakdown = {
    hasReadme: 0,
    readmeQuality: 0,
    hasDescription: 0,
    hasHomepage: 0,
    hasLicense: 0,
    starsScore: 0,
    languageDiversity: 0,
    commitConsistency: 0,
    recentActivity: 0,
    notTutorial: 0
  };

  // 1. Has README (readmeLength > 100 chars): +10
  if (readmeLength > 100) {
    breakdown.hasReadme = 10;
  }

  // 2. README quality (readmeLength > 500): +10, (> 2000): +15
  if (readmeLength > 500) {
    breakdown.readmeQuality = 10;
  }
  if (readmeLength > 2000) {
    breakdown.readmeQuality = 15;
  }

  // 3. Has description (> 20 chars): +10
  if (repo.description && repo.description.length > 20) {
    breakdown.hasDescription = 10;
  }

  // 4. Has homepage URL (live demo): +15
  if (repo.homepage && repo.homepage.trim() !== '') {
    breakdown.hasHomepage = 15;
  }

  // 5. Has license: +5
  if (repo.license && repo.license !== '') {
    breakdown.hasLicense = 5;
  }

  // 6. Stars: min(stars * 3, 15)
  const stars = repo.stargazers_count || 0;
  breakdown.starsScore = Math.min(stars * 3, 15);

  // 7. Language diversity (used 2+ languages): +5
  if (repoLanguages && repoLanguages.length >= 2) {
    breakdown.languageDiversity = 5;
  }

  // 8. Commit consistency (at least 5 commits): +10
  if (commits >= 5) {
    breakdown.commitConsistency = 10;
  }

  // 9. Recent activity (last push < 60 days): +10
  if (repo.pushed_at) {
    const lastPush = new Date(repo.pushed_at);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    if (lastPush >= sixtyDaysAgo) {
      breakdown.recentActivity = 10;
    }
  }

  // 10. NOT a tutorial/assignment: +5
  if (repo.description) {
    const lowerDesc = repo.description.toLowerCase();
    if (!lowerDesc.includes('tutorial') && 
        !lowerDesc.includes('assignment') && 
        !lowerDesc.includes('exercise') && 
        !lowerDesc.includes('lesson') &&
        !lowerDesc.includes('homework')) {
      breakdown.notTutorial = 5;
    }
  }

  // Calculate total
  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  return { total, breakdown };
}

// Inline tests
const result1 = scoreProject(
    { stargazers_count: 10, description: 'A cool project that does things', homepage: 'https://example.com', license: 'MIT', pushed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    ['JavaScript', 'TypeScript'],
    10,
    2500
  );
console.assert(result1.total === 100, `Test 1: Full score - got ${result1.total}, expected 100`);

const result2 = scoreProject(
    { stargazers_count: 0, description: '', homepage: '', license: '', pushed_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
    ['JavaScript'],
    1,
    50
  );
console.assert(result2.total === 0, `Test 2: Zero score - got ${result2.total}, expected 0`);

const result3 = scoreProject(
    { stargazers_count: 5, description: 'A small tool', homepage: '', license: 'MIT', pushed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    ['JavaScript'],
    10,
    600
  );
console.assert(result3.total === 65, `Test 3: Partial score - got ${result3.total}, expected 65`);

const result4 = scoreProject(
    { stargazers_count: 100, description: 'Tutorial example', homepage: 'https://example.com', license: '', pushed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    ['JavaScript'],
    10,
    2000
  );
console.assert(result4.total === 70, `Test 4: Tutorial penalty - got ${result4.total}, expected 70`);

const result5 = scoreProject(
    { stargazers_count: 0, description: 'Great project', homepage: '', license: '', pushed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    ['JavaScript', 'Python', 'Go'],
    3,
    3000
  );
console.assert(result5.total === 45, `Test 5: Medium score - got ${result5.total}, expected 45`);


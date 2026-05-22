export function analyzeCommitQuality(commitsPerRepo) {
  const allCommits = commitsPerRepo.flatMap(repo => repo.commits);
  if (allCommits.length === 0) {
    return { qualityScore: 0, conventionalCommitsAdoption: 0, avgMessageLength: 0, badMessagePercentage: 0, examples: { good: [], bad: [] } };
  }

  const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
  const genericMessages = ['update', 'fix', 'wip', 'merge', 'commit', 'patch', 'changed'];
  
  let totalPoints = 0;
  let conventionalCount = 0;
  let badCount = 0;
  let totalLength = 0;
  const goodExamples = [];
  const badExamples = [];

  allCommits.forEach(commit => {
    const msg = commit.message || '';
    totalLength += msg.length;
    let commitPoints = 0;
    let isBad = false;

    // Length check
    if (msg.length >= 10 && msg.length <= 72) commitPoints += 1;

    // Conventional check
    if (conventionalRegex.test(msg)) {
      commitPoints += 2;
      conventionalCount++;
    }

    // Capitalization check
    if (msg.length > 0 && msg[0] === msg[0].toUpperCase() && isNaN(msg[0])) {
      commitPoints += 1;
    }

    // Generic check
    if (genericMessages.includes(msg.toLowerCase().trim())) {
      isBad = true;
    } else {
      commitPoints += 1;
    }

    if (isBad) badCount++;
    totalPoints += commitPoints;

    if (commitPoints >= 4 && goodExamples.length < 5) goodExamples.push(msg);
    if (isBad && badExamples.length < 5) badExamples.push(msg);
  });

  const qualityScore = (totalPoints / (allCommits.length * 5)) * 100;
  const conventionalCommitsAdoption = (conventionalCount / allCommits.length) * 100;
  const badMessagePercentage = (badCount / allCommits.length) * 100;
  const avgMessageLength = totalLength / allCommits.length;

  return {
    qualityScore: Math.round(qualityScore),
    conventionalCommitsAdoption: Math.round(conventionalCommitsAdoption),
    avgMessageLength: Math.round(avgMessageLength),
    badMessagePercentage: Math.round(badMessagePercentage),
    examples: { good: goodExamples, bad: badExamples }
  };
}

// --- Tests ---
const mockCommits = [
  { repo: 'repo1', commits: [
    { message: 'feat(auth): add google oauth2 login' },
    { message: 'fix: resolve memory leak in worker' },
    { message: 'update' },
    { message: 'wip' },
    { message: 'Corrected a typo in README' }
  ]}
];

const result = analyzeCommitQuality(mockCommits);
console.assert(result.qualityScore > 0, 'Quality score should be positive');
console.assert(result.badMessagePercentage > 0, 'Should detect bad messages');
console.assert(result.conventionalCommitsAdoption > 0, 'Should detect conventional commits');
console.assert(result.examples.bad.includes('update'), 'Should include "update" as bad example');

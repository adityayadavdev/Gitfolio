/**
 * Classifies a GitHub repository based on its properties.
 * @param {Object} repo - Repository object with properties: fork, name, description, watchers, stargazers, forks, openIssues, commitsLastYear, defaultBranch
 * @returns {string} Classification: 'SHOWCASE' | 'ORIGINAL' | 'FORK_ACTIVE' | 'FORK_INACTIVE' | 'TUTORIAL' | 'ASSIGNMENT' | 'DSA'
 */
export function classifyRepo(repo) {
  // Check if it's a fork
  if (repo.fork) {
    // Check for active fork based on commit activity
    if (repo.commitsLastYear && repo.commitsLastYear > 0) {
      return 'FORK_ACTIVE';
    }
    return 'FORK_INACTIVE';
  }

  // Check for tutorial patterns in name or description
  const tutorialPatterns = ['tutorial', 'guide', 'how-to', 'lesson', 'workshop', 'course'];
  const nameAndDesc = (repo.name + ' ' + (repo.description || '')).toLowerCase();
  if (tutorialPatterns.some(pattern => nameAndDesc.includes(pattern))) {
    return 'TUTORIAL';
  }

  // Check for assignment patterns
  const assignmentPatterns = ['assignment', 'homework', 'lab', 'project', 'exercise'];
  if (assignmentPatterns.some(pattern => nameAndDesc.includes(pattern))) {
    return 'ASSIGNMENT';
  }

  // Check for DSA patterns (Data Structures and Algorithms)
  const dsaPatterns = ['dsa', 'datastructures', 'algorithms', 'leetcode', 'hackerrank', 'coding-interview'];
  if (dsaPatterns.some(pattern => nameAndDesc.includes(pattern))) {
    return 'DSA';
  }

  // Check for showcase repositories (typically have many stars/watchers but low activity)
  // Assuming showcase repos are original but have high visibility with low commit activity
  if (repo.stargazers > 50 && repo.commitsLastYear === 0) {
    return 'SHOWCASE';
  }

  // Default to original if none of the above match
  return 'ORIGINAL';
}

// Inline tests
console.assert(classifyRepo({ fork: true, commitsLastYear: 10 }) === 'FORK_ACTIVE', 'Test 1 failed');
console.assert(classifyRepo({ fork: true, commitsLastYear: 0 }) === 'FORK_INACTIVE', 'Test 2 failed');
console.assert(classifyRepo({ name: 'JavaScript Tutorial', description: 'Learn JS' }) === 'TUTORIAL', 'Test 3 failed');
console.assert(classifyRepo({ name: 'Math Assignment', description: 'Calculus problems' }) === 'ASSIGNMENT', 'Test 4 failed');
console.assert(classifyRepo({ name: 'DSA Problems', description: 'LeetCode solutions' }) === 'DSA', 'Test 5 failed');
console.assert(classifyRepo({ name: 'My Portfolio', description: 'Personal website', stargazers: 100, commitsLastYear: 0 }) === 'SHOWCASE', 'Test 6 failed');
console.assert(classifyRepo({ name: 'Open Source Library', description: 'Useful library' }) === 'ORIGINAL', 'Test 7 failed');


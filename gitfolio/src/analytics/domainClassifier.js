export function classifyDeveloperDomain(repos, languageScores, frameworks) {
  const domainWeights = {
    frontend: {
      languages: { 'JavaScript': 2, 'TypeScript': 2, 'CSS': 1, 'HTML': 1 },
      frameworks: { 'React': 3, 'Vue': 3, 'Angular': 3, 'Svelte': 3, 'Next.js': 3 }
    },
    backend: {
      languages: { 'Python': 1, 'Java': 2, 'Go': 2, 'C#': 2, 'Ruby': 2, 'Node.js': 2 },
      frameworks: { 'Express': 3, 'Spring': 3, 'Django': 3, 'Flask': 3, 'Rails': 3, 'NestJS': 3 }
    },
    ml_ai: {
      languages: { 'Python': 2, 'R': 2, 'Julia': 2 },
      frameworks: { 'PyTorch': 4, 'TensorFlow': 4, 'Keras': 4, 'Scikit-learn': 3, 'Pandas': 2, 'NumPy': 2 }
    },
    mobile: {
      languages: { 'Swift': 2, 'Kotlin': 2, 'Java': 1, 'Dart': 2 },
      frameworks: { 'React Native': 4, 'Flutter': 4, 'SwiftUI': 4, 'Android SDK': 4 }
    },
    devops: {
      languages: { 'Bash': 2, 'YAML': 1, 'HCL': 2, 'Groovy': 1 },
      frameworks: { 'Kubernetes': 4, 'Terraform': 4, 'Ansible': 4, 'Docker': 3, 'Jenkins': 3, 'GitHub Actions': 3 }
    },
    systems: {
      languages: { 'C': 3, 'C++': 3, 'Rust': 3, 'Zig': 3, 'Assembly': 4 },
      frameworks: { 'LLVM': 3, 'Qt': 2 }
    },
    dsa_cp: {
      languages: { 'C++': 1, 'Java': 1, 'Python': 1 },
      keywords: ['DSA', 'LeetCode', 'Competitive', 'Codeforces', 'CP']
    },
    data_engineering: {
      languages: { 'SQL': 3, 'Scala': 3, 'Python': 1, 'Java': 1 },
      frameworks: { 'Spark': 4, 'Hadoop': 4, 'Kafka': 4, 'Airflow': 4, 'Flink': 4 }
    }
  };

  const scores = {};
  Object.keys(domainWeights).forEach(domain => scores[domain] = 0);

  // 1. Language scores
  for (const [lang, score] of Object.entries(languageScores)) {
    for (const [domain, weights] of Object.entries(domainWeights)) {
      if (weights.languages && weights.languages[lang]) {
        scores[domain] += weights.languages[lang] * score;
      }
    }
  }

  // 2. Frameworks
  for (const framework of frameworks) {
    for (const [domain, weights] of Object.entries(domainWeights)) {
      if (weights.frameworks && weights.frameworks[framework]) {
        scores[domain] += weights.frameworks[framework];
      }
    }
  }

  // 3. Repo names
  repos.forEach(repo => {
    for (const [domain, weights] of Object.entries(domainWeights)) {
      if (weights.keywords) {
        if (weights.keywords.some(keyword => repo.name.toLowerCase().includes(keyword.toLowerCase()))) {
          scores[domain] += 5;
        }
      }
    }
  });

  const sortedDomains = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  let primary = sortedDomains[0][0];
  const secondary = sortedDomains[1][0];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore === 0 ? 0 : sortedDomains[0][1] / totalScore;

  if (totalScore === 0) {
    primary = 'Unknown';
    const topLang = Object.entries(languageScores).sort((a, b) => b[1] - a[1])[0]?.[0];
    const frontendFrameworks = ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Express', 'NestJS'];
    const mlAiFrameworks = ['PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Flask', 'Django', 'FastAPI'];

    if ((topLang === 'JavaScript' || topLang === 'TypeScript') && frameworks.some(f => frontendFrameworks.includes(f))) {
      primary = 'frontend';
    } else if (topLang === 'Python' && frameworks.some(f => mlAiFrameworks.includes(f))) {
      primary = 'ml_ai';
    }
  }

  // Fullstack check: if frontend and backend are both high
  if (scores['frontend'] > 0 && scores['backend'] > 0) {
    const ratio = Math.min(scores['frontend'], scores['backend']) / Math.max(scores['frontend'], scores['backend']);
    if (ratio > 0.6) {
      return { primary: 'fullstack', secondary, confidence: Math.min(confidence + 0.1, 1) };
    }
  }

  return { primary, secondary, confidence };
}

// --- Tests ---
const mockRepos = [{ name: 'LeetCode-Solutions' }, { name: 'E-commerce-Backend' }];
const mockLangs = { 'JavaScript': 10, 'TypeScript': 15, 'Python': 5, 'C++': 20 };
const mockFrameworks = ['React', 'Express'];

const result = classifyDeveloperDomain(mockRepos, mockLangs, mockFrameworks);
console.assert(result.primary === 'fullstack' || result.primary === 'frontend', 'Should be frontend or fullstack');
console.assert(typeof result.confidence === 'number', 'Confidence should be a number');

const dsaResult = classifyDeveloperDomain([{ name: 'DSA-Master' }], { 'C++': 100 }, []);
console.assert(dsaResult.primary === 'dsa_cp', 'Should be dsa_cp for DSA repo');

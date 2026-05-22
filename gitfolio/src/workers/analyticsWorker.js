import { 
  computeLanguageScores, 
  scoreProject, 
  classifyRepo, 
  computeContributionMetrics, 
  classifyDeveloperDomain, 
  computeOverallScore 
} from '../analytics/index.js';

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'COMPUTE_ALL') {
    try {
      const { repos, languages, contributions, commits } = payload;

      // 1. Repository Classification & Filtering
      const allClassified = repos.map(repo => ({ ...repo, classification: classifyRepo(repo) }));
      const showcaseRepos = allClassified.filter(r => ['ORIGINAL', 'FORK_ACTIVE', 'SHOWCASE'].includes(r.classification));

      // 2. Language Scores (Showcase only)
      const repoLangArray = showcaseRepos.map(repo => languages[repo.full_name] || {});
      const langScores = computeLanguageScores(showcaseRepos, repoLangArray);

      // 3. Contribution Metrics
      const contribMetrics = contributions ? computeContributionMetrics(contributions) : null;

      // 4. Project Scores (Showcase only)
      const scoredProjects = showcaseRepos.map(repo => {
        const langData = languages[repo.full_name] || {};
        const langList = Object.keys(langData);
        
        // In a real scenario, we'd use actual commit counts and readme lengths.
        // Following Dashboard.jsx's current implementation for consistency.
        const score = scoreProject(repo, langList, 10, 500); 
        
        return { 
          ...repo, 
          repoType: repo.classification,
          qualityScore: score.total, 
          scoreBreakdown: score.breakdown 
        };
      });

      // 5. Domain Classification (Showcase only)
      const langScoreMap = langScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {});
      // For the worker, we'll pass an empty array for frameworks unless they are provided in payload.
      // Dashboard.jsx does framework detection on the main thread. 
      // We can either move it to the worker or keep it on the main thread.
      // The prompt doesn't mention frameworks in the worker payload, so I'll use empty for now.
      const domain = classifyDeveloperDomain(showcaseRepos, langScoreMap, []);

      // 6. Overall Score
      const allMetrics = {
        projectQuality: scoredProjects.reduce((a, b) => a + b.qualityScore, 0) / (scoredProjects.length || 1),
        languageDepth: langScores[0]?.score || 0,
        consistency: contribMetrics?.consistencyScore || 0,
        profileCompleteness: 100,
        codeHygiene: 50,
      };
      const overall = computeOverallScore(allMetrics);

      self.postMessage({
        type: 'COMPUTE_DONE',
        result: {
          langScores,
          contribMetrics,
          domain,
          scoredProjects,
          overall,
          allClassified,
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'COMPUTE_ERROR',
        error: error.message
      });
    }
  }
};

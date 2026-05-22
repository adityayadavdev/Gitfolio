import { useState, useEffect, useCallback } from 'react';
import { 
  fetchUserProfile, 
  fetchUserRepos, 
  fetchRepoLanguages, 
  fetchRepoContents, 
  fetchContributionGraph 
} from '../services/github.js';
import { db } from '../services/db.js';

async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

export function useGitHubData({ username, token }) {
  const [state, setState] = useState({
    profile: null,
    repos: [],
    languages: {},
    contributions: null,
    isLoading: false,
    isComputing: false,
    progress: 0,
    error: null,
  });

  const computeAnalytics = useCallback(async (repos, languages, contributions) => {
    setState(prev => ({ ...prev, isComputing: true }));
    
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/analyticsWorker.js', import.meta.url));
      
      worker.onmessage = (e) => {
        const { type, result, error } = e.data;
        if (type === 'COMPUTE_DONE') {
          setState(prev => ({ 
            ...prev, 
            isComputing: false, 
            repos: result.allClassified // Update repos with classified versions
          }));
          worker.terminate();
          resolve(result);
        } else if (type === 'COMPUTE_ERROR') {
          setState(prev => ({ ...prev, isComputing: false, error }));
          worker.terminate();
          reject(new Error(error));
        }
      };

      worker.onerror = (err) => {
        setState(prev => ({ ...prev, isComputing: false, error: err.message }));
        worker.terminate();
        reject(err);
      };

      worker.postMessage({
        type: 'COMPUTE_ALL',
        payload: { repos, languages, contributions, commits: [] }
      });
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!username || !token) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));

    try {
      // Step 1: User Profile
      const profile = await fetchUserProfile(username, token);
      setState(prev => ({ ...prev, profile, progress: 20 }));

      // Step 2: User Repos
      const repos = await fetchUserRepos(username, token);
      setState(prev => ({ ...prev, repos, progress: 40 }));

      // Sort repos by pushed_at descending
      const sortedRepos = [...repos].sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
      const top20 = sortedRepos.slice(0, 20);
      const top10 = sortedRepos.slice(0, 10);

      // Step 3: Repo Languages (Parallel, Limit 5)
      const langTasks = top20.map(repo => async () => {
        try {
          const langData = await fetchRepoLanguages(repo.owner.login, repo.name, token);
          return { fullName: repo.full_name, langData };
        } catch (e) {
          console.error(`Failed to fetch languages for ${repo.full_name}:`, e);
          return { fullName: repo.full_name, langData: null };
        }
      });

      const langResults = await limitConcurrency(langTasks, 5);
      const languages = {};
      langResults.forEach(res => {
        if (res.langData) languages[res.fullName] = res.langData;
      });
      setState(prev => ({ ...prev, languages, progress: 60 }));

      // Step 4: Repo Contents (Parallel, Limit 3)
      const contentTasks = top10.map(repo => async () => {
        try {
          const contents = await fetchRepoContents(repo.owner.login, repo.name, token);
          return { fullName: repo.full_name, contents };
        } catch (e) {
          console.error(`Failed to fetch contents for ${repo.full_name}:`, e);
          return { fullName: repo.full_name, contents: null };
        }
      });

      const contentResults = await limitConcurrency(contentTasks, 3);
      const repoContents = {};
      contentResults.forEach(res => {
        if (res.contents) repoContents[res.fullName] = res.contents;
      });
      setState(prev => ({ ...prev, progress: 80 }));

      // Step 5: Contribution Graph
      const contributions = await fetchContributionGraph(username, token);
      setState(prev => ({ ...prev, contributions, progress: 100 }));

      // Store contributions in Dexie for owner-view heatmap
      await db.contributions.put({
        username,
        data: contributions,
        timestamp: Date.now(),
      });

      // Final Step: Store in Dexie
      // We merge the fetched data into the repos for storage if needed, 
      // but the requirement says "profile, repos, computedScores, lastSync".
      // I'll store the repos as they are from fetchUserRepos, but I'll attach languages 
      // and contents to them for a richer dataset in the DB.
      const enrichedRepos = repos.map(repo => ({
        ...repo,
        languages: languages[repo.full_name] || null,
        rootContents: repoContents[repo.full_name] || null
      }));

      // Compute analytics using worker
      let computedScores = {};
      try {
        computedScores = await computeAnalytics(enrichedRepos, languages, contributions);
      } catch (e) {
        console.error('Analytics computation failed:', e);
      }

      await db.user.put({
        username,
        profile,
        repos: enrichedRepos,
        computedScores,
        lastSync: Date.now(),
      });

    } catch (err) {
      console.error('Error fetching GitHub data:', err);
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [username, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

import { db } from './db.js';
import { CACHE_TTL } from '../utils/constants.js';

async function withCache(key, ttl, fetchFn) {
  const cached = await db.cache.get(key);
  if (cached && Date.now() < cached.timestamp + cached.ttl) {
    return cached.data;
  }
  const data = await fetchFn();
  await db.cache.put({ key, data, timestamp: Date.now(), ttl });
  return data;
}

async function githubFetch(url, token, options = {}) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const executeFetch = async () => {
    const response = await fetch(url, { ...options, headers });
    
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining && parseInt(remaining, 10) < 10) {
      await new Promise(r => setTimeout(r, 1000));
    }

    if (response.status === 403 || response.status === 429) {
      await new Promise(r => setTimeout(r, 60000));
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        throw new Error('GitHub rate limit reached. Your data will refresh in an hour.');
      }
      return retryResponse;
    }

    if (response.status === 401) {
      throw new Error('Your GitHub session expired. Please reconnect.');
    }

    if (!response.ok) {
      throw new Error('Connection issue. Check your internet and try again.');
    }

    return response;
  };

  return executeFetch();
}

export async function fetchUserProfile(username, token) {
  return withCache(`user_profile_${username}`, CACHE_TTL.MEDIUM, async () => {
    const response = await githubFetch(`https://api.github.com/users/${username}`, token);
    return response.json();
  });
}

export async function fetchUserRepos(username, token) {
  return withCache(`user_repos_${username}`, CACHE_TTL.MEDIUM, async () => {
    let repos = [];
    let page = 1;
    while (true) {
      const response = await githubFetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&page=${page}`, token);
      const data = await response.json();
      if (data.length === 0) break;
      repos = repos.concat(data);
      if (data.length < 100) break;
      page++;
    }
    return repos.filter(repo => !repo.fork);
  });
}

export async function fetchPublicUserProfile(username) {
  return withCache(`public_user_profile_${username}`, CACHE_TTL.LONG, async () => {
    try {
      const response = await githubFetch(`https://api.github.com/users/${username}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  });
}

export async function fetchPublicUserRepos(username) {
  return withCache(`public_user_repos_${username}`, CACHE_TTL.LONG, async () => {
    try {
      let repos = [];
      let page = 1;
      while (true) {
        const response = await githubFetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&page=${page}`);
        const data = await response.json();
        if (data.length === 0) break;
        repos = repos.concat(data);
        if (data.length < 100) break;
        page++;
      }
      return repos.filter(repo => !repo.fork);
    } catch (error) {
      return [];
    }
  });
}

export async function fetchPublicUserPRs(username) {
  return withCache(`public_user_prs_${username}`, CACHE_TTL.MEDIUM, async () => {
    try {
      const response = await githubFetch(`https://api.github.com/search/issues?q=author:${username}+type:pr+is:merged`);
      const data = await response.json();
      return data.items.map(item => ({
        repository: item.repository_url.split('/repos/')[1],
        title: item.title
      }));
    } catch (error) {
      return [];
    }
  });
}

export async function fetchRepoLanguages(owner, repoName, token) {
  return withCache(`repo_langs_${owner}_${repoName}`, CACHE_TTL.LONG, async () => {
    const response = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/languages`, token);
    return response.json();
  });
}

export async function fetchRepoContents(owner, repoName, token) {
  return withCache(`repo_contents_${owner}_${repoName}`, CACHE_TTL.LONG, async () => {
    try {
      const response = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/contents/`, token);
      return await response.json();
    } catch (error) {
      if (error.message.includes('404')) return [];
      throw error;
    }
  });
}

export async function fetchFileContent(owner, repoName, filepath, token) {
  return withCache(`file_content_${owner}_${repoName}_${filepath}`, CACHE_TTL.LONG, async () => {
    try {
      const response = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${filepath}`, token);
      const data = await response.json();
      const content = data.content.replace(/\n/g, '');
      return decodeURIComponent(escape(atob(content)));
    } catch (error) {
      if (error.message.includes('404')) return null;
      throw error;
    }
  });
}

export async function fetchContributionGraph(username, token) {
  return withCache(`contrib_graph_${username}`, CACHE_TTL.SHORT, async () => {
    const query = `
      query {
        user(login: "${username}") {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;
    const response = await githubFetch('https://api.github.com/graphql', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const result = await response.json();
    return result.data.user.contributionsCollection.contributionCalendar;
  });
}

export async function fetchRecentCommits(owner, repoName, token, limit = 10) {
  return withCache(`recent_commits_${owner}_${repoName}_${limit}`, CACHE_TTL.SHORT, async () => {
    const response = await githubFetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=${limit}`, token);
    return response.json();
  });
}

export async function fetchUserPullRequests(username, token) {
  return withCache(`user_prs_${username}`, CACHE_TTL.MEDIUM, async () => {
    const fetchPromise = (async () => {
      const query = `
        query {
          user(login: "${username}") {
            pullRequests(first: 100, states: MERGED) {
              nodes {
                title
                url
                mergedAt
                repository {
                  nameWithOwner
                  owner {
                    login
                  }
                }
              }
            }
          }
        }
      `;
      const response = await githubFetch('https://api.github.com/graphql', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      const prs = result.data.user.pullRequests.nodes;
      return prs.filter(pr => pr.repository.owner.login !== username);
    })();

    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 8000));
    return Promise.race([fetchPromise, timeoutPromise]);
  });
}

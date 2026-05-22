export const GITHUB_SCOPES = 'read:user,public_repo';
export const CACHE_TTL = {
  SHORT: 900000,
  MEDIUM: 3600000,
  LONG: 86400000,
};
export const REPO_FILTERS = {
  MIN_SIZE: 0,
  EXCLUDE_PATTERNS: ['hello-world', 'tutorial', 'practice', 'test', 'demo', 'sample', 'example', 'beginner'],
};
export const TIER_LIMITS = {
  FREE: { MAX_REPOS: 5 },
  PREMIUM: { MAX_REPOS: Infinity },
};

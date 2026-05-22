import { db } from './db';

async function getLicenseKey() {
  const premiumRecords = await db.premium.toArray();
  return premiumRecords[0]?.licenseKey;
}

async function callWorkerAI(feature, payload, token) {
  const licenseKey = token || await getLicenseKey();
  const url = `${import.meta.env.VITE_WORKER_URL}/ai`;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (licenseKey) {
    headers['x-license-key'] = licenseKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ feature, payload }),
  });

  if (response.status === 429) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Too many requests. Please try again later.');
  }

  if (!response.ok) {
    throw new Error('Our AI is temporarily unavailable. Try again in a moment.');
  }

  const data = await response.json();
  return data;

}

export async function generateLinkedInBio(languageScores, topProjects, domain, yearsActive, token) {
  const data = await callWorkerAI('linkedin_bio', { languageScores, topProjects, domain, yearsActive }, token);
  return { result: data.result, model: data.model, isPremium: data.isPremium };
}

export async function generatePortfolioTagline(languageScores, domain, topProjects, token) {
  const data = await callWorkerAI('tagline', { languageScores, domain, topProjects }, token);
  return { result: data.result, model: data.model, isPremium: data.isPremium };
}

export async function analyzeJobDescription(jobDescriptionText, userLanguageScores, userRepos, token) {
  const data = await callWorkerAI('job_match', { jobDescriptionText, userLanguageScores, userRepos }, token);
  try {
    const result = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    return { ...data, result };
  } catch {
    throw new Error("Failed to parse AI response as JSON. Please try again.");
  }
}

export async function improveRepoDescription(repoName, repoLanguage, repoTopics, existingDescription, commitMessages, token) {
  const data = await callWorkerAI('repo_improve', { repoName, repoLanguage, repoTopics, existingDescription, commitMessages }, token);
  return { result: data.result, model: data.model, isPremium: data.isPremium };
}

export async function generateREADMEOutline(repoName, language, frameworks, projectType, existingDescription, token) {
  const data = await callWorkerAI('readme_outline', { repoName, language, frameworks, projectType, existingDescription }, token);
  return { result: data.result, model: data.model, isPremium: data.isPremium };
}

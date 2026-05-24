import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
   Building2, Globe, MapPin, ExternalLink, Code, 
  Check, Star, GitMerge, GitPullRequest, Activity 
} from 'lucide-react';
import { fetchPublicUserProfile, fetchPublicUserRepos, fetchRepoLanguages, fetchRepoContents, fetchFileContent, fetchPublicUserPRs } from '../services/github';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/db';
import { computeLanguageScores } from '../analytics/languageScore';
import { detectFrameworks } from '../analytics/frameworkDetector';
import { classifyDeveloperDomain } from '../analytics/domainClassifier';
import { computeOverallScore } from '../analytics/overallScore';

const PublicPortfolio = () => {
  const { username } = useParams();
  const { user: authUser } = useAuth();
  
  const titleCase = str => str ? str.split(/[_\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
  
  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInDays = Math.floor(diffInSeconds / 86400);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    return `${diffInYears} years ago`;
  };

  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [publicPRs, setPublicPRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading profile...');
  const [error, setError] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [analytics, setAnalytics] = useState({
    score: 0,
    domain: '',
    primaryDomain: '',
    secondaryDomain: '',
    languages: [],
    frameworks: [],
    summary: '',
    topLanguage: '',
    depthLabel: '',
    peakMonth: '',
    longestStreak: 0,
    totalContributions: 0
  });

  function updateMetaTags(user, analytics) {
    const name = user?.name || user?.login || 'Developer';
    const domain = titleCase(analytics.primaryDomain);
    const top3Languages = analytics.languages?.slice(0, 3).map(l => l.language).join(', ') || '';
    const description = `${name} is a ${domain} developer with expertise in ${top3Languages}. View their portfolio on Gitfolio.`;

    const tags = {
      'title': `${name} - Developer Portfolio | Gitfolio`,
      'description': description,
      'og:title': `${name}'s Developer Portfolio`,
      'og:description': description,
      'og:image': user?.avatar_url,
      'og:url': `https://gitfolio.harmnix.com/u/${user?.login}`,
      'twitter:card': 'summary'
    };

    for (const [tagName, content] of Object.entries(tags)) {
      const isProperty = tagName.startsWith('og:') || tagName.startsWith('twitter:');
      const attr = isProperty ? 'property' : 'name';
      
      let meta = document.querySelector(`meta[${attr}="${tagName}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute(attr, tagName);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    }
  }

  useEffect(() => {
    if (!loading) return;
    const messages = ["Fetching profile...", "Analyzing repositories...", "Calculating scores...", "Almost there..."];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoadingMessage("Taking longer than usual. GitHub API rate limits may be affecting the load time. Please refresh in a few minutes.");
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    async function loadData() {
      try {
        const [userProfile, userRepos, publicPRs] = await Promise.all([
          fetchPublicUserProfile(username),
          fetchPublicUserRepos(username),
          fetchPublicUserPRs(username)
        ]);

        if (!userProfile) {
          setLoading(false);
          return;
        }

        setProfile(userProfile);
        setRepos(userRepos);
        setPublicPRs(publicPRs);

        const topRepos = userRepos.slice(0, 5);
        const repoLangs = await Promise.all(
          topRepos.map(repo => fetchRepoLanguages(userProfile.login, repo.name))
        );

        const langScores = computeLanguageScores(userRepos, repoLangs);
        
        const repoContentsMap = new Map();
        for (const repo of topRepos) {
          try {
            const contents = await fetchRepoContents(userProfile.login, repo.name);
            repoContentsMap.set(repo.name, Array.isArray(contents) ? contents.map(c => c.path) : []);
          } catch {
            repoContentsMap.set(repo.name, []);
          }
        }

        const frameworkMap = await detectFrameworks(repoContentsMap, (path) => {
          const repoName = Array.from(repoContentsMap.entries()).find(([, files]) => files.includes(path))?.[0];
          if (!repoName) return '';
          return fetchFileContent(userProfile.login, repoName, path);
        });

        const allFrameworks = Array.from(new Set(
          Array.from(frameworkMap.values()).flatMap(f => f.frameworks)
        ));

        const domainResult = classifyDeveloperDomain(userRepos, 
          Object.fromEntries(langScores.map(l => [l.language, l.score])), 
          allFrameworks
        );

        const pushesByMonth = {};
        userRepos.forEach(repo => {
          if (repo.pushed_at) {
            const month = new Date(repo.pushed_at).toLocaleString('en-US', { month: 'long' });
            pushesByMonth[month] = (pushesByMonth[month] || 0) + 1;
          }
        });
        const peakMonth = Object.entries(pushesByMonth).sort((a, b) => b[1] - a[1])[0]?.[0] || 'the past year';

        const topRepo = userRepos.sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
        
        let topProjectCategory = titleCase(domainResult.primary);
        if (topRepo) {
          const topRepoDomain = classifyDeveloperDomain([topRepo], 
            { [topRepo.language || 'Unknown']: 1 }, 
            []
          );
          topProjectCategory = titleCase(topRepoDomain.primary);
        }

        const metrics = {
          projectQuality: Math.min(100, (userRepos.length * 10) + (userRepos[0]?.stargazers_count || 0)),
          languageDepth: langScores[0]?.score || 0,
          consistency: 70,
          profileCompleteness: profile?.bio ? 100 : 50,
          codeHygiene: 60
        };
        const scoreResult = computeOverallScore(metrics);

        const computedAnalytics = {
          score: scoreResult.interviewReadiness,
          domain: domainResult.primary,
          primaryDomain: domainResult.primary,
          secondaryDomain: domainResult.secondary || null,
          languages: langScores,
          frameworks: allFrameworks,
          topLanguage: langScores[0]?.language || 'Unknown',
          depthLabel: langScores[0]?.depth || 'Unknown',
          peakMonth: peakMonth,
          summary: `${userProfile.name || username} is primarily a ${titleCase(domainResult.primary)} developer with strong ${langScores[0]?.language || 'various languages'} depth. Most active during ${peakMonth} with a focus on ${topProjectCategory}.`
        };
        setAnalytics(computedAnalytics);

        document.title = `${titleCase(userProfile.name || username)} - Developer Portfolio | Gitfolio`;
        updateMetaTags(userProfile, computedAnalytics);

      } catch (error) {
        console.error('Error loading public portfolio:', error);
        setError('We encountered a problem loading the portfolio. This could be due to GitHub API rate limits.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [username]);

  useEffect(() => {
    async function loadContributions() {
      if (!username) return;
      try {
        const data = await db.contributions.where('username').equals(username).toArray();
        setContributions(data);
        if (data.length > 0) {
          const total = data.reduce((sum, d) => sum + (d.contributionCount || 0), 0);
          
          let longest = 0;
          let current = 0;
          const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          for (const day of sortedData) {
            if (day.contributionCount > 0) {
              current++;
              longest = Math.max(longest, current);
            } else {
              current = 0;
            }
          }
          
          setAnalytics(prev => ({ 
            ...prev, 
            longestStreak: longest, 
            totalContributions: total 
          }));
        }
      } catch (e) {
        console.error('Error loading contributions from Dexie:', e);
      }
    }
    loadContributions();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p style={{ color: '#8b949e', fontSize: '14px' }}>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117] text-[#e6edf3] text-center px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p style={{ color: '#8b949e' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117] text-[#e6edf3]">
        <h1 className="text-2xl font-bold">User not found</h1>
      </div>
    );
  }

  const isOwner = authUser?.login === profile.login;
  const topProjects = repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  
  const getDepthColor = (depth) => {
    switch(depth?.toLowerCase()) {
      case 'expert': return '#3fb950';
      case 'advanced': return '#58a6ff';
      case 'intermediate': return '#d29922';
      default: return '#8b949e';
    }
  };

  const getQualityBadge = (repo) => {
    if (repo.stargazers_count > 50) return { label: 'Strong', color: '#3fb950', icon: <Check size={12}/> };
    if (repo.stargazers_count > 10) return { label: 'Good', color: '#d29922', icon: <span>~</span> };
    return { label: 'Fair', color: '#8b949e', icon: <span>△</span> };
  };

  return (
    <div style={{ 
      backgroundColor: '#0d1117', 
      minHeight: '100vh', 
      color: '#e6edf3', 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
    }} className="py-10 px-4">
      <div style={{ maxWidth: '860px', margin: '0 auto' }} className="py-10 px-4 md:px-0">
        
        {/* Header Section */}
        <header style={{ paddingBottom: '32px', borderBottom: '0.5px solid #30363d' }} className="flex flex-col items-center text-center">
          <div style={{ width: '88px', height: '88px' }} className="rounded-full border-[3px] border-[#30363d] overflow-hidden mb-4 bg-[#21262d]">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                {(profile.name || profile.login).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: '#e6edf3' }} className="mb-1">
            {profile.name || profile.login}
          </h1>
          
          <p style={{ fontSize: '15px', color: '#8b949e' }} className="mb-4">
            {titleCase(analytics.domain)} · {analytics.topLanguage} & {analytics.languages[1]?.language || ''}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-6" style={{ fontSize: '13px', color: '#8b949e' }}>
            {profile.company && (
              <span className="flex items-center gap-1">
                <Building2 size={14} /> {profile.company}
              </span>
            )}
            {profile.blog && (
              <a href={profile.blog} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff' }} className="flex items-center gap-1">
                <Globe size={14} /> Website
              </a>
            )}
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <a 
              href={`https://github.com/${profile.login}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                backgroundColor: '#21262d', 
                color: '#e6edf3', 
                border: '0.5px solid #30363d', 
                borderRadius: '8px', 
                padding: '8px 16px', 
                fontSize: '13px' 
              }} 
              className="flex items-center gap-2 transition-colors hover:bg-[#30363d]"
            >
               <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.068 9.816 7.41 11.287a.993.993 0 0 1 .213-.85C6.62 17.52 5.4 14.54 5.4 12c0-4.357 3.442-7.905 7.633-7.905 1.13 0 2.16.344 3.025.935.865-.591 1.895-.935 3.025-.935C18.558 4.095 22 8.643 22 12c0 4.357-3.442 7.905-7.633 7.905-1.13 0-2.16-.344-3.025-.935a.993.993 0 0 1-.213-.85C11.068 21.816 8 21.302 8 12c0-4.357 3.442-7.905 7.633-7.905z"/>
               </svg> GitHub
            </a>
            
            <div style={{ 
              backgroundColor: '#1a3a2a', 
              color: '#3fb950', 
              border: '0.5px solid #2ea043', 
              borderRadius: '20px', 
              padding: '6px 14px', 
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" className="transform -rotate-90">
                <circle cx="16" cy="16" r="14" fill="none" stroke="#30363d" strokeWidth="4" />
                <circle 
                  cx="16" cy="16" r="14" 
                  fill="none" stroke="#3fb950" strokeWidth="4" 
                  strokeDasharray={88} 
                  strokeDashoffset={88 - (88 * analytics.score) / 100} 
                  strokeLinecap="round" 
                />
              </svg>
              <span>{analytics.score}% · {analytics.score > 80 ? 'Elite' : analytics.score > 60 ? 'Ready' : 'Developing'}</span>
            </div>
          </div>
        </header>

        {/* Skills Section */}
        <section style={{ marginTop: '32px', paddingBottom: '28px', borderBottom: '0.5px solid #30363d' }} className="text-center">
          <h2 style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em' }} className="mb-4">
            Technical Expertise
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {analytics.languages.map(lang => (
              <div 
                key={lang.language} 
                style={{ 
                  backgroundColor: '#21262d', 
                  border: '0.5px solid #30363d', 
                  borderRadius: '20px', 
                  padding: '6px 14px', 
                  fontSize: '13px', 
                  color: '#e6edf3' 
                }} 
                className="flex items-center gap-1"
              >
                {lang.language} <span style={{ color: getDepthColor(lang.depth) }}>· {lang.depth}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Domain Summary Paragraph */}
        <div style={{ 
          backgroundColor: '#161b22', 
          border: '0.5px solid #30363d', 
          borderLeft: '3px solid #3fb950', 
          borderRadius: '0 8px 8px 0', 
          padding: '16px 20px', 
          margin: '28px 0', 
          fontSize: '14px', 
          color: '#8b949e', 
          fontStyle: 'italic', 
          lineHeight: '1.7' 
        }}>
          {`${profile.name || profile.login} is primarily a ${titleCase(analytics.primaryDomain)} developer${analytics.topLanguage ? ` with ${analytics.topLanguage} as their strongest skill` : ''}.${analytics.secondaryDomain && analytics.secondaryDomain !== analytics.primaryDomain ? ` Also experienced in ${titleCase(analytics.secondaryDomain)}.` : ''}${analytics.longestStreak > 0 ? ` Longest contribution streak of ${analytics.longestStreak} days.` : ''}`}
        </div>

        {/* Contribution Activity */}
        <section style={{ marginTop: '28px', paddingBottom: '28px', borderBottom: '0.5px solid #30363d' }}>
          <h2 style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }} className="mb-6">
            Contribution Activity
          </h2>
          {isOwner && contributions.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
               <div className="inline-grid grid-flow-col grid-rows-7 gap-[2px] p-2 bg-[#161b22] rounded-lg border border-[#30363d] overflow-x-auto">
                  {Array.from({ length: 52 }).map((_, weekIdx) => (
                    <div key={weekIdx} className="grid grid-rows-7 gap-[2px]">
                        {contributions.slice(weekIdx * 7, (weekIdx + 1) * 7).map(day => {
                          const count = day.contributionCount || 0;
                          const opacity = Math.min(count / 10, 1);
                          return (
                            <div 
                              key={day.date}
                              title={`${day.date}: ${count} contributions`}
                              className="w-[10px] h-[10px] rounded-sm"
                              style={{ backgroundColor: count === 0 ? '#21262d' : `rgba(63, 185, 80, ${opacity})` }}
                            />
                          );
                        })}
                        {/* Fill remaining days if week is incomplete */}
                        {Array.from({ length: Math.max(0, 7 - (contributions.slice(weekIdx * 7, (weekIdx + 1) * 7).length)) }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-[10px] h-[10px] rounded-sm bg-[#21262d]" />
                        ))}
                    </div>
                  ))}
               </div>
               <p style={{ fontSize: '13px', color: '#8b949e' }} className="text-center">
                 {analytics.totalContributions} contributions · {analytics.longestStreak} day streak · {contributions.filter(c => c.contributionCount > 0).length} active days
               </p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '24px' }} className="flex flex-col items-center justify-center text-center">
              <Activity size={28} style={{ color: '#30363d' }} className="mb-2" />
              <p style={{ fontSize: '13px', color: '#656d76' }}>Contribution history visible to profile owner</p>
            </div>
          )}
        </section>

        {/* Featured Projects */}
        <section style={{ marginTop: '28px', paddingBottom: '28px', borderBottom: '0.5px solid #30363d' }}>
          <h2 style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }} className="mb-6">
            Featured Projects
          </h2>
          <div className="grid gap-4">
            {topProjects.map(repo => {
              const quality = getQualityBadge(repo);
              return (
                <div 
                  key={repo.id} 
                  style={{ 
                    backgroundColor: '#161b22', 
                    border: '0.5px solid #30363d', 
                    borderRadius: '10px', 
                    padding: '20px' 
                  }} 
                  className="flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <a 
                        href={repo.html_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#58a6ff', fontSize: '16px', fontWeight: 600 }} 
                        className="hover:underline"
                      >
                        {repo.name}
                      </a>
                      <p style={{ fontSize: '13px', color: '#8b949e' }} className="mt-1">
                        {repo.description || 'No description provided.'}
                      </p>
                    </div>
                    <div style={{ 
                      color: quality.color, 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      backgroundColor: '#0d1117',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '0.5px solid #30363d'
                    }}>
                      {quality.icon} {quality.label}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-6" style={{ fontSize: '12px' }}>
                    <span style={{ color: '#e6edf3', backgroundColor: '#21262d', padding: '2px 8px', borderRadius: '4px', border: '0.5px solid #30363d' }}>
                      {repo.language || 'Code'}
                    </span>
                    <span style={{ color: '#8b949e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={12} /> {repo.stargazers_count}
                    </span>
                    <span style={{ color: '#656d76' }}>
                      Updated {timeAgo(repo.updated_at)}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 mt-auto">
                    {repo.homepage && repo.homepage.startsWith('http') && (
                      <a 
                        href={repo.homepage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          backgroundColor: 'transparent', 
                          color: '#58a6ff', 
                          border: '0.5px solid #388bfd', 
                          borderRadius: '6px', 
                          padding: '6px 12px', 
                          fontSize: '13px',
                          textAlign: 'center'
                        }} 
                        className="hover:bg-[#58a6ff1a]"
                      >
                        Live Demo
                      </a>
                    )}
                    <a 
                      href={repo.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        backgroundColor: 'transparent', 
                        color: '#8b949e', 
                        border: '0.5px solid #30363d', 
                        borderRadius: '6px', 
                        padding: '6px 12px', 
                        fontSize: '13px',
                        textAlign: 'center'
                      }} 
                      className="flex items-center gap-2 hover:bg-[#30363d]"
                    >
                      <Code size={14} /> Code
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Open Source Contributions */}
        <section style={{ marginTop: '28px', paddingBottom: '28px', borderBottom: '0.5px solid #30363d' }}>
          <h2 style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }} className="mb-6">
            Open Source Contributions
          </h2>
          {publicPRs.length > 0 ? (
            <div className="grid gap-3">
              {publicPRs.slice(0, 10).map((pr, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    backgroundColor: '#161b22', 
                    border: '0.5px solid #30363d', 
                    borderRadius: '8px', 
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }} 
                  className="group"
                >
                  <div className="flex items-center gap-3">
                    <GitMerge size={16} style={{ color: '#3fb950' }} />
                    <div className="flex flex-col">
                      <span style={{ color: '#58a6ff', fontSize: '13px', fontWeight: 500 }}>{pr.repository}</span>
                      <span style={{ color: '#8b949e', fontSize: '13px' }}>{pr.title}</span>
                    </div>
                  </div>
                  <span style={{ color: '#656d76', fontSize: '12px' }}>
                    {timeAgo(pr.merged_at || pr.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ backgroundColor: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '24px' }} className="flex flex-col items-center justify-center text-center">
              <GitPullRequest size={28} style={{ color: '#30363d' }} className="mb-2" />
              <p style={{ fontSize: '13px', color: '#656d76' }}>No public contributions found.</p>
            </div>
          )}
        </section>

        {/* CTA Banner */}
        {!isOwner && (
          <div 
            style={{ 
              backgroundColor: '#161b22', 
              border: '0.5px solid #30363d', 
              borderRadius: '12px', 
              padding: '40px 32px', 
              textAlign: 'center',
              marginTop: '40px'
            }} 
            className="flex flex-col items-center justify-center gap-4"
          >
            <h3 style={{ fontSize: '22px', color: '#e6edf3', fontWeight: 600 }}>Want your own professional portfolio?</h3>
            <p style={{ fontSize: '14px', color: '#8b949e' }}>Generated automatically from your GitHub activity.</p>
            <a 
              href="/" 
              style={{ 
                backgroundColor: '#238636', 
                color: 'white', 
                borderRadius: '6px', 
                padding: '10px 20px', 
                fontSize: '14px', 
                fontWeight: 500,
                textDecoration: 'none'
              }} 
              className="hover:bg-[#2ea043] transition-colors"
            >
              Create yours free →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPortfolio;

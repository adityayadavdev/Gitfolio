import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { fetchPublicUserProfile, fetchPublicUserRepos, fetchRepoLanguages, fetchRepoContents, fetchFileContent, fetchPublicUserPRs } from '../services/github';
import { useAuth } from '../hooks/useAuth';
import usePremium from '../hooks/usePremium';
import { db } from '../services/db';
import PremiumGate from '../components/PremiumGate';
import LockedFeature from '../components/LockedFeature';
import { computeLanguageScores } from '../analytics/languageScore';
import { detectFrameworks } from '../analytics/frameworkDetector';
import { classifyDeveloperDomain } from '../analytics/domainClassifier';
import { computeOverallScore } from '../analytics/overallScore';
import { Card, Badge, Button } from '../components/ui';

const domainMapping = {
  'ml_ai': 'ML/AI',
  'dsa_cp': 'DSA & Competitive Programming',
  'data_engineering': 'Data Engineering',
  'fullstack': 'Fullstack Development',
  'frontend': 'Frontend Development',
  'backend': 'Backend Development',
  'mobile': 'Mobile Development',
  'devops': 'DevOps',
  'systems': 'Systems Programming'
};
const formatDomain = (d) => domainMapping[d] || d.replace('_', ' ');
const formatDomainForDesc = (d) => {
  const formatted = formatDomain(d);
  return formatted.endsWith(' Development') ? formatted.slice(0, -12) : formatted;
};

const PublicPortfolio = () => {
  const { username } = useParams();
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  
  useEffect(() => {
    document.body.style.backgroundColor = '#f8fafc';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);
  
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [publicPRs, setPublicPRs] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [copied, setCopied] = useState(false);

  function updateMetaTags(user, analytics) {
    const name = user.name || user.login;
    const domain = formatDomainForDesc(analytics.primaryDomain);
    const top3Languages = analytics.languages.slice(0, 3).map(l => l.language).join(', ');
    const description = `${name} is a ${domain} developer with expertise in ${top3Languages}. View their portfolio on Gitfolio.`;

    const tags = {
      'title': `${name} - Developer Portfolio | Gitfolio`,
      'description': description,
      'og:title': `${name}'s Developer Portfolio`,
      'og:description': description,
      'og:image': user.avatar_url,
      'og:url': `https://gitfolio.harmnix.com/u/${user.login}`,
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

        // Compute analytics for public view
        const topRepos = userRepos.slice(0, 5);
        const repoLangs = await Promise.all(
          topRepos.map(repo => fetchRepoLanguages(userProfile.login, repo.name))
        );

        const langScores = computeLanguageScores(userRepos, repoLangs);
        
        // Framework detection for top repos
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

        // Enhanced Summary Logic
        const pushesByMonth = {};
        userRepos.forEach(repo => {
          if (repo.pushed_at) {
            const month = new Date(repo.pushed_at).toLocaleString('en-US', { month: 'long' });
            pushesByMonth[month] = (pushesByMonth[month] || 0) + 1;
          }
        });
        const peakMonth = Object.entries(pushesByMonth).sort((a, b) => b[1] - a[1])[0]?.[0] || 'the past year';

        const topRepo = userRepos.sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
        
        let topProjectCategory = formatDomain(domainResult.primary);
        if (topRepo) {
          const topRepoDomain = classifyDeveloperDomain([topRepo], 
            { [topRepo.language || 'Unknown']: 1 }, 
            []
          );
          topProjectCategory = formatDomain(topRepoDomain.primary);
        }

        // Simplified Readiness Score for public view
        const metrics = {
          projectQuality: Math.min(100, (userRepos.length * 10) + (userRepos[0]?.stargazers_count || 0)),
          languageDepth: langScores[0]?.score || 0,
          consistency: 70, // Fallback for public view
          profileCompleteness: profile?.bio ? 100 : 50,
          codeHygiene: 60 // Fallback
        };
        const scoreResult = computeOverallScore(metrics);

        const computedAnalytics = {
          score: scoreResult.interviewReadiness,
          domain: domainResult.primary.replace('_', ' '),
          primaryDomain: formatDomain(domainResult.primary),
          secondaryDomain: domainResult.secondary ? formatDomain(domainResult.secondary) : null,
          languages: langScores,
          frameworks: allFrameworks,
          topLanguage: langScores[0]?.language || 'Unknown',
          depthLabel: langScores[0]?.depth || 'Unknown',
          peakMonth: peakMonth,
          summary: `${userProfile.name || username} is primarily a ${formatDomain(domainResult.primary)} developer with strong ${langScores[0]?.language || 'various languages'} depth. Most active during ${peakMonth} with a focus on ${topProjectCategory}.`
        };
        setAnalytics(computedAnalytics);

        // SEO
        document.title = `${userProfile.name || username} - Developer Portfolio | Gitfolio`;
        updateMetaTags(userProfile, computedAnalytics);

      } catch (error) {
        console.error('Error loading public portfolio:', error);
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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-900">
        <h1 className="text-2xl font-bold">User not found</h1>
      </div>
    );
  }

  const isOwner = authUser?.login === profile.login;
  const topProjects = repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, isPremium ? 6 : 3);
  const days = contributions?.weeks?.flatMap(week => week.contributionDays) ?? [];
  const contribMap = new Map(contributions.map(d => [d.date, d.contributionCount]));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 font-sans">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; }
            .print-container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          }
        `}
      </style>

      <div className="max-w-[800px] mx-auto print-container">
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-12">
          <div className="relative mb-6">
             <img 
               src={profile.avatar_url + '?s=80'} 
               alt={profile.name} 
               loading="lazy"
               className="w-20 h-20 rounded-full border-4 border-white shadow-sm"
             />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
              <div className="bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
            </div>
          </div>
          
          <h1 className="text-4xl font-extrabold mb-2">{profile.name || profile.login}</h1>
          <p className="text-xl text-slate-600 mb-4 font-medium">
            {analytics.domain.toUpperCase()} Developer | {analytics.languages.slice(0, 2).map(l => l.language).join(' & ')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm text-slate-500">
            {profile.location && (
              <span className="flex items-center gap-1">
                <Lucide.MapPin size={14} /> {profile.location}
              </span>
            )}
            {profile.company && (
              <span className="flex items-center gap-1">
                <Lucide.Building2 size={14} /> {profile.company}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-slate-200 shadow-inner bg-white">
              <span className="text-lg font-bold text-slate-900">{analytics.score}</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="40" cy="40" r="36" 
                  className="fill-none stroke-slate-200" 
                  strokeWidth="4"
                />
                <circle 
                  cx="40" cy="40" r="36" 
                  className="fill-none stroke-slate-900" 
                  strokeWidth="4" 
                  strokeDasharray={226.2} 
                  strokeDashoffset={226.2 - (226.2 * analytics.score) / 100}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Readiness Score</p>
              <p className="text-sm font-medium text-slate-600">Interview Ready</p>
            </div>
          </div>

          <div className="flex gap-3 no-print">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyLink}
              className="gap-2"
            >
              {copied ? <Lucide.CheckCircle2 size={14} /> : <Lucide.Copy size={14} />}
              {copied ? 'Copied!' : 'Lucide.Copy Link'}
            </Button>
            <PremiumGate 
              feature="PDF Export" 
              fallback={<LockedFeature featureName="PDF Export" />}
            >
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                className="gap-2"
              >
                <Lucide.FileDown size={14} />
                Download PDF
              </Button>
            </PremiumGate>
          </div>
        </header>

         {/* Domain Summary */}
         <section className="mb-12 text-center">
           <p className="text-lg text-slate-600 leading-relaxed italic text-center mb-12">
             "{profile.name || profile.login} is primarily a {analytics.primaryDomain} developer with {analytics.topLanguage} as their strongest skill ({analytics.depthLabel}). {analytics.secondaryDomain ? 'Also experienced in ' + analytics.secondaryDomain + '.' : ''} Most active {analytics.peakMonth} with a {analytics.longestStreak}-day contribution streak."
           </p>
         </section>

        {/* Skills Section */}
        <section className="mb-12">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Technical Expertise</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {analytics.languages.slice(0, 6).map(lang => (
              <Badge key={lang.language} variant="secondary" className="px-3 py-1 text-sm font-medium bg-white border-slate-200 text-slate-700 shadow-sm">
                {lang.language} <span className="text-slate-400 ml-1 text-xs">• {lang.depth}</span>
              </Badge>
            ))}
            {analytics.frameworks.slice(0, 8).map(fw => (
              <Badge key={fw} variant="outline" className="px-3 py-1 text-sm font-medium border-slate-200 text-slate-600 bg-slate-100/50">
                {fw}
              </Badge>
            ))}
          </div>
         </section>
 
         {/* Contribution Activity */}
         <section className="mb-12">
           <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Contribution Activity</h2>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              {isOwner && days.length > 0 ? (
               <div className="flex flex-col items-center gap-4">
                 <div className="inline-grid grid-flow-col grid-rows-7 gap-[2px] p-2 bg-slate-50 rounded-lg border border-slate-100 overflow-x-auto">
                   {/* Simplified Heatmap Implementation */}
                   {Array.from({ length: 52 }).map((_, weekIdx) => (
                     <div key={weekIdx} className="grid grid-rows-7 gap-[2px]">
                         {days.map(date => {
                           const count = contribMap.get(date) || 0;
                           const opacity = Math.min(count / 10, 1);
                           return (
                             <div 
                               key={date}
                               title={`${date}: ${count} contributions`}
                               className="w-[10px] h-[10px] rounded-sm"
                               style={{ backgroundColor: count === 0 ? '#f1f5f9' : `rgba(16, 185, 129, ${opacity})` }}
                             />
                           );
                         })}
                     </div>
                   ))}
                 </div>
                 <p className="text-sm text-slate-500">Your personal activity heatmap</p>
               </div>
             ) : (
               <div>
                 {analytics.totalContributions > 0 ? (
                   <p className="text-lg font-medium text-slate-700">
                     {analytics.totalContributions} contributions in the last year • {analytics.longestStreak} day longest streak
                   </p>
                 ) : (
                   <p className="text-slate-500">Public activity data unavailable</p>
                 )}
               </div>
             )}
           </div>
         </section>
 
         {/* Featured Projects */}
        <section className="mb-12">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Featured Projects</h2>
          <div className="grid gap-6">
            {topProjects.map(repo => (
              <Card key={repo.id} className="p-6 bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                          {repo.name}
                        </a>
                        <Lucide.ExternalLink size={14} className="text-slate-400" />
                      </h3>
                      <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                        {repo.description || 'No description provided.'}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 bg-slate-50 border-slate-200">
                      <Lucide.Star size={12} className="text-yellow-500 fill-yellow-500" />
                      {repo.stargazers_count}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {repo.language && (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                        {repo.language}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-green-600 border-green-200 bg-green-50">
                      {repo.stargazers_count > 50 ? '⭐ Strong' : repo.stargazers_count > 10 ? '✓ Good' : '~ Fair'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-3 mt-auto">
                  <Button size="sm" variant="outline" asChild className="text-xs">
                    <a href={repo.homepage} target="_blank" rel="noopener noreferrer">Live Demo</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="text-xs gap-2">
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                      <Lucide.GitFork size={14} /> Code
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
</section>

        {/* Open Source */}
        <section className="mb-12">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Open Source Contributions</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {publicPRs.length > 0 ? (
              publicPRs.slice(0, 10).map((pr, idx) => (
                <Badge key={idx} variant="outline" className="px-3 py-1 text-xs border-slate-200 text-slate-600 bg-white shadow-sm">
                  {pr.repository}
                </Badge>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No public contributions found.</p>
            )}
          </div>
        </section>

        {/* CTA for Non-Owners */}
        {!isOwner && (
          <div className="mt-16 p-8 bg-slate-900 rounded-2xl text-center text-white no-print flex flex-col items-center justify-center gap-6">
            <h3 className="text-2xl font-bold">Want your own professional portfolio?</h3>
            <p className="text-slate-400">Generated automatically from your GitHub activity.</p>
            <Button asChild variant="default" className="bg-white text-slate-900 hover:bg-slate-100 font-bold gap-2">
              <a href="/">Create yours free <Lucide.ChevronRight size={18} /></a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPortfolio;

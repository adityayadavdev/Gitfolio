import { useMemo, useState, useEffect } from 'react';
import { 
  MapPin, 
  Briefcase, 
  Globe, 
  Share2, 
  FileDown, 
  Zap, 
  TrendingUp, 
  Calendar, 
  Code2, 
  GitFork, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGitHubData } from '../hooks/useGitHubData';
import usePremium from '../hooks/usePremium';
import { fetchFileContent, fetchUserPullRequests } from '../services/github';
import { 
  computeOverallScore, 
  computeLanguageScores, 
  computeContributionMetrics, 
  scoreProject, 
  classifyDeveloperDomain, 
  detectFrameworks,
} from '../analytics';
import { Card, Badge, Button, Skeleton } from '../components/ui';
import PremiumGate from '../components/PremiumGate';
import LockedFeature from '../components/LockedFeature';
import RepoImprover from '../components/AIFeatures/RepoImprover';
import ShareModal from '../components/ShareModal';
import ShareKit from '../components/ShareKit';
import { exportPortfolioPDF } from '../services/pdfExport';
import PlacementCard from '../components/PlacementCard';

const Dashboard = () => {
  const { user, token } = useAuth();
  const { isPremium, openUpgradeModal } = usePremium();
  const { 
    profile, 
    repos, 
    languages: rawLanguages, 
    contributions, 
    isLoading, 
    progress 
  } = useGitHubData({ username: user?.login, token });

  const [projectFilter, setProjectFilter] = useState('All');
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [frameworksData, setFrameworksData] = useState(null);
  const [improvingRepo, setImprovingRepo] = useState(null);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [publicPRs, setPublicPRs] = useState([]);
  const [prsLoading, setPrsLoading] = useState(true);

  useEffect(() => {
    // Framework detection is handled in a separate useEffect below
  }, [repos, token]);

  useEffect(() => {
    async function fetchPRs() {
      if (!user?.login || !token) return;
      setPrsLoading(true);
      try {
        const prs = await fetchUserPullRequests(user.login, token);
        setPublicPRs(prs || []);
      } catch (e) {
        console.error('Failed to fetch PRs', e);
      } finally {
        setPrsLoading(false);
      }
    }
    fetchPRs();
  }, [user?.login, token]);

  // To fix the detectFrameworks issue, I'll implement a modified version of it here 
  // or just do it manually in a useMemo.
  
  const analytics = useMemo(() => {
    if (!profile || !repos) return null;

    // 1. Language Scores
    const repoLangArray = repos.map(repo => rawLanguages[repo.full_name] || {});
    const langScores = computeLanguageScores(repos, repoLangArray);

    // 2. Contribution Metrics
    const contribMetrics = contributions ? computeContributionMetrics(contributions) : null;

    // 3. Domain Classification
    // We need frameworks for this. Since detectFrameworks is async, we can't use it in useMemo.
    // I'll use a placeholder or the frameworksData state.
    const frameworks = frameworksData ? Array.from(frameworksData.values()).flatMap(f => f.frameworks) : [];
    const domain = classifyDeveloperDomain(repos, 
      langScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {}), 
      frameworks
    );

    // 4. Project Scores
    const scoredProjects = repos.map(repo => {
      const langData = rawLanguages[repo.full_name] || {};
      const langList = Object.keys(langData);
      // We don't have commit counts or readme lengths easily available from useGitHubData.
      // I'll assume 10 commits and 500 chars for README if not available, or try to estimate.
      // In a real app, we'd fetch these.
      const score = scoreProject(repo, langList, 10, 500); 
      return { ...repo, qualityScore: score.total, scoreBreakdown: score.breakdown };
    });

    // 5. Overall Score
    const allMetrics = {
      projectQuality: scoredProjects.reduce((a, b) => a + b.qualityScore, 0) / (scoredProjects.length || 1),
      languageDepth: langScores[0]?.score || 0,
      consistency: contribMetrics?.consistencyScore || 0,
      profileCompleteness: 100, // Simplified
      codeHygiene: 50, // Simplified
    };
    const overall = computeOverallScore(allMetrics);

    return {
      langScores,
      contribMetrics,
      domain,
      scoredProjects,
      overall,
    };
  }, [profile, repos, rawLanguages, contributions, frameworksData]);

  useEffect(() => {
    async function runDetection() {
      if (!repos || !token) return;
      
      const repoContentsMap = new Map();
      const fileToRepo = new Map();
      
      repos.slice(0, 10).forEach(repo => {
        if (repo.rootContents) {
          const paths = repo.rootContents.map(f => f.path);
          repoContentsMap.set(repo.full_name, paths);
          paths.forEach(path => fileToRepo.set(path, repo));
        }
      });

      const fileContentFetcher = async (path) => {
        const repo = fileToRepo.get(path);
        if (!repo) return null;
        return await fetchFileContent(repo.owner.login, repo.name, path, token);
      };

      const results = await detectFrameworks(repoContentsMap, fileContentFetcher);
      setFrameworksData(results);
    }
    runDetection();
  }, [repos, token]);

  const filteredProjects = useMemo(() => {
    if (!analytics?.scoredProjects) return [];
    const projects = analytics.scoredProjects;
    
    const baseRepos = showAllRepos 
      ? projects 
      : projects.filter(repo => !['FORK_INACTIVE', 'TUTORIAL', 'ASSIGNMENT'].includes(repo.classification));

    if (projectFilter === 'All') return baseRepos;
    
    const domainMap = {
      'Web': ['frontend', 'backend', 'fullstack'],
      'ML/AI': ['ml_ai'],
      'Mobile': ['mobile'],
      'Systems': ['systems'],
      'DSA': ['dsa_cp'],
    };
    
    return baseRepos.filter(repo => {
      const repoLangs = rawLanguages[repo.full_name] || {};
      const repoLangScores = computeLanguageScores([repo], [repoLangs]);
      const repoFrameworks = frameworksData?.get(repo.full_name)?.frameworks || [];
      const repoDomain = classifyDeveloperDomain([repo], 
        repoLangScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {}), 
        repoFrameworks
      ).primary;
      
      return domainMap[projectFilter].includes(repoDomain);
    });
  }, [analytics, projectFilter, showAllRepos, rawLanguages, frameworksData]);

  const displayProjects = isPremium ? filteredProjects : filteredProjects.slice(0, 5);

  const openShareModal = () => {
    setShareModalOpen(true);
  };

  if (isLoading && !profile) {
    return (
      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 col-span-2" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans pb-20">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50 bg-[#30363d]">
        <div 
          className="h-full bg-[#3fb950] transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-8">
        {/* Profile Header */}
        <section className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <img 
              src={profile?.avatar_url + '?s=80'} 
              alt={profile?.name} 
              loading="lazy"
              className="w-24 h-24 rounded-full border-2 border-[#30363d]" 
            />
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{profile?.name || profile?.login}</h1>
                <Badge variant="info">@{profile?.login}</Badge>
              </div>
              <p className="text-[#8b949e] max-w-xl">{profile?.bio}</p>
              <div className="flex flex-wrap gap-4 text-sm text-[#8b949e]">
                {profile?.location && <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>}
                {profile?.company && <span className="flex items-center gap-1"><Briefcase size={14} /> {profile.company}</span>}
                {profile?.blog && <a href={profile.blog} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#58a6ff] hover:underline"><Globe size={14} /> {profile.blog}</a>}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle 
                  cx="48" cy="48" r="40" 
                  stroke="#30363d" strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="48" cy="48" r="40" 
                  stroke="#3fb950" strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={251.2} 
                  strokeDashoffset={251.2 - (251.2 * (analytics?.overall.interviewReadiness || 0)) / 100} 
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="relative font-bold text-xl">
                {analytics?.overall.interviewReadiness || 0}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold">Readiness</div>
              <div className="text-sm font-bold text-[#3fb950] capitalize">{analytics?.overall.tier || 'developing'}</div>
            </div>
               <div className="flex gap-2">
                  {analytics?.domain.primary && analytics.domain.primary !== 'Unknown' && <Badge variant="success">{analytics.domain.primary}</Badge>}
                    <Button 
                      size="sm"
                      variant="secondary" 
                      onClick={openShareModal} 
                      title="Share Portfolio"
                      className="p-2 h-8 w-8 flex items-center justify-center"
                    >
                     <Share2 size={14} />
                   </Button>

                  <PremiumGate 
                    feature="PDF Export" 
                    fallback={<LockedFeature featureName="PDF Export" />}
                  >
                      <Button 
                        size="sm"
                        variant="secondary" 
                        onClick={() => exportPortfolioPDF(user?.login, profile, analytics?.langScores, displayProjects, analytics?.overall, 'minimal')} 
                        title="Export as PDF"
                        className="p-2 h-8 w-8 flex items-center justify-center"
                      >
                       <FileDown size={14} />
                     </Button>
                   </PremiumGate>
                 </div>
                 <PremiumGate 
                   feature="placement_card" 
                   fallback={<LockedFeature featureName="Placement Card" />}
                 >
                   <PlacementCard profile={profile} topProjects={displayProjects} languageScores={analytics?.langScores} />
                 </PremiumGate>
            </div>
         </section>


        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-2 bg-green-900/20 rounded-lg text-[#3fb950]"><Zap size={20} /></div>
            <div className="text-2xl font-bold">{profile?.public_repos || 0}</div>
            <div className="text-xs text-[#8b949e] uppercase">Total Repos</div>
          </Card>
          <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-2 bg-blue-900/20 rounded-lg text-[#58a6ff]"><TrendingUp size={20} /></div>
            <div className="text-2xl font-bold">{analytics?.contribMetrics?.currentStreak || 0}</div>
            <div className="text-xs text-[#8b949e] uppercase">Current Streak</div>
          </Card>
          <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400"><Calendar size={20} /></div>
            <div className="text-2xl font-bold">{analytics?.contribMetrics?.activeDays || 0}</div>
            <div className="text-xs text-[#8b949e] uppercase">Active Days</div>
          </Card>
          <Card padding="p-4" className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-2 bg-yellow-900/20 rounded-lg text-yellow-400"><Code2 size={20} /></div>
            <div className="text-2xl font-bold truncate px-2">{analytics?.langScores[0]?.language || 'N/A'}</div>
            <div className="text-xs text-[#8b949e] uppercase">Top Language</div>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Language Depth */}
          <section className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Code2 size={20} /> Language Depth
            </h2>
            <Card className="space-y-6">
              {analytics?.langScores.slice(0, 8).map((lang) => (
                <div key={lang.language} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{lang.language}</span>
                    <span className="text-[#8b949e]">{lang.depth} • {lang.repoCount} repos</span>
                  </div>
                  <div className="h-2 w-full bg-[#30363d] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#58a6ff] transition-all duration-1000" 
                      style={{ width: `${lang.score}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-[#8b949e]">
                    <span>{lang.score}% Proficiency</span>
                    <span className={`flex items-center gap-1 ${lang.trend === 'growing' ? 'text-green-400' : lang.trend === 'declining' ? 'text-red-400' : ''}`}>
                      {lang.trend === 'growing' && <TrendingUp size={10} />}
                      {lang.trend}
                    </span>
                  </div>
                </div>
              ))}
              {!analytics?.langScores.length && <Skeleton className="h-40 w-full" />}
            </Card>
          </section>

          {/* Contribution Heatmap */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={20} /> Activity Heatmap
            </h2>
            <Card className="overflow-x-auto">
              <div className="inline-grid grid-flow-col grid-rows-7 gap-[2px] p-2">
                {contributions?.weeks.flatMap(week => 
                  week.contributionDays.map((day) => {
                    const count = day.contributionCount || 0;
                    const opacity = Math.min(count / 10, 1);
                    return (
                      <div 
                        key={day.date}
                        title={`${day.date}: ${count} contributions`}
                        className="w-[10px] h-[10px] rounded-sm transition-colors"
                        style={{ backgroundColor: count === 0 ? '#161b22' : `rgba(57, 211, 83, ${opacity})` }}
                      />
                    );
                  })
                )}
              </div>
            </Card>
          </section>
        </div>

        {/* Top Projects */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GitFork size={20} /> Top Projects
            </h2>
             <div className="flex flex-wrap gap-2">
               <Button 
                 size="sm"
                 variant="secondary" 
                 onClick={() => setShowAllRepos(!showAllRepos)}
                 className="text-xs py-1"
               >
                 {showAllRepos ? 'Hide Junk' : 'Show All Repos'}
               </Button>
               {['All', 'Web', 'ML/AI', 'Mobile', 'Systems', 'DSA'].map(filter => (
                 <Button 
                   key={filter} 
                   size="sm"
                   variant={projectFilter === filter ? 'primary' : 'secondary'} 
                   onClick={() => setProjectFilter(filter)}
                   className="text-xs py-1"
                 >
                   {filter}
                 </Button>
               ))}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map(repo => {
              const lang = Object.keys(rawLanguages[repo.full_name] || {})[0] || 'Unknown';
              const qualityColor = repo.qualityScore > 70 ? '#3fb950' : repo.qualityScore > 40 ? '#eab308' : '#ef4444';
              
              return (
                <Card key={repo.id} className="flex flex-col h-full group hover:border-[#58a6ff] transition-colors relative">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold truncate flex-1 mr-2">{repo.name}</h3>
                    <Badge variant="info">{lang}</Badge>
                  </div>
                  <p className="text-sm text-[#8b949e] line-clamp-2 mb-4 h-10">
                    {repo.description || 'No description provided.'}
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-[#8b949e]">
                        <span>Project Quality</span>
                        <span>{repo.qualityScore}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#30363d] rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000" 
                          style={{ width: `${repo.qualityScore}%`, backgroundColor: qualityColor }} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                         <span className="flex items-center gap-1">⭐ {repo.stargazers_count}</span>
                         <span className="flex items-center gap-1">🍴 {repo.forks_count}</span>
                       </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm"
                        variant="secondary" 
                        onClick={() => setImprovingRepo(repo)} 
                        className="text-xs py-1 px-2 h-7 flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Improve
                      </Button>
                      <a 
                        href={repo.html_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[#58a6ff] hover:underline text-xs flex items-center gap-1"
                      >
                        View <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
             {displayProjects.length === 0 && <div className="col-span-full text-center py-12 text-[#8b949e]">No projects found for this filter.</div>}
           </div>
         </section>
         <ShareKit username={user?.login} profile={profile} languageScores={analytics?.langScores} />


         {/* Code Hygiene & Open Source */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

           <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 size={20} /> Code Hygiene
              </h2>
              <PremiumGate 
                feature="Advanced Analytics" 
                fallback={<LockedFeature featureName="Advanced Analytics" />}
              >
                <Card padding="p-6" className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
                    <div>
                      <div className="text-sm text-[#8b949e]">Overall Hygiene Score</div>
                      <div className="text-3xl font-bold">{analytics?.overall.breakdown.codeHygiene || 0}%</div>
                    </div>
                    <div className={`p-3 rounded-full ${analytics?.overall.breakdown.codeHygiene > 70 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      <Zap size={24} />
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-[#8b949e]">Conventional Commits</span>
                       <span className="font-bold">{analytics?.overall.breakdown.codeHygiene > 70 ? 'High' : 'Low'}</span>
                     </div>
                     <div className="flex justify-between items-center mb-2"> 
                       <span className="text-sm text-[#8b949e]">Conventional Commits</span> 
                       <span className="text-[10px] uppercase font-bold text-[#4a4a4a]">Examples</span> 
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-900/10 border border-green-900/30 rounded-lg flex gap-3">
                        <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-1" />
                        <div className="text-xs text-green-200/80 italic">"feat(auth): implement jwt refresh tokens"</div>
                      </div>
                      <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex gap-3">
                        <XCircle size={16} className="text-red-400 shrink-0 mt-1" />
                        <div className="text-xs text-red-200/80 italic">"fixed stuff"</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </PremiumGate>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <GitFork size={20} /> Open Source Contributions
              </h2>
              <Card className="space-y-4">
                {prsLoading ? (
                  <>
                    <div className="text-center py-8 text-[#8b949e] text-sm">Connecting to GitHub GraphQL to fetch merged PRs...</div>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : publicPRs.length === 0 ? (
                    <div className="text-center py-8 text-[#8b949e] text-sm">No external contributions found. PRs merged into other repositories will appear here.</div>
                ) : (
                  <div className="space-y-3">
                    {publicPRs.map((pr, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-xl group hover:border-[#58a6ff] transition-colors">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate">{pr.title}</span>
                          <span className="text-xs text-[#8b949e] truncate">{pr.repository.nameWithOwner}</span>
                        </div>
                        <a 
                          href={pr.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-2 text-[#8b949e] hover:text-[#58a6ff] transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
        </div>

        {/* Premium Banner */}
        {!isPremium && (
          <section className="bg-gradient-to-r from-[#161b22] to-[#0d1117] border border-[#3fb950]/30 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-bold text-white">Unlock Premium Insights</h3>
              <p className="text-[#8b949e]">Get full project analysis, advanced domain detection, and personalized interview roadmaps.</p>
            </div>
             <Button variant="primary" size="lg" className="whitespace-nowrap px-8 py-3" onClick={openUpgradeModal}>
              Upgrade to Pro
            </Button>
          </section>
        )}
      </div>
       {improvingRepo && (
         <RepoImprover 
           repo={improvingRepo} 
           token={token} 
           isPremium={isPremium} 
           onClose={() => setImprovingRepo(null)} 
         />
       )}
       {isShareModalOpen && (
         <ShareModal 
           url={`https://gitfolio.harmnix.com/u/${user?.login}`} 
           onClose={() => setShareModalOpen(false)} 
         />
       )}
     </div>
   );

};

export default Dashboard;

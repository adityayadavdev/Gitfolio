import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGitHubData } from '../hooks/useGitHubData';
import { 
  computeOverallScore, 
  computeLanguageScores, 
  classifyDeveloperDomain, 
  computeContributionMetrics, 
  scoreProject 
} from '../analytics';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { RefreshCw, GraduationCap, Trophy, Search } from 'lucide-react';

const COMMON_COLLEGES = [
  "IIT Bombay", "IIT Delhi", "NIT Trichy", "BITS Pilani", 
  "VIT", "SRM", "Manipal", "IIIT Hyderabad"
];

const CollegeLeaderboard = () => {
  const { user } = useAuth();
  const { 
    profile, 
    repos, 
    languages: rawLanguages, 
    contributions, 
  } = useGitHubData({ username: user?.login });

  const [college, setCollege] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const analytics = useMemo(() => {
    if (!profile || !repos) return null;

    const repoLangArray = repos.map(repo => rawLanguages[repo.full_name] || {});
    const langScores = computeLanguageScores(repos, repoLangArray);
    const contribMetrics = contributions ? computeContributionMetrics(contributions) : null;
    
    const domain = classifyDeveloperDomain(
      repos, 
      langScores.reduce((acc, curr) => ({ ...acc, [curr.language]: curr.score }), {}), 
      [] // Frameworks not available here for simplicity
    );

    const scoredProjects = repos.map(repo => {
      const langData = rawLanguages[repo.full_name] || {};
      const langList = Object.keys(langData);
      const score = scoreProject(repo, langList, 10, 500); 
      return { ...repo, qualityScore: score.total };
    });

    const allMetrics = {
      projectQuality: scoredProjects.reduce((a, b) => a + b.qualityScore, 0) / (scoredProjects.length || 1),
      languageDepth: langScores[0]?.score || 0,
      consistency: contribMetrics?.consistencyScore || 0,
      profileCompleteness: 100,
      codeHygiene: 50,
    };
    const overall = computeOverallScore(allMetrics);

    return {
      langScores,
      domain,
      overall,
    };
  }, [profile, repos, rawLanguages, contributions]);

  const fetchLeaderboard = useCallback(async (collegeName) => {
    if (!collegeName) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(`/leaderboard/${encodeURIComponent(collegeName)}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (college) {
      const timer = setTimeout(() => {
        fetchLeaderboard(college);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [college, fetchLeaderboard]);

  const handleJoinLeaderboard = async () => {
    if (!college || !user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        username: user.login,
        college,
        overallScore: analytics?.overall.interviewReadiness || 0,
        languageScores: analytics?.langScores || [],
        domain: analytics?.domain.primary || 'Unknown',
      };
      const response = await fetch('/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        await fetchLeaderboard(college);
      }
    } catch (error) {
      console.error('Failed to submit to leaderboard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredColleges = COMMON_COLLEGES.filter(c => 
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userRankData = leaderboardData?.users.find(u => u.username === user?.login);

  return (
    <div className="space-y-8 p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-[#3fb950]" size={28} />
        <h1 className="text-3xl font-bold text-[#e6edf3]">College Ranking</h1>
      </div>

      {/* Join Section */}
      <Card className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-[#8b949e] flex items-center gap-2">
              <GraduationCap size={16} /> Select Your College
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#8b949e]">
                <Search size={16} />
              </div>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search or enter college name..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md py-2 pl-10 pr-4 text-[#e6edf3] focus:outline-none focus:border-[#3fb950] transition-colors"
              />
              {searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl max-h-60 overflow-auto">
                  {filteredColleges.length > 0 ? (
                    filteredColleges.map(c => (
                      <div 
                        key={c} 
                        className="px-4 py-2 hover:bg-[#30363d] cursor-pointer text-sm text-[#e6edf3]"
                        onClick={() => {
                          setCollege(c);
                          setSearchTerm(c);
                        }}
                      >
                        {c}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-[#8b949e]">No match found. You can type your college.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="w-full md:w-auto">
            <Button 
              onClick={() => setCollege(searchTerm)} 
              variant="secondary" 
              className="w-full md:w-auto"
            >
              Set College
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-[#30363d]">
          <div className="text-sm text-[#8b949e]">
            Current: <span className="text-[#e6edf3] font-medium">{college || 'None selected'}</span>
          </div>
          <Button 
            onClick={handleJoinLeaderboard} 
            variant="primary" 
            disabled={!college || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Join Leaderboard'}
          </Button>
        </div>
      </Card>

      {/* Rankings Section */}
      {college && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#e6edf3]">Rankings for {college}</h2>
            <Button 
              variant="outline" 
              onClick={() => fetchLeaderboard(college)} 
              disabled={isRefreshing}
              className="flex items-center gap-2 py-1 h-9"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>

          {userRankData && (
            <Card className="bg-gradient-to-r from-[#161b22] to-[#0d1117] border-l-4 border-l-[#3fb950]">
              <div className="text-center space-y-1">
                <p className="text-[#8b949e] text-sm">Your Current Standing</p>
                <p className="text-2xl font-bold text-[#e6edf3]">
                  You're <span className="text-[#3fb950]">#{userRankData.rank}</span> out of {leaderboardData?.totalUsers || 0} from {college}
                </p>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-[#8b949e] text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">Rank</th>
                    <th className="px-6 py-3 font-semibold">Username</th>
                    <th className="px-6 py-3 font-semibold">Domain</th>
                    <th className="px-6 py-3 font-semibold text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]">
                  {leaderboardData?.topUsers.slice(0, 10).map((user, index) => (
                    <tr key={user.username} className="hover:bg-[#1c2128] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        {index === 0 ? <span className="text-yellow-400">🥇</span> : index === 1 ? <span className="text-gray-300">🥈</span> : index === 2 ? <span className="text-amber-600">🥉</span> : index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#e6edf3] font-medium">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="info">{user.domain}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-[#3fb950]">
                        {user.score}
                      </td>
                    </tr>
                  ))}
                  {!leaderboardData?.topUsers.length && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-[#8b949e] text-sm">
                        No data available for this college yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CollegeLeaderboard;

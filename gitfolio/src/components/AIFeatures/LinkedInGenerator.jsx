import { useState } from 'react';
import { Loader2, Copy, ClipboardCheck, RefreshCw, User, Code, Briefcase } from 'lucide-react';
import { generateLinkedInBio } from '../../services/anthropic';
import { useGitHubData } from '../../hooks/useGitHubData';
import { useAuth } from '../../hooks/useAuth';
import usePremium from '../../hooks/usePremium';
import { canUseAI, incrementAIUsage } from '../../utils/aiRateLimit';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import PremiumGate from '../PremiumGate';

const LinkedInGenerator = () => {
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState(null);


  const { user, token } = useAuth();
  const { isPremium } = usePremium();
  const { profile, languages, repos } = useGitHubData({ 
    username: user?.login, 
    token: token 
  });

  const deriveProfileData = () => {
    // Aggregate language scores
    const aggregatedLanguages = {};
    Object.values(languages).forEach(langData => {
      if (langData) {
        Object.entries(langData).forEach(([lang, bytes]) => {
          aggregatedLanguages[lang] = (aggregatedLanguages[lang] || 0) + bytes;
        });
      }
    });

    const sortedLangs = Object.entries(aggregatedLanguages)
      .sort(([, a], [, b]) => b - a);
    
    const topSkills = sortedLangs.slice(0, 5).map(([lang]) => lang);
    
    // Derive domain based on top language
    let domain = 'Software Developer';
    if (topSkills[0]) {
      const topLang = topSkills[0];
      if (['JavaScript', 'TypeScript', 'HTML', 'CSS'].includes(topLang)) domain = 'Full-Stack Web Developer';
      else if (['Python', 'R', 'Julia'].includes(topLang)) domain = 'Data Scientist / ML Engineer';
      else if (['Java', 'Kotlin', 'Swift'].includes(topLang)) domain = 'Mobile App Developer';
      else if (['C++', 'C', 'Rust'].includes(topLang)) domain = 'Systems Programmer';
      else if (['Go'].includes(topLang)) domain = 'Backend / Cloud Engineer';
    }

    // Derive years active
    let yearsActive = '1+';
    if (repos && repos.length > 0) {
      const earliestRepo = repos.reduce((earliest, repo) => {
        return new Date(repo.created_at) < new Date(earliest.created_at) ? repo : earliest;
      }, repos[0]);
      
      const startYear = new Date(earliestRepo.created_at).getFullYear();
      const currentYear = new Date().getFullYear();
      const diff = currentYear - startYear;
      yearsActive = diff > 0 ? `${diff} years` : '1 year';
    }

    // Top projects (top 5 by stars)
    const topProjects = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map(repo => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count
      }));

    return {
      name: profile?.name || profile?.login || user?.login,
      domain,
      topSkills,
      yearsActive,
      languageScores: aggregatedLanguages,
      topProjects
    };
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const aiCheck = await canUseAI(isPremium);
      if (!aiCheck.allowed) {
        throw new Error(aiCheck.reason || 'AI limit reached. Please upgrade to premium.');
      }

      const data = deriveProfileData();
       const response = await generateLinkedInBio(
         data.languageScores, 
         data.topProjects, 
         data.domain, 
         data.yearsActive
       );
       
       setBio(response.result);
       setModel(response.model);
       await incrementAIUsage();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!bio) return;
    await navigator.clipboard.writeText(bio);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const profileData = deriveProfileData();

  const content = (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[#e6edf3]">LinkedIn Bio Generator</h2>
        <p className="text-sm text-slate-400">Generate a professional LinkedIn bio based on your GitHub activity and skills.</p>
      </div>

      {/* Input Preview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <User className="w-4 h-4" />
            Identity
          </div>
          <div className="text-[#e6edf3] font-medium">{profileData.name}</div>
        </div>
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <Briefcase className="w-4 h-4" />
            Specialization
          </div>
          <div className="text-[#e6edf3] font-medium">{profileData.domain}</div>
        </div>
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <Code className="w-4 h-4" />
            Top Skills
          </div>
          <div className="flex flex-wrap gap-2">
            {profileData.topSkills.map((skill, i) => (
              <Badge key={i} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={handleGenerate} 
          disabled={isLoading} 
          className="flex items-center gap-2 min-w-[180px] justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate LinkedIn Bio
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}

      {bio && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative">
            <textarea
              className="w-full h-64 p-4 bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:outline-none focus:ring-1 focus:ring-[#3fb950] transition-all resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-500">
              {bio.length}/2000 characters
            </div>
          </div>
          
           <div className="flex justify-end items-center gap-3 flex-col">
             <div className="flex justify-end gap-3 w-full">
               <Button 
                 variant="secondary" 
                 onClick={handleGenerate} 
                 disabled={isLoading}
                 className="flex items-center gap-2"
               >
                 <RefreshCw className="w-4 h-4" />
                 Regenerate
               </Button>
               <Button 
                 onClick={handleCopy} 
                 className="flex items-center gap-2"
               >
                 {copied ? (
                   <>
                     <ClipboardCheck className="w-4 h-4" />
                     Copied!
                   </>
                 ) : (
                   <>
                     <Copy className="w-4 h-4" />
                     Copy to Clipboard
                   </>
                 )}
               </Button>
             </div>
                <span className="text-xs text-slate-500 self-end">
                  {(model?.toLowerCase().includes('llama') || !isPremium)
                    ? 'Powered by Llama 3 (Free)'
                    : (model?.toLowerCase().includes('gemini') || model?.toLowerCase().includes('claude') || isPremium)
                      ? 'Powered by Claude (Premium)'
                      : 'Powered by Llama 3 (Free)'}
                </span>
           </div>

        </div>
      )}
    </div>
  );

  return (
    <PremiumGate 
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-[#161b22] border border-[#30363d] rounded-xl max-w-4xl mx-auto">
          <div className="p-3 bg-[#3fb950]/10 rounded-full">
            <Loader2 className="w-8 h-8 text-[#3fb950]" />
          </div>
          <h3 className="text-xl font-semibold text-[#e6edf3]">Premium Feature</h3>
          <p className="text-slate-400 max-w-sm">
            Unlock the LinkedIn Bio Generator to create a high-impact professional summary based on your GitHub profile.
          </p>
          <Button variant="primary">Upgrade to Premium</Button>
        </div>
      }
    >
      {content}
    </PremiumGate>
  );
};

export default LinkedInGenerator;

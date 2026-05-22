import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Copy, ClipboardCheck } from 'lucide-react';
import { analyzeJobDescription } from '../../services/anthropic';
import { useGitHubData } from '../../hooks/useGitHubData';
import { useAuth } from '../../hooks/useAuth';
import usePremium from '../../hooks/usePremium';
import { canUseAI, incrementAIUsage } from '../../utils/aiRateLimit';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import PremiumGate from '../PremiumGate';

const CircularProgress = ({ score }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-[#161b22]"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
          className="text-[#3fb950]"
        />
      </svg>
      <span className="absolute text-2xl font-bold text-[#e6edf3]">{score}%</span>
    </div>
  );
};

const JobMatchAnalyzer = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState(null);


  const { user, token } = useAuth();
  const { isPremium } = usePremium();
  const { languages, repos } = useGitHubData({ 
    username: user?.login, 
    token: token 
  });

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please provide a job description.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const aiCheck = await canUseAI(isPremium);
      if (!aiCheck.allowed) {
        throw new Error(aiCheck.reason || 'AI limit reached. Please upgrade to premium.');
      }

      const aggregatedLanguages = {};
      Object.values(languages).forEach(langData => {
        if (langData) {
          Object.entries(langData).forEach(([lang, bytes]) => {
            aggregatedLanguages[lang] = (aggregatedLanguages[lang] || 0) + bytes;
          });
        }
      });

      const response = await analyzeJobDescription(jobDescription, aggregatedLanguages, repos);
      setAnalysis(response.result);
      setModel(response.model);
      await incrementAIUsage();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;

    const text = `Job Match Analysis\nScore: ${analysis.matchScore}%\n\nStrong Matches:\n${analysis.strongMatches.join('\n')}\n\nGaps:\n${analysis.gaps.join('\n')}\n\nWarnings:\n${analysis.resumeWarnings.join('\n')}\n\nRecommendation:\n${analysis.recommendation}`;
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[#e6edf3]">Job Match Analyzer</h2>
        <p className="text-sm text-slate-400">Paste a job description to see how your GitHub profile matches the requirements.</p>
      </div>

      <div className="space-y-4">
        <textarea
          className="w-full h-48 p-3 bg-[#0d1117] border border-[#30363d] rounded-md text-[#e6edf3] focus:outline-none focus:ring-1 focus:ring-[#3fb950] transition-all resize-none"
          placeholder="Paste the full job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading} 
            className="flex items-center gap-2 min-w-[140px] justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing match...
              </>
            ) : (
              'Analyze Fit'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <div className="mb-2 text-sm font-medium text-slate-400">Overall Fit Score</div>
            <CircularProgress score={analysis.matchScore} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-[#3fb950] font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Strong Matches
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.strongMatches.map((match, i) => (
                  <Badge key={i} variant="success">{match}</Badge>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-yellow-400 font-medium">
                <AlertCircle className="w-4 h-4" />
                Gaps
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.gaps.map((gap, i) => (
                  <Badge key={i} variant="warning">{gap}</Badge>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-medium">
                <XCircle className="w-4 h-4" />
                Resume Warnings
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.resumeWarnings.map((warning, i) => (
                  <Badge key={i} variant="danger">{warning}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#3fb950]/10 border border-[#3fb950]/20 rounded-lg">
            <div className="text-sm font-semibold text-[#3fb950] mb-1">AI Recommendation</div>
            <p className="text-[#e6edf3] text-sm leading-relaxed">{analysis.recommendation}</p>
          </div>

           <div className="flex justify-center flex-col items-center gap-2">
             <Button 
               variant="secondary" 
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
                   Copy Analysis
                 </>
               )}
             </Button>
               <span className="text-xs text-slate-500">
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
            Unlock the Job Match Analyzer to optimize your resume and identify skill gaps for your dream roles.
          </p>
          <Button variant="primary">Upgrade to Premium</Button>
        </div>
      }
    >
      {content}
    </PremiumGate>
  );
};

export default JobMatchAnalyzer;

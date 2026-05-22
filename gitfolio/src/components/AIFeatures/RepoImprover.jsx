import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, X, Loader2 } from 'lucide-react';
import { improveRepoDescription, generateREADMEOutline } from '../../services/anthropic';
import { fetchRecentCommits } from '../../services/github';
import { canUseAI, incrementAIUsage } from '../../utils/aiRateLimit';
import usePremium from '../../hooks/usePremium';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';


export const RepoImprover = ({ repo, token, isPremium, onClose }) => {
  const { openUpgradeModal } = usePremium();
  const [outline, setOutline] = useState('');

  const [editableDescription, setEditableDescription] = useState('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedOutline, setCopiedOutline] = useState(false);
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function generateImprovements() {
      try {
        const aiCheck = await canUseAI(isPremium);
        if (!aiCheck.allowed) {
          setError(aiCheck.reason || 'AI limit reached');
          return;
        }


        setLoadingDescription(true);
        setLoadingOutline(true);

        // Fetch recent commits for better description
        let commitMessages = [];
        try {
          const commits = await fetchRecentCommits(repo.owner.login, repo.name, token);
          commitMessages = commits.map(c => c.commit.message).slice(0, 5);
        } catch (e) {
          console.error('Failed to fetch commits', e);
        }

        const [improvedDesc, readmeOutline] = await Promise.all([
          improveRepoDescription(
            repo.name, 
            repo.language || 'Unknown', 
            repo.topics || [], 
            repo.description || '', 
            commitMessages,
            token
          ),
          generateREADMEOutline(
            repo.name, 
            repo.language || 'Unknown', 
            repo.languages ? Object.keys(repo.languages) : [], 
            'Software Project', 
            repo.description || '',
            token
          )
        ]);

        setEditableDescription(improvedDesc.result);
        setOutline(readmeOutline.result);
        setModel(improvedDesc.model || readmeOutline.model);
        
        await incrementAIUsage();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingDescription(false);
        setLoadingOutline(false);
      }
    }

    generateImprovements();
  }, [repo, token, isPremium]);

  const handleCopy = async (text, setCopied) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl relative bg-[#161b22] border-[#30363d] overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1 text-[#8b949e] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400">
              <Sparkles size={24} />
            </div>
              <div>
                <h2 className="text-xl font-bold">Improve {repo.name}</h2>
                <p className="text-sm text-[#8b949e]">AI-powered suggestions for your project</p>
               </div>
               </div>

             {error && (
              <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg space-y-3">
                <div className="text-red-400 text-sm">
                  {!isPremium && error.includes('limit') 
                    ? 'Daily free limit reached. Upgrade to Premium for unlimited AI improvements' 
                    : error}
                </div>
                {!isPremium && error.includes('limit') && (
                  <Button 
                    onClick={openUpgradeModal} 
                    variant="primary" 
                    className="w-full py-1.5 text-xs h-auto"
                  >
                    Upgrade to Premium
                  </Button>
                )}
              </div>
            )}

           <div className="space-y-4">
             <div>
               <label className="text-xs uppercase font-bold text-[#8b949e] mb-2 block">Suggested Description</label>
               <div className="relative">
                 <textarea 
                   value={editableDescription}
                   onChange={(e) => setEditableDescription(e.target.value)}
                   disabled={loadingDescription}
                   className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none min-h-[80px] resize-none"
                 />
                 {loadingDescription ? (
                   <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/50 rounded-lg">
                     <Loader2 className="animate-spin text-[#58a6ff]" size={20} />
                   </div>
                 ) : (
                     <Button 
                       variant="secondary" 
                       size="sm"
                       onClick={() => handleCopy(editableDescription, setCopiedDesc)}
                       className="absolute bottom-2 right-2 p-0 h-8 w-8 flex items-center justify-center"
                     >
                       {copiedDesc ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                     </Button>
                 )}
               </div>
                <span className="text-xs text-slate-500">
                  {(model?.toLowerCase().includes('llama') || !isPremium) 
                    ? "Powered by Llama 3 (Free)" 
                    : (model?.toLowerCase().includes('gemini') || model?.toLowerCase().includes('claude') || isPremium)
                      ? "Powered by Claude (Premium)"
                      : "Powered by Llama 3 (Free)"}
                </span>
             </div>

            <div>
              <label className="text-xs uppercase font-bold text-[#8b949e] mb-2 block">README Outline</label>
              <div className="relative">
                <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-sm text-[#e6edf3] max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono">
                  {loadingOutline ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[#58a6ff]" size={20} />
                    </div>
                  ) : (
                    outline || 'Generating outline...'
                  )}
                </div>
                {!loadingOutline && outline && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleCopy(outline, setCopiedOutline)}
                      className="absolute bottom-2 right-2 p-0 h-8 w-8 flex items-center justify-center"
                    >
                      {copiedOutline ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </Button>
                )}
              </div>
            </div>
                </div>
              </div>
      </Card>
    </div>
  );
};

export default RepoImprover;



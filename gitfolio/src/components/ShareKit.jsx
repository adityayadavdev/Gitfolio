import { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGitHubData } from '../hooks/useGitHubData';
import { generateSkillBadge } from '../services/badgeGenerator';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Copy, Share2, ExternalLink } from 'lucide-react';

const ShareKit = () => {
  const { user, token } = useAuth();
  const { languages } = useGitHubData({ username: user?.login, token });

  const username = user?.login;
  const portfolioUrl = `https://gitfolio.harmnix.com/u/${username}`;

  const topSkills = useMemo(() => {
    if (!languages) return [];
    
    const skillTotals = {};
    Object.values(languages).forEach(repoLangs => {
      if (repoLangs) {
        Object.entries(repoLangs).forEach(([lang, bytes]) => {
          skillTotals[lang] = (skillTotals[lang] || 0) + bytes;
        });
      }
    });

    return Object.entries(skillTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([lang]) => lang);
  }, [languages]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleLinkedInShare = () => {
    const text = `Check out my curated GitHub portfolio on Gitfolio! 🚀\n\n${portfolioUrl}`;
    copyToClipboard(text);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out my curated GitHub portfolio on Gitfolio! 🚀\n${portfolioUrl}`);
    window.open(`whatsapp://send?text=${text}`, '_blank');
  };

  if (!username) return null;

  return (
    <Card className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Share Your Profile</h2>
        <p className="text-gray-400">Spread the word about your engineering journey</p>
      </div>

      {/* Section 1: Portfolio Link */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <ExternalLink size={14} /> Portfolio Link
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-sm text-gray-300 font-mono truncate">
            {portfolioUrl}
          </div>
          <Button variant="secondary" onClick={() => copyToClipboard(portfolioUrl)}>
            <Copy size={16} className="inline mr-2" /> Copy
          </Button>
        </div>
        <div className="flex justify-center p-4 bg-white rounded-xl w-fit mx-auto">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portfolioUrl)}`} 
            alt="Portfolio QR Code"
            className="w-32 h-32"
          />
        </div>
      </div>

      {/* Section 2: GitHub README Badges */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Badge variant="info">README</Badge> Skill Badges
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {topSkills.map((skill, index) => {
            const depthLabels = ['Expert', 'Advanced', 'Intermediate'];
            const label = depthLabels[index] || 'Beginner';
            const { svg, markdown } = generateSkillBadge(skill, label, username);
            
            return (
              <div key={skill} className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <div 
                  className="w-28 h-5" 
                  dangerouslySetInnerHTML={{ __html: svg }} 
                />
                <Button 
                  variant="outline" 
                  className="text-xs py-1" 
                  onClick={() => copyToClipboard(markdown)}
                >
                  <Copy size={14} className="inline mr-1" /> Copy Markdown
                </Button>
              </div>
            );
          })}
          {topSkills.length === 0 && (
            <p className="text-gray-500 text-sm italic">No skill data available yet.</p>
          )}
        </div>
      </div>

      {/* Section 3: Social Share */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Share2 size={14} /> Social Share
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleLinkedInShare}>
            <Copy size={16} className="inline mr-2" /> Copy for LinkedIn
          </Button>
          <Button variant="secondary" onClick={handleWhatsAppShare}>
            <Share2 size={16} className="inline mr-2" /> Share on WhatsApp
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ShareKit;

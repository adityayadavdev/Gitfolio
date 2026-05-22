import { useState } from 'react';
import { Share2, Copy, X, Check } from 'lucide-react';
import { Card, Button } from './ui';

const ShareModal = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md relative bg-[#161b22] border-[#30363d] overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1 text-[#8b949e] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
              <Share2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Share Your Portfolio</h2>
              <p className="text-sm text-[#8b949e]">Copy the link below to share your professional Gitfolio with recruiters and peers.</p>
            </div>
          </div>

          <div className="relative flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={url} 
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-sm text-[#e6edf3] outline-none"
            />
            <Button 
              onClick={copyToClipboard} 
              variant="primary" 
              className="px-4 flex items-center gap-2 min-w-[100px] justify-center"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ShareModal;

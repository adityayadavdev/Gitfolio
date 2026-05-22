import React from 'react';
import { Lock } from 'lucide-react';
import usePremium from '../hooks/usePremium';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const LockedFeature = ({ featureName }) => {
  const { openUpgradeModal } = usePremium();

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-[#161b22] border border-[#30363d] rounded-xl">
      <div className="p-4 bg-[#30363d]/30 rounded-full flex flex-col items-center justify-center mb-4 gap-2">
        <Lock className="w-6 h-6 text-gray-400" />
        <Badge variant="info">Premium</Badge>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{featureName}</h3>
      <p className="text-sm text-gray-400 mb-6">
        Unlock this advanced feature with a premium subscription.
      </p>
      <Button 
        onClick={openUpgradeModal} 
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        Unlock with Premium
      </Button>
      <p className="mt-3 text-xs text-gray-500">
        ₹299/month or ₹999 one-time
      </p>
    </div>
  );
};

export default LockedFeature;

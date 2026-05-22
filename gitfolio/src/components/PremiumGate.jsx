import React from 'react';
import usePremium from '../hooks/usePremium';

const PremiumGate = ({ children, fallback, feature }) => {
  const { isPremium, isPremiumLoading } = usePremium();

  if (isPremiumLoading) {
    return <div className="w-full h-full bg-gray-800 animate-pulse rounded-lg opacity-50" />;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default PremiumGate;

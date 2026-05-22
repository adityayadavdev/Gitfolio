import React from 'react';

export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300',
    success: 'bg-green-900/30 text-green-400 border border-green-900/50',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-900/50',
    warning: 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50',
    danger: 'bg-red-900/30 text-red-400 border border-red-900/50',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center justify-center ${variants[variant]}`}>
      {children}
    </span>
  );
};



import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-[#161b22] animate-pulse border border-[#30363d] rounded ${className}`} />
  );
};



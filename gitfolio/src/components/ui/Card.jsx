import React from 'react';

export function Card({ children, className = '', padding = 'p-6' }) {
  return (
    <div className={`bg-[#161b22] border border-[#30363d] rounded-xl ${padding} ${className}`}>
      {children}
    </div>
  );
};

import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  className = '',
  ...props 
}) {
  const variants = {
    primary: 'bg-[#3fb950] text-white hover:bg-[#34a143]',
    secondary: 'bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] border border-[#30363d]',
    outline: 'border border-[#30363d] text-[#e6edf3] hover:bg-[#161b22]',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-md font-medium transition-all ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

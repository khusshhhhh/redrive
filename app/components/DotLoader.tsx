'use client';

import React from 'react';

interface DotLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const DotLoader: React.FC<DotLoaderProps> = ({ 
  size = 'md', 
  color = 'white' 
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };

  const containerSizeClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  };

  return (
    <span className={`flex items-center justify-center ${containerSizeClasses[size]}`} aria-hidden="true">
      <div 
        className={`${sizeClasses[size]} rounded-full`}
        style={{ 
          backgroundColor: color,
          animation: 'dotPulse 1.4s infinite ease-in-out',
          animationDelay: '0s'
        }}
      />
      <div 
        className={`${sizeClasses[size]} rounded-full`}
        style={{ 
          backgroundColor: color,
          animation: 'dotPulse 1.4s infinite ease-in-out',
          animationDelay: '0.16s'
        }}
      />
      <div 
        className={`${sizeClasses[size]} rounded-full`}
        style={{ 
          backgroundColor: color,
          animation: 'dotPulse 1.4s infinite ease-in-out',
          animationDelay: '0.32s'
        }}
      />
    </span>
  );
};

export default DotLoader;

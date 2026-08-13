'use client';

import React from 'react';
import usePresence from '@/app/hooks/usePresence';

interface DataPreloaderProps {
  isAuthenticated?: boolean;
}

const DataPreloader: React.FC<DataPreloaderProps> = ({ isAuthenticated = false }) => {
  usePresence(isAuthenticated);

  return null; // This component doesn't render anything
};

export default DataPreloader;

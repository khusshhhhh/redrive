'use client';

import React, { useEffect } from 'react';
import SuburbDataLoader from '@/app/libs/SuburbDataLoader';
import usePresence from '@/app/hooks/usePresence';

interface DataPreloaderProps {
  isAuthenticated?: boolean;
}

const DataPreloader: React.FC<DataPreloaderProps> = ({ isAuthenticated = false }) => {
  useEffect(() => {
    // Preload suburb data in the background
    const dataLoader = SuburbDataLoader.getInstance();
    dataLoader.preload();
  }, []);

  usePresence(isAuthenticated);

  return null; // This component doesn't render anything
};

export default DataPreloader;
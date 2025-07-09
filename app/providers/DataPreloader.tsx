'use client';

import React, { useEffect } from 'react';
import SuburbDataLoader from '@/app/libs/SuburbDataLoader';

const DataPreloader: React.FC = () => {
  useEffect(() => {
    // Preload suburb data in the background
    const dataLoader = SuburbDataLoader.getInstance();
    dataLoader.preload();
  }, []);

  return null; // This component doesn't render anything
};

export default DataPreloader;
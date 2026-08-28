'use client';

import React from 'react';
import usePresence from '@/app/hooks/usePresence';
import { useCurrentUser } from '@/app/providers/CurrentUserProvider';

const DataPreloader: React.FC = () => {
  const { isAuthenticated } = useCurrentUser();

  usePresence(isAuthenticated);

  return null; // This component doesn't render anything
};

export default DataPreloader;

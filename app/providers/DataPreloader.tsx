'use client';

import React from 'react';
import usePresence from '@/app/hooks/usePresence';
import { useCurrentUser } from '@/app/providers/CurrentUserProvider';
import { useLiveUpdates } from '@/app/hooks/useLiveUpdates';
import { userChannel } from '@/app/libs/realtime/events';

const DataPreloader: React.FC = () => {
  const { currentUser, isAuthenticated } = useCurrentUser();

  usePresence(isAuthenticated);

  // App-wide realtime bridge: when a notification lands on the user's channel,
  // poke the notification hook (which already listens for this event) so the
  // bell badge updates without waiting for its next poll. No-op unless realtime
  // is enabled; the 60s poll in useNotifications stays as the fallback.
  useLiveUpdates({
    channel: currentUser ? userChannel(currentUser.id) : null,
    sseUrl: null,
    handlers: {
      notification: () => {
        window.dispatchEvent(new Event('redrive:notifications'));
      },
    },
  });

  return null; // This component doesn't render anything
};

export default DataPreloader;

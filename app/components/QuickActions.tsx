'use client';

import React, { useState } from 'react';
import {
  Plus,
  MessageCircle,
  Calendar,
  Star,
  MapPin,
  TrendingUp,
  Heart,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SafeUser } from '@/app/types';
import useRentModal from '@/app/hooks/useRentModal';
import useLoginModal from '@/app/hooks/useLoginModal';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import Button from './Button';

interface QuickActionsProps {
  currentUser?: SafeUser | null;
}

const QuickActions: React.FC<QuickActionsProps> = ({ currentUser }) => {
  const router = useRouter();
  const rentModal = useRentModal();
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    {
      id: 'list-vehicle',
      label: 'List Your Vehicle',
      description: 'Start earning by listing your car, van, or boat',
      icon: Plus,
      action: () => rentModal.onOpen(),
      requiresAuth: true,
      featured: true
    },
    {
      id: 'messages',
      label: 'Messages',
      description: 'Check your conversations with other users',
      icon: MessageCircle,
      action: () => router.push('/messages'),
      requiresAuth: true
    },
    {
      id: 'my-trips',
      label: 'My Trips',
      description: 'View your upcoming and past bookings',
      icon: Calendar,
      action: () => router.push('/trips'),
      requiresAuth: true
    },
    {
      id: 'favorites',
      label: 'Favorites',
      description: 'See vehicles you have saved',
      icon: Heart,
      action: () => router.push('/favorites'),
      requiresAuth: true
    },
    {
      id: 'reviews',
      label: 'Reviews',
      description: 'Manage reviews and ratings',
      icon: Star,
      action: () => router.push('/review'),
      requiresAuth: true
    },
    {
      id: 'nearby',
      label: 'Nearby Vehicles',
      description: 'Find vehicles close to your location',
      icon: MapPin,
      action: () => {
        // Get user location and redirect with location filter
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            router.push(`/?lat=${latitude}&lng=${longitude}&radius=10`);
          });
        }
      },
      requiresAuth: false
    },
    {
      id: 'trending',
      label: 'Trending',
      description: 'Popular vehicles this week',
      icon: TrendingUp,
      action: () => router.push('/?sortBy=trending'),
      requiresAuth: false
    },
    {
      id: 'instant-book',
      label: 'Instant Book',
      description: 'Vehicles you can book immediately',
      icon: Zap,
      action: () => router.push('/?instantBook=true'),
      requiresAuth: false
    }
  ];

  const featuredActions = quickActions.filter(action => action.featured);
  const regularActions = quickActions.filter(action => !action.featured);

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.requiresAuth && !currentUser) {
      loginModal.onOpen();
      return;
    }
    action.action();
  };

  return (
    <div className="bg-white rounded-md shadow-card mb-6">
      <div className="p-4 border-b border-hairline-soft">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-semibold text-ink">Quick Actions</h3>
          {regularActions.length > 0 && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              small
              outline
            >
              {isExpanded ? 'Show Less' : 'More Actions'}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Featured Actions */}
        {featuredActions.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className="bg-primary hover:bg-primary-active text-white p-4 rounded-md transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white bg-opacity-20 p-2 rounded-md">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{action.label}</h4>
                        <p className="text-sm opacity-90">{action.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Actions Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${!isExpanded && regularActions.length > 4 ? 'overflow-hidden' : ''}`}>
          {(isExpanded ? regularActions : regularActions.slice(0, 4)).map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="p-3 text-center bg-surface-soft hover:bg-surface-strong rounded-md transition-colors group"
              >
                <div className="w-12 h-12 rounded-md mx-auto mb-2 flex items-center justify-center bg-white border border-hairline group-hover:border-ink transition-colors">
                  <Icon className="w-6 h-6 text-ink" />
                </div>
                <h4 className="font-medium text-sm text-ink mb-1">{action.label}</h4>
                <p className="text-xs text-muted leading-tight">{action.description}</p>
              </button>
            );
          })}
        </div>

        {!isExpanded && regularActions.length > 4 && (
          <div className="mt-4 text-center">
            <Button
              onClick={() => setIsExpanded(true)}
              small
              outline
            >
              Show {regularActions.length - 4} More Actions
            </Button>
          </div>
        )}
      </div>

      {/* Guest Call-to-Action */}
      {!currentUser && (
        <div className="border-t border-hairline-soft p-4">
          <div className="text-center">
            <h4 className="font-semibold text-ink mb-2">Join Redrive Today</h4>
            <p className="text-sm text-muted mb-3">
              Access personalized features, save favorites, and start your adventure!
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => registerModal.onOpen()}
                small
              >
                Sign Up
              </Button>
              <Button
                onClick={() => loginModal.onOpen()}
                small
                outline
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;

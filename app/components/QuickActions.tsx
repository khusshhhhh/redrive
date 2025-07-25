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
  Settings,
  HelpCircle,
  Zap,
  Filter,
  Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SafeUser } from '@/app/types';
import useRentModal from '@/app/hooks/useRentModal';
import Button from './Button';

interface QuickActionsProps {
  currentUser?: SafeUser | null;
}

const QuickActions: React.FC<QuickActionsProps> = ({ currentUser }) => {
  const router = useRouter();
  const rentModal = useRentModal();
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    {
      id: 'list-vehicle',
      label: 'List Your Vehicle',
      description: 'Start earning by listing your car, van, or boat',
      icon: Plus,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => rentModal.onOpen(),
      requiresAuth: true,
      featured: true
    },
    {
      id: 'messages',
      label: 'Messages',
      description: 'Check your conversations with other users',
      icon: MessageCircle,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => router.push('/messages'),
      requiresAuth: true,
      badge: '3' // This could be dynamic
    },
    {
      id: 'my-trips',
      label: 'My Trips',
      description: 'View your upcoming and past bookings',
      icon: Calendar,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => router.push('/trips'),
      requiresAuth: true
    },
    {
      id: 'favorites',
      label: 'Favorites',
      description: 'See vehicles you have saved',
      icon: Heart,
      color: 'bg-red-500 hover:bg-red-600',
      action: () => router.push('/favorites'),
      requiresAuth: true
    },
    {
      id: 'reviews',
      label: 'Reviews',
      description: 'Manage reviews and ratings',
      icon: Star,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      action: () => router.push('/review'),
      requiresAuth: true
    },
    {
      id: 'nearby',
      label: 'Nearby Vehicles',
      description: 'Find vehicles close to your location',
      icon: MapPin,
      color: 'bg-indigo-500 hover:bg-indigo-600',
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
      color: 'bg-pink-500 hover:bg-pink-600',
      action: () => router.push('/?sortBy=trending'),
      requiresAuth: false
    },
    {
      id: 'instant-book',
      label: 'Instant Book',
      description: 'Vehicles you can book immediately',
      icon: Zap,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => router.push('/?instantBook=true'),
      requiresAuth: false
    }
  ];

  const featuredActions = quickActions.filter(action => action.featured);
  const regularActions = quickActions.filter(action => !action.featured);

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.requiresAuth && !currentUser) {
      router.push('/login');
      return;
    }
    action.action();
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </div>
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
                    className={`${action.color} text-white p-4 rounded-lg transition-all transform hover:scale-105 hover:shadow-lg`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
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
                className="relative p-3 text-center bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                {action.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
                <div className={`${action.color} w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">{action.label}</h4>
                <p className="text-xs text-gray-600 leading-tight">{action.description}</p>
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

      {/* Quick Stats for authenticated users */}
      {currentUser && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-xs text-gray-600">Total Trips</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">$1,240</div>
              <div className="text-xs text-gray-600">Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">4.9</div>
              <div className="text-xs text-gray-600">Rating</div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Call-to-Action */}
      {!currentUser && (
        <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="text-center">
            <h4 className="font-semibold text-gray-900 mb-2">Join REDRIVE Today</h4>
            <p className="text-sm text-gray-600 mb-3">
              Access personalized features, save favorites, and start your adventure!
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => router.push('/register')}
                small
              >
                Sign Up
              </Button>
              <Button
                onClick={() => router.push('/login')}
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
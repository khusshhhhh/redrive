'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Star, 
  DollarSign,
  ChevronRight,
  Eye,
  Heart,
  Calendar
} from 'lucide-react';
import { SafeListing, SafeUser } from '@/app/types';
import ListingCard from './listings/ListingCard';
import Button from './Button';
import { useRouter } from 'next/navigation';

interface SmartRecommendationsProps {
  currentUser?: SafeUser | null;
  userLocation?: { lat: number; lng: number; };
  viewedListings?: string[];
  favoriteListings?: string[];
}

interface RecommendationSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  listings: SafeListing[];
  reason: string;
  actionText?: string;
  actionUrl?: string;
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  currentUser,
  userLocation,
  viewedListings = [],
  favoriteListings = []
}) => {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Mock data for demonstration - in real app this would come from API
  const mockListings: SafeListing[] = [
    {
      id: '1',
      title: '2023 Toyota Camry - Sydney CBD',
      description: 'Perfect for business trips and city driving',
      imageSrc: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=800',
      createdAt: new Date().toISOString(),
      category: 'Car',
      roomCount: 1,
      bathroomCount: 1,
      guestCount: 5,
      locationValue: 'Sydney',
      userId: 'owner1',
      price: 85,
      regoImage: ''
    },
    {
      id: '2',
      title: 'Luxury BMW X5 - Melbourne',
      description: 'Premium SUV for special occasions',
      imageSrc: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
      createdAt: new Date().toISOString(),
      category: 'Car',
      roomCount: 1,
      bathroomCount: 1,
      guestCount: 7,
      locationValue: 'Melbourne',
      userId: 'owner2',
      price: 150,
      regoImage: ''
    },
    {
      id: '3',
      title: 'Adventure Campervan - Brisbane',
      description: 'Your home on wheels for the perfect getaway',
      imageSrc: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
      createdAt: new Date().toISOString(),
      category: 'Motorhomes',
      roomCount: 1,
      bathroomCount: 1,
      guestCount: 4,
      locationValue: 'Brisbane',
      userId: 'owner3',
      price: 120,
      regoImage: ''
    }
  ];

  useEffect(() => {
    generateRecommendations();
  }, [currentUser, userLocation, viewedListings, favoriteListings]);

  const generateRecommendations = async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const sections: RecommendationSection[] = [];

    // For authenticated users
    if (currentUser) {
      // Based on viewing history
      if (viewedListings.length > 0) {
        sections.push({
          id: 'similar-viewed',
          title: 'Similar to Recently Viewed',
          description: 'Based on vehicles you\'ve recently looked at',
          icon: Eye,
          color: 'text-blue-500',
          listings: mockListings.slice(0, 2),
          reason: 'You viewed similar cars in Sydney',
          actionText: 'View All Similar',
          actionUrl: '/search?similar=true'
        });
      }

      // Based on favorites
      if (favoriteListings.length > 0) {
        sections.push({
          id: 'like-favorites',
          title: 'More Like Your Favorites',
          description: 'Vehicles similar to ones you\'ve saved',
          icon: Heart,
          color: 'text-red-500',
          listings: mockListings.slice(1, 3),
          reason: 'You favorited luxury SUVs',
          actionText: 'Browse Luxury Vehicles',
          actionUrl: '/search?category=luxury'
        });
      }

      // Upcoming trips suggestion
      sections.push({
        id: 'upcoming-occasions',
        title: 'Perfect for Upcoming Occasions',
        description: 'Great vehicles for holidays and special events',
        icon: Calendar,
        color: 'text-purple-500',
        listings: mockListings.slice(2, 3),
        reason: 'Easter holidays are coming up',
        actionText: 'Plan Your Trip',
        actionUrl: '/search?occasion=holiday'
      });
    }

    // Location-based recommendations
    if (userLocation) {
      sections.push({
        id: 'nearby',
        title: 'Near You',
        description: 'Convenient pickups in your area',
        icon: MapPin,
        color: 'text-green-500',
        listings: mockListings.slice(0, 3),
        reason: 'Within 5km of your location',
        actionText: 'See All Nearby',
        actionUrl: `/search?lat=${userLocation.lat}&lng=${userLocation.lng}`
      });
    }

    // Trending vehicles
    sections.push({
      id: 'trending',
      title: 'Trending This Week',
      description: 'Popular choices among REDRIVE users',
      icon: TrendingUp,
      color: 'text-orange-500',
      listings: mockListings.slice(1, 3),
      reason: 'Most booked vehicles this week',
      actionText: 'See What\'s Hot',
      actionUrl: '/search?trending=true'
    });

    // Budget-friendly options
    sections.push({
      id: 'budget-friendly',
      title: 'Great Value',
      description: 'Quality vehicles at competitive prices',
      icon: DollarSign,
      color: 'text-emerald-500',
      listings: mockListings.filter(l => l.price < 100),
      reason: 'Under $100/day with excellent ratings',
      actionText: 'More Budget Options',
      actionUrl: '/search?maxPrice=100'
    });

    // Last minute deals
    sections.push({
      id: 'last-minute',
      title: 'Available Now',
      description: 'Ready for immediate booking',
      icon: Clock,
      color: 'text-amber-500',
      listings: mockListings.slice(0, 2),
      reason: 'Available for next 24 hours',
      actionText: 'Book Instantly',
      actionUrl: '/search?available=now'
    });

    // Filter out empty sections
    const filteredSections = sections.filter(section => section.listings.length > 0);
    
    setRecommendations(filteredSections);
    setLoading(false);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleActionClick = (url: string) => {
    router.push(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="h-6 bg-gray-300 rounded w-48"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900">Recommended for You</h3>
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
            Personalized
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Curated selections based on your preferences and activity
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {recommendations.map((section, index) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.id);
          const isFirst = index < 2; // Show first 2 sections by default
          const shouldShow = isFirst || isExpanded;

          return (
            <div key={section.id} className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${section.color}`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{section.title}</h4>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {section.listings.length} vehicle{section.listings.length > 1 ? 's' : ''}
                  </span>
                  {!isFirst && (
                    <ChevronRight 
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  )}
                </div>
              </div>

              {shouldShow && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                    <Sparkles className="inline w-3 h-3 mr-1" />
                    {section.reason}
                  </div>
                  
                  {/* Horizontal scroll for listings */}
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {section.listings.map((listing) => (
                      <div key={listing.id} className="min-w-[280px]">
                        <ListingCard
                          data={listing}
                          currentUser={currentUser}
                        />
                      </div>
                    ))}
                  </div>

                  {section.actionText && section.actionUrl && (
                    <div className="text-center">
                      <Button
                        onClick={() => handleActionClick(section.actionUrl!)}
                        small
                        outline
                        icon={ChevronRight}
                      >
                        {section.actionText}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresh Recommendations */}
      <div className="p-4 border-t border-gray-200 text-center">
        <Button
          onClick={generateRecommendations}
          small
          outline
          icon={Sparkles}
        >
          Refresh Recommendations
        </Button>
      </div>
    </div>
  );
};

export default SmartRecommendations;
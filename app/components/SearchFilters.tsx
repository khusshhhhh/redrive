'use client';

import React, { useState, useCallback } from 'react';
import { Search, Filter, MapPin, Calendar, DollarSign, Star, Users, Fuel, Settings } from 'lucide-react';
import { categories } from './navbar/Categories';
import Button from './Button';

interface SearchFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
}

export interface FilterOptions {
  category?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  minRating?: number;
  features?: string[];
  fuelType?: string;
  transmission?: string;
  passengers?: number;
  sortBy?: 'price' | 'rating' | 'distance' | 'newest';
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFiltersChange,
  initialFilters = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const features = [
    'Air Conditioning', 'GPS Navigation', 'Bluetooth', 'Backup Camera',
    'Roof Rack', 'Tow Hitch', 'Solar Panel', 'WiFi Hotspot',
    'Pet Friendly', 'Smoking Allowed', 'Child Seats Available', 'Bicycle Rack'
  ];

  const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'];
  const transmissionTypes = ['Automatic', 'Manual'];

  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Count active filters
    const count = Object.values(newFilters).filter(v => 
      v !== undefined && v !== null && v !== '' && 
      (Array.isArray(v) ? v.length > 0 : true)
    ).length;
    setActiveFiltersCount(count);
    
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    const emptyFilters: FilterOptions = {};
    setFilters(emptyFilters);
    setActiveFiltersCount(0);
    onFiltersChange(emptyFilters);
  }, [onFiltersChange]);

  const toggleFeature = useCallback((feature: string) => {
    const currentFeatures = filters.features || [];
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];
    updateFilter('features', newFeatures);
  }, [filters.features, updateFilter]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      {/* Quick Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by location, vehicle type, or features..."
              value={filters.location || ''}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            small
            outline
            icon={Filter}
          >
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Category & Basic Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {categories.map((cat) => (
                  <option key={cat.label} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Price Range (per day)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin || ''}
                  onChange={(e) => updateFilter('priceMin', parseInt(e.target.value) || undefined)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax || ''}
                  onChange={(e) => updateFilter('priceMax', parseInt(e.target.value) || undefined)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Dates
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Star className="inline w-4 h-4 mr-1" />
                Minimum Rating
              </label>
              <select
                value={filters.minRating || ''}
                onChange={(e) => updateFilter('minRating', parseFloat(e.target.value) || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
              </select>
            </div>
          </div>

          {/* Vehicle Specs Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Fuel className="inline w-4 h-4 mr-1" />
                Fuel Type
              </label>
              <select
                value={filters.fuelType || ''}
                onChange={(e) => updateFilter('fuelType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Fuel</option>
                {fuelTypes.map((fuel) => (
                  <option key={fuel} value={fuel}>{fuel}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="inline w-4 h-4 mr-1" />
                Transmission
              </label>
              <select
                value={filters.transmission || ''}
                onChange={(e) => updateFilter('transmission', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Type</option>
                {transmissionTypes.map((trans) => (
                  <option key={trans} value={trans}>{trans}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Passengers
              </label>
              <select
                value={filters.passengers || ''}
                onChange={(e) => updateFilter('passengers', parseInt(e.target.value) || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Size</option>
                <option value="2">2+ Passengers</option>
                <option value="4">4+ Passengers</option>
                <option value="5">5+ Passengers</option>
                <option value="7">7+ Passengers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy || ''}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                <option value="price">Price (Low to High)</option>
                <option value="rating">Highest Rated</option>
                <option value="distance">Nearest First</option>
                <option value="newest">Newest Listed</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Features & Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {features.map((feature) => {
                const isSelected = filters.features?.includes(feature) || false;
                return (
                  <button
                    key={feature}
                    onClick={() => toggleFeature(feature)}
                    className={`p-2 text-xs rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {feature}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All Filters
            </button>
            <div className="text-sm text-gray-500">
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
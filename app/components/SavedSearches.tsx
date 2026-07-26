'use client';

import React, { useState, useEffect } from 'react';
import { Save, Search, Trash2, Star, Clock } from 'lucide-react';
import { FilterOptions } from './SearchFilters';
import Button from './Button';
import toast from 'react-hot-toast';

interface SavedSearch {
  id: string;
  name: string;
  filters: FilterOptions;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

interface SavedSearchesProps {
  currentFilters: FilterOptions;
  onApplySearch?: (filters: FilterOptions) => void;
}

const SavedSearches: React.FC<SavedSearchesProps> = ({
  currentFilters,
  onApplySearch = () => {}
}) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('redrive-saved-searches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved searches:', error);
      }
    }
  }, []);

  // Save to localStorage
  const saveToBrowser = (searches: SavedSearch[]) => {
    localStorage.setItem('redrive-saved-searches', JSON.stringify(searches));
    setSavedSearches(searches);
  };

  // Save current filters as a new search
  const saveCurrentSearch = () => {
    if (!searchName.trim()) {
      toast.error('Please enter a name for your search');
      return;
    }

    // Check if filters are not empty
    const hasFilters = Object.values(currentFilters).some(value => 
      value !== undefined && value !== null && value !== '' &&
      (Array.isArray(value) ? value.length > 0 : true)
    );

    if (!hasFilters) {
      toast.error('Please set some filters before saving');
      return;
    }

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters: currentFilters,
      createdAt: new Date().toISOString(),
      useCount: 0
    };

    const updatedSearches = [newSearch, ...savedSearches];
    saveToBrowser(updatedSearches);
    
    setSearchName('');
    setShowSaveDialog(false);
    toast.success('Search saved successfully!');
  };

  // Apply a saved search
  const applySearch = (search: SavedSearch) => {
    const updatedSearch = {
      ...search,
      lastUsed: new Date().toISOString(),
      useCount: search.useCount + 1
    };

    const updatedSearches = savedSearches.map(s => 
      s.id === search.id ? updatedSearch : s
    );
    saveToBrowser(updatedSearches);

    onApplySearch(search.filters);
    toast.success(`Applied "${search.name}" search`);
  };

  // Delete a saved search
  const deleteSearch = (searchId: string) => {
    const updatedSearches = savedSearches.filter(s => s.id !== searchId);
    saveToBrowser(updatedSearches);
    toast.success('Search deleted');
  };

  // Generate search description
  const getSearchDescription = (filters: FilterOptions): string => {
    const parts: string[] = [];
    
    if (filters.category) parts.push(filters.category);
    if (filters.location) parts.push(`in ${filters.location}`);
    if (filters.priceMin || filters.priceMax) {
      if (filters.priceMin && filters.priceMax) {
        parts.push(`$${filters.priceMin}-$${filters.priceMax}/day`);
      } else if (filters.priceMin) {
        parts.push(`from $${filters.priceMin}/day`);
      } else if (filters.priceMax) {
        parts.push(`up to $${filters.priceMax}/day`);
      }
    }
    if (filters.minRating) parts.push(`${filters.minRating}+ stars`);
    if (filters.features?.length) {
      parts.push(`${filters.features.length} feature${filters.features.length > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'All vehicles';
  };

  // Sort searches by most recently used, then by use count
  const sortedSearches = [...savedSearches].sort((a, b) => {
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    if (a.lastUsed && !b.lastUsed) return -1;
    if (!a.lastUsed && b.lastUsed) return 1;
    return b.useCount - a.useCount;
  });

  const hasCurrentFilters = Object.values(currentFilters).some(value => 
    value !== undefined && value !== null && value !== '' &&
    (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-gray-200 dark:border-neutral-700 mb-6">
      <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900 dark:text-neutral-100">Saved Searches</h3>
            {savedSearches.length > 0 && (
              <span className="bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-400 text-xs px-2 py-1 rounded-full">
                {savedSearches.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasCurrentFilters && (
              <Button
                onClick={() => setShowSaveDialog(true)}
                small
                outline
                icon={Save}
              >
                Save Current
              </Button>
            )}
            {savedSearches.length > 0 && (
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                small
                outline
              >
                {isExpanded ? 'Hide' : 'Show'} ({savedSearches.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-blue-50 dark:bg-neutral-700 border-b border-blue-200 dark:border-neutral-600">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Search Name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Weekend Cars in Sydney"
                className="w-full p-2 border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-neutral-400">
              <strong>Current filters:</strong> {getSearchDescription(currentFilters)}
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCurrentSearch} small>
                Save Search
              </Button>
              <Button onClick={() => setShowSaveDialog(false)} small outline>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Searches List */}
      {savedSearches.length > 0 && (isExpanded || savedSearches.length <= 3) && (
        <div className="p-4">
          <div className="space-y-3">
            {(isExpanded ? sortedSearches : sortedSearches.slice(0, 3)).map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-neutral-100 truncate">
                      {search.name}
                    </h4>
                    {search.useCount > 0 && (
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        Used {search.useCount} time{search.useCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-neutral-400 truncate">
                    {getSearchDescription(search.filters)}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(search.createdAt).toLocaleDateString()}
                    </span>
                    {search.lastUsed && (
                      <span className="flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        Last used {new Date(search.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    onClick={() => applySearch(search)}
                    small
                    icon={Search}
                  >
                    Apply
                  </Button>
                  <button
                    onClick={() => deleteSearch(search.id)}
                    className="p-1 text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors"
                    title="Delete search"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {!isExpanded && savedSearches.length > 3 && (
            <div className="mt-3 text-center">
              <Button
                onClick={() => setIsExpanded(true)}
                small
                outline
              >
                Show {savedSearches.length - 3} more searches
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {savedSearches.length === 0 && (
        <div className="p-6 text-center text-gray-500 dark:text-neutral-400">
          <Star className="w-12 h-12 text-gray-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm">No saved searches yet</p>
          <p className="text-xs mt-1">Set some filters and save them for quick access</p>
        </div>
      )}
    </div>
  );
};

export default SavedSearches;
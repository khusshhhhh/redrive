'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Search, 
  Star, 
  Zap,
  CheckCircle,
  Skip,
  PlayCircle
} from 'lucide-react';
import Button from './Button';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  target?: string; // CSS selector for highlighting
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface FeatureTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const FeatureTour: React.FC<FeatureTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: '🎉 Welcome to the New REDRIVE!',
      description: 'We\'ve enhanced your experience with powerful new features. Let us show you around!',
      icon: Sparkles,
      position: 'center'
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions Hub',
      description: 'Access common tasks instantly. List your vehicle, check messages, or find nearby cars with one click.',
      icon: Zap,
      target: '[data-tour="quick-actions"]',
      position: 'bottom'
    },
    {
      id: 'smart-search',
      title: 'Advanced Search Filters',
      description: 'Find exactly what you need with detailed filters for price, features, fuel type, and more.',
      icon: Search,
      target: '[data-tour="search-filters"]',
      position: 'bottom',
      action: {
        label: 'Try Filters',
        onClick: () => {
          const filterButton = document.querySelector('[data-tour="filter-button"]') as HTMLElement;
          filterButton?.click();
        }
      }
    },
    {
      id: 'saved-searches',
      title: 'Save Your Searches',
      description: 'Never lose a good search again! Save your filter combinations for quick access later.',
      icon: Star,
      target: '[data-tour="saved-searches"]',
      position: 'bottom'
    },
    {
      id: 'recommendations',
      title: 'Smart Recommendations',
      description: 'Get personalized vehicle suggestions based on your browsing history, favorites, and location.',
      icon: Sparkles,
      target: '[data-tour="recommendations"]',
      position: 'top'
    },
    {
      id: 'mobile-optimized',
      title: 'Mobile-First Design',
      description: 'Every feature works beautifully on your phone. Swipe through images, get notifications, and book on the go.',
      icon: PlayCircle,
      position: 'center'
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start exploring with your enhanced REDRIVE experience. Happy driving! 🚗',
      icon: CheckCircle,
      position: 'center'
    }
  ];

  const currentTourStep = tourSteps[currentStep];

  useEffect(() => {
    // Highlight target element
    if (currentTourStep.target) {
      const element = document.querySelector(currentTourStep.target);
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight class
        element.classList.add('tour-highlight');
      }
    } else {
      setHighlightedElement(null);
    }

    // Cleanup highlight on step change
    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('tour-highlight');
      }
    };
  }, [currentStep, currentTourStep.target]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    onComplete();
    
    // Save completion to localStorage
    localStorage.setItem('redrive-tour-completed', 'true');
  };

  const skipTour = () => {
    setIsVisible(false);
    onSkip();
    
    // Save skip to localStorage
    localStorage.setItem('redrive-tour-skipped', 'true');
  };

  if (!isVisible) return null;

  const Icon = currentTourStep.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isCenterPosition = currentTourStep.position === 'center';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        {/* Tour Modal */}
        <div className={`
          bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-300
          ${isCenterPosition ? 'scale-100' : 'scale-95'}
        `}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{currentTourStep.title}</h3>
                  <div className="text-xs text-gray-500">
                    Step {currentStep + 1} of {tourSteps.length}
                  </div>
                </div>
              </div>
              <button
                onClick={skipTour}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-700 leading-relaxed mb-4">
              {currentTourStep.description}
            </p>

            {/* Action Button */}
            {currentTourStep.action && (
              <div className="mb-4">
                <Button
                  onClick={currentTourStep.action.onClick}
                  small
                  outline
                >
                  {currentTourStep.action.label}
                </Button>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={prevStep}
                  disabled={isFirstStep}
                  small
                  outline
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
              </div>

              <div className="flex gap-2">
                {!isLastStep && (
                  <Button
                    onClick={skipTour}
                    small
                    outline
                    icon={Skip}
                  >
                    Skip Tour
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  small
                  icon={isLastStep ? CheckCircle : ChevronRight}
                >
                  {isLastStep ? 'Complete' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tour Styles */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 51 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3) !important;
          border-radius: 8px;
          animation: tour-pulse 2s infinite;
        }

        @keyframes tour-pulse {
          0% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.2);
          }
          100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
    </>
  );
};

// Hook to manage tour state
export const useFeatureTour = () => {
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    // Check if user has completed or skipped the tour
    const tourCompleted = localStorage.getItem('redrive-tour-completed');
    const tourSkipped = localStorage.getItem('redrive-tour-skipped');
    
    // Show tour for new users or if it's been a while
    if (!tourCompleted && !tourSkipped) {
      // Delay showing tour to let the page load
      const timer = setTimeout(() => {
        setShouldShowTour(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = () => {
    setShouldShowTour(true);
  };

  const completeTour = () => {
    setShouldShowTour(false);
  };

  const skipTour = () => {
    setShouldShowTour(false);
  };

  return {
    shouldShowTour,
    startTour,
    completeTour,
    skipTour
  };
};

export default FeatureTour;
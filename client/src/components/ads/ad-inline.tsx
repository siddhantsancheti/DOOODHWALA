import { useState, useEffect } from 'react';
import { ExternalLink, X, Star } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Ad } from '@shared/schema';

interface AdInlineProps {
  targetAudience?: string;
  targetLocation?: string;
  className?: string;
}

export function AdInline({ targetAudience, targetLocation, className = '' }: AdInlineProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    loadAd();
  }, [targetAudience, targetLocation]);

  // Track impression when ad is displayed
  useEffect(() => {
    if (ad && isVisible) {
      trackAdEvent('impression');
    }
  }, [ad, isVisible]);

  const loadAd = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ads?position=inline&targetAudience=${targetAudience}&targetLocation=${targetLocation}`);
      const adData = await response.json();
      if (adData.length > 0) {
        setAd(adData[0]);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackAdEvent = async (event: string) => {
    if (!ad) return;
    
    try {
      await apiRequest(`/api/ads/${ad.id}/track`, 'POST', {
        event,
      });
    } catch (error) {
      console.error('Error tracking ad event:', error);
    }
  };

  const handleAdClick = async () => {
    if (!ad) return;
    
    await trackAdEvent('click');
    window.open(ad.ctaUrl, '_blank');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (isLoading || !ad || !isVisible) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm ${className}`}>
      <div className="relative">
        {/* Ad Badge */}
        <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
          Sponsored
        </div>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
        
        {/* Ad Content */}
        <div className="p-6 pt-12">
          <div className="flex items-center space-x-4">
            {/* Ad Image */}
            {ad.imageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm"
                />
              </div>
            )}
            
            {/* Ad Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {ad.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {ad.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    By {ad.advertiserName}
                  </span>
                  {ad.adType === 'sponsored' && (
                    <div className="flex items-center space-x-1">
                      <Star size={12} className="text-yellow-400 fill-current" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Verified
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleAdClick}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <ExternalLink size={16} className="mr-2" />
                  {ad.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
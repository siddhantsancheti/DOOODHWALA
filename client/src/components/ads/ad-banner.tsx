import { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Ad } from '@shared/schema';

interface AdBannerProps {
  position: string;
  targetAudience?: string;
  targetLocation?: string;
  className?: string;
}

export function AdBanner({ position, targetAudience, targetLocation, className = '' }: AdBannerProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const currentAd = ads[currentAdIndex];

  useEffect(() => {
    loadAds();
  }, [position, targetAudience, targetLocation]);

  // Auto-rotate ads every 30 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  // Track impression when ad is displayed
  useEffect(() => {
    if (currentAd && isVisible) {
      trackAdEvent('impression');
    }
  }, [currentAd, isVisible]);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ads?position=${position}&targetAudience=${targetAudience}&targetLocation=${targetLocation}`);
      const adData = await response.json();
      setAds(adData);
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackAdEvent = async (event: string) => {
    if (!currentAd) return;
    
    try {
      await apiRequest('POST', `/api/ads/${currentAd.id}/track`, {
        event,
      });
    } catch (error) {
      console.error('Error tracking ad event:', error);
    }
  };

  const handleAdClick = async () => {
    if (!currentAd) return;
    
    await trackAdEvent('click');
    window.open(currentAd.ctaUrl, '_blank');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (isLoading || !currentAd || !isVisible) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      <div className="relative">
        {/* Ad Badge */}
        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          Ad
        </div>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
        
        {/* Ad Content */}
        <div className="p-4 pt-8">
          <div className="flex items-start space-x-4">
            {/* Ad Image */}
            {currentAd.imageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={currentAd.imageUrl}
                  alt={currentAd.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              </div>
            )}
            
            {/* Ad Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {currentAd.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {currentAd.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  By {currentAd.advertiserName}
                </span>
                <button
                  onClick={handleAdClick}
                  className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                >
                  <ExternalLink size={14} className="mr-1" />
                  {currentAd.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ad Indicators */}
        {ads.length > 1 && (
          <div className="flex justify-center space-x-1 pb-2">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                className={`w-2 h-2 rounded-full ${
                  index === currentAdIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
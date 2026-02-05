import { useState, useEffect } from 'react';
import { ExternalLink, X, TrendingUp, Users, Heart } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Ad } from '@shared/schema';

interface AdSidebarProps {
  targetAudience?: string;
  targetLocation?: string;
  className?: string;
}

export function AdSidebar({ targetAudience, targetLocation, className = '' }: AdSidebarProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const currentAd = ads[currentAdIndex];

  useEffect(() => {
    loadAds();
  }, [targetAudience, targetLocation]);

  // Auto-rotate ads every 20 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
      }, 20000);
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
      const response = await fetch(`/api/ads?position=sidebar&targetAudience=${targetAudience}&targetLocation=${targetLocation}`);
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

  const getAdIcon = (adType: string) => {
    switch (adType) {
      case 'promotional':
        return <TrendingUp size={16} className="text-orange-500" />;
      case 'sponsored':
        return <Users size={16} className="text-blue-500" />;
      default:
        return <Heart size={16} className="text-pink-500" />;
    }
  };

  if (isLoading || !currentAd || !isVisible) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      <div className="relative">
        {/* Ad Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {getAdIcon(currentAd.adType)}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentAd.adType === 'sponsored' ? 'Sponsored' : 'Promoted'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Ad Content */}
        <div className="p-4">
          {/* Ad Image */}
          {currentAd.imageUrl && (
            <div className="mb-3">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}
          
          {/* Ad Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {currentAd.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {currentAd.description}
            </p>
            
            {/* Advertiser Info */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>By {currentAd.advertiserName}</span>
              <div className="flex items-center space-x-2">
                <span>{currentAd.impressions || 0} views</span>
                <span>•</span>
                <span>{currentAd.clicks || 0} clicks</span>
              </div>
            </div>
            
            {/* CTA Button */}
            <button
              onClick={handleAdClick}
              className="w-full mt-3 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <ExternalLink size={14} />
              <span>{currentAd.ctaText}</span>
            </button>
          </div>
        </div>
        
        {/* Ad Indicators */}
        {ads.length > 1 && (
          <div className="flex justify-center space-x-1 pb-3">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                className={`w-1.5 h-1.5 rounded-full ${
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
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";

interface BannerAdProps {
  adId: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaText: string;
  ctaUrl: string;
  advertiserName: string;
  adType: "banner" | "sponsored" | "promotional";
  position: "top" | "bottom" | "sidebar" | "inline";
  onClose?: () => void;
  dismissible?: boolean;
}

export function BannerAd({
  adId,
  title,
  description,
  imageUrl,
  ctaText,
  ctaUrl,
  advertiserName,
  adType,
  position,
  onClose,
  dismissible = true
}: BannerAdProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Track ad impression
  useEffect(() => {
    const trackImpression = async () => {
      try {
        await fetch('/api/ads/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adId,
            event: 'impression',
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to track ad impression:', error);
      }
    };

    if (isVisible) {
      trackImpression();
    }
  }, [adId, isVisible]);

  const handleClick = async () => {
    setIsLoading(true);
    
    try {
      // Track click event
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adId,
          event: 'click',
          timestamp: new Date().toISOString()
        })
      });

      // Open link in new tab
      window.open(ctaUrl, '_blank');
    } catch (error) {
      console.error('Failed to track ad click:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  const getAdStyles = () => {
    switch (position) {
      case "top":
        return "w-full mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200";
      case "bottom":
        return "w-full mt-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200";
      case "sidebar":
        return "w-full mb-4 bg-white border-gray-200 shadow-sm";
      case "inline":
        return "w-full my-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200";
      default:
        return "w-full mb-4 bg-white border-gray-200";
    }
  };

  const getAdTypeColor = () => {
    switch (adType) {
      case "sponsored":
        return "bg-yellow-100 text-yellow-800";
      case "promotional":
        return "bg-green-100 text-green-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <Card className={`${getAdStyles()} hover:shadow-md transition-shadow relative`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getAdTypeColor()}>
              {adType === "sponsored" ? "Sponsored" : adType === "promotional" ? "Promoted" : "Ad"}
            </Badge>
            <span className="text-xs text-gray-500">by {advertiserName}</span>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          {imageUrl && (
            <div className="flex-shrink-0">
              <img 
                src={imageUrl} 
                alt={title}
                className="w-16 h-16 object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 mb-3">{description}</p>
            
            <Button 
              onClick={handleClick}
              disabled={isLoading}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {isLoading ? "Loading..." : ctaText}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
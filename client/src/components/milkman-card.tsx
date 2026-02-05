import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Truck, Phone } from "lucide-react";
import { useLanguage, getTranslatedText } from '@/hooks/useLanguage';

interface MilkmanCardProps {
  milkman: {
    id: number;
    businessName: string;
    pricePerLiter: string;
    deliveryTimeStart: string;
    deliveryTimeEnd: string;
    rating: string;
    totalReviews: number;
    isAvailable: boolean;
    verified?: boolean;
  };
  onOrder: () => void;
  onContact?: () => void;
}

export function MilkmanCard({ milkman, onOrder, onContact }: MilkmanCardProps) {
  const { language } = useLanguage();
  
  const formatTime = (time: string) => {
    // Convert 24h format to 12h format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="border rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow milkman-card-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
          {/* Profile placeholder */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg sm:text-xl">👨‍🌾</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-mobile-primary truncate text-sm sm:text-base">{getTranslatedText(milkman.businessName, language)}</h3>
              {milkman.verified && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {getTranslatedText("Verified", language)}
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs sm:text-sm text-mobile-secondary">
              <div className="flex items-center space-x-1 mb-1 sm:mb-0">
                <Star className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                <span className="truncate">{parseFloat(milkman.rating).toFixed(1)} ({milkman.totalReviews} {getTranslatedText("reviews", language)})</span>
              </div>
              <span className="text-gray-400 hidden sm:inline">•</span>
              <span className="whitespace-nowrap">0.5 {getTranslatedText("km away", language)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2 flex-shrink-0">
          <Badge className={`${milkman.isAvailable ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} text-xs`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${milkman.isAvailable ? "bg-green-500" : "bg-yellow-500"}`} />
            {getTranslatedText(milkman.isAvailable ? "Available" : "Busy", language)}
          </Badge>
          {milkman.isAvailable ? (
            <Button 
              className="btn-mobile-enhanced modern-button text-xs sm:text-sm"
              onClick={onOrder}
              size="sm"
            >
              {getTranslatedText("Order Now", language)}
            </Button>
          ) : (
            <Button variant="outline" disabled className="btn-mobile-enhanced text-xs sm:text-sm" size="sm">
              {getTranslatedText("Notify Me", language)}
            </Button>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-mobile-secondary">
        <span className="flex items-center whitespace-nowrap">
          <span className="text-lg sm:text-2xl mr-1">🥛</span>
          <span className="font-medium text-mobile-primary">₹{milkman.pricePerLiter}/L</span>
        </span>
        <span className="flex items-center whitespace-nowrap">
          <Clock className="h-3 w-3 mr-1 text-secondary-green flex-shrink-0" />
          {formatTime(milkman.deliveryTimeStart)} - {formatTime(milkman.deliveryTimeEnd)}
        </span>
        <span className="flex items-center whitespace-nowrap">
          <Truck className="h-3 w-3 mr-1 text-accent-orange flex-shrink-0" />
          {getTranslatedText("Free delivery", language)}
        </span>
        {onContact && (
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-6 w-6 flex-shrink-0 touch-target"
            onClick={onContact}
          >
            <Phone className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

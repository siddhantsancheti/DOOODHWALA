import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Shield, 
  TrendingUp,
  Filter,
  Navigation,
  Award,
  Users,
  IndianRupee
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationRecommendationsProps {
  customerLocation?: { lat: number; lng: number };
  onMilkmanSelect: (milkman: any) => void;
  onOrderNow: (milkman: any) => void;
}

export function LocationRecommendations({ 
  customerLocation, 
  onMilkmanSelect, 
  onOrderNow 
}: LocationRecommendationsProps) {
  const [radius, setRadius] = useState([5]);
  const [sortBy, setSortBy] = useState("recommendation");
  const [minRating, setMinRating] = useState([0]);
  const [maxPrice, setMaxPrice] = useState([100]);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const { toast } = useToast();

  // Get current location if not provided
  const [currentLocation, setCurrentLocation] = useState(customerLocation);

  useEffect(() => {
    if (!customerLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    }
  }, [customerLocation, toast]);

  // Fetch recommendations based on location
  const { data: recommendations = [], isLoading, error } = useQuery({
    queryKey: [
      "/api/milkmen/recommendations",
      currentLocation?.lat,
      currentLocation?.lng,
      radius[0]
    ],
    queryFn: async () => {
      if (!currentLocation) return [];
      
      const response = await fetch(
        `/api/milkmen/recommendations?lat=${currentLocation.lat}&lng=${currentLocation.lng}&radius=${radius[0]}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }
      
      return response.json();
    },
    enabled: !!currentLocation,
  });

  // Filter recommendations based on user preferences
  const filteredRecommendations = recommendations.filter((milkman: any) => {
    const rating = parseFloat(milkman.rating || '0');
    const price = parseFloat(milkman.pricePerLiter || '0');
    
    if (rating < minRating[0]) return false;
    if (price > maxPrice[0]) return false;
    if (showVerifiedOnly && !milkman.verified) return false;
    
    return true;
  });

  // Sort recommendations
  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    switch (sortBy) {
      case "distance":
        return (a.distanceKm || 0) - (b.distanceKm || 0);
      case "rating":
        return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
      case "price":
        return parseFloat(a.pricePerLiter || '0') - parseFloat(b.pricePerLiter || '0');
      case "recommendation":
      default:
        return (b.recommendationScore || 0) - (a.recommendationScore || 0);
    }
  });

  const getRecommendationBadge = (score: number) => {
    if (score >= 80) return { label: "Excellent", variant: "default" as const, color: "bg-green-500" };
    if (score >= 60) return { label: "Good", variant: "secondary" as const, color: "bg-blue-500" };
    if (score >= 40) return { label: "Fair", variant: "outline" as const, color: "bg-yellow-500" };
    return { label: "Basic", variant: "outline" as const, color: "bg-gray-500" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-3">Finding nearby milkmen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Location Error</h3>
          <p className="text-gray-600">Unable to fetch recommendations. Please try again.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Status */}
      {currentLocation && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-800">
              Showing recommendations within {radius[0]}km of your location
            </span>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Radius Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Radius: {radius[0]}km</label>
              <Slider
                value={radius}
                onValueChange={setRadius}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Rating: {minRating[0]}★</label>
              <Slider
                value={minRating}
                onValueChange={setMinRating}
                max={5}
                min={0}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Price Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Price: ₹{maxPrice[0]}</label>
              <Slider
                value={maxPrice}
                onValueChange={setMaxPrice}
                max={100}
                min={20}
                step={5}
                className="w-full"
              />
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="recommendation">Recommendation Score</option>
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
                <option value="price">Price</option>
              </select>
            </div>
          </div>

          {/* Verified Only Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verified-only"
              checked={showVerifiedOnly}
              onChange={(e) => setShowVerifiedOnly(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="verified-only" className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Show verified milkmen only
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Found {sortedRecommendations.length} milkmen within {radius[0]}km
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {sortedRecommendations.length > 0 ? (
          sortedRecommendations.map((milkman: any) => {
            const badge = getRecommendationBadge(milkman.recommendationScore || 0);
            
            return (
              <Card key={milkman.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{milkman.businessName}</h3>
                            {milkman.verified && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600">{milkman.contactName}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <MapPin className="h-4 w-4" />
                            <span>{milkman.distanceLabel}</span>
                          </div>
                        </div>
                        <Badge variant={badge.variant} className="ml-2">
                          <Award className="h-3 w-3 mr-1" />
                          {badge.label}
                        </Badge>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">
                            {parseFloat(milkman.rating || '0').toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{milkman.totalReviews} reviews</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-green-500" />
                          <span className="text-sm">₹{milkman.pricePerLiter}/L</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">
                            {milkman.deliveryTimeStart}-{milkman.deliveryTimeEnd}
                          </span>
                        </div>
                      </div>

                      {/* Recommendation Score */}
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">
                          Recommendation Score: {milkman.recommendationScore || 0}/100
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all" 
                            style={{ width: `${(milkman.recommendationScore || 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      <Button
                        onClick={() => onMilkmanSelect(milkman)}
                        className="w-full"
                        variant="outline"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={() => onOrderNow(milkman)}
                        className="w-full"
                      >
                        Order Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          window.open(`tel:${milkman.phone}`, '_self');
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No milkmen found</h3>
              <p className="text-gray-600 mb-4">
                Try increasing your search radius or adjusting your filters.
              </p>
              <Button onClick={() => setRadius([radius[0] + 5])}>
                Increase Search Radius
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
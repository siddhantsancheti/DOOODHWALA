import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationRecommendations } from "@/components/location-recommendations";
import { ArrowLeft, MapPin, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Milkman {
  id: number;
  businessName: string;
  contactName: string;
  address: string;
  latitude?: string;
  longitude?: string;
  rating?: number;
  deliverySlots?: any[];
  dairyItems?: any[];
}

export default function LocationRecommendationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMilkman, setSelectedMilkman] = useState<any>(null);

  // Get customer profile for location
  const { data: customerProfile } = useQuery({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const { data: milkmen } = useQuery<Milkman[]>({
    queryKey: ["/api/milkmen"],
  });

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Extract location from customer profile or use geolocation
  const getCustomerLocation = () => {
    const profile = customerProfile as any;
    if (profile?.latitude && profile?.longitude) {
      return {
        lat: parseFloat(profile.latitude),
        lng: parseFloat(profile.longitude)
      };
    }
    // Fallback or attempt to parse address
    if (profile?.address) {
      // Mock coordinates for Pune if address exists but no coords
      return {
        lat: 18.5204,
        lng: 73.8567
      };
    }
    return undefined;
  };

  const handleMilkmanSelect = (milkman: any) => {
    setSelectedMilkman(milkman);
    // Navigate to detailed view or show modal
    setLocation(`/milkman/${milkman.id}`);
  };

  const handleOrderNow = (milkman: any) => {
    // Navigate to order page with selected milkman
    setLocation(`/order?milkmanId=${milkman.id}`);
  };

  const handleBackToDashboard = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Location-Based Recommendations
            </h1>
          </div>

          <p className="text-gray-600 max-w-2xl">
            Find the best milkmen near you based on distance, ratings, price, and availability.
            We use intelligent scoring to recommend the most suitable dairy suppliers for your needs.
          </p>
        </div>

        {/* Smart Recommendations Banner */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-full">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Smart Recommendations</h3>
                <p className="text-gray-600 text-sm">
                  Our intelligent system considers distance, ratings, pricing, verification status,
                  and availability to find the perfect milkman for you.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Recommendations Component */}
        <LocationRecommendations
          customerLocation={getCustomerLocation()}
          onMilkmanSelect={handleMilkmanSelect}
          onOrderNow={handleOrderNow}
        />
      </div>
    </div>
  );
}
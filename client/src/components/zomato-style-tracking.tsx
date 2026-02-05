import { useState, useEffect } from "react";
import { RouteMap } from "./route-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Phone,
  MessageCircle,
  Share2,
  Clock,
  MapPin,
  User,
  Star,
  CheckCircle,
  Truck,
  Package,
  Timer,
  Navigation,
  AlertCircle,
  Route
} from "lucide-react";

interface ZomatoStyleTrackingProps {
  order: any;
  customerProfile: any;
  milkmanProfile: any;
}

export function ZomatoStyleTracking({ order, customerProfile, milkmanProfile }: ZomatoStyleTrackingProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("15 mins");
  const [deliveryStatus, setDeliveryStatus] = useState<'confirmed' | 'preparing' | 'out_for_delivery' | 'nearby' | 'delivered'>('confirmed');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulate delivery progress
  useEffect(() => {
    // If order is delivered, set progress to 100
    if (order.status === 'delivered') {
      setProgress(100);
      setDeliveryStatus('delivered');
      return;
    }

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 2, 95); // Don't reach 100 automatically unless status changes

        // Update delivery status based on progress
        if (newProgress >= 90) {
          setDeliveryStatus('nearby');
          setEstimatedTime('2 mins');
        } else if (newProgress >= 50) {
          setDeliveryStatus('out_for_delivery');
          setEstimatedTime('8 mins');
        } else {
          setDeliveryStatus('confirmed');
          setEstimatedTime('15 mins');
        }

        return newProgress;
      });
    }, 3000);

    return () => clearInterval(progressTimer);
  }, [order.status]);

  const getProgressColor = () => {
    switch (deliveryStatus) {
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'out_for_delivery': return 'bg-green-500';
      case 'nearby': return 'bg-red-500';
      case 'delivered': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCallMilkman = () => {
    if (milkmanProfile?.phone) {
      window.open(`tel:${milkmanProfile.phone}`, '_self');
    } else {
      toast({
        title: "Number not available",
        description: "Delivery partner's phone number is not available.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Tracking Link Shared",
        description: "Live tracking link has been copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Share Failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive"
      });
    });
  };

  const handleChat = () => {
    // Navigate to YD page which handles chat
    setLocation('/your-doodhwala');
  };

  // Prepare locations for RouteMap
  const mapLocations = [
    {
      lat: parseFloat(milkmanProfile?.latitude || "19.8762"),
      lng: parseFloat(milkmanProfile?.longitude || "75.3433"),
      name: milkmanProfile?.contactName || "Delivery Partner",
      type: 'milkman' as const
    },
    {
      lat: parseFloat(customerProfile?.latitude || "19.8762"),
      lng: parseFloat(customerProfile?.longitude || "75.3433"),
      name: "Your Location",
      address: customerProfile?.address,
      type: 'customer' as const
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header with Order Summary */}
      <Card className="shadow-lg border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" />
              Order #{order.id}
            </CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Live Tracking
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Estimated Delivery</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{estimatedTime}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>Delivery Partner</span>
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{milkmanProfile.contactName}</div>
              <div className="flex items-center gap-1 text-sm text-yellow-600">
                <Star className="w-4 h-4 fill-current" />
                <span>4.8 (127 reviews)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>Delivery Address</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{customerProfile.address}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <Card className="shadow-lg border-none">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Order Progress</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{progress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className={`flex flex-col items-center ${progress >= 0 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-5 h-5 mb-1" />
                <span className="text-xs">Confirmed</span>
              </div>
              <div className={`flex flex-col items-center ${progress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                <Truck className="w-5 h-5 mb-1" />
                <span className="text-xs">Out for Delivery</span>
              </div>
              <div className={`flex flex-col items-center ${progress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-5 h-5 mb-1" />
                <span className="text-xs">Delivered</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={handleCallMilkman}
          className="h-12 bg-green-600 hover:bg-green-700 text-white w-full"
        >
          <Phone className="w-5 h-5 mr-2" />
          Call Delivery Partner
        </Button>
        <Button
          onClick={handleChat}
          variant="outline"
          className="h-12 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 w-full"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Chat with Partner
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          className="h-12 border-gray-600 text-gray-600 hover:bg-gray-50 dark:border-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 w-full"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Tracking
        </Button>
      </div>

      {/* Route Map */}
      <Card className="shadow-lg border-none overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Delivery Route
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] w-full">
            <RouteMap locations={mapLocations} height="100%" />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Timeline */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Delivery Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">Order Confirmed</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Your order has been confirmed and is being prepared</div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(order.createdAt).toLocaleTimeString()}
              </div>
            </div>

            {progress >= 50 && (
              <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Out for Delivery</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{milkmanProfile.contactName} is on the way</div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(Date.now() - 180000).toLocaleTimeString()}
                </div>
              </div>
            )}

            {progress >= 90 && (
              <div className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Nearby</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Your delivery partner is almost at your location</div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(Date.now() - 60000).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// Enhanced India Map Component with Zomato-style in-app navigation
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Route, Clock, ArrowUpRight, ArrowUp, Car, Phone, RotateCcw, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

interface MapComponentProps {
  customerLocation: LocationData;
  milkmanLocation: LocationData;
  showDeliveryRoute?: boolean;
  onCallMilkman?: () => void;
}

// Mock map data for India
const INDIA_MAP_DATA = {
  center: { lat: 20.5937, lng: 78.9629 },
  zoom: 5,
  states: [
    { name: "Maharashtra", coordinates: [[19.7515, 75.7139]] },
    { name: "Karnataka", coordinates: [[15.3173, 75.7139]] },
    // Add more states as needed
  ]
};

// Mock navigation data
const NAVIGATION_STEPS = [
  {
    instruction: "Head east on MG Road toward Station Road",
    distance: "0.5 km",
    icon: "arrow-up-right",
    type: "turn"
  },
  {
    instruction: "Turn right onto Station Road",
    distance: "1.2 km", 
    icon: "arrow-right",
    type: "turn"
  },
  {
    instruction: "Continue straight for 800m",
    distance: "0.8 km",
    icon: "arrow-up",
    type: "straight"
  },
  {
    instruction: "Turn left onto Customer Street",
    distance: "0.3 km",
    icon: "arrow-left", 
    type: "turn"
  },
  {
    instruction: "Destination will be on your right",
    distance: "0.1 km",
    icon: "map-pin",
    type: "destination"
  }
];

export function IndiaMap({ 
  customerLocation, 
  milkmanLocation, 
  showDeliveryRoute = false,
  onCallMilkman 
}: MapComponentProps) {
  const [open, setOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Mock values for demonstration
  const estimatedDistance = "2.3 km";
  const estimatedDuration = "8 mins";

  // Initialize map when dialog opens
  useEffect(() => {
    if (open && !mapLoaded) {
      // Simulate map loading
      const timer = setTimeout(() => {
        setMapLoaded(true);
        if (showDeliveryRoute) {
          initializeDeliveryRoute();
        }
        toast({
          title: "Map Loaded",
          description: "Delivery route is now visible on the map",
          duration: 2000,
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [open, mapLoaded, showDeliveryRoute, toast]);

  // Auto-progress navigation steps
  useEffect(() => {
    if (navigationStarted && currentStep < NAVIGATION_STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [navigationStarted, currentStep]);

  const initializeDeliveryRoute = () => {
    // Mock route initialization
    console.log("Initializing delivery route from", milkmanLocation.name, "to customer location");
  };

  const handleNavigate = () => {
    setOpen(true);
    toast({
      title: "Opening Navigation",
      description: `Showing delivery route from ${milkmanLocation.name}`,
    });
  };

  return (
    <div className="w-full">
      <Button 
        onClick={handleNavigate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
      >
        <Navigation className="w-4 h-4" />
        Navigate
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] p-0 bg-gray-50 dark:bg-gray-900">
          <DialogHeader className="p-4 bg-white dark:bg-gray-800 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Delivery Route from {milkmanLocation.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 relative min-h-[600px]">
            {/* Map Container */}
            <div 
              ref={mapContainerRef}
              className="w-full h-full bg-gradient-to-br from-green-100 via-blue-50 to-green-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 relative overflow-hidden"
            >
              {!mapLoaded ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading map...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Map Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-600 dark:text-gray-400">
                      <MapPin className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-lg font-medium">Interactive Map</p>
                      <p className="text-sm">Delivery route visualization</p>
                    </div>
                  </div>

                  {/* Location Markers */}
                  <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-blue-600 rounded-full p-3 shadow-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-md whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{milkmanLocation.name}</span>
                    </div>
                  </div>

                  <div className="absolute top-3/4 right-1/4 transform translate-x-1/2 -translate-y-1/2">
                    <div className="bg-green-600 rounded-full p-3 shadow-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-md whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Delivery Location</span>
                    </div>
                  </div>

                  {/* Route Line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 25% 25% Q 50% 10% 75% 75%"
                      stroke="url(#routeGradient)"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="10,5"
                      className="animate-pulse"
                    />
                  </svg>
                </>
              )}
            </div>

            {/* Step-by-step Navigation Overlay */}
            {navigationStarted && currentStep < NAVIGATION_STEPS.length && (
              <div className="absolute top-20 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 rounded-full p-2">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {milkmanLocation.name} is on MG Road
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {estimatedDuration} away
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of 5
                </div>
              </div>
            )}

            {/* Navigation Status Bar */}
            {navigationStarted && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span>Delivery Route • {estimatedDuration} journey</span>
              </div>
            )}

            {/* Compact Navigation Panel - Bottom Right */}
            <div className="absolute bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)]">
              {!navigationStarted ? (
                <div className="bg-white/98 dark:bg-gray-800/98 backdrop-blur-lg rounded-xl p-3 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                  {/* Compact Route Info Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Delivery Route</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">via MG Road</div>
                  </div>
                  
                  {/* Quick Route Stats */}
                  <div className="flex items-center gap-4 mb-3 p-2 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-sm font-medium">{estimatedDuration}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-sm">{estimatedDistance}</span>
                    </div>
                  </div>
                  
                  {/* Compact Location Info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{milkmanLocation.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">(Start)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Your Location</span>
                      <span className="text-gray-500 dark:text-gray-400">(Delivery)</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setNavigationStarted(true);
                        setCurrentStep(0);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                    >
                      <Route className="w-3 h-3 mr-2" />
                      Track Route
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (onCallMilkman) onCallMilkman();
                      }}
                      className="px-3 h-9"
                    >
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/98 dark:bg-gray-800/98 backdrop-blur-lg rounded-xl p-3 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                  {/* Active Tracking Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        TRACKING
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{estimatedDuration}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{estimatedDistance}</div>
                  </div>
                  
                  {/* Compact Route Steps */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 p-2 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg">
                      <ArrowUpRight className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-xs text-gray-900 dark:text-gray-100">From {milkmanLocation.name}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg opacity-60">
                      <ArrowUp className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500">To your location</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setNavigationStarted(false);
                        setCurrentStep(0);
                      }}
                      variant="outline"
                      className="flex-1 h-9 text-sm"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (onCallMilkman) onCallMilkman();
                      }}
                      className="px-3 h-9"
                    >
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import { MilkmanCard } from "@/components/milkman-card";
import { OrderCard } from "@/components/order-card";
import { TrackingMap } from "@/components/tracking-map";
import { YDChat } from "@/components/yd-chat";
import { Link, useLocation } from "wouter";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";
import { AdBanner } from "@/components/ads/ad-banner";
import { AdInline } from "@/components/ads/ad-inline";
import { AdSidebar } from "@/components/ads/ad-sidebar";
import {
  ShoppingCart,
  MapPin,
  Receipt,
  Star,
  Plus,
  Clock,
  CheckCircle,
  Truck,
  ArrowLeft,
  DollarSign,
  Languages,
  Settings,
  User,
  Users
} from "lucide-react";

import type { Customer, Milkman, Order, ServiceRequest } from "@shared/schema";

// Helper function to extract location parts from address
function extractLocationParts(address: string) {
  const parts = address.split(',').map(part => part.trim());
  return {
    area: parts[0] || '',
    city: parts[1] || '',
    state: parts[2] || '',
    country: parts[3] || ''
  };
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [formAddress, setFormAddress] = useState("");
  const [addressDetails, setAddressDetails] = useState({
    houseNumber: "",
    buildingName: "",
    streetName: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    country: ""
  });
  const [locationCoords, setLocationCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [currentView, setCurrentView] = useState('your-doodhwala');

  // Check for payment success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const paymentMethod = urlParams.get('method');

    if (paymentStatus === 'success') {
      toast({
        title: "Payment Successful!",
        description: `Your ${paymentMethod || 'payment'} has been processed successfully. Thank you for your order!`,
      });
      // Remove the payment parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  // All features now navigate within the same tab
  const [settingsForm, setSettingsForm] = useState({
    milkType: 'Fresh Milk',
    deliveryTime: '7:00 - 7:30 AM',
    subscriptionType: 'Daily',
    weekendDelivery: true,
    holidayDelivery: false,
    smsNotifications: true,
    emailNotifications: false,
    specialInstructions: '',
    paymentMethod: 'Monthly Postpaid',
    billingCycle: 'Monthly (1st to 30th)'
  });

  const { data: customerProfile, isLoading: profileLoading, error: profileError } = useQuery<Customer>({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
    retry: 1,
    staleTime: 0, // Always fetch fresh data
  });

  // Force token refresh and debug customer profile loading
  useEffect(() => {
    // Force refresh auth token if it's stale
    if (user && user.userType !== 'customer') {
      console.log('Token mismatch detected - forcing auth refresh');
      window.location.reload();
      return;
    }

    if (customerProfile) {
      console.log('Customer profile query success:', customerProfile);
    }
    if (profileError) {
      console.error('Customer profile query error:', profileError);
    }
  }, [customerProfile, profileError, user]);

  const { data: milkmen } = useQuery<Milkman[]>({
    queryKey: ["/api/milkmen"],
    enabled: !!user,
  });

  // Function to extract city and area from address
  const extractLocationParts = (address: string) => {
    if (!address) return { city: "", area: "" };
    // Split by comma to get different parts
    const parts = address.split(',').map(part => part.trim().toLowerCase());

    // For addresses like "Area, City, State, Country" or "City, State, Country"
    if (parts.length >= 3) {
      return {
        city: parts[parts.length - 3], // Third last part is typically city
        area: parts[0] // First part is typically area/locality
      };
    } else if (parts.length === 2) {
      return {
        city: parts[0],
        area: parts[0] // If only 2 parts, treat as same
      };
    } else {
      return {
        city: parts[0] || "",
        area: parts[0] || ""
      };
    }
  };

  // Filter milkmen by customer's city and area
  const filteredMilkmen = milkmen?.filter((milkman) => {
    if (!customerProfile || !customerProfile.address || !milkman.address) return false;

    const customer = extractLocationParts(customerProfile.address);
    const milkmanLocation = extractLocationParts(milkman.address);

    // First priority: Same area and city
    const sameArea = customer.area === milkmanLocation.area;
    const sameCity = customer.city === milkmanLocation.city;

    // Return true if same city (and optionally same area for better matching)
    return sameCity;
  }) || [];

  // Sort milkmen: same area first, then by rating
  const sortedFilteredMilkmen = filteredMilkmen.sort((a, b) => {
    const customer = extractLocationParts(customerProfile?.address || "");
    const aLocation = extractLocationParts(a.address);
    const bLocation = extractLocationParts(b.address);

    const aSameArea = customer.area === aLocation.area;
    const bSameArea = customer.area === bLocation.area;

    // Prioritize same area
    if (aSameArea && !bSameArea) return -1;
    if (!aSameArea && bSameArea) return 1;

    // Then sort by rating
    return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders/customer"],
    enabled: !!customerProfile,
  });

  const { data: serviceRequests } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/customer"],
    enabled: !!customerProfile,
  });

  const { data: bills } = useQuery<any[]>({
    queryKey: [`/api/bills/bills/customer/${user?.id}`],
    enabled: !!user,
  });

  const currentBill = bills && bills.length > 0 ? bills[0] : null;



  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Creating customer profile with data:", data);
        const response = await apiRequest("/api/customers", "POST", data);
        console.log("Profile creation response:", response);
        return response;
      } catch (error) {
        console.error("Profile creation failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Profile creation successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      setShowProfileForm(false);
      toast({
        title: "Profile Created",
        description: "Your customer profile has been set up successfully!",
      });
    },
    onError: (error: Error) => {
      console.error("Profile creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof settingsForm) => {
      try {
        console.log('Saving settings:', settings);
        return new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Settings save failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully!" });
      setCurrentView('your-doodhwala');
    },
    onError: (error: Error) => {
      console.error("Settings save error:", error);
      toast({ title: "Error saving settings", description: error.message || "Failed to save settings", variant: "destructive" });
    }
  });

  const handleSettingsChange = (field: string, value: any) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settingsForm);
  };

  const handleResetSettings = () => {
    setSettingsForm({
      milkType: 'Fresh Milk',
      deliveryTime: '7:00 - 7:30 AM',
      subscriptionType: 'Daily',
      weekendDelivery: true,
      holidayDelivery: false,
      smsNotifications: true,
      emailNotifications: false,
      specialInstructions: '',
      paymentMethod: 'Monthly Postpaid',
      billingCycle: 'Monthly (1st to 30th)'
    });
    toast({ title: "Settings reset to default" });
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        await apiRequest("/api/orders", "POST", data);
      } catch (error) {
        console.error("Order creation failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/customer"] });
      toast({
        title: "Order Placed",
        description: "Your milk order has been placed successfully!",
      });
    },
    onError: (error: Error) => {
      console.error("Order creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    console.log('Profile check - profileLoading:', profileLoading, 'customerProfile:', customerProfile, 'user:', user);

    // Don't proceed if user type is wrong - wait for refresh
    if (user && user.userType !== 'customer') {
      console.log('User type mismatch - waiting for refresh');
      return;
    }

    if (!profileLoading && customerProfile && (customerProfile as any)?.name && (customerProfile as any)?.address) {
      console.log('Profile exists with name and address, setting showProfileForm to false');
      console.log('Current showProfileForm state before change:', showProfileForm);
      if (showProfileForm !== false) {
        setShowProfileForm(false);
      }
    } else if (!profileLoading && (!customerProfile || !(customerProfile as any)?.name || !(customerProfile as any)?.address)) {
      console.log('Setting showProfileForm to true - missing profile, name, or address');
      console.log('Current showProfileForm state before change:', showProfileForm);
      if (showProfileForm !== true) {
        setShowProfileForm(true);
      }
    }
  }, [profileLoading, customerProfile, user]);

  // Auto-generate formatted address from individual fields
  useEffect(() => {
    const parts = [];

    // Clean and validate each field before adding
    const cleanedDetails = {
      houseNumber: addressDetails.houseNumber.trim(),
      buildingName: addressDetails.buildingName.trim(),
      streetName: addressDetails.streetName.trim(),
      area: addressDetails.area.trim(),
      landmark: addressDetails.landmark.trim(),
      city: addressDetails.city.trim(),
      state: addressDetails.state.trim(),
      pincode: addressDetails.pincode.trim(),
      country: addressDetails.country.trim()
    };

    // Add fields in proper order, avoiding duplicates
    if (cleanedDetails.houseNumber) parts.push(cleanedDetails.houseNumber);
    if (cleanedDetails.buildingName && cleanedDetails.buildingName !== cleanedDetails.houseNumber) {
      parts.push(cleanedDetails.buildingName);
    }
    if (cleanedDetails.streetName && !parts.includes(cleanedDetails.streetName)) {
      parts.push(cleanedDetails.streetName);
    }
    if (cleanedDetails.area && !parts.includes(cleanedDetails.area)) {
      parts.push(cleanedDetails.area);
    }
    if (cleanedDetails.landmark && !cleanedDetails.landmark.toLowerCase().startsWith('near')) {
      parts.push(`Near ${cleanedDetails.landmark}`);
    } else if (cleanedDetails.landmark) {
      parts.push(cleanedDetails.landmark);
    }
    if (cleanedDetails.city && !parts.includes(cleanedDetails.city)) {
      parts.push(cleanedDetails.city);
    }
    if (cleanedDetails.state && cleanedDetails.state !== cleanedDetails.city) {
      parts.push(cleanedDetails.state);
    }
    if (cleanedDetails.pincode) parts.push(cleanedDetails.pincode);
    if (cleanedDetails.country && !parts.includes(cleanedDetails.country)) {
      parts.push(cleanedDetails.country);
    }

    const generatedAddress = parts.filter(Boolean).join(", ");
    if (generatedAddress) {
      setFormAddress(generatedAddress);
    }
  }, [addressDetails]);

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      setLocationLoading(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding to get address
      let addressText = "";

      try {
        // Try BigDataCloud first with detailed address
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Geocoding response:", data); // Debug logging

        if (data) {
          // Extract detailed address components with enhanced parsing
          const newAddressDetails = {
            houseNumber: data.streetNumber || "",
            buildingName: data.building || "",
            streetName: data.street || data.road || "",
            area: data.locality || data.neighbourhood || "",
            landmark: data.landmark || "",
            city: data.city || "",
            state: data.principalSubdivision || "",
            pincode: data.postcode || "",
            country: data.countryName || ""
          };

          // Extract detailed locality information
          if (data.localityInfo) {
            // Check administrative divisions
            if (data.localityInfo.administrative) {
              data.localityInfo.administrative.forEach((admin: any) => {
                if (admin.adminLevel === 6 && !newAddressDetails.city) {
                  newAddressDetails.city = admin.name;
                }
                if (admin.adminLevel === 4 && !newAddressDetails.state) {
                  newAddressDetails.state = admin.name;
                }
              });
            }

            // Check informative locations for areas and landmarks
            if (data.localityInfo.informative) {
              data.localityInfo.informative.forEach((info: any) => {
                if (info.description?.includes('neighbourhood') && !newAddressDetails.area) {
                  newAddressDetails.area = info.name;
                } else if (info.description?.includes('suburb') && !newAddressDetails.area) {
                  newAddressDetails.area = info.name;
                } else if ((info.description?.includes('building') || info.description?.includes('landmark')) && !newAddressDetails.landmark) {
                  newAddressDetails.landmark = info.name;
                }
              });
            }
          }

          // If we have a plus code but no pincode, extract it
          if (data.plusCode && !newAddressDetails.pincode) {
            // Plus codes can give us approximate postal codes
            const matches = data.plusCode.match(/\d{6}/);
            if (matches) {
              newAddressDetails.pincode = matches[0];
            }
          }

          // Update address details state with comprehensive location data
          setAddressDetails(newAddressDetails);

          // Build formatted address from detailed components
          const addressParts = [];
          if (data.streetNumber) addressParts.push(data.streetNumber);
          if (data.street) addressParts.push(data.street);
          if (data.locality) addressParts.push(data.locality);
          if (data.city) addressParts.push(data.city);
          if (data.principalSubdivision) addressParts.push(data.principalSubdivision);
          if (data.postcode) addressParts.push(data.postcode);
          if (data.countryName) addressParts.push(data.countryName);

          if (addressParts.length > 0) {
            addressText = addressParts.join(", ");
          }
        }
      } catch (geocodeError) {
        console.log("BigDataCloud failed, trying OpenStreetMap...", geocodeError);

        // Fallback to OpenStreetMap Nominatim with enhanced detail level
        try {
          const osmResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&extratags=1&namedetails=1`);

          if (osmResponse.ok) {
            const osmData = await osmResponse.json();
            console.log("OSM Geocoding response:", osmData); // Debug logging

            if (osmData && osmData.address) {
              // Extract detailed address components from OSM
              const addr = osmData.address;
              const newAddressDetails = {
                houseNumber: addr.house_number || "",
                buildingName: addr.building || addr.amenity || addr.commercial || "",
                streetName: addr.road || addr.street || addr.pedestrian || "",
                area: addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || "",
                landmark: "",
                city: addr.city || addr.town || addr.village || addr.municipality || "",
                state: addr.state || addr.state_district || addr.region || "",
                pincode: addr.postcode || "",
                country: addr.country || ""
              };

              // Try to extract landmark from various OSM fields
              if (addr.amenity) {
                newAddressDetails.landmark = addr.amenity;
              } else if (addr.shop) {
                newAddressDetails.landmark = addr.shop;
              } else if (addr.tourism) {
                newAddressDetails.landmark = addr.tourism;
              } else if (addr.historic) {
                newAddressDetails.landmark = addr.historic;
              }

              // Extract additional details from extratags if available
              if (osmData.extratags) {
                if (osmData.extratags.building && !newAddressDetails.buildingName) {
                  newAddressDetails.buildingName = osmData.extratags.building;
                }
                if (osmData.extratags['addr:postcode'] && !newAddressDetails.pincode) {
                  newAddressDetails.pincode = osmData.extratags['addr:postcode'];
                }
              }

              // Update address details state
              setAddressDetails(newAddressDetails);

              // Build formatted address from parts with proper ordering
              const parts = [];
              if (newAddressDetails.houseNumber) parts.push(newAddressDetails.houseNumber);
              if (newAddressDetails.buildingName) parts.push(newAddressDetails.buildingName);
              if (newAddressDetails.streetName) parts.push(newAddressDetails.streetName);
              if (newAddressDetails.area) parts.push(newAddressDetails.area);
              if (newAddressDetails.landmark) parts.push(`Near ${newAddressDetails.landmark}`);
              if (newAddressDetails.city) parts.push(newAddressDetails.city);
              if (newAddressDetails.state) parts.push(newAddressDetails.state);
              if (newAddressDetails.pincode) parts.push(newAddressDetails.pincode);
              if (newAddressDetails.country) parts.push(newAddressDetails.country);

              addressText = parts.filter(Boolean).join(", ");
            } else if (osmData && osmData.display_name) {
              addressText = osmData.display_name;
            }
          }
        } catch (osmError) {
          console.log("OSM geocoding also failed:", osmError);
        }
      }

      // Store coordinates regardless of address resolution
      setLocationCoords({ lat: latitude, lng: longitude });

      if (addressText) {
        setFormAddress(addressText);
        toast({
          title: "Location Retrieved",
          description: "Your current location has been added to the address field.",
        });
      } else {
        // Final fallback to coordinates
        setFormAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast({
          title: "Location Retrieved",
          description: "Location coordinates retrieved. Please add more address details.",
        });
      }
    } catch (error: any) {
      let errorMessage = "Unable to retrieve your location.";

      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions.";
      } else if (error.code === 2) {
        errorMessage = "Location information is unavailable.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out.";
      }

      setLocationError(errorMessage);
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Build detailed address with all captured information
    const detailedAddressParts = [];
    if (addressDetails.houseNumber) detailedAddressParts.push(addressDetails.houseNumber);
    if (addressDetails.buildingName) detailedAddressParts.push(addressDetails.buildingName);
    if (addressDetails.streetName) detailedAddressParts.push(addressDetails.streetName);
    if (addressDetails.area) detailedAddressParts.push(addressDetails.area);
    if (addressDetails.landmark && !addressDetails.landmark.toLowerCase().startsWith('near')) {
      detailedAddressParts.push(`Near ${addressDetails.landmark}`);
    } else if (addressDetails.landmark) {
      detailedAddressParts.push(addressDetails.landmark);
    }
    if (addressDetails.city) detailedAddressParts.push(addressDetails.city);
    if (addressDetails.state) detailedAddressParts.push(addressDetails.state);
    if (addressDetails.pincode) detailedAddressParts.push(addressDetails.pincode);
    if (addressDetails.country) detailedAddressParts.push(addressDetails.country);

    const finalAddress = detailedAddressParts.filter(Boolean).join(", ") || formAddress;

    const data = {
      name: formData.get("firstName") as string,
      email: formData.get("email") as string,
      address: finalAddress,
      addressDetails: addressDetails, // Store detailed components separately
      ...(locationCoords && {
        latitude: locationCoords.lat.toString(),
        longitude: locationCoords.lng.toString(),
      }),
    };
    createProfileMutation.mutate(data);
  };

  const [, setLocation] = useLocation();

  /*
  const handleQuickOrder = (milkmanId: number, pricePerLiter: number) => {
    // Redirect to comprehensive order page
    setLocation(`/order?milkmanId=${milkmanId}`);
  };

  const handleQuickOrderClick = () => {
    setLocation('/quick-order');
  };
  */

  const handleTrackDeliveryClick = () => {
    setLocation('/track-delivery');
  };

  const handleViewOrdersClick = () => {
    setLocation('/view-orders');
  };

  const handleYourDoodhwalaClick = () => {
    setLocation('/your-doodhwala');
  };

  const handleNewOrderClick = () => {
    // Check if customer has an assigned milkman
    if (!(customerProfile as any)?.assignedMilkmanId) {
      toast({
        title: "No Assigned Dairyman",
        description: "Please assign a dairyman first to place orders.",
        variant: "destructive",
      });
      setLocation('/your-doodhwala');
      return;
    }

    // Count unique milkmen from service requests
    const uniqueMilkmenIds = (serviceRequests as any[])
      ? new Set((serviceRequests as any[]).map((req: any) => req.milkmanId))
      : new Set();

    // Add the assigned milkman to the count
    uniqueMilkmenIds.add((customerProfile as any).assignedMilkmanId);

    // If only one milkman is assigned, open chat directly
    if (uniqueMilkmenIds.size === 1) {
      setShowChat(true);
    } else {
      // If multiple milkmen are assigned, navigate to YD page
      setLocation('/your-doodhwala');
    }
  };

  // This function is no longer used since all features open in new windows
  const renderCurrentView = () => {
    switch (currentView) {
      /*
      case 'quick-order':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Quick Order</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentView('dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Select a Milkman to Place Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedFilteredMilkmen.length > 0 ? (
                    <>
                      {/!* Show area-based grouping *!/}
                      <div className="text-sm text-gray-600 mb-4">
                        Showing milkmen in your city • Same area vendors appear first
                      </div>
                      {sortedFilteredMilkmen.map((milkman: any) => {
                        const customer = extractLocationParts((customerProfile as any)?.address || "");
                        const milkmanLocation = extractLocationParts(milkman.address);
                        const sameArea = customer.area === milkmanLocation.area;

                        return (
                          <div key={milkman.id} className={sameArea ? "relative" : ""}>
                            {sameArea && (
                              <div className="absolute -top-1 -left-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full z-10">
                                Same Area
                              </div>
                            )}
                            <MilkmanCard
                              milkman={milkman}
                              onOrder={() => handleQuickOrder(milkman.id, parseFloat(milkman.pricePerLiter))}
                            />
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No milkmen in your city</h3>
                      <p className="text-gray-600">
                        We couldn't find any milkmen in {(customerProfile as any)?.address ? extractLocationParts((customerProfile as any).address).city : 'your area'}.
                        Check back later as we're always adding new vendors.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      */

      case 'track-delivery':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Track Delivery</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentView('dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Live Delivery Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <TrackingMap
                  customerLocation={{ lat: 19.0760, lng: 72.8777 }}
                  orders={(orders as any[]) || []}
                />
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <Truck className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">Your delivery is on the way!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Estimated arrival: 7:15 AM
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'view-bills':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Monthly Bills</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentView('dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">December 2024</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Orders: </span>
                        <span className="font-medium">28</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total: </span>
                        <span className="font-medium">₹1,400</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span className="text-green-600 font-medium">Paid</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity: </span>
                        <span className="font-medium">56L</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h3 className="font-medium mb-2">January 2025 (Current)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Orders: </span>
                        <span className="font-medium">2</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total: </span>
                        <span className="font-medium">₹100</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span className="text-orange-600 font-medium">Pending</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity: </span>
                        <span className="font-medium">4L</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'your-doodhwala':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl lg:text-3xl font-bold">Your Doodhwala</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentView('dashboard')}
                className="w-full sm:w-auto"
              >
                Back to Dashboard
              </Button>
            </div>

            {/* Current Bill Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getTranslatedText('Current Bill', language)}
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{currentBill ? currentBill.totalAmount : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentBill ? (
                    <span className={currentBill.status === 'paid' ? "text-green-600" : "text-amber-600"}>
                      {currentBill.status === 'paid' ? "Paid" : "Due"} for {new Date(currentBill.createdAt).toLocaleString('default', { month: 'long' })}
                    </span>
                  ) : (
                    "No bills due"
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Assigned Milkman Card */}
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Assigned Milkman</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto sm:mx-0">
                      <Star className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-semibold text-lg mb-1">Pure Dairy Farm</h3>
                      <p className="text-sm text-gray-600 mb-1">₹50/liter • 4.8★ (120 reviews)</p>
                      <p className="text-sm text-gray-600">Delivery: 7:00-8:00 AM</p>
                    </div>
                    <div className="text-center sm:text-right">
                      <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="w-full h-14 text-base font-medium border-2 hover:border-blue-500 hover:bg-blue-50"
                      onClick={() => setCurrentView('yd-chat')}
                    >
                      📝 Daily Order
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-14 text-base font-medium border-2 hover:border-green-500 hover:bg-green-50"
                      onClick={() => setCurrentView('yd-settings')}
                    >
                      ⚙️ Change Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Settings Overview */}
            <Card className="shadow-lg border-2">
              <CardHeader>
                <CardTitle className="text-xl">Current Settings Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-3 text-lg">Order Settings</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Milk Type:</span>
                        <span className="font-medium text-blue-600">Fresh Milk</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Delivery Time:</span>
                        <span className="font-medium text-blue-600">7:00-8:00 AM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subscription:</span>
                        <span className="font-medium text-blue-600">Daily</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold mb-3 text-lg">Preferences</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Weekend Delivery:</span>
                        <span className="font-medium text-green-600">Enabled</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Notifications:</span>
                        <span className="font-medium text-green-600">SMS Only</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium text-green-600">Monthly Postpaid</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'yd-chat':
        return (
          <YDChat
            customerProfile={customerProfile}
            onBack={() => setCurrentView('your-doodhwala')}
          />
        );

      case 'yd-settings':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="ghost"
                onClick={() => setCurrentView('your-doodhwala')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-2xl font-bold">Dairyman Settings</h2>
            </div>

            <div className="grid gap-6">
              {/* Current Dairyman Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Current Dairyman
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium">Ramesh Patil Dairy</h3>
                      <p className="text-sm text-gray-600">₹28/liter • Same area delivery</p>
                      <p className="text-sm text-gray-600">📞 +91-9876543212</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">4.9</span>
                      </div>
                      <p className="text-xs text-gray-500">203 reviews</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Change Dairyman
                  </Button>
                </CardContent>
              </Card>

              {/* Regular Order Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Regular Order Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Milk Type</label>
                      <select
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={settingsForm.milkType}
                        onChange={(e) => handleSettingsChange('milkType', e.target.value)}
                      >
                        <option>Fresh Milk</option>
                        <option>Buffalo Milk</option>
                        <option>Double Toned Milk</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Delivery Time</label>
                      <select
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={settingsForm.deliveryTime}
                        onChange={(e) => handleSettingsChange('deliveryTime', e.target.value)}
                      >
                        <option>6:30 - 7:00 AM</option>
                        <option>7:00 - 7:30 AM</option>
                        <option>7:30 - 8:00 AM</option>
                        <option>8:00 - 8:30 AM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Subscription Type</label>
                      <select
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={settingsForm.subscriptionType}
                        onChange={(e) => handleSettingsChange('subscriptionType', e.target.value)}
                      >
                        <option>Daily</option>
                        <option>Alternate Days</option>
                        <option>Weekly (7 days)</option>
                        <option>Custom Schedule</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Weekend Delivery</label>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={settingsForm.weekendDelivery}
                        onChange={(e) => handleSettingsChange('weekendDelivery', e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Holiday Delivery</label>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={settingsForm.holidayDelivery}
                        onChange={(e) => handleSettingsChange('holidayDelivery', e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">SMS Notifications</label>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={settingsForm.smsNotifications}
                        onChange={(e) => handleSettingsChange('smsNotifications', e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Email Notifications</label>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={settingsForm.emailNotifications}
                        onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Special Instructions</label>
                    <textarea
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="e.g., Leave at door, ring bell twice, etc."
                      value={settingsForm.specialInstructions}
                      onChange={(e) => handleSettingsChange('specialInstructions', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Method</label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={settingsForm.paymentMethod}
                      onChange={(e) => handleSettingsChange('paymentMethod', e.target.value)}
                    >
                      <option>Monthly Postpaid</option>
                      <option>Cash on Delivery</option>
                      <option>UPI/Digital Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Billing Cycle</label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={settingsForm.billingCycle}
                      onChange={(e) => handleSettingsChange('billingCycle', e.target.value)}
                    >
                      <option>Monthly (1st to 30th)</option>
                      <option>Custom Date Range</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={handleSaveSettings}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleResetSettings}
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }





  return (
    <div className="app-container min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <MobileNav />

      <div className="flex-1 w-full mx-auto mobile-optimized responsive-padding px-4 py-6">
        <div className="max-w-4xl mx-auto">{/* Centered container */}
          {/* Top Banner Ad */}
          <div className="mb-6 flex justify-center">
            <AdBanner
              position="top"
              targetAudience="customers"
              targetLocation={(customerProfile as any)?.address ? extractLocationParts((customerProfile as any).address).city : undefined}
              className="mb-6"
            />
          </div>

          {/* Main Content with Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1 w-full">
              {/* Dashboard Header */}
              <Card className="card-mobile dashboard-header-mobile shadow-lg border-2">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h1 className="responsive-heading font-bold text-mobile-primary mb-3 tracking-tight">
                        {getTranslatedText('Welcome back', language)}, <span className="mobile-gradient-text">{(customerProfile as any)?.name || getTranslatedText('Valued Customer', language)}</span>!
                      </h1>
                      <p className="responsive-body text-mobile-secondary mobile-text-readable">{getTranslatedText('Manage your daily milk orders and track deliveries', language)}</p>
                    </div>
                    <div className="dashboard-header-controls mt-4 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <Button
                        className="btn-mobile-enhanced modern-button shadow-md flex items-center justify-center gap-2"
                        onClick={handleNewOrderClick}
                      >
                        <Plus className="w-5 h-5 flex-shrink-0" />
                        <span>{getTranslatedText('New Order', language)}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="space-y-4 mobile-spacing mt-6">
                <Card className="feature-card-mobile hover:border-purple-500 h-24" onClick={handleYourDoodhwalaClick}>
                  <CardContent className="flex items-center h-full p-4 gap-4">
                    <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <Star className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-lg font-semibold text-mobile-primary mb-1 truncate">{getTranslatedText('Your Dairyman', language)}</h3>
                      <p className="text-sm text-mobile-secondary truncate">{getTranslatedText('Manage YD settings', language)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* <Card className="feature-card-mobile hover:border-primary-blue h-24" onClick={handleQuickOrderClick}>
                  <CardContent className="flex items-center h-full p-4 gap-4">
                    <div className="dairy-blue p-3 rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="h-6 w-6 text-primary-blue" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-lg font-semibold text-mobile-primary mb-1 truncate">{getTranslatedText('Quick Order', language)}</h3>
                      <p className="text-sm text-mobile-secondary truncate">{getTranslatedText('Place today\'s order', language)}</p>
                    </div>
                  </CardContent>
                </Card> */}

                <Card className="feature-card-mobile hover:border-green-500 h-24" onClick={handleTrackDeliveryClick}>
                  <CardContent className="flex items-center h-full p-4 gap-4">
                    <div className="dairy-green p-3 rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-lg font-semibold text-mobile-primary mb-1 truncate">{getTranslatedText('Track Delivery', language)}</h3>
                      <p className="text-sm text-mobile-secondary truncate">{getTranslatedText('See live location', language)}</p>
                    </div>
                  </CardContent>
                </Card>


              </div>



              {/* Inline Ad */}
              <div className="mb-8">
                <AdInline
                  targetAudience="customers"
                  targetLocation={(customerProfile as any)?.address ? extractLocationParts((customerProfile as any).address).city : undefined}
                  className="mb-6"
                />
              </div>

              {/* Available Milkmen */}
              {/* <Card className="card-mobile mt-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-mobile-primary">{getTranslatedText('Available Milkmen', language)}</CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary-blue hover:bg-dairy-blue btn-mobile-enhanced">
                      {getTranslatedText('Filter', language)}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {(milkmen as any[])?.map((milkman: any) => (
                      <div key={milkman.id} className="milkman-card-mobile">
                        <MilkmanCard
                          milkman={milkman}
                          onOrder={() => handleQuickOrder(milkman.id, parseFloat(milkman.pricePerLiter))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card> */}
            </div>

            {/* Sidebar with Ads */}
            <div className="hidden lg:block w-80 space-y-6">
              <AdSidebar
                targetAudience="customers"
                targetLocation={(customerProfile as any)?.address ? extractLocationParts((customerProfile as any).address).city : undefined}
                className="sticky top-6"
              />
            </div>
          </div>

          {/* Chat Interface Modal */}
          {showChat && customerProfile && (
            <div className="chat-modal-overlay mobile-modal" role="dialog" aria-labelledby="chat-dialog-title" aria-describedby="chat-dialog-description">
              <div className="chat-modal-container mobile-modal-content dark:bg-gray-900">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 id="chat-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white mobile-heading">{getTranslatedText('Chat with Your Dairyman', language)}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(false)}
                    aria-label={getTranslatedText('Close chat', language)}
                    className="chat-touch-target chat-accessible mobile-button"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div id="chat-dialog-description" className="sr-only">
                  {getTranslatedText('Direct chat interface for placing orders with your assigned dairyman', language)}
                </div>
                <div className="flex-1 min-h-0 mobile-chat">
                  <YDChat
                    customerProfile={customerProfile}
                    onBack={() => setShowChat(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mobile Navigation */}
          <MobileNav />
        </div>{/* Close centered container */}
      </div>
    </div>
  );
}

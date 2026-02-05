import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { CustomerPricingManager } from "@/components/customer-pricing-manager";
import MilkmanServiceRequests from "@/components/milkman-service-requests";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";
import { useWebSocket } from "@/hooks/useWebSocket";
import { IndividualCustomerChat } from "@/components/individual-customer-chat";
import { CODOTPVerification } from "@/components/cod-otp-verification";
import {
  ShoppingCart,
  CheckCircle,
  DollarSign,
  Star,
  Route,
  Truck,
  Phone,
  Clock,
  MapPin,
  Plus,
  Minus,
  Package,
  IndianRupee,
  Trash2,
  X,
  User,
  Users,
  MessageCircle,
  Send,
  Check,
  BarChart3,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Settings,
  Banknote,
  Receipt,
  ChevronDown,
  CreditCard,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RouteMap } from "@/components/route-map";

export default function MilkmanDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [dairyItems, setDairyItems] = useState([
    { name: "Fresh Milk", price: "", unit: "per liter", isCustom: false },
    { name: "Buffalo Milk", price: "", unit: "per liter", isCustom: false },
    { name: "Toned Milk", price: "", unit: "per liter", isCustom: false },
    { name: "Double Toned Milk", price: "", unit: "per liter", isCustom: false },
    { name: "Curd/Yogurt", price: "", unit: "per 500g", isCustom: false },
    { name: "Paneer", price: "", unit: "per kg", isCustom: false },
    { name: "Butter", price: "", unit: "per 500g", isCustom: false },
    { name: "Ghee", price: "", unit: "per kg", isCustom: false },
  ]);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [newCustomItem, setNewCustomItem] = useState({ name: "", unit: "", price: "" });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [serviceAddress, setServiceAddress] = useState("");
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
  const [deliverySlots, setDeliverySlots] = useState([
    { id: 1, startTime: "06:00", endTime: "09:00", name: "Morning", isActive: true },
    { id: 2, startTime: "17:00", endTime: "19:00", name: "Evening", isActive: true }
  ]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Customer management state
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [orderModalType, setOrderModalType] = useState<'today' | 'completed'>('today');
  const [assignedCustomers, setAssignedCustomers] = useState<any[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({ name: "", startTime: "06:00", endTime: "09:00", isActive: true });
  const [serviceRequestPrices, setServiceRequestPrices] = useState<Record<string, Record<number, string>>>({});

  // Earnings management state
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format

  // Monthly orders state
  const [showMonthlyOrdersModal, setShowMonthlyOrdersModal] = useState(false);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all");

  // COD payment verification state
  const [showCODModal, setShowCODModal] = useState(false);

  // Bills management state
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  // Notification state for customers
  const [hasNewCustomerActivity, setHasNewCustomerActivity] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState(Date.now());

  // Local state for quantity inputs to prevent API calls on every keystroke
  const [localQuantities, setLocalQuantities] = useState<Record<number, string>>({});


  // WebSocket connection
  const { isConnected, sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  // Handle real-time inventory updates and notifications
  useEffect(() => {
    const handleInventoryUpdate = (data: any) => {
      if (data.type === 'inventory_update') {
        console.log('Real-time inventory update received:', data.data);

        // Update local quantities state to reflect new inventory
        if (data.data.dairyItems) {
          const newLocalQuantities: Record<number, string> = {};
          data.data.dairyItems.forEach((item: any, index: number) => {
            newLocalQuantities[index] = String(item.quantity || 0);
          });
          setLocalQuantities(newLocalQuantities);

          // Invalidate profile query to refresh from server
          queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });

          // Show toast notification
          toast({
            title: "Inventory Updated",
            description: data.data.message || "Product inventory has been updated automatically",
          });
        }
      } else if (data.type === 'new_notification') {
        // Refresh notifications when new ones arrive
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        setHasNewCustomerActivity(true);
      }
    };

    addMessageHandler('inventory-handler', handleInventoryUpdate);

    return () => {
      removeMessageHandler('inventory-handler');
    };
  }, [addMessageHandler, removeMessageHandler]); // Remove problematic dependencies

  const { data: milkmanProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/milkmen/profile"],
    enabled: !!user,
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/orders/milkman"],
    enabled: !!milkmanProfile,
  });

  // Fetch assigned customers
  const { data: assignedCustomersData, error: customersError } = useQuery<any[]>({
    queryKey: ["/api/milkmen/customers"],
    enabled: !!milkmanProfile,
    staleTime: 0, // Ensure we always fetch fresh data
    refetchOnMount: true,
  });

  useEffect(() => {
    console.log("Dashboard: Assigned Customers Data:", assignedCustomersData);
    if (customersError) {
      console.error("Dashboard: Error fetching customers:", customersError);
    }
  }, [assignedCustomersData, customersError]);

  // Fetch notifications for the milkman
  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!milkmanProfile,
  });



  // Fetch service requests for milkman
  const { data: serviceRequests } = useQuery<any[]>({
    queryKey: ["/api/service-requests/milkman"],
    enabled: !!milkmanProfile,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  // Fetch group chat messages for monthly orders
  const { data: groupChatMessages } = useQuery<any[]>({
    queryKey: ["/api/chat/group", milkmanProfile?.id],
    enabled: !!milkmanProfile,
  });

  // Fetch pending COD payments for this milkman
  const { data: codPayments, refetch: refetchCODPayments } = useQuery<any[]>({
    queryKey: ["/api/payments/cod/pending", milkmanProfile?.id],
    enabled: !!milkmanProfile,
  });

  // Process monthly orders analytics for selected customer
  const processMonthlyOrdersAnalytics = () => {
    if (!groupChatMessages || !selectedCustomer) return { dailyOrders: {}, totalAmount: 0, productTotals: {} };

    const orderMessages = groupChatMessages.filter((msg: any) =>
      (msg.messageType === 'order' || (msg.orderQuantity && parseFloat(msg.orderQuantity) > 0)) &&
      msg.customerId === selectedCustomer.id
    );
    const [year, month] = selectedMonth.split('-').map(Number);

    // Group by date and product
    const dailyOrders: { [key: string]: { [product: string]: { quantity: number, amount: number, customerName: string, customerId: number }[] } } = {};
    const productTotals: { [product: string]: { quantity: number, amount: number } } = {};
    let totalAmount = 0;

    orderMessages.forEach((msg: any) => {
      const date = new Date(msg.createdAt);
      if (date.getMonth() === month - 1 && date.getFullYear() === year) {
        const dateKey = date.toISOString().split('T')[0];

        // Parse order items from the message
        let orderItems = msg.orderItems || [];

        // Fallback for legacy orders that have quantity but no items
        if (orderItems.length === 0 && msg.orderQuantity && parseFloat(msg.orderQuantity) > 0) {
          orderItems = [{
            product: msg.orderProduct || "Milk",
            quantity: parseFloat(msg.orderQuantity),
            price: parseFloat(milkmanProfile?.pricePerLiter || "0")
          }];
        }

        orderItems.forEach((item: any) => {
          const productName = item.product;
          const quantity = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const amount = quantity * price;

          if (!dailyOrders[dateKey]) {
            dailyOrders[dateKey] = {};
          }

          if (!dailyOrders[dateKey][productName]) {
            dailyOrders[dateKey][productName] = [];
          }

          dailyOrders[dateKey][productName].push({
            quantity,
            amount,
            customerName: selectedCustomer.name,
            customerId: selectedCustomer.id
          });

          // Update product totals
          if (!productTotals[productName]) {
            productTotals[productName] = { quantity: 0, amount: 0 };
          }
          productTotals[productName].quantity += quantity;
          productTotals[productName].amount += amount;

          totalAmount += amount;
        });
      }
    });

    return { dailyOrders, totalAmount, productTotals };
  };

  const { dailyOrders, totalAmount, productTotals } = processMonthlyOrdersAnalytics();

  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/milkmen", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
      setShowProfileForm(false);
      toast({
        title: "Profile Created",
        description: "Your milkman profile has been set up successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await apiRequest(`/api/orders/${orderId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      await apiRequest("/api/milkmen/availability", "PATCH", { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductsMutation = useMutation({
    mutationFn: async (dairyItems: any[]) => {
      await apiRequest("/api/milkmen/products", "PATCH", { dairyItems });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
      // Don't show toast for individual quantity updates to avoid spam
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize local quantities when milkman profile loads
  useEffect(() => {
    if (milkmanProfile?.dairyItems) {
      const initialQuantities: Record<number, string> = {};
      milkmanProfile.dairyItems.forEach((item: any, index: number) => {
        initialQuantities[index] = String(item.quantity || 0);
      });
      setLocalQuantities(initialQuantities);
    }
  }, [milkmanProfile]);

  // Store timeout refs for debouncing
  const updateTimeouts = useRef<Record<number, NodeJS.Timeout>>({});

  // Debounced function to update product quantity
  const updateQuantityWithDelay = (index: number, newQuantity: number) => {
    // Clear existing timeout for this index
    if (updateTimeouts.current[index]) {
      clearTimeout(updateTimeouts.current[index]);
    }

    // Set new timeout for delayed update
    updateTimeouts.current[index] = setTimeout(() => {
      if (milkmanProfile?.dairyItems) {
        const updatedItems = [...milkmanProfile.dairyItems];
        updatedItems[index] = { ...updatedItems[index], quantity: newQuantity };
        updateProductsMutation.mutate(updatedItems);
      }
    }, 800); // 800ms delay to allow for complete typing
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const acceptServiceRequestMutation = useMutation({
    mutationFn: async ({ requestId, services }: { requestId: number; services: any[] }) => {
      return apiRequest(`/api/service-requests/${requestId}/approve`, "POST", { services });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      toast({
        title: "Service Request Accepted",
        description: "Customer has been notified of your pricing and acceptance.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept service request",
        variant: "destructive",
      });
    },
  });

  const rejectServiceRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest(`/api/service-requests/${requestId}/reject`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      toast({
        title: "Service Request Declined",
        description: "Customer has been notified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to decline service request",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return apiRequest("/api/chat/send", "POST", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setNewMessage("");
      // Individual customer chats will handle their own refresh
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // WebSocket message handling
  useEffect(() => {
    if (!isConnected) return;

    const handleWebSocketMessage = (data: any) => {
      if (data.type === 'new_message' && data.message) {
        setChatMessages(prev => [...prev, data.message]);
        // Set notification if message is from customer
        if (data.message.senderType === 'customer') {
          setHasNewCustomerActivity(true);
        }
      } else if (data.type === 'message_sent' && data.message) {
        setChatMessages(prev => [...prev, data.message]);
      } else if (data.type === 'new_order' || data.type === 'order_accepted' || data.type === 'order_delivered') {
        // Set notification for new orders
        if (data.type === 'new_order') {
          setHasNewCustomerActivity(true);
        }
        // Invalidate orders query to refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
      }
    };

    addMessageHandler('milkman-dashboard', handleWebSocketMessage);

    return () => {
      removeMessageHandler('milkman-dashboard');
    };
  }, [isConnected]); // Remove handler dependencies to prevent loops

  // Only show profile form if needed - run once after initial load
  useEffect(() => {
    if (!profileLoading && !milkmanProfile) {
      setShowProfileForm(true);
    }
  }, [profileLoading]); // Remove milkmanProfile dependency to prevent loops

  // Update assigned customers state
  useEffect(() => {
    if (assignedCustomersData) {
      setAssignedCustomers(assignedCustomersData);
    }
  }, [assignedCustomersData]);

  // Chat messages are now handled per individual customer in their respective chat components

  // Update active chats count
  useEffect(() => {
    if (assignedCustomersData) {
      setActiveChats(assignedCustomersData.filter((customer: any) => customer.hasActiveChat));
    }
  }, [assignedCustomersData]);

  // Check for new customer activity (messages or orders) - reduced dependencies to prevent loops
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // Check for unread notifications related to customers (messages, orders)
      const unreadNotifications = notifications.filter((notification: any) =>
        !notification.isRead &&
        (notification.type === 'message' || notification.type === 'order')
      );

      setHasNewCustomerActivity(unreadNotifications.length > 0);
    }
  }, [notifications]); // Remove complex dependencies that can cause loops

  // Auto-generate formatted address from individual fields - use separate function to avoid infinite loops
  const generateAddressFromDetails = (details: typeof addressDetails) => {
    const parts = [];

    // Clean and validate each field before adding
    const cleanedDetails = {
      houseNumber: details.houseNumber.trim(),
      buildingName: details.buildingName.trim(),
      streetName: details.streetName.trim(),
      area: details.area.trim(),
      landmark: details.landmark.trim(),
      city: details.city.trim(),
      state: details.state.trim(),
      pincode: details.pincode.trim(),
      country: details.country.trim()
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
    return generatedAddress;
  };

  // Only update address when user manually edits address details
  useEffect(() => {
    const generatedAddress = generateAddressFromDetails(addressDetails);
    if (generatedAddress && generatedAddress !== serviceAddress) {
      setServiceAddress(generatedAddress);
    }
  }, []); // Remove dependency to prevent infinite loops - address will be updated via form handlers

  // Real-time location tracking
  useEffect(() => {
    let watchId: number;

    if (navigator.geolocation) {
      // Start watching position immediately for real-time updates
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocationCoords({ lat: latitude, lng: longitude });
          setIsGettingLocation(false);

          // Update profile with new location (optimistically or periodically? kept simple here)
          // Ideally we don't spam the API. We can just update local state for the map.

          // Reverse geocode only if address is missing or significantly changed (simplified here to just on first load or manual trigger)
        },
        (error) => {
          console.error("Error watching position:", error);
          if (error.code === error.PERMISSION_DENIED) {
            toast({
              title: "Location Permission Denied",
              description: "Please enable location services for real-time tracking.",
              variant: "destructive",
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000
        }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    // Manual trigger just to refresh address details via reverse geocoding
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocationCoords({ lat: latitude, lng: longitude });

          try {
            // Use BigDataCloud reverse geocoding API with detailed address
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            console.log("Geocoding response:", data);

            if (data) {
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

              const formattedAddress = addressParts.filter(Boolean).join(", ");
              setServiceAddress(formattedAddress || `${latitude}, ${longitude}`);
            }

            setIsGettingLocation(false);
            toast({
              title: "Location Found",
              description: "Your current location has been set as service address",
            });
          } catch (error) {
            console.error("Geocoding error:", error);

            // Fallback to OpenStreetMap Nominatim with enhanced detail level
            try {
              const osmResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&extratags=1&namedetails=1`);

              if (osmResponse.ok) {
                const osmData = await osmResponse.json();
                console.log("OSM Geocoding response:", osmData);

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

                  // Update address details state
                  setAddressDetails(newAddressDetails);

                  // Build formatted address
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

                  const addressText = parts.filter(Boolean).join(", ");
                  setServiceAddress(addressText || osmData.display_name || `${latitude}, ${longitude}`);
                }
              }
            } catch (osmError) {
              console.log("OSM geocoding also failed:", osmError);
              setServiceAddress(`${latitude}, ${longitude}`);
            }

            setIsGettingLocation(false);
            toast({
              title: "Location Found",
              description: "Coordinates have been set. You can edit the address manually.",
            });
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setIsGettingLocation(false);
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enter address manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
    }
  };

  const updateDairyItemPrice = (index: number, price: string) => {
    const updatedItems = [...dairyItems];
    updatedItems[index].price = price;
    setDairyItems(updatedItems);
  };

  const addCustomItem = () => {
    if (newCustomItem.name.trim() && newCustomItem.unit.trim()) {
      const customItem = {
        name: newCustomItem.name.trim(),
        unit: newCustomItem.unit.trim(),
        price: newCustomItem.price.trim(),
        isCustom: true
      };
      setDairyItems([...dairyItems, customItem]);
      setNewCustomItem({ name: "", unit: "", price: "" });
      setShowCustomItemForm(false);
      toast({
        title: "Custom Item Added",
        description: `${customItem.name} has been added to your product list`,
      });
    }
  };

  const removeCustomItem = (index: number) => {
    const updatedItems = dairyItems.filter((_, i) => i !== index);
    setDairyItems(updatedItems);
    toast({
      title: "Item Removed",
      description: "Custom item has been removed from your product list",
    });
  };

  const addDeliverySlot = () => {
    if (newSlot.name && newSlot.startTime && newSlot.endTime) {
      if (editingSlot !== null) {
        // Update existing slot
        setDeliverySlots(deliverySlots.map(slot =>
          slot.id === editingSlot ? { ...newSlot, id: editingSlot } : slot
        ));
        setEditingSlot(null);
        toast({
          title: "Delivery Slot Updated",
          description: `${newSlot.name} slot has been updated`,
        });
      } else {
        // Add new slot
        const newId = Math.max(...deliverySlots.map(slot => slot.id), 0) + 1;
        setDeliverySlots([...deliverySlots, { ...newSlot, id: newId }]);
        toast({
          title: "Delivery Slot Added",
          description: `${newSlot.name} slot has been added to your schedule`,
        });
      }
      setNewSlot({ name: "", startTime: "06:00", endTime: "09:00", isActive: true });
      setShowSlotForm(false);
    }
  };

  const editDeliverySlot = (slot: any) => {
    setNewSlot({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive
    });
    setEditingSlot(slot.id);
    setShowSlotForm(true);
  };

  const removeDeliverySlot = (id: number) => {
    setDeliverySlots(deliverySlots.filter(slot => slot.id !== id));
    toast({
      title: "Delivery Slot Removed",
      description: "Delivery slot has been removed from your schedule",
    });
  };

  const toggleSlotActive = (id: number) => {
    setDeliverySlots(deliverySlots.map(slot =>
      slot.id === id ? { ...slot, isActive: !slot.isActive } : slot
    ));
  };

  const cancelSlotEdit = () => {
    setNewSlot({ name: "", startTime: "06:00", endTime: "09:00", isActive: true });
    setEditingSlot(null);
    setShowSlotForm(false);
  };

  const formatTime12Hour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Filter out dairy items with empty prices
    const activeDairyItems = dairyItems.filter(item => item.price.trim() !== "");

    // Calculate a default price from dairy items or use a default value
    const defaultPrice = activeDairyItems.length > 0 ?
      activeDairyItems.find(item => item.name?.toLowerCase()?.includes('milk'))?.price || "25.00" :
      "25.00";

    // Get active delivery slots for the primary schedule
    const activeSlots = deliverySlots.filter(slot => slot.isActive);
    const primarySlot = activeSlots.length > 0 ? activeSlots[0] : deliverySlots[0];

    const data = {
      contactName: formData.get("contactName") as string,
      businessName: formData.get("businessName") as string,
      address: serviceAddress || (formData.get("address") as string),
      // Use calculated default price since we removed the base price field
      pricePerLiter: defaultPrice,
      dairyItems: activeDairyItems,
      deliveryTimeStart: primarySlot?.startTime || "06:00",
      deliveryTimeEnd: primarySlot?.endTime || "09:00",
      deliverySlots: deliverySlots, // Include all slots for advanced scheduling
      // Bank account details
      bankAccountNumber: formData.get("bankAccountNumber") as string,
      bankIfscCode: formData.get("bankIfscCode") as string,
      bankAccountHolderName: formData.get("bankAccountHolderName") as string,
      bankAccountType: formData.get("bankAccountType") as string,
      bankName: formData.get("bankName") as string,
      upiId: formData.get("upiId") as string,
    };
    console.log("Frontend: Sending data to create milkman profile:", JSON.stringify(data, null, 2));
    createProfileMutation.mutate(data);
  };

  const handleOrderStatusUpdate = (orderId: number, status: string) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  const handleAvailabilityToggle = (isAvailable: boolean) => {
    updateAvailabilityMutation.mutate(isAvailable);
  };

  // Chat handlers
  const handleOpenChat = (customer: any) => {
    setSelectedCustomer(customer);
    setShowChatModal(true);
  };

  const handleOpenCustomersModal = () => {
    setShowCustomersModal(true);
    // Reset notification when opening customers modal
    setHasNewCustomerActivity(false);
    setLastCheckedTime(Date.now());
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedCustomer && milkmanProfile && isConnected) {
      sendMessage(selectedCustomer.id, milkmanProfile.id, newMessage, 'milkman');
      setNewMessage("");
    }
  };

  const handleAcceptOrder = async (message: any) => {
    try {
      // Mark message as accepted via API
      await apiRequest(`/api/chat/messages/${message.id}/accepted`, "POST");

      // Update local state
      setChatMessages(prev => prev.map(msg =>
        msg.id === message.id
          ? { ...msg, isAccepted: true, acceptedAt: new Date().toISOString() }
          : msg
      ));

      // Real-time inventory management - decrease quantity when order is accepted
      if (milkmanProfile?.dairyItems && message.orderQuantity) {
        const orderedQuantity = parseFloat(message.orderQuantity) || 0;
        const productName = message.orderProduct || 'Fresh Milk'; // Default to Fresh Milk if not specified

        // Find matching product and update inventory
        const updatedDairyItems = milkmanProfile.dairyItems.map((item: any) => {
          if (item.name === productName ||
            (productName === 'Fresh Milk' && item.name?.toLowerCase()?.includes('fresh milk'))) {
            const currentQuantity = parseFloat(item.quantity) || 0;
            const newQuantity = Math.max(0, currentQuantity - orderedQuantity);

            console.log(`Inventory Update: ${item.name} - Ordered: ${orderedQuantity}, Current: ${currentQuantity}, New: ${newQuantity}`);

            return {
              ...item,
              quantity: newQuantity,
              isAvailable: newQuantity > 0
            };
          }
          return item;
        });

        // Update inventory via API
        try {
          await updateProductsMutation.mutateAsync(updatedDairyItems);
          console.log('Inventory automatically updated after order acceptance');
        } catch (inventoryError) {
          console.error('Failed to update inventory:', inventoryError);
          toast({
            title: "Warning",
            description: "Order accepted but inventory update failed. Please update manually.",
            variant: "destructive",
          });
        }
      }

      // Send real-time WebSocket notification for order acceptance
      if (isConnected && selectedCustomer && milkmanProfile) {
        // Send confirmation message to customer
        sendMessage(selectedCustomer.id, milkmanProfile.id,
          `✅ Order Accepted! Your order for ${message.orderQuantity} units has been confirmed. I'll deliver it soon.`,
          'milkman'
        );
      }

      // Create notification for customer
      try {
        await apiRequest('/api/notifications', 'POST', {
          userId: selectedCustomer.userId,
          title: 'Order Accepted',
          message: `Your order for ${message.orderQuantity} units has been accepted by ${milkmanProfile.contactName}`,
          type: 'order_accepted',
          relatedId: message.id
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      toast({
        title: "Order Accepted",
        description: "Customer has been notified and inventory automatically updated",
      });
    } catch (error: any) {
      console.error('Error accepting order:', error);
      toast({
        title: "Error",
        description: "Failed to accept order",
        variant: "destructive",
      });
    }
  };

  // Removed handleConfirmDelivery - using 3-tick system where Mark Delivered is the final step

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="w-full px-6 py-4">
          <Card className="w-full max-w-none">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold">{getTranslatedText('Complete Your Profile', language)}</CardTitle>
              <p className="text-lg text-gray-600 mt-2">
                Let's set up your milkman profile to start serving customers
              </p>
            </CardHeader>
            <CardContent className="px-8 pb-6">
              <form onSubmit={handleProfileSubmit} className="space-y-8 max-w-4xl mx-auto">
                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 border-b pb-3">{getTranslatedText('Contact Information', language)}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="contactName" className="text-base font-medium">{getTranslatedText('Full Name', language)}</Label>
                      <Input
                        id="contactName"
                        name="contactName"
                        placeholder="e.g., Rajesh Kumar"
                        required
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessName" className="text-base font-medium">{getTranslatedText('Business Name', language)}</Label>
                      <Input
                        id="businessName"
                        name="businessName"
                        placeholder="e.g., Rajesh Kumar Dairy"
                        required
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Address */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 border-b pb-3">{getTranslatedText('Service Area', language)}</h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="modern-button text-white font-medium flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        {isGettingLocation ? getTranslatedText('Getting Location...', language) : getTranslatedText('Use Current Location', language)}
                      </Button>
                    </div>

                    {/* Detailed Address Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="houseNumber" className="text-base font-medium">{getTranslatedText('House/Flat Number', language)}</Label>
                        <Input
                          id="houseNumber"
                          name="houseNumber"
                          placeholder="e.g., 123, A-501"
                          value={addressDetails.houseNumber}
                          onChange={(e) => setAddressDetails({ ...addressDetails, houseNumber: e.target.value })}
                          className="mt-2 h-12 text-base"
                        />
                      </div>
                      <div>
                        <Label htmlFor="buildingName" className="text-base font-medium">{getTranslatedText('Building/Society Name', language)}</Label>
                        <Input
                          id="buildingName"
                          name="buildingName"
                          placeholder="e.g., Sunshine Apartments"
                          value={addressDetails.buildingName}
                          onChange={(e) => setAddressDetails({ ...addressDetails, buildingName: e.target.value })}
                          className="mt-2 h-12 text-base"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="streetName">{getTranslatedText('Street Name', language)}</Label>
                        <Input
                          id="streetName"
                          name="streetName"
                          placeholder="e.g., MG Road"
                          value={addressDetails.streetName}
                          onChange={(e) => setAddressDetails({ ...addressDetails, streetName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="area">{getTranslatedText('Area/Locality', language)}</Label>
                        <Input
                          id="area"
                          name="area"
                          placeholder="e.g., Koregaon Park"
                          value={addressDetails.area}
                          onChange={(e) => setAddressDetails({ ...addressDetails, area: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="landmark">{getTranslatedText('Landmark', language)}</Label>
                      <Input
                        id="landmark"
                        name="landmark"
                        placeholder="e.g., Near City Hospital"
                        value={addressDetails.landmark}
                        onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">{getTranslatedText('City', language)}</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="e.g., Mumbai"
                          value={addressDetails.city}
                          onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">{getTranslatedText('State', language)}</Label>
                        <Input
                          id="state"
                          name="state"
                          placeholder="e.g., Maharashtra"
                          value={addressDetails.state}
                          onChange={(e) => setAddressDetails({ ...addressDetails, state: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pincode">{getTranslatedText('Pincode', language)}</Label>
                        <Input
                          id="pincode"
                          name="pincode"
                          placeholder="e.g., 400001"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={addressDetails.pincode}
                          onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">{getTranslatedText('Country', language)}</Label>
                        <Input
                          id="country"
                          name="country"
                          placeholder="e.g., India"
                          value={addressDetails.country || "India"}
                          onChange={(e) => setAddressDetails({ ...addressDetails, country: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="formattedAddress">{getTranslatedText('Complete Address', language)}</Label>
                      <Textarea
                        id="formattedAddress"
                        name="formattedAddress"
                        placeholder="This will be auto-filled based on the details above"
                        value={serviceAddress}
                        onChange={(e) => setServiceAddress(e.target.value)}
                        className="min-h-[80px]"
                        required
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Tip: For accurate service area, ensure street name and area/locality are filled correctly
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 border-b pb-3">{getTranslatedText('Bank Account Details (Optional)', language)}</h3>
                  <p className="text-sm text-gray-600">{getTranslatedText('Add your bank account details to receive payments directly from customers', language)}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankAccountHolderName" className="text-base font-medium">{getTranslatedText('Account Holder Name', language)}</Label>
                      <Input
                        id="bankAccountHolderName"
                        name="bankAccountHolderName"
                        placeholder="e.g., Rajesh Kumar"
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccountType" className="text-base font-medium">{getTranslatedText('Account Type', language)}</Label>
                      <select
                        id="bankAccountType"
                        name="bankAccountType"
                        className="mt-2 h-12 text-base flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">{getTranslatedText('Select Account Type', language)}</option>
                        <option value="savings">{getTranslatedText('Savings Account', language)}</option>
                        <option value="current">{getTranslatedText('Current Account', language)}</option>
                        <option value="overdraft">{getTranslatedText('Overdraft Account', language)}</option>
                        <option value="joint">{getTranslatedText('Joint Account', language)}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankAccountNumber" className="text-base font-medium">{getTranslatedText('Account Number', language)}</Label>
                      <Input
                        id="bankAccountNumber"
                        name="bankAccountNumber"
                        placeholder="e.g., 1234567890123456"
                        pattern="[0-9]{9,18}"
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankIfscCode" className="text-base font-medium">{getTranslatedText('IFSC Code', language)}</Label>
                      <Input
                        id="bankIfscCode"
                        name="bankIfscCode"
                        placeholder="e.g., SBIN0001234"
                        pattern="[A-Z]{4}0[A-Z0-9]{6}"
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="bankName" className="text-base font-medium">{getTranslatedText('Bank Name', language)}</Label>
                      <Input
                        id="bankName"
                        name="bankName"
                        placeholder="e.g., State Bank of India"
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="upiId" className="text-base font-medium">{getTranslatedText('UPI ID (Optional)', language)}</Label>
                      <Input
                        id="upiId"
                        name="upiId"
                        placeholder="e.g., rajeshkumar@paytm"
                        className="mt-2 h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 mt-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">{getTranslatedText('Payment Information', language)}</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {getTranslatedText('Your bank account details are securely stored and used only for receiving payments from customers. We never share this information with third parties.', language)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dairy Products & Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{getTranslatedText('Dairy Products & Pricing', language)}</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">{getTranslatedText('Additional Dairy Products (Optional)', language)}</Label>
                        <p className="text-sm text-gray-600">{getTranslatedText('Set prices for additional products you offer', language)}</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowCustomItemForm(true)}
                        variant="outline"
                        className="flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{getTranslatedText('Add Custom Item', language)}</span>
                        <span className="sm:hidden">+</span>
                      </Button>
                    </div>

                    {/* Custom Item Form */}
                    {showCustomItemForm && (
                      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{getTranslatedText('Add Custom Dairy Product', language)}</h4>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowCustomItemForm(false);
                              setNewCustomItem({ name: "", unit: "", price: "" });
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="customItemName">{getTranslatedText('Product Name', language)}</Label>
                            <Input
                              id="customItemName"
                              placeholder="e.g., Lassi"
                              value={newCustomItem.name}
                              onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="customItemUnit">{getTranslatedText('Unit', language)}</Label>
                            <Input
                              id="customItemUnit"
                              placeholder="e.g., per 250ml"
                              value={newCustomItem.unit}
                              onChange={(e) => setNewCustomItem({ ...newCustomItem, unit: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="customItemPrice">{getTranslatedText('Price (₹)', language)}</Label>
                            <Input
                              id="customItemPrice"
                              type="number"
                              step="0.1"
                              min="1"
                              placeholder="0.00"
                              value={newCustomItem.price}
                              onChange={(e) => setNewCustomItem({ ...newCustomItem, price: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button
                            type="button"
                            onClick={addCustomItem}
                            disabled={!newCustomItem.name.trim() || !newCustomItem.unit.trim()}
                            className="modern-button text-white font-medium"
                          >
                            {getTranslatedText('Add Product', language)}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3">
                      {dairyItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({item.unit})</span>
                            {item.isCustom && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                                {getTranslatedText('Custom', language)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              step="0.1"
                              min="1"
                              placeholder="0.00"
                              value={item.price}
                              onChange={(e) => updateDairyItemPrice(index, e.target.value)}
                              className="w-24"
                            />
                            {item.isCustom && (
                              <Button
                                type="button"
                                onClick={() => removeCustomItem(index)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Delivery Schedule Slots */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{getTranslatedText('Delivery Schedule', language)}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSlotForm(true)}
                      className="text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">{getTranslatedText('Add Slot', language)}</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  </div>

                  {/* Existing Slots */}
                  <div className="space-y-3">
                    {deliverySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={slot.isActive}
                            onCheckedChange={() => toggleSlotActive(slot.id)}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{slot.name}</p>
                            <p className="text-sm text-gray-600">
                              {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editDeliverySlot(slot)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeliverySlot(slot.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add/Edit Slot Form */}
                  {showSlotForm && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        {editingSlot !== null ? getTranslatedText('Edit Delivery Slot', language) : getTranslatedText('Add New Delivery Slot', language)}
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="slotName">{getTranslatedText('Slot Name', language)}</Label>
                          <Input
                            id="slotName"
                            placeholder="e.g., Morning, Afternoon, Evening"
                            value={newSlot.name}
                            onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="slotStartTime">{getTranslatedText('Start Time', language)}</Label>
                            <select
                              id="slotStartTime"
                              value={newSlot.startTime}
                              onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="05:00">5:00 AM</option>
                              <option value="05:30">5:30 AM</option>
                              <option value="06:00">6:00 AM</option>
                              <option value="06:30">6:30 AM</option>
                              <option value="07:00">7:00 AM</option>
                              <option value="07:30">7:30 AM</option>
                              <option value="08:00">8:00 AM</option>
                              <option value="08:30">8:30 AM</option>
                              <option value="09:00">9:00 AM</option>
                              <option value="09:30">9:30 AM</option>
                              <option value="10:00">10:00 AM</option>
                              <option value="10:30">10:30 AM</option>
                              <option value="11:00">11:00 AM</option>
                              <option value="11:30">11:30 AM</option>
                              <option value="12:00">12:00 PM</option>
                              <option value="12:30">12:30 PM</option>
                              <option value="13:00">1:00 PM</option>
                              <option value="13:30">1:30 PM</option>
                              <option value="14:00">2:00 PM</option>
                              <option value="14:30">2:30 PM</option>
                              <option value="15:00">3:00 PM</option>
                              <option value="15:30">3:30 PM</option>
                              <option value="16:00">4:00 PM</option>
                              <option value="16:30">4:30 PM</option>
                              <option value="17:00">5:00 PM</option>
                              <option value="17:30">5:30 PM</option>
                              <option value="18:00">6:00 PM</option>
                              <option value="18:30">6:30 PM</option>
                              <option value="19:00">7:00 PM</option>
                              <option value="19:30">7:30 PM</option>
                              <option value="20:00">8:00 PM</option>
                              <option value="20:30">8:30 PM</option>
                              <option value="21:00">9:00 PM</option>
                              <option value="21:30">9:30 PM</option>
                              <option value="22:00">10:00 PM</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="slotEndTime">{getTranslatedText('End Time', language)}</Label>
                            <select
                              id="slotEndTime"
                              value={newSlot.endTime}
                              onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="05:30">5:30 AM</option>
                              <option value="06:00">6:00 AM</option>
                              <option value="06:30">6:30 AM</option>
                              <option value="07:00">7:00 AM</option>
                              <option value="07:30">7:30 AM</option>
                              <option value="08:00">8:00 AM</option>
                              <option value="08:30">8:30 AM</option>
                              <option value="09:00">9:00 AM</option>
                              <option value="09:30">9:30 AM</option>
                              <option value="10:00">10:00 AM</option>
                              <option value="10:30">10:30 AM</option>
                              <option value="11:00">11:00 AM</option>
                              <option value="11:30">11:30 AM</option>
                              <option value="12:00">12:00 PM</option>
                              <option value="12:30">12:30 PM</option>
                              <option value="13:00">1:00 PM</option>
                              <option value="13:30">1:30 PM</option>
                              <option value="14:00">2:00 PM</option>
                              <option value="14:30">2:30 PM</option>
                              <option value="15:00">3:00 PM</option>
                              <option value="15:30">3:30 PM</option>
                              <option value="16:00">4:00 PM</option>
                              <option value="16:30">4:30 PM</option>
                              <option value="17:00">5:00 PM</option>
                              <option value="17:30">5:30 PM</option>
                              <option value="18:00">6:00 PM</option>
                              <option value="18:30">6:30 PM</option>
                              <option value="19:00">7:00 PM</option>
                              <option value="19:30">7:30 PM</option>
                              <option value="20:00">8:00 PM</option>
                              <option value="20:30">8:30 PM</option>
                              <option value="21:00">9:00 PM</option>
                              <option value="21:30">9:30 PM</option>
                              <option value="22:00">10:00 PM</option>
                              <option value="22:30">10:30 PM</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            onClick={addDeliverySlot}
                            className="modern-button text-white font-medium"
                          >
                            {editingSlot !== null ? getTranslatedText('Update Slot', language) : getTranslatedText('Add Slot', language)}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelSlotEdit}
                          >
                            {getTranslatedText('Cancel', language)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full modern-button text-white font-semibold py-4 h-auto text-lg mb-0"
                  disabled={createProfileMutation.isPending}
                >
                  {createProfileMutation.isPending ? getTranslatedText('Setting up...', language) : getTranslatedText('Complete Profile Setup', language)}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const todaysOrders = (orders || []).filter((order: any) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.deliveryDate).toDateString();
    return today === orderDate;
  });

  const completedOrders = todaysOrders.filter((order: any) => order.status === "delivered");
  const pendingOrders = todaysOrders.filter((order: any) => order.status !== "delivered");
  const totalRevenue = completedOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalAmount), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <Card className="modern-card mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
                  {getTranslatedText('WELCOME', language)}, <span className="gradient-text">{milkmanProfile?.contactName || "Milkman"}</span>!
                </h1>
                <p className="text-lg text-muted-foreground">
                  {getTranslatedText('You have', language)} {pendingOrders.length} {getTranslatedText('deliveries scheduled for today', language)}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-3 dashboard-header-controls">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={milkmanProfile?.isAvailable || false}
                    onCheckedChange={handleAvailabilityToggle}
                  />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {milkmanProfile?.isAvailable ? getTranslatedText('Online', language) : getTranslatedText('Offline', language)}
                  </span>
                </div>






              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            setOrderModalType('today');
            setShowOrdersModal(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{getTranslatedText('Today\'s Orders', language)}</p>
                  <p className="text-2xl font-bold text-gray-900">{todaysOrders.length}</p>
                </div>
                <div className="dairy-blue p-4 rounded-full">
                  <ShoppingCart className="h-8 w-8 text-primary-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            setOrderModalType('completed');
            setShowOrdersModal(true);
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{getTranslatedText('Completed', language)}</p>
                  <p className="text-2xl font-bold text-gray-900">{completedOrders.length}</p>
                </div>
                <div className="dairy-green p-4 rounded-full">
                  <CheckCircle className="h-8 w-8 text-secondary-green" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={handleOpenCustomersModal}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{getTranslatedText('My Customers', language)}</p>
                  <p className="text-2xl font-bold text-gray-900">{assignedCustomers.length}</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-full relative">
                  <Users className="h-8 w-8 text-purple-600" />
                  {hasNewCustomerActivity && (
                    <div className="notification-dot notification-dot-pulse"></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setShowEarningsModal(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{getTranslatedText('Monthly Average', language)}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalRevenue * 30).toFixed(0)}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-full">
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowBillsModal(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{getTranslatedText('Bills', language)}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{consolidatedBill ? consolidatedBill.totalAmount : "0.00"}</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-full">
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2">

            {/* Active Delivery Section */}
            {todaysOrders.some((o: any) => o.status === 'out_for_delivery') && (
              <Card className="mb-8 border-l-4 border-l-green-500 shadow-md bg-green-50/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2 text-green-700">
                      <Truck className="h-6 w-6 animate-pulse" />
                      {getTranslatedText('Active Delivery', language)}
                    </CardTitle>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 animate-pulse">
                      Live Tracking
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(() => {
                      const activeOrder = todaysOrders.find((o: any) => o.status === 'out_for_delivery');
                      if (!activeOrder) return null;
                      const customer = assignedCustomers.find((c: any) => c.id === activeOrder.customerId);

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-semibold">{customer?.name || `Customer #${activeOrder.customerId}`}</h3>
                              <p className="text-sm text-gray-500">{customer?.address}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">{activeOrder.quantity}L</div>
                              <div className="text-sm text-gray-500">Vol.</div>
                            </div>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Confirmed</span>
                              <span>Out for Delivery</span>
                              <span>Delivered</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full w-[60%] animate-pulse"></div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleOrderStatusUpdate(activeOrder.id, "delivered")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Delivered
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => window.location.href = `tel:${customer?.phone}`}>
                              <Phone className="mr-2 h-4 w-4" />
                              Call
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{getTranslatedText('Today\'s Deliveries', language)}</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary-blue hover:bg-dairy-blue">
                    {getTranslatedText('Sort by Route', language)}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysOrders.map((order: any) => (
                    <Card key={order.id} className={order.status === "delivered" ? "bg-green-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${order.status === "delivered"
                              ? "bg-secondary-green text-white"
                              : order.status === "out_for_delivery"
                                ? "bg-primary-blue text-white"
                                : "bg-gray-200 text-gray-600"
                              }`}>
                              {order.status === "delivered" ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : order.status === "out_for_delivery" ? (
                                <Truck className="h-5 w-5" />
                              ) : (
                                <Clock className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {assignedCustomers.find((c: any) => c.id === order.customerId)?.name || `Customer #${order.customerId}`}
                              </h3>
                              <p className="text-sm text-gray-600">Delivery Time: {order.deliveryTime}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₹{order.totalAmount}</p>
                            <p className="text-sm text-gray-600">{order.quantity}L Milk</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${order.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : order.status === "out_for_delivery"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                              }`}>
                              {order.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        {order.status !== "delivered" && (
                          <div className="mt-4 flex space-x-2">
                            <Button
                              size="sm"
                              className="flex-1 modern-button text-white font-medium"
                              onClick={() => handleOrderStatusUpdate(order.id, "delivered")}
                              disabled={updateOrderStatusMutation.isPending}
                            >
                              {getTranslatedText('Mark Delivered', language)}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-4"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {todaysOrders.length === 0 && (
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">{getTranslatedText('No deliveries scheduled for today', language)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Route Map Section - Moved here */}
            <Card className="overflow-hidden mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{getTranslatedText('Delivery Route', language)}</span>
                  <span className="text-sm font-normal text-muted-foreground">{todaysOrders.length} stops</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Prepare Locations */}
                {(() => {
                  const locations = [];
                  // Add Milkman (Start)
                  if (locationCoords) {
                    locations.push({
                      lat: locationCoords.lat,
                      lng: locationCoords.lng,
                      name: "Start Location",
                      type: 'milkman' as const
                    });
                  } else if (milkmanProfile?.latitude && milkmanProfile?.longitude) {
                    locations.push({
                      lat: parseFloat(milkmanProfile.latitude),
                      lng: parseFloat(milkmanProfile.longitude),
                      name: milkmanProfile.businessName || "My Dairy",
                      address: milkmanProfile.address,
                      type: 'milkman' as const
                    });
                  }

                  // Add Customers (Stops) from Today's Orders
                  // We need unique customers for the map to avoid duplicate stops
                  const uniqueCustomerIds = new Set();
                  todaysOrders.forEach((order: any) => {
                    const customer = assignedCustomers.find((c: any) => c.id === order.customerId);
                    if (customer && !uniqueCustomerIds.has(customer.id)) {
                      uniqueCustomerIds.add(customer.id);
                      // Use customer lat/lng if available, otherwise we might skip or use a fallback
                      // For now assuming customer has lat/lng or we can't plot them
                      if (customer.latitude && customer.longitude) {
                        locations.push({
                          lat: parseFloat(customer.latitude),
                          lng: parseFloat(customer.longitude),
                          name: customer.name,
                          address: customer.address,
                          type: 'customer' as const
                        });
                      }
                    }
                  });

                  return locations.length > 0 ? (
                    <div className="h-[400px]">
                      <RouteMap locations={locations} height="100%" />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-gray-50">
                      <Route className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No location data available for route.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={getCurrentLocation}>
                        <MapPin className="mr-2 h-4 w-4" />
                        Detect My Location
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Service Requests */}
            {milkmanProfile && (
              <MilkmanServiceRequests
                milkmanProfile={milkmanProfile}
                onCustomerChat={handleOpenChat}
              />
            )}

            {/* Product Inventory Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {getTranslatedText('Product Inventory', language)}
                  <Package className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {milkmanProfile?.dairyItems && milkmanProfile.dairyItems.length > 0 ? (
                    <>
                      {milkmanProfile.dairyItems.map((item: any, index: number) => (
                        <div key={index} className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 space-y-2">
                          {/* Product name and availability */}
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate flex-1 mr-2 dark:text-gray-100">{item.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${item.isAvailable
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                              }`}>
                              {item.isAvailable ? getTranslatedText('Available', language) : getTranslatedText('Out of Stock', language)}
                            </span>
                          </div>

                          {/* Price and stock status */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">₹</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="1"
                                value={item.price}
                                onChange={(e) => {
                                  const updatedItems = [...milkmanProfile.dairyItems];
                                  updatedItems[index] = { ...item, price: e.target.value };
                                  updateProductsMutation.mutate(updatedItems);
                                }}
                                disabled={updateProductsMutation.isPending}
                                className="w-16 h-7 text-center text-sm px-1 font-medium dark:bg-gray-700 dark:text-gray-100"
                                placeholder="0.0"
                              />
                              <span className="text-gray-500 text-xs dark:text-gray-400">{item.unit}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.quantity > 10
                              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : item.quantity > 0
                                ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              }`}>
                              {item.quantity > 10
                                ? getTranslatedText('In Stock', language)
                                : item.quantity > 0
                                  ? getTranslatedText('Low Stock', language)
                                  : getTranslatedText('No Stock', language)}
                            </span>
                          </div>

                          {/* Quantity input and availability toggle */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 flex-1">
                              <Label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {getTranslatedText('Qty', language)}:
                              </Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={localQuantities[index] || ""}
                                onChange={(e) => {
                                  const inputValue = e.target.value;

                                  // Allow only numeric characters
                                  if (!/^\d*$/.test(inputValue)) {
                                    return; // Ignore non-numeric input
                                  }

                                  // Allow empty input for clearing
                                  if (inputValue === "") {
                                    setLocalQuantities(prev => ({ ...prev, [index]: "" }));
                                    updateQuantityWithDelay(index, 0);
                                    return;
                                  }

                                  const newQuantity = parseInt(inputValue);
                                  // Validate range 0-999
                                  if (newQuantity >= 0 && newQuantity <= 999) {
                                    setLocalQuantities(prev => ({ ...prev, [index]: inputValue }));
                                    updateQuantityWithDelay(index, newQuantity);
                                  }
                                }}
                                onBlur={(e) => {
                                  // Ensure valid value on blur
                                  const inputValue = e.target.value;
                                  if (inputValue === "" || isNaN(parseInt(inputValue))) {
                                    setLocalQuantities(prev => ({ ...prev, [index]: "0" }));
                                    updateQuantityWithDelay(index, 0);
                                  }
                                }}
                                disabled={updateProductsMutation.isPending}
                                className="w-20 h-8 text-center text-sm px-1 font-medium dark:bg-gray-700 dark:text-gray-100"
                                placeholder="0-999"
                                maxLength={3}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const updatedItems = [...milkmanProfile.dairyItems];
                                updatedItems[index] = {
                                  ...item,
                                  isAvailable: !item.isAvailable,
                                  quantity: !item.isAvailable ? Math.max(1, item.quantity) : item.quantity
                                };
                                updateProductsMutation.mutate(updatedItems);
                              }}
                              disabled={updateProductsMutation.isPending}
                              className="h-7 px-2 text-xs"
                            >
                              {item.isAvailable ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {updateProductsMutation.isPending && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          {getTranslatedText('Updating inventory...', language)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">{getTranslatedText('No products found', language)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>



            {/* Daily Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{getTranslatedText('Daily Summary', language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{getTranslatedText('Orders completed', language)}</span>
                    <span className="font-medium">{completedOrders.length}/{todaysOrders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{getTranslatedText('Distance covered', language)}</span>
                    <span className="font-medium">4.2 km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{getTranslatedText('Earnings today', language)}</span>
                    <span className="font-medium text-secondary-green">₹{totalRevenue.toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-secondary-green h-2 rounded-full"
                      style={{ width: `${(completedOrders.length / Math.max(todaysOrders.length, 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {Math.round((completedOrders.length / Math.max(todaysOrders.length, 1)) * 100)}% {getTranslatedText('of daily target completed', language)}
                  </p>
                </div>
              </CardContent>
            </Card>



            {/* Customer Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{getTranslatedText('Recent Feedback', language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border-l-4 border-secondary-green pl-3">
                    <div className="flex items-center space-x-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">"Always on time and friendly!"</p>
                    <p className="text-xs text-gray-500">- {getTranslatedText('Customer', language)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Customers Modal */}
      <Dialog open={showCustomersModal} onOpenChange={setShowCustomersModal}>
        <DialogContent className="w-[95vw] max-w-4xl h-[85vh] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{getTranslatedText('My Customers', language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assignedCustomers.length > 0 ? (
              assignedCustomers.map((customer: any) => (
                <Card key={customer.id} className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{customer.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{customer.phone}</p>
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 sm:line-clamp-1">{customer.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChat(customer)}
                        className="flex-1 sm:flex-none h-9"
                      >
                        <MessageCircle className="h-4 w-4 sm:mr-2" />
                        <span className="hidden xs:inline sm:inline">{getTranslatedText('Chat', language)}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowMonthlyOrdersModal(true);
                        }}
                        className="flex-1 sm:flex-none h-9"
                      >
                        <ShoppingCart className="h-4 w-4 sm:mr-2" />
                        <span className="hidden xs:inline sm:inline">{getTranslatedText('Monthly Orders', language)}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{getTranslatedText('No customers assigned yet', language)}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Earnings Modal */}
      <Dialog open={showEarningsModal} onOpenChange={setShowEarningsModal}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              {getTranslatedText('Monthly Earnings Details', language)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Month Selector */}
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium">{getTranslatedText('Select Month', language)}:</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">₹{(totalRevenue * 30).toFixed(0)}</p>
                    <p className="text-sm text-gray-600">{getTranslatedText('Total Month', language)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">₹{totalRevenue.toFixed(0)}</p>
                    <p className="text-sm text-gray-600">{getTranslatedText('Daily Average', language)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{completedOrders.length * 30}</p>
                    <p className="text-sm text-gray-600">{getTranslatedText('Orders Delivered', language)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Day-by-Day Earnings List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{getTranslatedText('Daily Earnings Breakdown', language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const year = parseInt(selectedMonth.split('-')[0]);
                    const month = parseInt(selectedMonth.split('-')[1]);
                    const daysInMonth = new Date(year, month, 0).getDate();
                    const today = new Date();
                    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

                    return Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const date = new Date(year, month - 1, day);
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const isToday = isCurrentMonth && day === today.getDate();
                      const isPast = date < today;

                      // Generate sample earnings based on day patterns
                      const baseEarnings = totalRevenue;
                      const weekendMultiplier = (dayName === 'Sun' || dayName === 'Sat') ? 0.7 : 1;
                      const randomVariation = 0.8 + Math.random() * 0.4; // 80% to 120%
                      const dayEarnings = isPast || isToday ? baseEarnings * weekendMultiplier * randomVariation : 0;

                      const ordersCount = isPast || isToday ? Math.floor(Math.random() * 8) + 3 : 0;

                      return (
                        <div key={day} className={`flex items-center justify-between p-3 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                          }`}>
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border">
                              <span className="text-sm font-medium">{day}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {dayName}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {isToday && <span className="text-blue-600 ml-2">({getTranslatedText('Today', language)})</span>}
                              </p>
                              <p className="text-sm text-gray-600">
                                {isPast || isToday ? `${ordersCount} ${getTranslatedText('orders delivered', language)}` : getTranslatedText('No deliveries yet', language)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${dayEarnings > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              ₹{dayEarnings.toFixed(0)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {isPast || isToday ? getTranslatedText('Completed', language) : getTranslatedText('Pending', language)}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Customer Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="flex flex-col w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] p-0 overflow-hidden bg-gray-50 dark:bg-gray-900 border-0 gap-0">
          <div className="flex-1 min-h-0 w-full relative">
            <IndividualCustomerChat
              selectedCustomer={selectedCustomer}
              milkmanProfile={milkmanProfile}
              onClose={() => setShowChatModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={showOrdersModal} onOpenChange={setShowOrdersModal}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {orderModalType === 'today' ? getTranslatedText("Today's Orders", language) : getTranslatedText("Completed Orders", language)} {getTranslatedText('Details', language)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {orderModalType === 'today' ? (
              todaysOrders.length > 0 ? (
                <div className="space-y-4">
                  {todaysOrders.map((order: any) => (
                    <Card key={order.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <ShoppingCart className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {assignedCustomers.find((c: any) => c.id === order.customerId)?.name || getTranslatedText('Unknown Customer', language)}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {getTranslatedText('Order', language)} #{order.id} • {new Date(order.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">₹{order.totalAmount}</p>
                            <p className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                              {order.status}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Product Details</Label>
                            <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium text-gray-900">{order.productName}</p>
                              <p className="text-sm text-gray-600">
                                Quantity: {order.quantity} {(order.productName || "").toLowerCase().includes('milk') ? 'L' : 'units'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Price: ₹{order.pricePerLiter} per {(order.productName || "").toLowerCase().includes('milk') ? 'liter' : 'unit'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-600">Customer Address</Label>
                            <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700">
                                {assignedCustomers.find((c: any) => c.id === order.customerId)?.address || 'Address not available'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{getTranslatedText('No orders for today', language)}</p>
                </div>
              )
            ) : (
              completedOrders.length > 0 ? (
                <div className="space-y-4">
                  {completedOrders.map((order: any) => (
                    <Card key={order.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {assignedCustomers.find((c: any) => c.id === order.customerId)?.name || 'Unknown Customer'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Order #{order.id} • Delivered on {new Date(order.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">₹{order.totalAmount}</p>
                            <p className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              {order.status}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Product Details</Label>
                            <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium text-gray-900">{order.productName}</p>
                              <p className="text-sm text-gray-600">
                                Quantity: {order.quantity} {(order.productName || "").toLowerCase().includes('milk') ? 'L' : 'units'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Price: ₹{order.pricePerLiter} per {(order.productName || "").toLowerCase().includes('milk') ? 'liter' : 'unit'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-600">Customer Address</Label>
                            <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700">
                                {assignedCustomers.find((c: any) => c.id === order.customerId)?.address || 'Address not available'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{getTranslatedText('No completed orders', language)}</p>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Orders Modal */}
      <Dialog open={showMonthlyOrdersModal} onOpenChange={setShowMonthlyOrdersModal}>
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Monthly Orders - {selectedCustomer?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowMonthlyOrdersModal(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Month Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Select Month:</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold">Total Month</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{totalAmount.toFixed(0)}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold">Products Sold</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {Object.keys(productTotals).length}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold">Total Orders</h3>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(dailyOrders).length}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  <h3 className="font-semibold">Total Quantity</h3>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {Object.values(productTotals).reduce((sum: number, product: any) => sum + product.quantity, 0).toFixed(1)}L
                </p>
              </Card>
            </div>

            {/* Daily Orders Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Daily Orders</CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Filter by Product:</label>
                    <select
                      value={selectedProductFilter}
                      onChange={(e) => setSelectedProductFilter(e.target.value)}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="all">All Products</option>
                      {Object.keys(productTotals).map(product => (
                        <option key={product} value={product}>{product}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dailyOrders)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, products]) => {
                      const dateObj = new Date(date);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      const formattedDate = dateObj.toLocaleDateString('en-IN');
                      const isToday = dateObj.toDateString() === new Date().toDateString();

                      // Filter products if a specific product is selected
                      const filteredProducts = selectedProductFilter === 'all'
                        ? products
                        : { [selectedProductFilter]: products[selectedProductFilter] || [] };

                      // Skip if no products match the filter
                      if (Object.keys(filteredProducts).length === 0 ||
                        Object.values(filteredProducts).every(orders => orders.length === 0)) {
                        return null;
                      }

                      return (
                        <Card key={date} className={`border-l-4 ${isToday ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{dayName}</h4>
                                <p className="text-sm text-gray-600">{formattedDate}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Total</p>
                                <p className="text-xl font-bold text-green-600">
                                  ₹{Object.values(filteredProducts).reduce((sum, orders) =>
                                    sum + orders.reduce((orderSum, order) => orderSum + order.amount, 0), 0
                                  ).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {Object.entries(filteredProducts).map(([product, orders]) => (
                                <div key={product} className="bg-white p-3 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-gray-900">{product}</h5>
                                    <p className="text-sm font-medium text-gray-600">
                                      {orders.reduce((sum, order) => sum + order.quantity, 0)}L × ₹{orders[0]?.amount / orders[0]?.quantity || 0} = ₹{orders.reduce((sum, order) => sum + order.amount, 0).toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    {orders.map((order, index) => (
                                      <div key={index} className="flex items-center justify-between text-sm text-gray-600">
                                        <span>{order.customerName}</span>
                                        <span>{order.quantity}L - ₹{order.amount.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bills Modal */}
      <Dialog open={showBillsModal} onOpenChange={setShowBillsModal}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              {getTranslatedText('Customer Bills', language)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder={getTranslatedText('Search customers by name...', language)}
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="pl-4 pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <User className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Bills Content */}
            <div className="space-y-4">
              {assignedCustomers
                .filter(customer =>
                  (customer.name || "").toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                  (customer.phone || "").includes(customerSearchTerm)
                )
                .map((customer, index) => {
                  // Calculate customer bills from orders
                  const customerOrders = orders?.filter(order => order.customerId === customer.id) || [];
                  const totalAmount = customerOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
                  const paidOrders = customerOrders.filter(order => order.paymentStatus === 'completed');
                  const unpaidOrders = customerOrders.filter(order => order.paymentStatus !== 'completed');

                  // Payment method distribution
                  const paymentMethods = customerOrders.reduce((acc, order) => {
                    const method = order.paymentMethod || 'COD';
                    acc[method] = (acc[method] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  const primaryPaymentMethod = Object.keys(paymentMethods).length > 0
                    ? Object.keys(paymentMethods).reduce((a, b) => paymentMethods[a] > paymentMethods[b] ? a : b)
                    : 'COD';

                  return (
                    <Card key={customer.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Customer Info */}
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                              <p className="text-sm text-gray-600">{customer.phone}</p>
                              <p className="text-xs text-gray-500 mt-1 truncate" title={customer.address}>
                                {customer.address}
                              </p>
                            </div>
                          </div>

                          {/* Total Amount */}
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                            <p className="text-xl font-bold text-green-600">₹{totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{customerOrders.length} orders</p>
                          </div>

                          {/* Payment Method */}
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Primary Payment</p>
                            <div className="flex items-center justify-center gap-1">
                              {primaryPaymentMethod === 'COD' && <Banknote className="h-4 w-4 text-orange-600" />}
                              {primaryPaymentMethod === 'UPI' && <Smartphone className="h-4 w-4 text-purple-600" />}
                              {primaryPaymentMethod === 'Online' && <CreditCard className="h-4 w-4 text-blue-600" />}
                              <span className={`text-sm font-medium ${primaryPaymentMethod === 'COD' ? 'text-orange-600' :
                                primaryPaymentMethod === 'UPI' ? 'text-purple-600' : 'text-blue-600'
                                }`}>
                                {primaryPaymentMethod}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {Object.entries(paymentMethods).map(([method, count]) =>
                                `${method}: ${count}`
                              ).join(', ')}
                            </p>
                          </div>

                          {/* Payment Status */}
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">
                                  Paid: {paidOrders.length}
                                </span>
                              </div>
                              {unpaidOrders.length > 0 && (
                                <div className="flex items-center justify-center gap-2">
                                  <Clock className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm font-medium text-orange-600">
                                    Pending: {unpaidOrders.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Order Details Expansion */}
                        {customerOrders.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <details className="group">
                              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                <span>View Order Details ({customerOrders.length} orders)</span>
                                <span className="group-open:rotate-180 transition-transform">
                                  <ChevronDown className="h-4 w-4" />
                                </span>
                              </summary>
                              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                                {customerOrders.slice(0, 5).map((order, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                    <div>
                                      <span className="font-medium">{order.productName || 'Milk'}</span>
                                      <span className="text-gray-500 ml-2">{order.quantity}L</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">₹{(order.amount || 0).toFixed(2)}</div>
                                      <div className={`text-xs px-2 py-1 rounded ${order.paymentStatus === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {order.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {customerOrders.length > 5 && (
                                  <p className="text-xs text-gray-500 text-center">
                                    +{customerOrders.length - 5} more orders...
                                  </p>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

              {/* No Results */}
              {assignedCustomers
                .filter(customer =>
                  (customer.name || "").toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                  (customer.phone || "").includes(customerSearchTerm)
                ).length === 0 && (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Found</h3>
                    <p className="text-gray-600">
                      {customerSearchTerm
                        ? `No customers found matching "${customerSearchTerm}"`
                        : "No customer bills available yet."
                      }
                    </p>
                  </div>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}

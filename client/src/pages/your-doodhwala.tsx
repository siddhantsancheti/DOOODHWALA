import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YDChat } from "@/components/yd-chat";
import { WhatsAppGroupChat } from "@/components/whatsapp-group-chat";
import { ServiceRequestForm } from "@/components/service-request-form";
import { ServiceSelectionForm } from "@/components/service-selection-form";
import { Heart, MessageCircle, Star, Phone, MapPin, Clock, Settings, ArrowLeft, Search, UserPlus, ShoppingCart, User, BarChart3, Calendar, TrendingUp, FileText, Download, Users, Key, Package, UserMinus } from "lucide-react";
import { useLanguage, getTranslatedText } from '@/hooks/useLanguage';
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function YourDoodhwala() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();

  const { data: customerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const { data: milkmen } = useQuery({
    queryKey: ["/api/milkmen"],
    enabled: !!user,
  });

  // Check for payment success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const paymentMethod = urlParams.get('method');

    if (paymentStatus === 'success') {
      toast({
        title: getTranslatedText("Payment Successful!", language),
        description: getTranslatedText("Your payment has been processed successfully. Thank you for your order!", language),
      });
      // Remove the payment parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [toast]);

  // Unassign milkman mutation
  const removeMilkmanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/customers/unassign-yd", "POST");
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Dairyman Removed",
        description: "You have successfully removed your dairyman.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/your-doodhwala"] });
      // Reset state
      // setYourDoodhwala(null); 
      setShowSettings(false);
    },
    onError: (error: any) => {
      // Check if it's a pending bills error
      if (error.message.includes("Pending bills")) {
        const totalAmount = error.body?.totalAmount;

        toast({
          title: "Cannot Remove Dairyman",
          description: `You have pending bills. Redirecting to payment page...`,
          variant: "destructive",
        });

        // Redirect to checkout after a short delay
        setTimeout(() => {
          if (totalAmount && (customerProfile as any)?.assignedMilkmanId) {
            localStorage.setItem('checkoutAmount', totalAmount.toString());
            setLocation(`/checkout?amount=${totalAmount}&source=monthly-orders&milkmanId=${(customerProfile as any)?.assignedMilkmanId}`);
          } else {
            // Fallback if we don't have exact details
            setLocation('/view-orders');
          }
        }, 1500);
      } else {
        toast({
          title: "Removal Failed",
          description: error.message || "Failed to remove dairyman",
          variant: "destructive",
        });
      }
    },
  });

  // Mock customer pricing data since endpoint may not be available
  const customerPricing = null;

  // Fetch real service requests
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["/api/service-requests/customer"],
    enabled: !!user,
  });

  // Mock chat messages since endpoint may not be available
  const chatMessages: any[] = [];

  // Mock group chat messages since endpoint may not be available - Sample data to show all members
  const groupChatMessages: any[] = [
    {
      id: 1,
      messageType: 'order',
      customerId: 1,
      orderItems: [
        { product: 'Fresh Milk', quantity: '2', price: '55' },
        { product: 'Curd', quantity: '1', price: '40' }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      messageType: 'order',
      customerId: 2,
      orderItems: [
        { product: 'Buffalo Milk', quantity: '1.5', price: '60' },
        { product: 'Buttermilk', quantity: '2', price: '25' }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString() // Yesterday
    },
    {
      id: 3,
      messageType: 'order',
      customerId: 3,
      orderItems: [
        { product: 'Fresh Milk', quantity: '1', price: '55' },
        { product: 'Curd', quantity: '2', price: '40' }
      ],
      createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ];

  // Mock group members since endpoint may not be available - Sample data for all group members
  const groupMembers: any[] = [
    { id: 1, name: 'Priya Sharma' },
    { id: 2, name: 'Rajesh Kumar' },
    { id: 3, name: 'Anita Patel' }
  ];

  // Find assigned milkman with fallback
  const yourDairyman = (milkmen && Array.isArray(milkmen))
    ? milkmen.find((m: any) => m.id === (customerProfile as any)?.assignedMilkmanId) || null
    : null;

  // Get additional milkmen from service requests (empty for now)
  const additionalMilkmen: any[] = [];

  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [showOrderChart, setShowOrderChart] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [activeSheet, setActiveSheet] = useState("summary");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [selectedProduct, setSelectedProduct] = useState("all"); // Product filter
  const [searchTerm, setSearchTerm] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupPassword, setGroupPassword] = useState("");
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  const openChatWindow = () => {
    setShowChat(true);
  };

  const openSettingsWindow = () => {
    setShowSettings(true);
  };

  const handleJoinGroup = async () => {
    if (!groupCode || !groupPassword) {
      toast({
        title: getTranslatedText("Error", language),
        description: getTranslatedText("Please enter both group code and password", language),
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse milkman ID from group code (format: MILK{id}GRP)
      const milkmanIdMatch = groupCode.match(/^MILK(\d+)GRP$/);
      if (!milkmanIdMatch) {
        throw new Error(getTranslatedText("Invalid group code format. Expected format: MILK{number}GRP", language));
      }

      const milkmanId = parseInt(milkmanIdMatch[1]);
      const milkman = (milkmen && Array.isArray(milkmen))
        ? milkmen.find((m: any) => m.id === milkmanId)
        : null;

      if (!milkman) {
        throw new Error(getTranslatedText("Milkman not found for this group code", language));
      }

      // Validate password (format: businessname123)
      const expectedPassword = `${milkman.businessName?.replace(/\s+/g, '').toLowerCase()}123`;
      if (groupPassword !== expectedPassword) {
        throw new Error(getTranslatedText("Invalid group password", language));
      }

      // Check if already assigned to this milkman
      if ((customerProfile as any)?.assignedMilkmanId === milkmanId) {
        toast({
          title: getTranslatedText("Already Member", language),
          description: getTranslatedText("You are already assigned to this milkman's group", language),
        });
        setShowJoinGroupDialog(false);
        return;
      }

      // Assign customer to milkman
      const response = await apiRequest({
        url: "/api/customers/assign-yd",
        method: "POST",
        body: {
          milkmanId: milkmanId
        }
      });

      if (response.ok) {
        toast({
          title: getTranslatedText("Success", language),
          description: getTranslatedText("Successfully joined group!", language),
        });

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });

        // Reset form
        setGroupCode("");
        setGroupPassword("");
        setShowJoinGroupDialog(false);
      } else {
        throw new Error(getTranslatedText("Failed to join group", language));
      }
    } catch (error: any) {
      toast({
        title: getTranslatedText("Error", language),
        description: error.message || getTranslatedText("Failed to join group", language),
        variant: "destructive",
      });
    }
  };

  const openServiceSelection = () => {
    setShowServiceSelection(true);
  };

  const openOrderChart = () => {
    setShowOrderChart(true);
  };

  const handlePayNow = (amount: number) => {
    // Store payment amount and redirect to checkout
    localStorage.setItem('checkoutAmount', amount.toString());
    setLocation(`/checkout?amount=${amount}&source=monthly-orders&milkmanId=${(customerProfile as any)?.assignedMilkmanId}`);
  };

  // Process chat messages for order analytics
  const processOrderAnalytics = () => {
    // Return empty data structure when no messages available
    if (!groupChatMessages || groupChatMessages.length === 0) {
      return {
        chartData: [],
        pieChartData: [],
        totalAmount: 0,
        productTotals: {},
        productSheets: {},
        summarySheet: [],
        dailyOrders: {}
      };
    }
    // Use group chat messages for comprehensive order tracking
    const orderMessages = groupChatMessages.filter((msg: any) => msg.messageType === 'order');
    const [year, month] = selectedMonth.split('-').map(Number);

    // Group by date and product
    const dailyOrders: { [key: string]: { [product: string]: { quantity: number, amount: number, customerName: string, customerId: number }[] } } = {};
    const productTotals: { [product: string]: { quantity: number, amount: number } } = {};
    const productSheets: { [product: string]: Array<{ date: string, day: string, quantity: number, amount: number }> } = {};

    orderMessages.forEach((msg: any) => {
      const date = new Date(msg.createdAt);
      if (date.getMonth() === month - 1 && date.getFullYear() === year) {
        const dateKey = date.toISOString().split('T')[0];

        // Get customer name from group members
        const customer = groupMembers.find((member: any) => member.id === msg.customerId);
        const customerName = customer?.name || 'Unknown Customer';

        // Parse order items from the message
        const orderItems = msg.orderItems || [];

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
            customerName,
            customerId: msg.customerId
          });

          // Update product totals
          if (!productTotals[productName]) {
            productTotals[productName] = { quantity: 0, amount: 0 };
          }
          productTotals[productName].quantity += quantity;
          productTotals[productName].amount += amount;

          // Create product sheets (Excel-like tables)
          if (!productSheets[productName]) {
            productSheets[productName] = [];
          }

          // Find or create entry for this date
          let dateEntry = productSheets[productName].find(entry => entry.date === dateKey);
          if (!dateEntry) {
            dateEntry = {
              date: dateKey,
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              quantity: 0,
              amount: 0
            };
            productSheets[productName].push(dateEntry);
          }

          dateEntry.quantity += quantity;
          dateEntry.amount += amount;
        });
      }
    });

    // Sort product sheets by date
    Object.keys(productSheets).forEach(product => {
      productSheets[product].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    // Convert to chart data - properly sum quantities from multiple orders
    const chartData = Object.entries(dailyOrders).map(([date, products]) => ({
      date: new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      fullDate: date,
      ...Object.entries(products).reduce((acc, [product, orders]) => ({
        ...acc,
        [product]: (orders as any[]).reduce((sum: number, order: any) => sum + order.quantity, 0),
        [`${product}_amount`]: (orders as any[]).reduce((sum: number, order: any) => sum + order.amount, 0)
      }), {})
    })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

    // Product pie chart data
    const pieChartData = Object.entries(productTotals).map(([product, data]) => ({
      name: product,
      value: (data as any).quantity,
      amount: (data as any).amount
    }));

    const totalAmount = Object.values(productTotals).reduce((sum, data) => sum + (data as any).amount, 0);

    // Create overall summary sheet - properly handle arrays of orders
    const summarySheet = Object.entries(dailyOrders).map(([date, products]) => ({
      date: date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      formattedDate: new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      products: Object.entries(products).map(([product, orders]) => ({
        product,
        quantity: (orders as any[]).reduce((sum: number, order: any) => sum + order.quantity, 0),
        amount: (orders as any[]).reduce((sum: number, order: any) => sum + order.amount, 0)
      })),
      totalQuantity: Object.values(products).reduce((sum, orders) =>
        sum + (orders as any[]).reduce((orderSum: number, order: any) => orderSum + order.quantity, 0), 0),
      totalAmount: Object.values(products).reduce((sum, orders) =>
        sum + (orders as any[]).reduce((orderSum: number, order: any) => orderSum + order.amount, 0), 0)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { chartData, pieChartData, totalAmount, productTotals, productSheets, summarySheet, dailyOrders };
  };

  const { chartData, pieChartData, totalAmount, productTotals, productSheets, summarySheet, dailyOrders } = processOrderAnalytics();

  const filteredMilkmen = (milkmen && Array.isArray(milkmen))
    ? milkmen.filter((milkman: any) => {
      // Filter out currently assigned milkman and match search term
      const isNotCurrentlyAssigned = milkman.id !== (customerProfile as any)?.assignedMilkmanId;
      const matchesSearch = (milkman.contactName || milkman.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (milkman.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (milkman.address || '').toLowerCase().includes(searchTerm.toLowerCase());

      return isNotCurrentlyAssigned && matchesSearch;
    })
    : [];

  const [selectedMilkmenForAssignment, setSelectedMilkmenForAssignment] = useState<any[]>([]);
  const [selectedMilkmanForService, setSelectedMilkmanForService] = useState<any>(null);

  const assignMilkmanMutation = useMutation({
    mutationFn: async (data: { milkmanId: number }) => {
      console.log("Attempting to assign milkman:", data);
      const response = await apiRequest({
        url: "/api/customers/assign-yd",
        method: "PATCH",
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Assignment API error:", errorData);
        throw new Error(errorData.message || `Assignment failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log("Assignment API success:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
    },
    onError: (error: any) => {
      console.error("Assignment mutation error:", error);
      toast({
        title: getTranslatedText("Assignment Error", language),
        description: error.message || getTranslatedText("Failed to assign milkman. Please try again.", language),
        variant: "destructive",
      });
    },
  });

  const createServiceRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating service request:", data);
      const response = await apiRequest("/api/service-requests", "POST", data);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Service request API error:", errorData);
        throw new Error(errorData.message || `Service request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log("Service request API success:", result);
      return result;
    },
    onError: (error: any) => {
      console.error("Service request mutation error:", error);
      toast({
        title: getTranslatedText("Service Request Error", language),
        description: error.message || getTranslatedText("Failed to create service request. Please try again.", language),
        variant: "destructive",
      });
    },
  });

  const handleMilkmanSelection = (milkman: any) => {
    setSelectedMilkmenForAssignment(prev => {
      const exists = prev.find(m => m.id === milkman.id);
      if (exists) {
        return prev.filter(m => m.id !== milkman.id);
      } else {
        return [...prev, milkman];
      }
    });
  };

  const handleAssignSelectedMilkmen = async () => {
    if (selectedMilkmenForAssignment.length > 0) {
      // Instead of directly assigning, show service selection for the first milkman
      setSelectedMilkmanForService(selectedMilkmenForAssignment[0]);
      setShowAssignDialog(false);
      setShowServiceSelection(true);
    }
  };

  const handleServiceSelectionComplete = async (milkman: any, selectedServices: any[], selectedDeliverySlots: any[] = []) => {
    try {
      console.log("Starting assignment process:");
      console.log("Primary milkman:", milkman);
      console.log("Selected milkmen for assignment:", selectedMilkmenForAssignment);
      console.log("Selected services:", selectedServices);

      /* Removed immediate assignment - waiting for milkman acceptance
      // Assign the primary milkman (only the first one)
      await assignMilkmanMutation.mutateAsync({
        milkmanId: milkman.id
      });
      console.log("Primary milkman assigned successfully");
      */

      // Create service request for the primary milkman
      await createServiceRequestMutation.mutateAsync({
        milkmanId: milkman.id,
        services: selectedServices,
        customerNotes: `Assignment with selected services - ${milkman.contactName} (${milkman.businessName})`
      });
      console.log("Service request created for primary milkman");

      // Handle additional milkmen (skip the first one as it's already assigned)
      if (selectedMilkmenForAssignment.length > 1) {
        const additionalMilkmen = selectedMilkmenForAssignment.slice(1);
        console.log("Processing additional milkmen:", additionalMilkmen);

        for (const additionalMilkman of additionalMilkmen) {
          console.log("Creating service request for additional milkman:", additionalMilkman);
          // Only create service request for additional milkmen (don't reassign primary)
          await createServiceRequestMutation.mutateAsync({
            milkmanId: additionalMilkman.id,
            services: selectedServices,
            customerNotes: `Multi-milkman assignment - ${additionalMilkman.contactName} (${additionalMilkman.businessName})`
          });
        }
      }

      toast({
        title: getTranslatedText("Assignment Successful!", language),
        description: `${selectedMilkmenForAssignment.length} ${getTranslatedText("milkmen have been assigned with selected services.", language)}`,
      });

      handleAssignmentComplete();
    } catch (error) {
      console.error("Error in assignment:", error);
      toast({
        title: getTranslatedText("Assignment Error", language),
        description: error instanceof Error ? error.message : getTranslatedText("Failed to assign milkmen. Please try again.", language),
        variant: "destructive",
      });
    }
  };

  const handleAssignmentComplete = () => {
    setShowServiceSelection(false);
    setSelectedMilkmenForAssignment([]);
    setSelectedMilkmanForService(null);
    queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">{getTranslatedText("Profile Required", language)}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{getTranslatedText("Please complete your profile to view your dairyman.", language)}</p>
              <Button onClick={() => setLocation('/customer')}>{getTranslatedText("Back to Dashboard", language)}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation('/customer')}
            >
              <Heart className="h-6 w-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getTranslatedText("Your Doodhwala", language)}</h1>
            </div>
            <Button variant="outline" onClick={() => setLocation('/customer')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {getTranslatedText("Back to Dashboard", language)}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!yourDairyman && (Array.isArray(serviceRequests) && serviceRequests.length > 0 && (serviceRequests as any[])[0].status === 'pending') && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-900">Request Pending</h3>
                  <p className="text-yellow-700">You have requested {(serviceRequests as any[])[0].services?.length || 'service'} from a milkman. Waiting for acceptance.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200"
                  onClick={() => setShowRequestDetails(true)}
                >
                  View Details
                </Button>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Pending Approval
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Details Dialog */}
        <Dialog open={showRequestDetails} onOpenChange={setShowRequestDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Services you have requested. Waiting for milkman acceptance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {(serviceRequests as any[]) && (serviceRequests as any[]).length > 0 && (serviceRequests as any[])[0].services?.map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">{service.quantity} {service.unit}</p>
                  </div>
                  <p className="font-medium text-gray-900">₹{service.price}</p>
                </div>
              ))}
              {(serviceRequests as any[]) && (serviceRequests as any[]).length > 0 && (serviceRequests as any[])[0].customerNotes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Your Notes</p>
                  <p className="text-sm text-gray-700">{(serviceRequests as any[])[0].customerNotes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRequestDetails(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {yourDairyman ? (
          <div className="space-y-6">
            {/* Dairyman Name - Clickable Card for Daily Chat & Orders */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
              onClick={openChatWindow}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {yourDairyman.contactName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">{yourDairyman.contactName}</h3>
                      <p className="text-blue-700 dark:text-blue-200">{yourDairyman.businessName}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">{getTranslatedText("Click to chat and place daily orders", language)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 p-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettingsWindow();
                      }}
                      title="Settings & Services"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-100 p-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrderChart();
                      }}
                      title="Monthly Orders"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Assigned Milkmen */}
            {additionalMilkmen.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Milkmen</CardTitle>
                  <p className="text-sm text-gray-600">
                    Other milkmen you've requested services from
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {additionalMilkmen.map((milkman: any) => (
                      <Card key={milkman.id} className="p-4 border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold text-gray-600">
                                {milkman.contactName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold">{milkman.contactName}</h4>
                              <p className="text-sm text-gray-600">{milkman.businessName}</p>
                              <p className="text-xs text-gray-500">{milkman.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Service Request
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-sm">{milkman.rating || "4.5"}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-16 flex items-center gap-3"
                    onClick={() => window.open(`tel:${yourDairyman.phone}`, '_self')}
                  >
                    <Phone className="h-5 w-5" />
                    <span>Call Dairyman</span>
                  </Button>

                  <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-16 flex items-center gap-3"
                      >
                        <Users className="h-5 w-5" />
                        <span>Join Group</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Join Group
                        </DialogTitle>
                        <DialogDescription>
                          Enter the group code and password to join a milkman's group chat
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Group Code</Label>
                          <Input
                            placeholder="Enter group code (e.g., MILK1GRP)"
                            value={groupCode}
                            onChange={(e) => setGroupCode(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Group Password</Label>
                          <Input
                            type="password"
                            placeholder="Enter group password"
                            value={groupPassword}
                            onChange={(e) => setGroupPassword(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowJoinGroupDialog(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleJoinGroup}
                            disabled={!groupCode || !groupPassword}
                          >
                            Join Group
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-16 flex items-center gap-3"
                      >
                        <UserPlus className="h-5 w-5" />
                        <span>Add More Milkmen</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Select Multiple Milkmen</DialogTitle>
                        <DialogDescription>
                          Choose one or more milkmen to assign. You'll need to select services before final assignment.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by name, business, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        {selectedMilkmenForAssignment.length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium mb-2">Selected Milkmen ({selectedMilkmenForAssignment.length}):</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedMilkmenForAssignment.map((milkman: any) => (
                                <Badge key={milkman.id} variant="default" className="text-xs">
                                  {milkman.contactName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="max-h-96 overflow-y-auto space-y-3">
                          {filteredMilkmen?.map((milkman: any) => {
                            const isSelected = selectedMilkmenForAssignment.find(m => m.id === milkman.id);
                            return (
                              <Card key={milkman.id} className={`p-4 cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                                }`} onClick={() => handleMilkmanSelection(milkman)}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold">{milkman.contactName}</h3>
                                      {milkman.verified && (
                                        <Badge variant="secondary" className="text-xs">
                                          Verified
                                        </Badge>
                                      )}
                                      {isSelected && (
                                        <Badge variant="default" className="text-xs">
                                          Selected
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{milkman.businessName}</p>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                      <MapPin className="h-3 w-3" />
                                      <span>{milkman.address}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                        <span>{milkman.rating || "4.5"}</span>
                                      </div>
                                      <span className="font-semibold text-blue-600">
                                        ₹{milkman.pricePerLiter}/L
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setSelectedMilkmenForAssignment([])}
                            disabled={selectedMilkmenForAssignment.length === 0}
                          >
                            Clear Selection
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={handleAssignSelectedMilkmen}
                            disabled={selectedMilkmenForAssignment.length === 0}
                          >
                            Assign {selectedMilkmenForAssignment.length} Milkmen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>


          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Dairyman Assigned</h3>
              <p className="text-gray-600 mb-4">
                You haven't been assigned a dairyman yet. Search and select a dairyman from available options.
              </p>
              <div className="flex gap-3 justify-center">
                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Assign Milkmen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Select Your Milkmen</DialogTitle>
                      <DialogDescription>
                        Choose one or more milkmen. You'll need to select products before final assignment.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name, business, or location..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {selectedMilkmenForAssignment.length > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium mb-2">Selected Milkmen ({selectedMilkmenForAssignment.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedMilkmenForAssignment.map((milkman: any) => (
                              <Badge key={milkman.id} variant="default" className="text-xs">
                                {milkman.contactName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {filteredMilkmen?.map((milkman: any) => {
                          const isSelected = selectedMilkmenForAssignment.find(m => m.id === milkman.id);
                          return (
                            <Card key={milkman.id} className={`p-4 cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                              }`} onClick={() => handleMilkmanSelection(milkman)}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold">{milkman.contactName}</h3>
                                    {milkman.verified && (
                                      <Badge variant="secondary" className="text-xs">
                                        Verified
                                      </Badge>
                                    )}
                                    {isSelected && (
                                      <Badge variant="default" className="text-xs">
                                        Selected
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-1">{milkman.businessName}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>{milkman.address}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                      <span>{milkman.rating || "4.5"}</span>
                                    </div>
                                    <span className="font-semibold text-blue-600">
                                      ₹{milkman.pricePerLiter}/L
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedMilkmenForAssignment([])}
                          disabled={selectedMilkmenForAssignment.length === 0}
                        >
                          Clear Selection
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleAssignSelectedMilkmen}
                          disabled={selectedMilkmenForAssignment.length === 0}
                        >
                          Select Services & Assign
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Join Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Join Group
                      </DialogTitle>
                      <DialogDescription>
                        Enter the group code and password to join a milkman's group chat
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Group Code</Label>
                        <Input
                          placeholder="Enter group code (e.g., MILK1GRP)"
                          value={groupCode}
                          onChange={(e) => setGroupCode(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Group Password</Label>
                        <Input
                          type="password"
                          placeholder="Enter group password"
                          value={groupPassword}
                          onChange={(e) => setGroupPassword(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowJoinGroupDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleJoinGroup}
                          disabled={!groupCode || !groupPassword}
                        >
                          Join Group
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* WhatsApp Group Chat Modal - Full Screen */}
      {
        showChat && yourDairyman && customerProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-4xl h-full max-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              <WhatsAppGroupChat
                customerProfile={customerProfile}
                milkmanProfile={yourDairyman}
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )
      }

      {/* Settings Modal */}
      {
        showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{getTranslatedText("Settings & Services", language)}</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-3 h-12"
                    onClick={() => {
                      setShowSettings(false);
                      setLocation('/service-requests');
                    }}
                  >
                    <Clock className="h-4 w-4" />
                    {getTranslatedText("View Service Requests", language)}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center gap-3 h-12"
                    onClick={() => {
                      setShowSettings(false);
                      setLocation('/view-orders');
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {getTranslatedText("View Order History", language)}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center gap-3 h-12"
                    onClick={() => {
                      setShowSettings(false);
                      setLocation('/track-delivery');
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    {getTranslatedText("Track Deliveries", language)}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center gap-3 h-12"
                    onClick={() => {
                      setShowSettings(false);
                      setShowServiceDetails(true);
                    }}
                  >
                    <User className="h-4 w-4" />
                    {getTranslatedText("Dairyman Details", language)}
                  </Button>

                  <Button
                    variant="destructive"
                    className="flex items-center gap-3 h-12 mt-4 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                    onClick={() => {
                      if (confirm("Are you sure you want to remove your dairyman?")) {
                        removeMilkmanMutation.mutate();
                      }
                    }}
                    disabled={removeMilkmanMutation.isPending}
                  >
                    <UserMinus className="h-4 w-4" />
                    {removeMilkmanMutation.isPending ? "Removing..." : getTranslatedText("Remove Dairyman", language)}
                  </Button>
                </div>

                <div className="pt-2 border-t">
                  <Button
                    className="w-full"
                    onClick={() => setShowSettings(false)}
                  >
                    {getTranslatedText("Close", language)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      {/* Service Details Modal */}
      {
        showServiceDetails && yourDairyman && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{yourDairyman.contactName} - {getTranslatedText("Service Details", language)}</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowServiceDetails(false)}>
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{getTranslatedText("Business Information", language)}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{yourDairyman.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{yourDairyman.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{yourDairyman.rating} ({yourDairyman.totalReviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{yourDairyman.deliveryTimeStart} - {yourDairyman.deliveryTimeEnd}</span>
                    </div>
                  </div>
                </div>

                {/* Available Products */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{getTranslatedText("Available Products & Services", language)}</h3>
                  <div className="grid gap-3">
                    {yourDairyman.dairyItems?.map((item: any, index: number) => {
                      // Check if there's custom pricing for this customer
                      const customPrice = (customerPricing as any)?.pricePerLiter;
                      const displayPrice = customPrice || item.price;
                      const isCustomPrice = !!customPrice;

                      return (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{item.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.unit}</p>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-blue-600">₹{displayPrice}</span>
                                  {isCustomPrice && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getTranslatedText("Custom Price", language)}
                                    </Badge>
                                  )}
                                  {isCustomPrice && item.price !== displayPrice && (
                                    <span className="text-sm text-gray-500 line-through">₹{item.price}</span>
                                  )}
                                </div>
                                <Badge variant={item.isAvailable ? "default" : "secondary"}>
                                  {item.isAvailable ? getTranslatedText("Available", language) : getTranslatedText("Out of Stock", language)}
                                </Badge>
                              </div>
                              {item.quantity && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {getTranslatedText("Stock", language)}: {item.quantity} {item.unit}
                                </p>
                              )}
                              {isCustomPrice && (customerPricing as any)?.notes && (
                                <p className="text-sm text-blue-600 mt-1 italic">
                                  {getTranslatedText("Note", language)}: {(customerPricing as any).notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Information */}
                {yourDairyman.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">{getTranslatedText("About", language)}</h3>
                    <p className="text-gray-600">{yourDairyman.description}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setShowServiceDetails(false);
                      openChatWindow();
                    }}
                    className="flex-1"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {getTranslatedText("Chat & Order", language)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`tel:${yourDairyman.phone}`, '_self')}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {getTranslatedText("Call Now", language)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      {/* Service Selection Form Modal */}
      {
        showServiceSelection && selectedMilkmanForService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <ServiceSelectionForm
              milkman={selectedMilkmanForService}
              onClose={() => setShowServiceSelection(false)}
              onAssignComplete={handleServiceSelectionComplete}
            />
          </div>
        )
      }

      {/* Monthly Orders Modal */}
      {
        showOrderChart && yourDairyman && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <Card className="w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{getTranslatedText("Monthly Orders", language)} - {yourDairyman.contactName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowOrderChart(false)} className="flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
                {/* Month Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <label className="text-sm font-medium whitespace-nowrap">{getTranslatedText("Select Month", language)}:</label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-48"
                  />
                </div>

                {/* Monthly Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <h3 className="font-semibold text-sm sm:text-base">{getTranslatedText("Total Month", language)}</h3>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">
                      ₹{totalAmount.toFixed(0)}
                    </p>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <h3 className="font-semibold text-sm sm:text-base">{getTranslatedText("Pay Now", language)}</h3>
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base min-h-[44px]"
                      onClick={() => handlePayNow(totalAmount)}
                    >
                      ₹{totalAmount.toFixed(0)}
                    </Button>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <h3 className="font-semibold text-sm sm:text-base">{getTranslatedText("Total Amount", language)}</h3>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">
                      ₹{totalAmount.toFixed(2)}
                    </p>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <h3 className="font-semibold text-sm sm:text-base">{getTranslatedText("Total Quantity", language)}</h3>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      {(() => {
                        const { productTotals } = processOrderAnalytics();
                        const totalQuantity = Object.values(productTotals).reduce((sum: number, product: any) => sum + product.quantity, 0);
                        return totalQuantity.toFixed(1);
                      })()}L
                    </p>
                  </Card>
                </div>

                {/* Daily Orders Breakdown */}
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">{getTranslatedText("Daily Orders", language)}</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Label htmlFor="product-filter" className="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">{getTranslatedText("Filter by Product", language)}:</Label>
                        <select
                          id="product-filter"
                          value={selectedProduct}
                          onChange={(e) => setSelectedProduct(e.target.value)}
                          className="w-full sm:w-auto px-3 py-2 border dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-white mobile-form-input min-h-[44px]"
                        >
                          <option value="all">{getTranslatedText("All Products", language)}</option>
                          {yourDairyman?.dairyItems?.map((item: any) => (
                            <option key={item.name} value={item.name}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {(() => {
                        const { dailyOrders } = processOrderAnalytics();
                        const [year, month] = selectedMonth.split('-').map(Number);

                        // Debug: Log data for checking (can be removed in production)
                        // console.log('Monthly Orders Debug:', { selectedMonth, year, month, groupChatMessages: groupChatMessages.length, dailyOrdersKeys: Object.keys(dailyOrders), dailyOrders: dailyOrders });

                        // Get all order dates and sort them (latest first)
                        const orderDates = Object.keys(dailyOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                        if (orderDates.length === 0) {
                          return (
                            <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                              <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                              <p>{getTranslatedText("No orders found for the selected month.", language)}</p>
                              <p className="text-xs mt-2">Debug: Found {(groupChatMessages || []).length} group messages, {(groupChatMessages || []).filter((m: any) => m?.messageType === 'order').length} order messages</p>
                            </div>
                          );
                        }

                        return orderDates.map((dateKey) => {
                          const date = new Date(dateKey);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                          const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const isToday = date.toDateString() === new Date().toDateString();

                          // Get all products for this date and flatten into single array
                          const dayProducts = dailyOrders[dateKey];
                          const allOrders: Array<{
                            product: string;
                            quantity: number;
                            price: number;
                            amount: number;
                            customerName: string;
                            customerId: number;
                          }> = [];

                          Object.entries(dayProducts).forEach(([productName, orders]) => {
                            (orders as any[]).forEach((order: any) => {
                              allOrders.push({
                                product: productName,
                                quantity: order.quantity,
                                price: order.amount / order.quantity,
                                amount: order.amount,
                                customerName: order.customerName,
                                customerId: order.customerId
                              });
                            });
                          });

                          // Filter orders based on selected product
                          const filteredOrders = selectedProduct === 'all'
                            ? allOrders
                            : allOrders.filter(order => order.product === selectedProduct);

                          if (filteredOrders.length === 0) {
                            return null;
                          }

                          return (
                            <div key={dateKey} className={`border dark:border-gray-700 rounded-lg p-4 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800'
                              }`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{date.getDate()}</span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-white">{dayName}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{formattedDate}</p>
                                    {isToday && <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">({getTranslatedText("Today", language)})</span>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{getTranslatedText("Total Orders", language)}</p>
                                  <p className="font-bold text-blue-600 dark:text-blue-400">{filteredOrders.length}</p>
                                </div>
                              </div>

                              {/* Order Details Table - Mobile Responsive */}
                              <div className="space-y-2">
                                {/* Desktop Table Header - Hidden on mobile */}
                                <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 p-2 rounded">
                                  <div className="col-span-3">{getTranslatedText("Product", language)}</div>
                                  <div className="col-span-2">{getTranslatedText("Qty", language)}</div>
                                  <div className="col-span-2">{getTranslatedText("Price", language)}</div>
                                  <div className="col-span-2">{getTranslatedText("Amount", language)}</div>
                                  <div className="col-span-3">{getTranslatedText("Customer", language)}</div>
                                </div>

                                {filteredOrders.map((order, index) => (
                                  <div key={index}>
                                    {/* Desktop Table Row */}
                                    <div className="hidden md:grid grid-cols-12 gap-2 text-sm p-2 border-b border-gray-200 dark:border-gray-700">
                                      <div className="col-span-3 font-medium text-gray-800 dark:text-white">{order.product}</div>
                                      <div className="col-span-2 text-gray-600 dark:text-gray-400">{order.quantity}L</div>
                                      <div className="col-span-2 text-gray-600 dark:text-gray-400">₹{order.price.toFixed(0)}</div>
                                      <div className="col-span-2 font-semibold text-green-600 dark:text-green-400">₹{order.amount.toFixed(2)}</div>
                                      <div className="col-span-3 text-blue-600 dark:text-blue-400 font-medium">{order.customerName}</div>
                                    </div>

                                    {/* Mobile Card Layout */}
                                    <div className="md:hidden bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 mb-2 shadow-sm">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{order.product}</h4>
                                          <p className="text-blue-600 dark:text-blue-400 font-medium text-xs">{order.customerName}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold text-green-600 dark:text-green-400 text-sm">₹{order.amount.toFixed(2)}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">{getTranslatedText("Qty", language)}:</span>
                                          <span className="ml-1 text-gray-700 dark:text-gray-300 font-medium">{order.quantity}L</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">{getTranslatedText("Price", language)}:</span>
                                          <span className="ml-1 text-gray-700 dark:text-gray-300 font-medium">₹{order.price.toFixed(0)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Daily Total */}
                              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">{getTranslatedText("Day Total", language)}:</span>
                                  <span className="font-bold text-green-600 dark:text-green-400">
                                    ₹{filteredOrders.reduce((sum, order) => sum + order.amount, 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }).filter(Boolean);
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )
      }
    </div >
  );
}
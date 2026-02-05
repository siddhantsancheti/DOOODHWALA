import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";
import { VoiceRecorder, VoiceMessage } from "./voice-recorder";
import {
  Send,
  User,
  Package,
  Edit3,
  Check,
  CheckCheck,
  ShoppingCart,
  Users,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Star,
  IndianRupee,
  UserPlus,
  UserMinus,
  Settings,
  X,
  Camera,
  File,
  Image,
  ChevronRight,
  Info,
  Share,
  Paperclip,
  Eye,
  Copy,
  Key,
  Mic,
  Volume2,
  FileText
} from "lucide-react";

interface WhatsAppGroupChatProps {
  customerProfile: any;
  milkmanProfile: any;
  onClose: () => void;
}

export function WhatsAppGroupChat({ customerProfile, milkmanProfile, onClose }: WhatsAppGroupChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [newMessage, setNewMessage] = useState("");
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [orderProduct, setOrderProduct] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderItems, setOrderItems] = useState<Array<{ product: string, quantity: number, price: number }>>([]);
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [showBillSummary, setShowBillSummary] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showMonthlyOrders, setShowMonthlyOrders] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Consolidated billing states
  const [showConsolidatedBill, setShowConsolidatedBill] = useState(false);
  const [consolidatedBillData, setConsolidatedBillData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isConnected } = useWebSocket();

  // Get all customers assigned to this milkman for group chat
  const { data: groupMembers = [] } = useQuery({
    queryKey: [`/api/customers/group/${milkmanProfile.id}`],
    enabled: !!milkmanProfile?.id,
  });

  // Get chat messages for the group
  const { data: chatMessages = [] } = useQuery({
    queryKey: [`/api/chat/group/${milkmanProfile.id}`],
    enabled: !!milkmanProfile?.id,
  });

  // Get customer pricing for order calculations
  const { data: customerPricing } = useQuery({
    queryKey: [`/api/customer-pricings/${milkmanProfile.id}/${customerProfile.id}`],
    enabled: !!milkmanProfile?.id && !!customerProfile?.id,
  });

  // Get current month bill for real-time billing
  const { data: currentBillData } = useQuery({
    queryKey: [`/api/bills/current`],
    enabled: !!customerProfile?.id,
  });

  // Get consolidated bill data for the group (includes all group member orders)
  const { data: consolidatedBill } = useQuery({
    queryKey: [`/api/bills/consolidated/${milkmanProfile.id}`],
    enabled: !!milkmanProfile?.id,
  }) as { data: any };

  // Get service requests for the customer to filter products
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["/api/service-requests/customer"],
    enabled: !!customerProfile?.id,
  });

  // Update current bill when data changes
  useEffect(() => {
    if (currentBillData) {
      setCurrentBill(currentBillData);
    }
  }, [currentBillData]);

  // Get filtered products based on customer's service requests
  const getRequestedProducts = () => {
    if (!milkmanProfile || !serviceRequests) {
      return [];
    }

    // Find service request for this milkman
    const milkmanServiceRequest = serviceRequests.find(
      (req: any) => req.milkmanId === milkmanProfile.id
    );

    if (!milkmanServiceRequest?.services) {
      // Fallback to all available products if no service request found
      return milkmanProfile.dairyItems?.filter((item: any) => item.isAvailable !== false) || [];
    }

    // Filter milkman's products based on customer's requested services
    const filteredProducts = milkmanProfile.dairyItems?.filter((item: any) =>
      (item.isAvailable !== false) &&
      milkmanServiceRequest.services.some((service: any) => service.name === item.name)
    ) || [];

    return filteredProducts;
  };

  const requestedProducts = getRequestedProducts();

  // Process monthly orders analytics
  const processMonthlyOrdersAnalytics = () => {
    if (!chatMessages) return { dailyOrders: {}, productTotals: {}, totalAmount: 0 };

    const orderMessages = chatMessages.filter((msg: any) => msg.messageType === 'order');
    const [year, month] = selectedMonth.split('-').map(Number);

    // Group by date and product with customer details
    const dailyOrders: {
      [key: string]: Array<{
        product: string;
        quantity: number;
        price: number;
        amount: number;
        customerName: string;
        customerId: number;
      }>
    } = {};

    const productTotals: { [product: string]: { quantity: number, amount: number } } = {};
    let totalAmount = 0;

    orderMessages.forEach((msg: any) => {
      const date = new Date(msg.createdAt);
      if (date.getMonth() === month - 1 && date.getFullYear() === year) {
        const dateKey = date.toISOString().split('T')[0];

        // Get customer name from group members
        const customer = groupMembers.find((member: any) => member.id === msg.customerId);
        const customerName = customer?.name || 'Unknown Customer';

        // Parse order items from the message
        const orderItems = msg.orderItems || [];

        if (!dailyOrders[dateKey]) {
          dailyOrders[dateKey] = [];
        }

        orderItems.forEach((item: any) => {
          const productName = item.product;
          const quantity = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const amount = quantity * price;

          dailyOrders[dateKey].push({
            product: productName,
            quantity,
            price,
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
          totalAmount += amount;
        });
      }
    });

    return { dailyOrders, productTotals, totalAmount };
  };

  // Memoize monthly analytics to prevent unnecessary recalculations
  const monthlyAnalytics = useMemo(() => {
    return processMonthlyOrdersAnalytics();
  }, [chatMessages, groupMembers, selectedMonth]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("/api/chat/send", "POST", messageData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanProfile.id}`] });
      // Refresh both individual and consolidated bill data when order is placed
      if (data.messageType === 'order') {
        queryClient.invalidateQueries({ queryKey: [`/api/bills/current`] });
        queryClient.invalidateQueries({ queryKey: [`/api/bills/consolidated/${milkmanProfile.id}`] });
      }
      if (sendMessage) {
        sendMessage({
          type: "chat_message",
          message: data,
          milkmanId: milkmanProfile.id,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Generate consolidated bill mutation
  const generateConsolidatedBillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/bills/consolidated/${milkmanProfile.id}/generate`, "POST");
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bills/consolidated/${milkmanProfile.id}`] });
      setConsolidatedBillData(data);
      setShowConsolidatedBill(true);
      toast({
        title: "Consolidated Bill Generated",
        description: "Bill generated for all group members. Any member can pay it.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating consolidated bill",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendVoiceMessageMutation = useMutation({
    mutationFn: async ({ audioBlob, duration }: { audioBlob: Blob, duration: number }) => {
      // Create FormData to upload the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('duration', duration.toString());
      formData.append('customerId', customerProfile.id.toString());
      formData.append('milkmanId', milkmanProfile.id.toString());

      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send voice message');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanProfile.id}`] });
      if (sendMessage) {
        sendMessage({
          type: "chat_message",
          message: data,
          milkmanId: milkmanProfile.id,
        });
      }
      toast({
        title: "Voice message sent",
        description: "Your voice message has been delivered",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending voice message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, newText, quantity }: any) => {
      return await apiRequest(`/api/chat/edit/${messageId}`, "PUT", {
        message: newText,
        orderQuantity: quantity
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanProfile.id}`] });
      // Refresh bill data when order is edited
      queryClient.invalidateQueries({ queryKey: [`/api/bills/current`] });
      setEditingMessage(null);
      setEditText("");
      toast({
        title: "Order Updated",
        description: "Your order has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update message",
        variant: "destructive",
      });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/chat/accept/${messageId}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanProfile.id}`] });
      toast({
        title: "Order Accepted",
        description: "Order has been accepted and customer notified",
      });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/chat/mark-delivered/${messageId}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanProfile.id}`] });
      toast({
        title: "Order Delivered",
        description: "Order has been marked as delivered",
      });
    },
  });

  // Removed confirm delivery mutation - using 3-tick system where Mark Delivered is the final step

  // Add customer to group chat
  const addCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await apiRequest(`/api/chat/group/${milkmanProfile.id}/add-customer`, "POST", {
        customerId
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/group/${milkmanProfile.id}`] });
      toast({
        title: "Customer added",
        description: "Customer has been added to the group chat",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add customer to group",
        variant: "destructive",
      });
    }
  });

  // Remove customer from group chat
  const removeCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await apiRequest(`/api/chat/group/${milkmanProfile.id}/remove-customer`, "POST", {
        customerId
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/group/${milkmanProfile.id}`] });
      toast({
        title: "Customer removed",
        description: "Customer has been removed from the group chat",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove customer from group",
        variant: "destructive",
      });
    }
  });

  // Get available customers to add to group
  const { data: allCustomers = [] } = useQuery({
    queryKey: [`/api/milkmen/${milkmanProfile.id}/customers`],
    enabled: !!milkmanProfile?.id && showGroupManagement,
  });

  const handleAddToCart = () => {
    if (!orderProduct || !orderQuantity) {
      toast({
        title: "Invalid Selection",
        description: "Please select a product and quantity",
        variant: "destructive",
      });
      return;
    }

    const productPrice = requestedProducts.find((item: any) => item.name === orderProduct)?.price || 0;
    const quantity = parseFloat(orderQuantity);
    const price = parseFloat(productPrice);

    // Check if product already exists in cart
    const existingItemIndex = orderItems.findIndex(item => item.product === orderProduct);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      setOrderItems([...orderItems, {
        product: orderProduct,
        quantity,
        price
      }]);
    }

    setOrderProduct("");
    setOrderQuantity("");

    toast({
      title: "Added to Cart",
      description: `${quantity} ${orderProduct} added to your order`,
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handlePlaceOrder = () => {
    let finalOrderItems = [...orderItems];

    // If cart is empty but selection exists, use the current selection
    if (finalOrderItems.length === 0 && orderProduct && orderQuantity) {
      const productPrice = requestedProducts.find((item: any) => item.name === orderProduct)?.price || 0;
      finalOrderItems.push({
        product: orderProduct,
        quantity: parseFloat(orderQuantity),
        price: parseFloat(productPrice)
      });
    }

    if (finalOrderItems.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please select a product and quantity or add items to cart",
        variant: "destructive",
      });
      return;
    }

    const orderSummary = finalOrderItems.map(item =>
      `${item.quantity} ${item.product} (₹${item.price} each)`
    ).join(', ');

    const totalAmount = finalOrderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const messageData = {
      customerId: customerProfile.id,
      milkmanId: milkmanProfile.id,
      message: `Multi-Product Order: ${orderSummary}`,
      messageType: "order",
      orderProduct: finalOrderItems.map(item => item.product).join(', '),
      orderQuantity: finalOrderItems.reduce((sum, item) => sum + item.quantity, 0),
      orderTotal: totalAmount,
      orderItems: finalOrderItems, // Include full order details
      senderType: "customer",
    };

    sendMessageMutation.mutate(messageData);
    setOrderItems([]);

    // Only clear selection if we used it to place the order
    if (orderItems.length === 0) {
      setOrderProduct("");
      setOrderQuantity("");
    }

    setIsOrderMode(false);

    toast({
      title: "Order Placed",
      description: `Order with ${finalOrderItems.length} items placed successfully`,
    });
    // Return early to skip the rest since we rewrote the function body
    return;
  };

  // Keep the original function signature for the rest of the file to be valid, 
  // checking if I need to replace more lines.
  // The original function went from 479 to 515. 
  // I need to ensure I replace the whole block correctly.

  const handleSendMessage = () => {
    if (!newMessage.trim() && !isOrderMode) {
      return;
    }

    if (isOrderMode) {
      handlePlaceOrder();
      return;
    }

    const messageData = {
      customerId: customerProfile.id,
      milkmanId: milkmanProfile.id,
      message: newMessage,
      messageType: "text",
      senderType: "customer",
    };

    sendMessageMutation.mutate(messageData);
    setNewMessage("");
  };

  const handleVoiceMessage = (audioBlob: Blob, duration: number) => {
    sendVoiceMessageMutation.mutate({ audioBlob, duration });
    setIsRecordingVoice(false);
  };

  const handleEditMessage = (messageId: number) => {
    editMessageMutation.mutate({
      messageId,
      newText: editText,
      quantity: parseFloat(editText.match(/(\d+(?:\.\d+)?)/)?.[1] || "0")
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const renderMessageStatus = (message: any) => {
    if (message.isDelivered) {
      // Three ticks for delivered (Mark Delivered pressed)
      return (
        <div className="flex items-center gap-0.5 text-green-600">
          <Check className="h-3 w-3" />
          <Check className="h-3 w-3" />
          <Check className="h-3 w-3" />
        </div>
      );
    } else if (message.isAccepted) {
      // Two ticks for accepted (Accept Order pressed)
      return (
        <div className="flex items-center gap-0.5 text-blue-600">
          <Check className="h-3 w-3" />
          <Check className="h-3 w-3" />
        </div>
      );
    } else {
      // Single tick for sent (Order placed)
      return <div className="text-gray-400"><Check className="h-3 w-3" /></div>;
    }
  };

  const getCustomerInfo = (customerId: number) => {
    return groupMembers.find((member: any) => member.id === customerId);
  };

  return (
    <div className="flex flex-col h-screen w-screen fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50">
      {/* Chat Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-green-600 dark:bg-green-700 text-white shadow-lg">
        {/* Top row with profile info and close button */}
        <div className="flex items-center justify-between mb-2 sm:mb-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-700" />
            </div>
            <div className="cursor-pointer flex-1 min-w-0" onClick={() => setShowGroupInfo(true)}>
              <h3 className="font-semibold text-sm sm:text-base truncate">{milkmanProfile.businessName}</h3>
              <p className="text-xs sm:text-sm text-green-100 dark:text-green-200 truncate">
                {groupMembers.slice(0, 2).map((member: any, index: number) => (
                  <span key={member.id}>
                    {member.name}{index < Math.min(groupMembers.length - 1, 1) ? ", " : ""}
                  </span>
                ))}
                {groupMembers.length > 2 && <span>+{groupMembers.length - 2}</span>}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-green-700 dark:hover:bg-green-800 flex-shrink-0 ml-2">
            ✕
          </Button>
        </div>

        {/* Bottom row with action buttons */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1 overflow-x-auto pb-1 scrollbar-hide">
          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isConnected ? 'bg-green-300 dark:bg-green-400' : 'bg-red-300 dark:bg-red-400'} flex-shrink-0 mr-1`} />

          {/* Current Bill Summary Button - only show for customers */}
          {user?.userType === 'customer' && currentBill && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBillSummary(true)}
              className="text-white hover:bg-green-700 dark:hover:bg-green-800 flex items-center gap-0.5 text-xs min-h-[28px] sm:min-h-[32px] px-1 flex-shrink-0"
              title={`Your Bill: ₹${currentBill.totalAmount}`}
            >
              <IndianRupee className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline text-xs">₹{Math.round(currentBill.totalAmount)}</span>
            </Button>
          )}



          {/* Generate Consolidated Bill Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateConsolidatedBillMutation.mutate()}
            disabled={generateConsolidatedBillMutation.isPending}
            className="text-white hover:bg-green-700 dark:hover:bg-green-800 min-h-[28px] sm:min-h-[32px] px-1 flex-shrink-0"
            title="Generate Bill"
          >
            <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>

          {/* Monthly Orders Button - show for all users */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMonthlyOrders(true)}
            className="text-white hover:bg-green-700 dark:hover:bg-green-800 min-h-[28px] sm:min-h-[32px] px-1 flex-shrink-0"
            title="Monthly Orders"
          >
            <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>

          {/* Group Management Button - only show for milkmen */}
          {user?.userType === 'milkman' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGroupManagement(true)}
              className="text-white hover:bg-green-700 dark:hover:bg-green-800 min-h-[28px] sm:min-h-[32px] px-1 flex-shrink-0"
              title="Group Management"
            >
              <Settings className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
          )}
        </div>
      </div>



      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
        {chatMessages.map((message: any, index: number) => {
          const customerInfo = getCustomerInfo(message.customerId);
          const isOwnMessage = message.senderType === 'customer' && message.customerId === customerProfile?.id;

          // Date Separator Logic
          const messageDate = new Date(message.createdAt);
          const prevMessageDate = index > 0 ? new Date(chatMessages[index - 1].createdAt) : null;

          const isNewDay = !prevMessageDate ||
            messageDate.getDate() !== prevMessageDate.getDate() ||
            messageDate.getMonth() !== prevMessageDate.getMonth() ||
            messageDate.getFullYear() !== prevMessageDate.getFullYear();

          const getDateLabel = (date: Date) => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
              return "Today";
            } else if (date.toDateString() === yesterday.toDateString()) {
              return "Yesterday";
            } else {
              return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
            }
          };

          return (
            <div key={message.id || index}>
              {isNewDay && (
                <div className="flex justify-center my-4">
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full shadow-sm">
                    {getDateLabel(messageDate)}
                  </span>
                </div>
              )}
              <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[280px] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${isOwnMessage
                  ? 'bg-green-500 dark:bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-600'
                  }`}>
                  {/* Sender name for group messages */}
                  {!isOwnMessage && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-500">
                        {message.senderType === 'milkman' ? (milkmanProfile?.businessName || 'Milkman') : (customerInfo?.name || 'Customer')}
                      </span>
                    </div>
                  )}

                  {/* Order message styling */}
                  {message.messageType === 'order' && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded border-l-4 border-orange-500 dark:border-orange-400">
                      <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">Order Request</span>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="flex flex-col gap-1">
                    {message.messageType === 'voice' ? (
                      <VoiceMessage
                        voiceUrl={message.voiceUrl}
                        duration={message.voiceDuration}
                        senderType={isOwnMessage ? 'customer' : 'milkman'}
                        timestamp={new Date(message.createdAt)}
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{message.message}</p>
                    )}

                    {/* Order details */}
                    {message.messageType === 'order' && message.orderTotal && (
                      <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm">
                        <div className="space-y-2">
                          {message.orderItems ? (
                            <>
                              <div className="font-bold text-gray-900 dark:text-white text-base">Order Items:</div>
                              {message.orderItems.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between items-center py-1">
                                  <span className="font-medium text-gray-800 dark:text-gray-200">{item.quantity} × {item.product}</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">₹{(item.quantity * item.price).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center font-bold border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                                <span className="text-gray-900 dark:text-white">Total:</span>
                                <span className="text-lg text-green-600 dark:text-green-400">₹{message.orderTotal}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800 dark:text-gray-200">Quantity: {message.orderQuantity}</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">Total: ₹{message.orderTotal}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Message timestamp and status */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {new Date(message.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {new Date(message.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>

                      {isOwnMessage && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {/* Edit button for own orders (only if not delivered by milkman) */}
                          {message.messageType === 'order' && !message.isDelivered && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingMessage(message.id);
                                setEditText(message.message);
                              }}
                              className="h-6 w-6 p-0 text-white hover:bg-green-600 dark:text-gray-300 dark:hover:bg-green-700"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Message status */}
                          {renderMessageStatus(message)}
                        </div>
                      )}

                      {/* Milkman order action buttons */}
                      {!isOwnMessage && user?.userType === 'milkman' && message.messageType === 'order' && (
                        <div className="flex items-center gap-2 mt-2">
                          {/* Accept Order button - only show if not accepted yet */}
                          {!message.isAccepted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acceptOrderMutation.mutate(message.id)}
                              disabled={acceptOrderMutation.isPending}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept Order
                            </Button>
                          )}

                          {/* Mark Delivered button - only show if accepted but not delivered */}
                          {message.isAccepted && !message.isDelivered && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markDeliveredMutation.mutate(message.id)}
                              disabled={markDeliveredMutation.isPending}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              <Check className="h-4 w-4 mr-1" />
                              <Check className="h-4 w-4 mr-1" />
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Edit Message Dialog */}
      <Dialog open={editingMessage !== null} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Edit Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editMessage" className="text-gray-900 dark:text-white">Update your order:</Label>
              <Input
                id="editMessage"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Order: 2 Fresh Milk"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingMessage(null)}>
                Cancel
              </Button>
              <Button onClick={() => editingMessage && handleEditMessage(editingMessage)}>
                Update Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Management Dialog */}
      <Dialog open={showGroupManagement} onOpenChange={setShowGroupManagement}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Manage Group Chat Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Group Members */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                <Users className="h-4 w-4" />
                Current Members ({groupMembers.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {groupMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.phone}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomerMutation.mutate(member.id)}
                      disabled={removeCustomerMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Customers to Add */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                <UserPlus className="h-4 w-4" />
                Add Customers
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {allCustomers
                  .filter((customer: any) => !groupMembers.find((member: any) => member.id === customer.id))
                  .map((customer: any) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{customer.phone}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addCustomerMutation.mutate(customer.id)}
                        disabled={addCustomerMutation.isPending}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
              {allCustomers.filter((customer: any) => !groupMembers.find((member: any) => member.id === customer.id)).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  All your customers are already in the group chat
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowGroupManagement(false)}>
                {getTranslatedText('Close', language)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Cart Display */}
      {
        isOrderMode && orderItems.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
            <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3">Your Order ({orderItems.length} items)</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <span className="font-medium text-gray-900 dark:text-white">{item.quantity} × {item.product}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">₹{(item.quantity * item.price).toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromCart(index)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700">
              <div className="flex justify-between items-center font-bold text-base">
                <span className="text-gray-900 dark:text-white">Total Amount:</span>
                <span className="text-lg text-green-600 dark:text-green-400">₹{orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )
      }

      {/* Message Input */}
      <div className="p-3 md:p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 mobile-chat-input">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 md:flex-initial">
            <Button
              variant={isOrderMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsOrderMode(!isOrderMode);
                if (!isOrderMode) {
                  setOrderItems([]);
                  setOrderProduct("");
                  setOrderQuantity("");
                }
              }}
              className="flex items-center gap-2 mobile-button min-h-[44px] flex-1 md:flex-initial"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isOrderMode ? getTranslatedText('Cancel', language) : getTranslatedText('Order', language)}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareMenu(true)}
              className="flex items-center gap-2 mobile-button min-h-[44px] flex-1 md:flex-initial"
            >
              <Paperclip className="h-4 w-4" />
              <span className="text-sm font-medium">Share</span>
            </Button>
          </div>

          {/* Input Area */}
          {isOrderMode ? (
            <div className="flex-1 flex flex-col md:flex-row gap-2 mobile-order-input">
              <Select value={orderProduct} onValueChange={setOrderProduct}>
                <SelectTrigger className="w-full md:w-40 mobile-form-input min-h-[44px]">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  {requestedProducts.length > 0 ? (
                    requestedProducts.map((item: any) => (
                      <SelectItem key={item.name} value={item.name}>
                        {item.name} - ₹{item.price}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-products" disabled>
                      No products available - Please request services first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Quantity"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                className="w-full md:w-24 mobile-form-input min-h-[44px]"
              />
              <Button
                onClick={handleAddToCart}
                variant="outline"
                size="sm"
                className="whitespace-nowrap mobile-button min-h-[44px] w-full md:w-auto"
              >
                {getTranslatedText('Add to Cart', language)}
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 mobile-form-input min-h-[44px]"
              />
              <VoiceRecorder
                onVoiceMessage={handleVoiceMessage}
                isRecording={isRecordingVoice}
                onStartRecording={() => setIsRecordingVoice(true)}
                onStopRecording={() => setIsRecordingVoice(false)}
                disabled={sendVoiceMessageMutation.isPending}
              />
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={
              sendMessageMutation.isPending ||
              (isOrderMode && orderItems.length === 0 && (!orderProduct || !orderQuantity))
            }
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 mobile-button min-h-[44px] w-full md:w-auto"
          >
            {isOrderMode ? (
              <>
                <ShoppingCart className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{getTranslatedText('Place Order', language)}</span>
              </>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Billing Summary Modal */}
      <Dialog open={showBillSummary} onOpenChange={setShowBillSummary}>
        <DialogContent className="max-w-md mobile-modal mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <IndianRupee className="h-5 w-5" />
              Current Month Bill
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentBill ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                    <p className="text-lg font-bold dark:text-white">{currentBill.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Quantity</p>
                    <p className="text-lg font-bold dark:text-white">{currentBill.totalQuantity} L</p>
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium dark:text-gray-300">Subtotal:</span>
                    <span className="font-semibold dark:text-white">₹{currentBill.subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium dark:text-gray-300">Discount:</span>
                    <span className="font-semibold dark:text-white">₹{currentBill.discount}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t dark:border-gray-700 pt-2">
                    <span className="dark:text-white">Total Amount:</span>
                    <span className="text-green-600 dark:text-green-400">₹{currentBill.totalAmount}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span>Status:</span>
                    <Badge variant={currentBill.status === 'paid' ? 'default' : 'secondary'}>
                      {currentBill.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span>Due Date:</span>
                    <span>{new Date(currentBill.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No orders placed this month</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setShowBillSummary(false)} className="mobile-button min-h-[44px]">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Info Modal */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mobile-modal-optimized max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              Group Info
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2">
            <div className="space-y-4 sm:space-y-6">
              {/* Group Details */}
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold">{milkmanProfile.businessName}</h2>
                <p className="text-sm text-gray-600">{groupMembers.length} members</p>
              </div>

              {/* Group Members */}
              <div>
                <h3 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Users className="h-4 w-4" />
                  Members ({groupMembers.length})
                </h3>
                <div className="space-y-1 sm:space-y-2 max-h-32 sm:max-h-48 overflow-y-auto scrollbar-hide">
                  {groupMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{member.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{member.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared Content */}
              <div>
                <h3 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <File className="h-4 w-4" />
                  Shared Content
                </h3>
                <div className="space-y-0.5 sm:space-y-2">
                  {/* Media Section */}
                  <div
                    className="flex items-center justify-between p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                    onClick={() => {
                      toast({
                        title: "Media Gallery",
                        description: "No media items shared yet",
                      });
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Media</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Photos, videos</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                  </div>

                  {/* Orders Section */}
                  <div
                    className="flex items-center justify-between p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                    onClick={() => {
                      setShowGroupInfo(false);
                      setShowMonthlyOrders(true);
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Orders</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {chatMessages.filter((msg: any) => msg.messageType === 'order').length} orders placed
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                  </div>

                  {/* Documents Section */}
                  <div
                    className="flex items-center justify-between p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                    onClick={() => {
                      toast({
                        title: "Documents",
                        description: "No documents shared yet",
                      });
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <File className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Documents</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Bills, receipts</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Show Group Details Button */}
              <div className="border-t dark:border-gray-700 pt-2 sm:pt-4">
                <Button
                  variant="outline"
                  className="w-full justify-start h-8 sm:h-10 text-sm sm:text-base"
                  onClick={() => setShowGroupDetails(true)}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Show Group Details
                </Button>
              </div>

              {/* Group Actions */}
              <div className="border-t dark:border-gray-700 pt-2 sm:pt-4">
                <div className="space-y-0.5 sm:space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 sm:h-10 text-sm sm:text-base text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setShowGroupInfo(false);
                      toast({
                        title: "Exit Group",
                        description: "You cannot exit this service group while active.",
                        variant: "destructive"
                      });
                    }}
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Exit Group
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 sm:h-10 text-sm sm:text-base text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      if (confirm("Clear chat history? This cannot be undone.")) {
                        setShowGroupInfo(false);
                        toast({
                          title: "Chat Cleared",
                          description: "Chat history has been cleared locally.",
                        });
                        // Ideally we would call an API here
                      }
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Clear Chat
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t pt-3 mt-2">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowGroupInfo(false)}
                className="mobile-button-enhanced min-h-[40px] sm:min-h-[44px] px-4 sm:px-6 text-sm sm:text-base"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Content Modal */}
      <Dialog open={showShareMenu} onOpenChange={setShowShareMenu}>
        <DialogContent className="max-w-md mobile-modal mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Share className="h-5 w-5" />
              Share Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mobile-grid">
              {/* Photo/Video */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 mobile-button"
                onClick={() => {
                  // Add photo/video sharing functionality
                  setShowShareMenu(false);
                  toast({
                    title: "Photo/Video",
                    description: "Photo/Video sharing will be available soon",
                  });
                }}
              >
                <Camera className="h-6 w-6 text-purple-500" />
                <span className="text-sm font-medium">Photo/Video</span>
              </Button>

              {/* Documents */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 mobile-button"
                onClick={() => {
                  // Add document sharing functionality
                  setShowShareMenu(false);
                  toast({
                    title: "Documents",
                    description: "Document sharing will be available soon",
                  });
                }}
              >
                <File className="h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium">Documents</span>
              </Button>

              {/* Location */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 mobile-button"
                onClick={() => {
                  // Add location sharing functionality
                  setShowShareMenu(false);
                  toast({
                    title: "Location",
                    description: "Location sharing will be available soon",
                  });
                }}
              >
                <MapPin className="h-6 w-6 text-red-500" />
                <span className="text-sm font-medium">Location</span>
              </Button>

              {/* Contact */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 mobile-button"
                onClick={() => {
                  // Add contact sharing functionality
                  setShowShareMenu(false);
                  toast({
                    title: "Contact",
                    description: "Contact sharing will be available soon",
                  });
                }}
              >
                <User className="h-6 w-6 text-green-500" />
                <span className="text-sm font-medium">Contact</span>
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowShareMenu(false)} className="mobile-button min-h-[44px]">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Details Modal */}
      <Dialog open={showGroupDetails} onOpenChange={setShowGroupDetails}>
        <DialogContent className="w-[90vw] max-w-[280px] max-h-[70vh] overflow-y-auto p-3 sm:p-6 fixed inset-4 m-auto sm:relative sm:inset-auto sm:m-0 sm:w-full sm:max-w-lg sm:max-h-[85vh]">
          <DialogHeader className="pb-1 sm:pb-6">
            <DialogTitle className="flex items-center gap-1 text-xs sm:text-lg font-semibold">
              <Key className="h-4 w-4 sm:h-5 sm:w-5" />
              Group Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 sm:space-y-4">
            {/* Group Code */}
            <div className="space-y-0.5 sm:space-y-2">
              <Label className="text-xs font-medium">Group Code</Label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex-1 p-1 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs sm:text-lg text-center break-all leading-tight">
                  MILK{milkmanProfile.id}GRP
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[36px] min-h-[36px] p-1.5 sm:p-3"
                  onClick={() => {
                    navigator.clipboard.writeText(`MILK${milkmanProfile.id}GRP`);
                    toast({
                      title: "Copied!",
                      description: "Group code copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* Group Password */}
            <div className="space-y-0.5 sm:space-y-2">
              <Label className="text-xs font-medium">Group Password</Label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex-1 p-1 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs sm:text-lg text-center break-all leading-tight">
                  {milkmanProfile.businessName?.replace(/\s+/g, '').toLowerCase()}123
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[36px] min-h-[36px] p-1.5 sm:p-3"
                  onClick={() => {
                    const password = `${milkmanProfile.businessName?.replace(/\s+/g, '').toLowerCase()}123`;
                    navigator.clipboard.writeText(password);
                    toast({
                      title: "Copied!",
                      description: "Group password copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* Group Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 leading-tight">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 flex-shrink-0" />
                Share these details with new members to join the group.
              </p>
            </div>

            <div className="flex justify-end pt-0.5 sm:pt-0">
              <Button onClick={() => setShowGroupDetails(false)} className="w-full sm:w-auto mobile-button min-h-[36px] sm:min-h-[44px] py-1.5 px-3 sm:py-2 sm:px-4 text-sm">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Orders Modal */}
      <Dialog open={showMonthlyOrders} onOpenChange={setShowMonthlyOrders}>
        <DialogContent className="w-[95vw] max-w-4xl mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Monthly Orders - {milkmanProfile.businessName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6 p-1 sm:p-0">
            {/* Month Selector and Product Filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Select Month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border rounded-md mobile-form-input min-h-[44px]"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Filter by Product:</label>
                <select
                  value={selectedProductFilter}
                  onChange={(e) => setSelectedProductFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border rounded-md mobile-form-input min-h-[44px]"
                >
                  <option value="all">All Products</option>
                  {Object.keys(monthlyAnalytics.productTotals).map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {(() => {
                const { totalAmount, productTotals } = monthlyAnalytics;
                const totalQuantity = Object.values(productTotals).reduce((sum, product) => sum + product.quantity, 0);
                const totalProducts = Object.keys(productTotals).length;

                return (
                  <>
                    <Card className="mobile-card">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-gray-600">Total Amount</p>
                            <p className="text-lg sm:text-xl font-bold text-green-600 truncate">₹{totalAmount}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="mobile-card">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-gray-600">Total Quantity</p>
                            <p className="text-lg sm:text-xl font-bold text-orange-600 truncate">{totalQuantity.toFixed(1)}L</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="mobile-card">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-gray-600">Total Products</p>
                            <p className="text-lg sm:text-xl font-bold text-blue-600 truncate">{totalProducts}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>

            {/* Daily Orders Breakdown */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-base sm:text-lg">Daily Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-4">
                  {(() => {
                    const { dailyOrders } = monthlyAnalytics;
                    const orderDates = Object.keys(dailyOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                    if (orderDates.length === 0) {
                      return (
                        <div className="text-center p-6 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p>No orders found for the selected month.</p>
                        </div>
                      );
                    }

                    return orderDates.map((dateKey) => {
                      const date = new Date(dateKey);
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      const dayOrders = dailyOrders[dateKey];

                      // Filter orders based on selected product
                      const filteredOrders = selectedProductFilter === 'all'
                        ? dayOrders
                        : dayOrders.filter(order => order.product === selectedProductFilter);

                      if (filteredOrders.length === 0) {
                        return null;
                      }

                      return (
                        <div key={dateKey} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{date.getDate()}</span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-800 dark:text-white">{dayName}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{formattedDate}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                              <p className="font-bold text-blue-600 dark:text-blue-400">{filteredOrders.length}</p>
                            </div>
                          </div>

                          {/* Order Details Table - Mobile Responsive */}
                          <div className="space-y-2">
                            {/* Desktop Table Header - Hidden on mobile */}
                            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 p-2 rounded">
                              <div className="col-span-3">Product</div>
                              <div className="col-span-2">Qty</div>
                              <div className="col-span-2">Price</div>
                              <div className="col-span-2">Amount</div>
                              <div className="col-span-3">Customer</div>
                            </div>

                            {filteredOrders.map((order, index) => (
                              <div key={index}>
                                {/* Desktop Table Row */}
                                <div className="hidden sm:grid grid-cols-12 gap-2 text-sm p-2 border-b border-gray-200 dark:border-gray-700">
                                  <div className="col-span-3 font-medium text-gray-800 dark:text-white">{order.product}</div>
                                  <div className="col-span-2 text-gray-600 dark:text-gray-400">{order.quantity}L</div>
                                  <div className="col-span-2 text-gray-600 dark:text-gray-400">₹{order.price}</div>
                                  <div className="col-span-2 font-semibold text-green-600 dark:text-green-400">₹{order.amount}</div>
                                  <div className="col-span-3 text-blue-600 dark:text-blue-400 font-medium">{order.customerName}</div>
                                </div>

                                {/* Mobile Card Layout */}
                                <div className="sm:hidden bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 mb-2 shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-800 dark:text-white text-sm truncate">{order.product}</h4>
                                      <p className="text-blue-600 dark:text-blue-400 font-medium text-xs truncate">{order.customerName}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                      <p className="font-bold text-green-600 dark:text-green-400 text-sm">₹{order.amount}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Qty:</span>
                                      <span className="ml-1 text-gray-700 dark:text-gray-300 font-medium">{order.quantity}L</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Price:</span>
                                      <span className="ml-1 text-gray-700 dark:text-gray-300 font-medium">₹{order.price}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Daily Total */}
                          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Day Total:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                ₹{filteredOrders.reduce((sum, order) => sum + order.amount, 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-2 sm:justify-end">
              <Button
                onClick={() => setShowMonthlyOrders(false)}
                className="w-full sm:w-auto mobile-button min-h-[44px]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Consolidated Bill Modal */}
      <Dialog open={showConsolidatedBill} onOpenChange={setShowConsolidatedBill}>
        <DialogContent
          className="w-[95vw] max-w-[95vw] sm:max-w-lg md:max-w-2xl h-[85vh] max-h-[85vh] overflow-y-auto p-0 m-2"
          aria-describedby="consolidated-bill-description"
        >
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 flex-shrink-0" />
              Group Consolidated Bill
            </DialogTitle>
            <div id="consolidated-bill-description" className="sr-only">
              View and pay the consolidated bill for all group members
            </div>
          </DialogHeader>
          <div className="space-y-4 p-4 pt-2">
            {consolidatedBill ? (
              <>
                {/* Bill Summary */}
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 dark:text-green-200 text-base">
                        Total Amount
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {consolidatedBill.memberCount} members • {consolidatedBill.month}
                      </p>
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      ₹{consolidatedBill.totalAmount}
                    </div>
                  </div>
                </div>

                {/* Orders by Member */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-base">Orders by Member</h4>
                  {consolidatedBill.ordersByMember?.map((member: any) => (
                    <Card key={member.memberId} className="border-l-4 border-l-blue-500 card-mobile">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center gap-2 mb-3">
                          <h5 className="font-medium text-gray-800 dark:text-gray-200 text-base flex-1">
                            {member.memberName}
                          </h5>
                          <Badge variant="secondary">
                            ₹{member.memberTotal}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {member.orders.map((order: any, orderIndex: number) => (
                            <div key={orderIndex} className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                              <div className="space-y-1">
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {new Date(order.date).toLocaleDateString('en-IN')}
                                </div>
                                <div className="space-y-1">
                                  {order.items.map((item: any, itemIndex: number) => (
                                    <div key={itemIndex} className="flex justify-between items-center gap-2">
                                      <span className="text-sm flex-1 min-w-0">
                                        {item.quantity} × {item.product}
                                      </span>
                                      <span className="text-sm font-medium flex-shrink-0">
                                        ₹{(item.quantity * item.price).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Payment Actions */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      onClick={() => {
                        // Navigate to payment page with consolidated bill data
                        const paymentUrl = `/checkout?type=consolidated&milkmanId=${consolidatedBill.milkmanId}&amount=${consolidatedBill.totalAmount}`;
                        window.location.href = paymentUrl;
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white w-full flex items-center justify-center gap-2 h-10"
                    >
                      <IndianRupee className="h-4 w-4 flex-shrink-0" />
                      <span>Pay ₹{consolidatedBill.totalAmount}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const shareText = `Consolidated Bill - ${milkmanProfile.businessName}\nTotal: ₹${consolidatedBill.totalAmount}\nMembers: ${consolidatedBill.memberCount}\nMonth: ${consolidatedBill.month}\n\nAny group member can pay this bill.`;
                        navigator.share?.({ text: shareText }) || navigator.clipboard.writeText(shareText);
                        toast({
                          title: "Bill details copied!",
                          description: "Share with group members",
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 h-10"
                    >
                      <Share className="h-4 w-4 flex-shrink-0" />
                      <span>Share Bill</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <IndianRupee className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Pending Bills</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px]">
                  Great news! There are no pending bills for this group at the moment.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6"
                  onClick={() => generateConsolidatedBillMutation.mutate()}
                  disabled={generateConsolidatedBillMutation.isPending}
                >
                  {generateConsolidatedBillMutation.isPending ? "Checking..." : "Check Again"}
                </Button>
              </div>
            )}

            <div className="flex justify-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowConsolidatedBill(false)}
                className="w-full h-10"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
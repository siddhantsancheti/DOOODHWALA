import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, ArrowLeft, Calculator, Package, Check, Clock, RefreshCw, Pause, Play, Trash2, CalendarDays, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";

interface YDChatProps {
  customerProfile: any;
  onBack: () => void;
}

export function YDChat({ customerProfile, onBack }: YDChatProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [message, setMessage] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showNumpad, setShowNumpad] = useState(true); // Show numpad by default
  const [showKeyboard, setShowKeyboard] = useState(false); // Add keyboard option
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);
  const [subFrequency, setSubFrequency] = useState<string>("daily");
  const [subDaysOfWeek, setSubDaysOfWeek] = useState<number[]>([]);
  const [subMonthDays, setSubMonthDays] = useState<number[]>([1]);
  const [subInstructions, setSubInstructions] = useState("");
  const [showActiveSubscriptions, setShowActiveSubscriptions] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection
  const { isConnected, sendMessage: sendWSMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  // Get assigned milkman from customer profile
  const assignedMilkmanId = customerProfile.assignedMilkmanId;

  // Fetch assigned milkman details
  const { data: assignedMilkman } = useQuery({
    queryKey: [`/api/milkmen/${assignedMilkmanId}`],
    enabled: !!assignedMilkmanId,
  });

  // Fetch chat messages
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: [`/api/chat/messages/${customerProfile.id}/${assignedMilkmanId}`],
    enabled: !!customerProfile?.id && !!assignedMilkmanId && !!assignedMilkman,
  });

  // Fetch customer's selected products from service requests
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["/api/service-requests/customer"],
    enabled: !!customerProfile?.id,
  });

  // Fetch customer subscriptions
  const { data: customerSubscriptions = [], refetch: refetchSubscriptions } = useQuery<any[]>({
    queryKey: ["/api/subscriptions/customer"],
    enabled: !!customerProfile?.id,
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (subData: any) => {
      const res = await apiRequest("/api/subscriptions", "POST", subData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/customer"] });
      setShowSubscriptionPanel(false);
      setSubFrequency("daily");
      setSubDaysOfWeek([]);
      setSubMonthDays([1]);
      setSubInstructions("");
      toast({ title: "Subscription Created", description: "Your recurring order has been set up!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create subscription.", variant: "destructive" });
    },
  });

  // Toggle subscription mutation
  const toggleSubscriptionMutation = useMutation({
    mutationFn: async (subId: number) => {
      const res = await apiRequest(`/api/subscriptions/${subId}/toggle`, "PATCH");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/customer"] });
      toast({ title: "Updated", description: "Subscription status updated." });
    },
  });

  // Delete subscription mutation
  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subId: number) => {
      const res = await apiRequest(`/api/subscriptions/${subId}`, "DELETE");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/customer"] });
      toast({ title: "Deleted", description: "Subscription removed." });
    },
  });



  // Get products from customer's selected services during assignment
  const getSelectedProducts = () => {
    if (!assignedMilkman || !serviceRequests) return [];

    // Find service request for the assigned milkman
    const assignedMilkmanServiceRequest = (serviceRequests as any[]).find(
      (req: any) => req.milkmanId === assignedMilkmanId
    );

    if (!assignedMilkmanServiceRequest?.services) {
      // Fallback to all available products if no service request found
      return (assignedMilkman as any).dairyItems?.filter((item: any) => item.isAvailable) || [];
    }

    // Filter milkman's products based on customer's selected services
    return (assignedMilkman as any).dairyItems?.filter((item: any) =>
      item.isAvailable &&
      assignedMilkmanServiceRequest.services.some((service: any) => service.name === item.name)
    ) || [];
  };

  const selectedProducts = getSelectedProducts();



  // WebSocket message handling
  useEffect(() => {
    if (!isConnected) return;

    const handleWebSocketMessage = (data: any) => {
      if (data.type === 'new_message' && data.message) {
        setChatMessages(prev => [...prev, data.message]);
      } else if (data.type === 'message_sent' && data.message) {
        setChatMessages(prev => [...prev, data.message]);
      }
    };

    addMessageHandler('yd-chat', handleWebSocketMessage);

    return () => {
      removeMessageHandler('yd-chat');
    };
  }, [isConnected, addMessageHandler, removeMessageHandler]);

  // Initialize chat messages from API
  useEffect(() => {
    if (messages && (messages as any[]).length > 0) {
      setChatMessages(messages as any[]);
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = () => {
    if (!message.trim() || !isConnected) return;

    try {
      sendWSMessage(customerProfile.id, assignedMilkmanId, message.trim(), 'customer');
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendOrderMessage = () => {
    if (!orderQuantity) {
      toast({
        title: "Missing Information",
        description: "Please enter order quantity.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        title: "Missing Information",
        description: "Please select a product.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Please wait for connection to establish.",
        variant: "destructive",
      });
      return;
    }

    // Find the selected product to get its unit
    const productInfo = selectedProducts.find((p: any) => p.name === selectedProduct);
    const productUnit = productInfo ? productInfo.unit : "unit";

    // Convert unit to proper format for display
    const getUnitDisplay = (unit: string) => {
      if (unit.includes("liter")) return "liter" + (parseFloat(orderQuantity) > 1 ? "s" : "");
      if (unit.includes("kg")) return "kg";
      if (unit.includes("500g")) return "pack" + (parseFloat(orderQuantity) > 1 ? "s" : "");
      if (unit.includes("250g")) return "pack" + (parseFloat(orderQuantity) > 1 ? "s" : "");
      if (unit.includes("200g")) return "pack" + (parseFloat(orderQuantity) > 1 ? "s" : "");
      return unit;
    };

    const unitDisplay = getUnitDisplay(productUnit);
    const productName = selectedProduct;
    const orderMessage = message.trim() || `Order for ${orderQuantity} ${unitDisplay} of ${productName}`;

    try {
      sendWSMessage(customerProfile.id, assignedMilkmanId, orderMessage, 'customer');
      setMessage("");
      setOrderQuantity("");
    } catch (error) {
      console.error("Failed to send order message:", error);
      toast({
        title: "Order Failed",
        description: "Failed to send order. Please try again.",
        variant: "destructive",
      });
    }
    setSelectedProduct("");
    setShowNumpad(true);
  };

  const addToQuantity = (digit: string) => {
    if (digit === "." && orderQuantity.includes(".")) return;
    if (orderQuantity.length >= 8) return; // Limit input length
    setOrderQuantity(prev => prev + digit);
  };

  const clearQuantity = () => {
    setOrderQuantity("");
    setSelectedProduct("");
  };

  const deleteLastDigit = () => {
    setOrderQuantity(prev => prev.slice(0, -1));
  };

  const numpadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"]
  ];

  const [isAutoSend, setIsAutoSend] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("07:00");

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const [presetOrder, setPresetOrder] = useState<any>(null);

  // Initialize preset order from customer profile
  useEffect(() => {
    if (customerProfile?.presetOrder) {
      setPresetOrder(customerProfile.presetOrder);
      setIsAutoSend(customerProfile.presetOrder.autoSend || false);
      setScheduleTime(customerProfile.presetOrder.scheduleTime || "07:00");
    }
  }, [customerProfile]);

  const updatePresetOrderMutation = useMutation({
    mutationFn: async (presetData: any) => {
      const res = await apiRequest("/api/customers/profile/preset-order", "PATCH", { presetOrder: presetData });
      return await res.json();
    },
    onSuccess: (data) => {
      setPresetOrder(data.presetOrder);
      toast({
        title: "Preset Saved",
        description: "Your quick order preset has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preset order.",
        variant: "destructive",
      });
    }
  });

  const saveAsPreset = () => {
    if (!orderQuantity || !selectedProduct) {
      toast({
        title: "Missing Information",
        description: "Please select product and quantity to save as preset.",
        variant: "destructive",
      });
      return;
    }

    // Find the product to include its ID if needed, or just name/quantity
    const productInfo = selectedProducts.find((p: any) => p.name === selectedProduct);

    const newPreset = {
      autoSend: isAutoSend,
      scheduleTime: scheduleTime,
      items: [{
        product: selectedProduct,
        quantity: orderQuantity,
        unit: productInfo?.unit || "unit"
      }]
    };

    updatePresetOrderMutation.mutate(newPreset);
  };

  const handleCreateSubscription = () => {
    if (!orderQuantity || !selectedProduct) {
      toast({ title: "Missing Information", description: "Select product and enter quantity first.", variant: "destructive" });
      return;
    }
    if (subFrequency === "weekly" && subDaysOfWeek.length === 0) {
      toast({ title: "Missing Days", description: "Select at least one day of the week.", variant: "destructive" });
      return;
    }

    const productInfo = selectedProducts.find((p: any) => p.name === selectedProduct);

    createSubscriptionMutation.mutate({
      milkmanId: assignedMilkmanId,
      productName: selectedProduct,
      quantity: orderQuantity,
      unit: productInfo?.unit || "liter",
      priceSnapshot: productInfo?.price || null,
      frequencyType: subFrequency,
      daysOfWeek: subFrequency === "weekly" ? subDaysOfWeek : (subFrequency === "monthly" ? subMonthDays : null),
      startDate: new Date().toISOString(),
      specialInstructions: subInstructions || null,
    });
  };

  const toggleDay = (day: number) => {
    setSubDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getFrequencyLabel = (sub: any) => {
    if (sub.frequencyType === "daily") return "Every day";
    if (sub.frequencyType === "weekly") {
      const days = (sub.daysOfWeek as number[]) || [];
      return days.map(d => DAY_LABELS[d]).join(", ");
    }
    if (sub.frequencyType === "monthly") {
      const days = (sub.daysOfWeek as number[]) || [1];
      return `Day ${days.join(", ")} of month`;
    }
    return sub.frequencyType;
  };

  const sendQuickOrder = () => {
    if (!presetOrder || !presetOrder.items || presetOrder.items.length === 0) return;

    const item = presetOrder.items[0];
    const productName = item.product;
    const quantity = item.quantity;
    const unit = item.unit;

    // Convert unit to proper format for display
    const getUnitDisplay = (unit: string) => {
      if (unit.includes("liter")) return "liter" + (parseFloat(quantity) > 1 ? "s" : "");
      if (unit.includes("kg")) return "kg";
      if (unit.includes("500g")) return "pack" + (parseFloat(quantity) > 1 ? "s" : "");
      return unit;
    };

    const unitDisplay = getUnitDisplay(unit);
    const orderMessage = `Order for ${quantity} ${unitDisplay} of ${productName}`;

    try {
      sendWSMessage(customerProfile.id, assignedMilkmanId, orderMessage, 'customer');
      toast({ title: "Quick Order Sent", description: orderMessage });
    } catch (error) {
      toast({
        title: "Order Failed",
        description: "Failed to send order.",
        variant: "destructive",
      });
    }
  };

  // Message status component
  const MessageStatus = ({ message }: { message: any }) => {
    if (message.senderType !== 'customer') return null;

    return (
      <div className="flex items-center gap-1 text-xs">
        {message.isDelivered ? (
          <div className="flex items-center gap-0.5 text-green-400">
            <Check className="h-3 w-3" />
            <Check className="h-3 w-3" />
            <Check className="h-3 w-3" />
          </div>
        ) : message.isAccepted ? (
          <div className="flex items-center gap-0.5 text-blue-400">
            <Check className="h-3 w-3" />
            <Check className="h-3 w-3" />
          </div>
        ) : (
          <div className="text-gray-400">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  // If no assigned milkman, show loading or error state
  if (!assignedMilkman) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <MessageCircle className="h-12 w-12 mb-4 text-gray-400 dark:text-gray-500" />
        <p className="text-center text-gray-600 dark:text-gray-400">
          {assignedMilkmanId ? "Loading dairyman details..." : "No assigned dairyman found"}
        </p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2 chat-touch-target chat-accessible"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{(assignedMilkman as any).contactName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{(assignedMilkman as any).businessName}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isConnected ? 'Online' : 'Connecting...'}
            </span>
          </div>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Messages */}
      <div className="chat-messages-container">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
            <MessageCircle className="h-12 w-12 mb-4" />
            <p className="text-center">Start a conversation with {(assignedMilkman as any)?.contactName}</p>
            <p className="text-sm text-center">Place daily orders or send messages</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`chat-bubble chat-message ${msg.senderType === 'customer'
                  ? 'chat-bubble-customer'
                  : 'chat-bubble-milkman'
                  }`}>
                  {msg.messageType === 'order' && (
                    <div className="font-medium text-sm mb-1">
                      📦 Order: {msg.orderQuantity} units
                    </div>
                  )}
                  <div className="text-sm">{msg.message}</div>
                  <div className={`flex items-center justify-between mt-1 ${msg.senderType === 'customer' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    <div className="text-xs">
                      {formatTime(msg.createdAt)}
                    </div>
                    <MessageStatus message={msg} />
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Active Subscriptions Bar */}
      {(customerSubscriptions as any[]).length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            className="w-full flex items-center justify-between text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-2 rounded-lg transition-colors"
            onClick={() => setShowActiveSubscriptions(!showActiveSubscriptions)}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="font-medium">{(customerSubscriptions as any[]).filter((s: any) => s.isActive).length} Active Subscription{(customerSubscriptions as any[]).filter((s: any) => s.isActive).length !== 1 ? 's' : ''}</span>
            </span>
            <span className="text-xs">{showActiveSubscriptions ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {showActiveSubscriptions && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {(customerSubscriptions as any[]).map((sub: any) => (
                <div key={sub.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${sub.isActive
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{sub.quantity} {sub.unit} {sub.productName}</span>
                      <Badge variant={sub.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {sub.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {getFrequencyLabel(sub)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => toggleSubscriptionMutation.mutate(sub.id)}
                      title={sub.isActive ? 'Pause' : 'Resume'}
                    >
                      {sub.isActive ? <Pause className="h-3.5 w-3.5 text-yellow-600" /> : <Play className="h-3.5 w-3.5 text-green-600" />}
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      onClick={() => deleteSubscriptionMutation.mutate(sub.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Section */}
      <div className="chat-input-area">
        <div className="space-y-3">
          {/* Preset Order Button if available */}
          {presetOrder && showNumpad && (
            <Button
              variant="secondary"
              className="w-full mb-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
              onClick={sendQuickOrder}
              disabled={!isConnected}
            >
              ⚡ Quick Order: {presetOrder.items[0].quantity} {presetOrder.items[0].product}
            </Button>
          )}

          {/* Always show order quantity section when numpad is active */}
          {showNumpad && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Product</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose product" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProducts.length > 0 ? (
                        selectedProducts.map((product: any) => (
                          <SelectItem key={product.name} value={product.name}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{product.name}</span>
                              <span className="text-xs text-gray-500">({product.unit})</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-products" disabled>
                          No products available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Quantity</label>
                  <div className="mt-1 relative">
                    <Input
                      value={orderQuantity}
                      placeholder="0.0"
                      readOnly
                      className="text-center text-lg font-mono bg-gray-50 dark:bg-gray-800 dark:text-white"
                    />
                    <Calculator className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Numpad */}
              <div className="chat-numpad">
                {numpadButtons.flat().map((button) => (
                  <button
                    key={button}
                    className="chat-numpad-button chat-touch-target chat-accessible"
                    onClick={() => {
                      if (button === "⌫") {
                        deleteLastDigit();
                      } else {
                        addToQuantity(button);
                      }
                    }}
                  >
                    {button}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Switch
                  id="auto-send"
                  checked={isAutoSend}
                  onCheckedChange={setIsAutoSend}
                />
                <Label htmlFor="auto-send" className="text-sm cursor-pointer">
                  Auto-send daily?
                </Label>

                {isAutoSend && (
                  <Select value={scheduleTime} onValueChange={setScheduleTime}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:00">6:00 AM</SelectItem>
                      <SelectItem value="07:00">7:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="17:00">5:00 PM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Save Preset Button */}
                <Button
                  variant="outline"
                  className="flex-1 chat-touch-target chat-accessible text-xs min-w-[80px]"
                  onClick={saveAsPreset}
                  disabled={!orderQuantity || !selectedProduct}
                >
                  📅 Daily
                </Button>
                <Button
                  variant={showSubscriptionPanel ? "default" : "outline"}
                  className={`flex-1 chat-touch-target chat-accessible text-xs min-w-[80px] ${showSubscriptionPanel ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''
                    }`}
                  onClick={() => setShowSubscriptionPanel(!showSubscriptionPanel)}
                >
                  🔄 Subscribe
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 chat-touch-target chat-accessible text-xs min-w-[60px]"
                  onClick={clearQuantity}
                >
                  {getTranslatedText('Clear', language)}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 chat-touch-target chat-accessible text-xs min-w-[80px]"
                  onClick={() => {
                    setShowNumpad(false);
                    setShowKeyboard(true);
                    setShowSubscriptionPanel(false);
                  }}
                >
                  💬 Message
                </Button>
              </div>

              {/* Subscription Panel */}
              {showSubscriptionPanel && (
                <div className="mt-3 p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      Set Up Subscription
                    </h4>
                    <button onClick={() => setShowSubscriptionPanel(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {(!selectedProduct || !orderQuantity) && (
                    <p className="text-xs text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-800/40 px-2 py-1.5 rounded">
                      ⬆️ Select a product and enter quantity above first
                    </p>
                  )}

                  {/* Frequency selector */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Frequency</label>
                    <div className="flex gap-1.5">
                      {["daily", "weekly", "monthly"].map(freq => (
                        <button
                          key={freq}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${subFrequency === freq
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-purple-300'
                            }`}
                          onClick={() => setSubFrequency(freq)}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day picker for weekly */}
                  {subFrequency === "weekly" && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Select Days</label>
                      <div className="flex gap-1">
                        {DAY_LABELS.map((day, i) => (
                          <button
                            key={i}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${subDaysOfWeek.includes(i)
                                ? 'bg-purple-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                              }`}
                            onClick={() => toggleDay(i)}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special instructions */}
                  <Input
                    placeholder="Special instructions (optional)"
                    value={subInstructions}
                    onChange={(e) => setSubInstructions(e.target.value)}
                    className="text-xs h-8"
                  />

                  {/* Create button */}
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
                    onClick={handleCreateSubscription}
                    disabled={!selectedProduct || !orderQuantity || createSubscriptionMutation.isPending}
                  >
                    {createSubscriptionMutation.isPending ? 'Creating...' : '🔄 Create Subscription'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={showNumpad ? getTranslatedText('Optional note for your order...', language) : getTranslatedText('Type a message...', language)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (showNumpad) {
                    sendOrderMessage();
                  } else {
                    sendMessage();
                  }
                }
              }}
              className="flex-1 chat-accessible dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
            {showKeyboard && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowKeyboard(false);
                  setShowNumpad(true);
                }}
                className="chat-touch-target chat-accessible dark:bg-gray-800 dark:text-white dark:border-gray-700"
                title="Place Order"
              >
                📦
              </Button>
            )}
            <Button
              onClick={showNumpad ? sendOrderMessage : sendMessage}
              disabled={!isConnected || (showKeyboard && !message.trim()) || (showNumpad && (!orderQuantity || !selectedProduct))}
              className="chat-touch-target chat-accessible dark:bg-green-700 dark:hover:bg-green-800"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {showNumpad && (
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Select product and enter quantity to send order (note is optional)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
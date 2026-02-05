import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, ArrowLeft, Calculator, Package, Check } from "lucide-react";
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



  // Get products from customer's selected services during assignment
  const getSelectedProducts = () => {
    if (!assignedMilkman || !serviceRequests) return [];
    
    // Find service request for the assigned milkman
    const assignedMilkmanServiceRequest = serviceRequests.find(
      (req: any) => req.milkmanId === assignedMilkmanId
    );
    
    if (!assignedMilkmanServiceRequest?.services) {
      // Fallback to all available products if no service request found
      return assignedMilkman.dairyItems?.filter((item: any) => item.isAvailable) || [];
    }
    
    // Filter milkman's products based on customer's selected services
    return assignedMilkman.dairyItems?.filter((item: any) => 
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
    if (messages && messages.length > 0) {
      setChatMessages(messages);
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
    const productInfo = selectedProducts.find(p => p.name === selectedProduct);
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

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{assignedMilkman.contactName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{assignedMilkman.businessName}</p>
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
            <p className="text-center">Start a conversation with {assignedMilkman?.contactName}</p>
            <p className="text-sm text-center">Place daily orders or send messages</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`chat-bubble chat-message ${
                  msg.senderType === 'customer' 
                    ? 'chat-bubble-customer' 
                    : 'chat-bubble-milkman'
                }`}>
                  {msg.messageType === 'order' && (
                    <div className="font-medium text-sm mb-1">
                      📦 Order: {msg.orderQuantity} units
                    </div>
                  )}
                  <div className="text-sm">{msg.message}</div>
                  <div className={`flex items-center justify-between mt-1 ${
                    msg.senderType === 'customer' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
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
      
      {/* Input Section */}
      <div className="chat-input-area">
        <div className="space-y-3">
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 chat-touch-target chat-accessible"
                  onClick={clearQuantity}
                >
                  {getTranslatedText('Clear', language)}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 chat-touch-target chat-accessible"
                  onClick={() => {
                    setShowNumpad(false);
                    setShowKeyboard(true);
                  }}
                >
                  💬 Message
                </Button>
              </div>
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
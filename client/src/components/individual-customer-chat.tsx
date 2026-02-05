import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Send,
  ShoppingCart,
  User,
  Package,
  Check,
  MapPin,
  Phone,
  Edit2,
  Trash2,
  Mic,
  Receipt,
  MicOff,
  Play,
  Pause,
  Download
} from "lucide-react";

interface IndividualCustomerChatProps {
  selectedCustomer: any;
  milkmanProfile: any;
  onClose: () => void;
}

export function IndividualCustomerChat({ selectedCustomer, milkmanProfile, onClose }: IndividualCustomerChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [newMessage, setNewMessage] = useState("");
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [orderProduct, setOrderProduct] = useState("Milk");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isConnected, addMessageHandler, removeMessageHandler } = useWebSocket();

  // Get individual chat messages between this customer and milkman
  const { data: chatMessages = [], refetch: refetchChat } = useQuery<any[]>({
    queryKey: [`/api/chat/messages?milkmanId=${milkmanProfile?.id}&customerId=${selectedCustomer?.id}`],
    enabled: !!selectedCustomer?.id && !!milkmanProfile?.id,
    staleTime: 0, // Always refetch to get latest messages
  });

  // Listen for real-time messages
  useEffect(() => {
    if (!isConnected || !selectedCustomer?.id || !milkmanProfile?.id) return;

    const handler = (data: any) => {
      // Check if message belongs to this chat
      const isRelevant =
        (data.milkmanId === milkmanProfile.id && data.customerId === selectedCustomer.id) ||
        (data.message?.milkmanId === milkmanProfile.id && data.message?.customerId === selectedCustomer.id);

      if (isRelevant) {
        if (data.type === 'new_message' || data.type === 'message_sent' || data.type === 'order_accepted' || data.type === 'order_delivered') {
          queryClient.invalidateQueries({ queryKey: [`/api/chat/messages?milkmanId=${milkmanProfile.id}&customerId=${selectedCustomer.id}`] });
          // Also invalidate orders if it's an order event
          if (data.type === 'order_accepted' || data.type === 'order_delivered') {
            queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
          }
        }
      }
    };

    const handlerId = `chat-${selectedCustomer.id}-${milkmanProfile.id}`;
    addMessageHandler(handlerId, handler);

    return () => {
      removeMessageHandler(handlerId);
    };
  }, [isConnected, selectedCustomer?.id, milkmanProfile?.id, addMessageHandler, removeMessageHandler]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("/api/chat/messages", "POST", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/messages?milkmanId=${milkmanProfile?.id}&customerId=${selectedCustomer?.id}`] });
      setNewMessage("");
      setIsOrderMode(false);
      setOrderQuantity("");
      toast({
        title: "Message Sent",
        description: isOrderMode ? "Order request sent successfully" : "Message sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/chat/messages/${messageId}/accepted`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/messages?milkmanId=${milkmanProfile?.id}&customerId=${selectedCustomer?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
      // Invalidate profile to refresh inventory
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
      toast({
        title: "Order Accepted",
        description: "Order has been accepted and inventory updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept order",
        variant: "destructive",
      });
    },
  });

  // Mark delivered mutation
  const markDeliveredMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/chat/messages/${messageId}/delivered`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/messages?milkmanId=${milkmanProfile?.id}&customerId=${selectedCustomer?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
      toast({
        title: "Order Delivered",
        description: "Order has been marked as delivered",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark order as delivered",
        variant: "destructive",
      });
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, message, orderQuantity }: { messageId: number; message: string; orderQuantity?: string }) => {
      return await apiRequest(`/api/chat/edit/${messageId}`, "PUT", { message, orderQuantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/messages?milkmanId=${milkmanProfile?.id}&customerId=${selectedCustomer?.id}`] });
      setEditingMessage(null);
      setEditText("");
      toast({
        title: "Message Updated",
        description: "Message has been updated successfully",
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

  // Generate Bill mutation
  const generateBillMutation = useMutation({
    mutationFn: async () => {
      if (!milkmanProfile) throw new Error("Milkman profile missing");
      if (!selectedCustomer) throw new Error("Selected customer missing");

      console.log("Generating bill for:", { milkmanId: milkmanProfile.id, customerId: selectedCustomer.id });

      return await apiRequest("/api/bills/generate-chat-bill", "POST", {
        milkmanId: milkmanProfile.id,
        customerId: selectedCustomer.id
      });
    },
    onSuccess: (data: any) => {
      // Send the bill message with details
      const billDetails = {
        billId: data.bill.id,
        totalAmount: data.bill.totalAmount,
        month: data.bill.billMonth,
        orderCount: data.bill.totalOrders
      };

      sendMessageMutation.mutate({
        customerId: selectedCustomer.id,
        milkmanId: milkmanProfile.id,
        message: JSON.stringify(billDetails), // Store bill meta in message for easy parsing
        senderType: "milkman",
        messageType: "bill",
        orderTotal: data.bill.totalAmount
      });

      queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });

      toast({
        title: "Bill Generated",
        description: `Invoice for ₹${data.bill.totalAmount} sent successfully`,
      });
      setIsOrderMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate bill",
        variant: "destructive",
      });
    },
  });

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !isOrderMode) return;
    if (isOrderMode) {
      // Check if this is a Bill
      if (orderProduct === "Bill") {
        generateBillMutation.mutate();
        return;
      }

      // Prepare order message (Legacy/Fallback if other products enabled in future)
      // Since we removed the UI for selecting products, this branch might not be reached for regular orders
      // but keeping it safe.
      const messageContent = newMessage.trim()
        ? `Order Request: ${orderQuantity}L - ${newMessage}`
        : `Order Request: ${orderQuantity}L`;

      // Construct order items for analytics
      // Assuming 'Milk' is the default product and using profile price
      const price = parseFloat(milkmanProfile.pricePerLiter || "0");
      const orderItems = [{
        product: orderProduct || "Milk",
        quantity: parseFloat(orderQuantity),
        price: price
      }];

      sendMessageMutation.mutate({
        customerId: selectedCustomer.id,
        milkmanId: milkmanProfile.id,
        message: messageContent,
        orderQuantity: orderQuantity, // Keep legacy for display if needed
        orderItems: orderItems, // New structure for analytics
        senderType: "milkman",
        messageType: "order" // Explicitly mark as order
      });
    } else {
      if (!newMessage.trim()) return;

      sendMessageMutation.mutate({
        customerId: selectedCustomer.id,
        milkmanId: milkmanProfile.id,
        message: newMessage,
        senderType: "milkman",
      });
    }
  };

  // Products mutation
  const updateProductsMutation = useMutation({
    mutationFn: async (updatedProducts: any[]) => {
      const res = await apiRequest("/api/products/update", "POST", {
        dairyItems: updatedProducts
      });
      return res; // apiRequest already returns JSON, no need for res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
    },
  });

  // Handle accepting orders
  const handleAcceptOrder = async (messageId: number, orderQuantity: string, orderProduct: string) => {
    if (!messageId) return;

    try {
      // Optimistically update inventory if milkman is logged in
      if (user?.userType === 'milkman' && milkmanProfile?.dairyItems) {
        const currentItems = [...milkmanProfile.dairyItems];
        const productIndex = currentItems.findIndex((item: any) =>
          item.name.toLowerCase() === orderProduct.toLowerCase()
        );

        if (productIndex !== -1) {
          const currentQty = parseFloat(currentItems[productIndex].quantity || "0");
          const orderQty = parseFloat(orderQuantity);
          const newQty = Math.max(0, currentQty - orderQty);

          currentItems[productIndex] = {
            ...currentItems[productIndex],
            quantity: newQty.toString()
          };

          // Call mutation to update backend (though backend chat acceptance also updates it,
          // this ensures explicit sync and frontend cache update)
          // Actually, since backend chat route handles it, we mainly want to invalidate query
          // But if we want to be double sure or show immediate UI change:
          // We will just rely on invalidation since backend does the heavy lifting now
        }
      }

      await acceptOrderMutation.mutateAsync(messageId);
    } catch (error) {
      console.error("Failed to accept order:", error);
    }
  };

  // Handle marking as delivered
  const handleMarkDelivered = (message: any) => {
    markDeliveredMutation.mutate(message.id);
  };

  // Handle editing messages
  const handleEditMessage = (message: any) => {
    setEditingMessage(message.id);
    setEditText(message.message);
  };

  // Save edited message
  const handleSaveEdit = () => {
    if (editingMessage && editText.trim()) {
      editMessageMutation.mutate({
        messageId: editingMessage,
        message: editText,
      });
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // WebSocket message handling
  useEffect(() => {
    if (isConnected && selectedCustomer && milkmanProfile) {
      const messageHandler = (data: any) => {
        if (data.type === 'new_message' &&
          data.customerId == selectedCustomer.id &&
          data.milkmanId == milkmanProfile.id) {
          refetchChat();
        }
      };

      // Add message handler logic here if needed
      return () => {
        // Cleanup handler
      };
    }
  }, [isConnected, selectedCustomer, milkmanProfile, refetchChat]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900 border rounded-lg">
      {/* Header */}
      <div className="flex-shrink-0 bg-green-600 dark:bg-green-700 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 dark:bg-white/30 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{selectedCustomer?.name}</h3>
            <p className="text-sm opacity-90">{selectedCustomer?.phone}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 dark:hover:bg-white/20">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10 dark:hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {chatMessages.map((message: any) => {
          const isOwnMessage = message.senderType === 'milkman';
          const isOrderMessage = message.messageType === 'order';
          const isBillMessage = message.messageType === 'bill';
          const isEditing = editingMessage === message.id;

          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm ${isOwnMessage
                ? 'bg-green-500 dark:bg-green-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border dark:border-gray-700'
                }`}>
                {isOrderMessage && !isOwnMessage && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-orange-50 dark:bg-orange-900/30 rounded border-orange-200 dark:border-orange-700 border">
                    <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                      {getTranslatedText('Order Request', language)}
                    </span>
                  </div>
                )}

                {isBillMessage && (
                  <div className="mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <div className="flex items-center text-green-600 font-bold">
                        <Receipt className="h-4 w-4 mr-2" />
                        <span>INVOICE</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        #{JSON.parse(message.message || '{}').billId || '---'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total Orders:</span>
                        <span className="font-medium">{JSON.parse(message.message || '{}').orderCount || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Month:</span>
                        <span className="font-medium">{JSON.parse(message.message || '{}').month || 0}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t flex justify-between items-center">
                        <span className="font-semibold">Total Amount</span>
                        <span className="text-lg font-bold text-green-600">
                          ₹{JSON.parse(message.message || '{}').totalAmount || message.orderTotal || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={editMessageMutation.isPending}>
                        <Check className="h-3 w-3 mr-1" />
                        {getTranslatedText('Save', language)}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMessage(null);
                          setEditText("");
                        }}
                      >
                        {getTranslatedText('Cancel', language)}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{message.message}</p>

                    {message.orderQuantity && (
                      <div className="text-xs mt-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {getTranslatedText('Quantity', language)}: {message.orderQuantity} {getTranslatedText('liters', language)}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </span>

                      {isOwnMessage && (
                        <div className="flex items-center space-x-1">
                          {message.isEditable && (
                            <button
                              onClick={() => handleEditMessage(message)}
                              className="text-xs opacity-70 hover:opacity-100"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                          <div className="flex items-center">
                            <Check className="h-3 w-3" />
                            {message.isDelivered && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Order Actions */}
                {isOrderMessage && !isOwnMessage && (
                  <div className="mt-2 pt-2 border-t">
                    {!message.isAccepted ? (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptOrder(message)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={acceptOrderMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {getTranslatedText('Accept Order', language)}
                      </Button>
                    ) : !message.isDelivered ? (
                      <Button
                        size="sm"
                        onClick={() => handleMarkDelivered(message)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={markDeliveredMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        <Check className="h-4 w-4 mr-1" />
                        <Check className="h-4 w-4 mr-1" />
                        {getTranslatedText('Mark Delivered', language)}
                      </Button>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-sm text-green-600 font-medium">
                          ✅ {getTranslatedText('Order Delivered Successfully', language)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
        {/* Bill Mode Toggle */}
        <div className="flex items-center space-x-2 mb-3">
          <Button
            variant={isOrderMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsOrderMode(!isOrderMode);
              setOrderProduct("Bill"); // Reuse state
            }}
            className="flex-shrink-0"
          >
            <Receipt className="h-4 w-4 mr-2" />
            {isOrderMode ? getTranslatedText('Cancel Bill', language) : getTranslatedText('Send Bill', language)}
          </Button>

          {isOrderMode && (
            <>
              {orderProduct === "Bill" ? (
                <div className="text-sm text-muted-foreground flex items-center italic">
                  All unbilled delivered orders will be included.
                </div>
              ) : (
                <Input
                  placeholder="Amount (₹)"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="w-24"
                  type="number"
                />
              )}
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isOrderMode
                ? (orderProduct === "Bill" ? "Generating invoice based on recent orders..." : getTranslatedText('Add note for bill...', language))
                : getTranslatedText('Type a message...', language)
            }
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || generateBillMutation.isPending || (!newMessage.trim() && !isOrderMode)}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            {isOrderMode && orderProduct === "Bill" ? (
              generateBillMutation.isPending ? "..." : "Generate"
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
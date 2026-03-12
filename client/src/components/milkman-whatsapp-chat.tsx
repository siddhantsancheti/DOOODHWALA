import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
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
  Users,
  Star,
  IndianRupee,
  Camera,
  File,
  Image,
  ChevronRight,
  Info,
  Share,
  Paperclip,
  UserPlus,
  UserMinus,
  Settings,
  MessageCircle,
  Phone,
  Edit2,
  Trash2
} from "lucide-react";

interface MilkmanWhatsAppChatProps {
  selectedCustomer: any;
  milkmanProfile: any;
  onClose: () => void;
}

export function MilkmanWhatsAppChat({ selectedCustomer, milkmanProfile, onClose }: MilkmanWhatsAppChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [orderProduct, setOrderProduct] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderItems, setOrderItems] = useState<Array<{ product: string, quantity: number, price: number }>>([]);
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isConnected } = useWebSocket();

  // Get all customers assigned to this milkman for group chat
  const { data: groupMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/group/${milkmanProfile.id}`],
    enabled: !!milkmanProfile?.id,
  });

  // Get chat messages for the group
  const { data: chatMessages = [] } = useQuery<any[]>({
    queryKey: [`/api/chat/group/${milkmanProfile.id}`],
    enabled: !!milkmanProfile?.id,
  });

  // Get customer pricing for order calculations
  const { data: customerPricing } = useQuery({
    queryKey: [`/api/customer-pricings/${milkmanProfile.id}/${selectedCustomer.id}`],
    enabled: !!milkmanProfile?.id && !!selectedCustomer?.id,
  });

  // Get current month bill for real-time billing
  const { data: currentBillData } = useQuery({
    queryKey: [`/api/bills/current`],
    enabled: !!selectedCustomer?.id,
  });

  // Update current bill when data changes
  useEffect(() => {
    if (currentBillData) {
      setCurrentBill(currentBillData);
    }
  }, [currentBillData]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("/api/chat/send", "POST", messageData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanProfile.id}`] });
      // Refresh bill data when order is placed
      if (data.messageType === 'order') {
        queryClient.invalidateQueries({ queryKey: [`/api/bills/current`] });
      }
      if (sendMessage) {
        sendMessage(
          milkmanProfile.id,
          milkmanProfile.id,
          data.message,
          (user as any)?.userType || 'customer'
        );
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
        description: "Order has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
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
        description: "Order has been accepted successfully",
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

  // Mark Delivered mutation
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark order as delivered",
        variant: "destructive",
      });
    },
  });

  const handleAcceptOrder = (message: any) => {
    acceptOrderMutation.mutate(message.id);
  };

  const handleMarkDelivered = (message: any) => {
    markDeliveredMutation.mutate(message.id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const messageData = {
      customerId: selectedCustomer.id,
      milkmanId: milkmanProfile.id,
      message: newMessage,
      messageType: "text",
      senderType: "milkman",
    };

    sendMessageMutation.mutate(messageData);
    setNewMessage("");
  };

  const handleEditMessage = (messageId: number, originalText: string, originalQuantity?: number) => {
    setEditingMessage(messageId);
    setEditText(originalText);
    setOrderQuantity(originalQuantity?.toString() || "");
  };

  const handleSaveEdit = () => {
    if (editingMessage === null || !editText.trim()) return;

    const quantity = orderQuantity ? parseFloat(orderQuantity) : undefined;
    editMessageMutation.mutate({
      messageId: editingMessage,
      newText: editText.trim(),
      quantity: quantity
    });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
    setOrderQuantity("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-gray-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-green-600 dark:text-green-700" />
          </div>
          <div className="cursor-pointer" onClick={() => setShowGroupInfo(true)}>
            <h3 className="font-semibold">{selectedCustomer.name}</h3>
            <p className="text-sm text-green-100 dark:text-green-200">
              {groupMembers.length} total customers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {isOrderMode ? "Cancel Order" : "Order"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareMenu(true)}
            className="flex items-center gap-2"
          >
            <Paperclip className="h-4 w-4" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-green-800 dark:hover:bg-green-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
        {chatMessages.map((message: any) => {
          const isOwnMessage = message.senderType === 'milkman';
          const isOrderMessage = message.messageType === 'order';
          const isEditing = editingMessage === message.id;

          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg shadow-sm ${isOwnMessage
                  ? 'bg-green-500 dark:bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white border dark:border-gray-700'
                  }`}
              >
                {isOrderMessage && !isOwnMessage && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-orange-50 dark:bg-orange-900/30 rounded border-orange-200 dark:border-orange-700 border">
                    <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">Order Request</span>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-sm"
                      placeholder="Edit message..."
                    />
                    {isOrderMessage && (
                      <Input
                        type="number"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        className="text-sm"
                        placeholder="Quantity"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{message.message}</p>
                      {isOrderMessage && !isOwnMessage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMessage(message.id, message.message, message.orderQuantity)}
                          className="ml-2 p-1 h-6 w-6"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {message.orderQuantity && (
                      <div className="text-xs mt-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        Quantity: {message.orderQuantity} units
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs opacity-70">
                    {new Date(message.timestamp || message.createdAt).toLocaleTimeString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="text-xs opacity-70">
                      {message.isDelivered ? (
                        <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          <Check className="h-3 w-3" />
                          <Check className="h-3 w-3" />
                        </div>
                      ) : message.isAccepted ? (
                        <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                          <Check className="h-3 w-3" />
                          <Check className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="text-gray-400 dark:text-gray-500">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isOrderMessage && !isOwnMessage && (
                  <div className="mt-2 pt-2 border-t dark:border-gray-600">
                    {!message.isAccepted ? (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptOrder(message)}
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept Order
                      </Button>
                    ) : !message.isDelivered ? (
                      <Button
                        size="sm"
                        onClick={() => handleMarkDelivered(message)}
                        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        <Check className="h-4 w-4 mr-1" />
                        <Check className="h-4 w-4 mr-1" />
                        Mark Delivered
                      </Button>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✅ Order Delivered Successfully
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

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Group Info Modal */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Info
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Group Details */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">{milkmanProfile.businessName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{groupMembers.length} members</p>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Members</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {groupMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowGroupInfo(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Content Modal */}
      <Dialog open={showShareMenu} onOpenChange={setShowShareMenu}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share className="h-5 w-5" />
              Share Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Photo/Video */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setShowShareMenu(false);
                  toast({
                    title: "Photo/Video",
                    description: "Photo/Video sharing will be available soon",
                  });
                }}
              >
                <Camera className="h-6 w-6 text-purple-500" />
                <span className="text-sm">Photo/Video</span>
              </Button>

              {/* Documents */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setShowShareMenu(false);
                  toast({
                    title: "Documents",
                    description: "Document sharing will be available soon",
                  });
                }}
              >
                <File className="h-6 w-6 text-blue-500" />
                <span className="text-sm">Documents</span>
              </Button>

              {/* Location */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setShowShareMenu(false);
                  toast({
                    title: "Location",
                    description: "Location sharing will be available soon",
                  });
                }}
              >
                <MapPin className="h-6 w-6 text-red-500" />
                <span className="text-sm">Location</span>
              </Button>

              {/* Contact */}
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setShowShareMenu(false);
                  toast({
                    title: "Contact",
                    description: "Contact sharing will be available soon",
                  });
                }}
              >
                <User className="h-6 w-6 text-green-500" />
                <span className="text-sm">Contact</span>
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowShareMenu(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
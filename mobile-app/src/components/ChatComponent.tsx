import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Dimensions,
  Modal, FlatList, useColorScheme
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Send, Package, MessageSquare, Clock, Check, User, Truck, X, Plus, Minus,
  IndianRupee, Receipt, Share, Camera, File, MapPin, BarChart3, Settings, CheckCheck, Mic, ShoppingCart,
  ArrowLeft, Calculator, RefreshCw, Pause, Play, Trash2, Calendar, ChevronDown, ChevronUp, Bell, Info
} from 'lucide-react-native';
import { lightColors, darkColors } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

const getDateLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function ChatComponent({ customerId, milkmanId, embedded = false, navigation }: { customerId: any, milkmanId: any, embedded?: boolean, navigation?: any }) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme() || 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const isDark = colorScheme === 'dark';

  const [message, setMessage] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showNumpad, setShowNumpad] = useState(true);
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);
  const [subFrequency, setSubFrequency] = useState<string>("daily");
  const [subDaysOfWeek, setSubDaysOfWeek] = useState<number[]>([]);
  const [subMonthDays, setSubMonthDays] = useState<number[]>([1]);
  const [subInstructions, setSubInstructions] = useState("");
  const [showActiveSubscriptions, setShowActiveSubscriptions] = useState(false);
  const [isAutoSend, setIsAutoSend] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("07:00");
  
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { isConnected, sendMessage: sendWSMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  const { data: milkman } = useQuery<any>({
    queryKey: [`/api/milkmen/${milkmanId}`],
    enabled: !!milkmanId,
  });

  const { data: customerProfile } = useQuery<any>({
    queryKey: ["/api/customers/profile"],
    enabled: user?.userType === 'customer',
  });

  const { data: groupMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/group/${milkmanId}`],
    enabled: !!milkmanId,
  });

  const { data: history = [], isLoading: isHistoryLoading } = useQuery<any[]>({
    queryKey: [`/api/chat/group/${milkmanId}`],
    enabled: !!milkmanId,
  });

  const { data: customerSubscriptions = [], refetch: refetchSubscriptions } = useQuery<any[]>({
    queryKey: ["/api/subscriptions/customer"],
    enabled: user?.userType === 'customer',
  });

  useEffect(() => {
    if (history.length > 0) setChatMessages(history);
  }, [history]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      if (['new_message', 'message_sent', 'order_accepted', 'order_delivered'].includes(data.type)) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
      }
    };
    addMessageHandler('chat-comp', handleNewMessage);
    return () => removeMessageHandler('chat-comp');
  }, [milkmanId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest({ url: "/api/chat/send", method: "POST", body: messageData });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
      sendWSMessage(customerId, milkmanId, data.message, (user?.userType as any) || 'customer');
    },
    onError: (error: any) => Alert.alert("Error", error.message || "Failed to send message"),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (subData: any) => {
      const response = await apiRequest({ url: "/api/subscriptions", method: "POST", body: subData });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/customer"] });
      setShowSubscriptionPanel(false);
      setOrderQuantity("");
      setSelectedProduct(null);
      Alert.alert(t('subscriptionCreated') || "Subscription Created", t('subscriptionCreatedDesc') || "Your recurring order has been set up!");
    },
    onError: (error: any) => Alert.alert("Error", error.message || "Failed to create subscription"),
  });

  const toggleSubscriptionMutation = useMutation({
    mutationFn: async (subId: number) => {
      const response = await apiRequest({ url: `/api/subscriptions/${subId}/toggle`, method: "PATCH" });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/customer"] });
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subId: number) => {
      const response = await apiRequest({ url: `/api/subscriptions/${subId}`, method: "DELETE" });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/customer"] });
    },
  });

  const updatePresetOrderMutation = useMutation({
    mutationFn: async (presetOrder: any) => {
      const response = await apiRequest({ url: "/api/customers/profile/preset-order", method: "PATCH", body: { presetOrder } });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      Alert.alert(t('presetSaved') || "Preset Saved", t('presetSavedDesc') || "Your quick order preset has been saved.");
    },
  });

  const handleSendOrder = () => {
    if (!orderQuantity || !selectedProduct) {
      Alert.alert(t('missingInfo') || "Missing Info", t('selectProductAndQty') || "Please select product and enter quantity.");
      return;
    }

    const orderMessage = `Order for ${orderQuantity} ${selectedProduct.unit || 'unit'} of ${selectedProduct.name}`;
    
    sendMessageMutation.mutate({
      customerId, milkmanId,
      message: orderMessage,
      messageType: "order",
      orderItems: [{ product: selectedProduct.name, quantity: parseFloat(orderQuantity), price: parseFloat(selectedProduct.price || "0") }],
      orderTotal: parseFloat(selectedProduct.price || "0") * parseFloat(orderQuantity),
      senderType: user?.userType,
    });
    
    setOrderQuantity("");
    setSelectedProduct(null);
  };

  const handleQuickOrder = () => {
    const preset = customerProfile?.presetOrder;
    if (!preset || !preset.items?.length) return;

    const item = preset.items[0];
    const orderMessage = `Order for ${item.quantity} ${item.unit || 'unit'} of ${item.product}`;
    
    sendMessageMutation.mutate({
      customerId, milkmanId,
      message: orderMessage,
      messageType: "order",
      orderItems: [{ product: item.product, quantity: parseFloat(item.quantity), price: 0 }],
      orderTotal: 0,
      senderType: user?.userType,
    });
  };

  const handleSaveAsPreset = () => {
    if (!orderQuantity || !selectedProduct) return;
    updatePresetOrderMutation.mutate({
      autoSend: isAutoSend,
      scheduleTime: scheduleTime,
      items: [{
        product: selectedProduct.name,
        quantity: orderQuantity,
        unit: selectedProduct.unit || "unit"
      }]
    });
  };

  const addToQuantity = (digit: string) => {
    if (digit === "." && orderQuantity.includes(".")) return;
    if (orderQuantity.length >= 8) return;
    setOrderQuantity(prev => prev + digit);
  };

  const deleteLastDigit = () => setOrderQuantity(prev => prev.slice(0, -1));

  const toggleDay = (day: number) => {
    setSubDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleCreateSubscription = () => {
    if (!orderQuantity || !selectedProduct) return;
    
    createSubscriptionMutation.mutate({
      milkmanId,
      productName: selectedProduct.name,
      quantity: orderQuantity,
      unit: selectedProduct.unit || "liter",
      priceSnapshot: selectedProduct.price || null,
      frequencyType: subFrequency,
      daysOfWeek: subFrequency === "weekly" ? subDaysOfWeek : null,
      startDate: new Date().toISOString(),
      specialInstructions: subInstructions || null,
    });
  };

  const scrollToEnd = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const surfaceColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const availableProducts = milkman?.dairyItems?.filter((item: any) => item.isAvailable !== false) || [];
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MessageStatus = ({ message }: { message: any }) => {
    if (message.senderType !== 'customer') return null;
    return (
      <View style={{ flexDirection: 'row', marginLeft: 4, alignItems: 'center' }}>
        {message.isDelivered ? (
          <View style={{ flexDirection: 'row' }}>
            <Check size={10} color="#93C5FD" />
            <Check size={10} color="#93C5FD" style={{ marginLeft: -6 }} />
            <Check size={10} color="#93C5FD" style={{ marginLeft: -6 }} />
          </View>
        ) : message.isAccepted ? (
          <CheckCheck size={12} color="#60A5FA" />
        ) : (
          <Check size={12} color="rgba(255,255,255,0.7)" />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollViewRef} style={styles.messagesList} contentContainerStyle={{ padding: 16 }} onContentSizeChange={scrollToEnd}>
        {chatMessages.map((msg, idx) => {
          const isMe = msg.senderType === user?.userType && (user?.userType === 'milkman' ? msg.milkmanId === Number(milkmanId) : msg.customerId === Number(customerId));
          const msgDate = new Date(msg.createdAt);
          const prevMsgDate = idx > 0 ? new Date(chatMessages[idx - 1].createdAt) : null;
          const isNewDay = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

          return (
            <View key={msg.id || idx}>
              {isNewDay && <View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>{getDateLabel(msgDate)}</Text></View>}
              <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: surfaceColor }]]}>
                  {!isMe && (
                    <Text style={[styles.senderName, { color: colors.primary }]}>
                      {msg.senderType === 'milkman' ? milkman?.businessName : groupMembers.find((m: any) => m.id === msg.customerId)?.name || 'Member'}
                    </Text>
                  )}
                  {msg.messageType === 'order' && (
                    <View style={[styles.requestBanner, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(249,115,22,0.1)' }]}>
                      <Package size={14} color={isMe ? '#FFFFFF' : '#EA580C'} />
                      <Text style={[styles.requestBannerText, { color: isMe ? '#FFFFFF' : '#EA580C' }]}>Order Request</Text>
                    </View>
                  )}

                  {msg.messageType === 'bill' ? (
                    <View style={[styles.billMsgCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.primary }]}>
                      <View style={styles.billMsgHeader}>
                        <Receipt size={18} color={colors.primary} />
                        <Text style={[styles.billMsgTitle, { color: textColor }]}>Monthly Bill</Text>
                      </View>
                      <Text style={[styles.billMsgText, { color: textColor }]}>{msg.message}</Text>
                      {user?.userType === 'customer' && (
                        <TouchableOpacity
                          style={[styles.billPayBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            if (navigation) {
                              navigation.navigate('Checkout', {
                                amount: parseFloat(msg.orderTotal || '0'),
                                description: `Bill #${msg.billId}`,
                                orderId: `BILL_${msg.billId}`,
                                paymentType: 'single',
                              });
                            } else {
                              Alert.alert("Navigation Error", "Could not find navigation context. Please use the 'Bills' screen.");
                            }
                          }}
                        >
                          <Text style={styles.billPayBtnText}>Pay Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.msgText, isMe ? styles.myMsgText : { color: textColor }]}>{msg.message}</Text>
                  )}

                  <View style={styles.msgFooter}>
                    <Text style={[styles.msgTime, isMe ? styles.myMsgTime : { color: textMuted }]}>
                      {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <MessageStatus message={msg} />
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Subscription Bar */}
      {customerSubscriptions.length > 0 && (
        <View style={[styles.subBar, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
          <TouchableOpacity 
            style={styles.subBarHeader} 
            onPress={() => setShowActiveSubscriptions(!showActiveSubscriptions)}
          >
            <RefreshCw size={14} color={colors.primary} />
            <Text style={[styles.subBarText, { color: textColor }]}>
              {customerSubscriptions.filter((s:any) => s.isActive).length} Active Subscriptions
            </Text>
            {showActiveSubscriptions ? <ChevronUp size={16} color={textMuted} /> : <ChevronDown size={16} color={textMuted} />}
          </TouchableOpacity>
          
          {showActiveSubscriptions && (
            <ScrollView style={styles.subList} nestedScrollEnabled>
              {customerSubscriptions.map((sub: any) => (
                <View key={sub.id} style={[styles.subItem, { borderBlockColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subItemTitle, { color: textColor }]}>{sub.quantity} {sub.unit} {sub.productName}</Text>
                    <Text style={styles.subItemFreq}>{sub.frequencyType}</Text>
                  </View>
                  <View style={styles.subActions}>
                    <TouchableOpacity onPress={() => toggleSubscriptionMutation.mutate(sub.id)}>
                      {sub.isActive ? <Pause size={16} color="#EAB308" /> : <Play size={16} color="#16A34A" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSubscriptionMutation.mutate(sub.id)} style={{ marginLeft: 12 }}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={[styles.bottomArea, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
        {showNumpad ? (
          <View style={styles.orderPanel}>
            {/* Quick Order Button */}
            {customerProfile?.presetOrder && (
              <TouchableOpacity 
                style={[styles.quickOrderBtn, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}
                onPress={handleQuickOrder}
              >
                <Text style={[styles.quickOrderBtnText, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                  ⚡ Quick Order: {customerProfile.presetOrder.items?.[0]?.quantity} {customerProfile.presetOrder.items?.[0]?.product}
                </Text>
              </TouchableOpacity>
            )}

            {/* Product Strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productStrip}>
              {availableProducts.map((item: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.productChip, 
                    { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor },
                    selectedProduct?.name === item.name && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]} 
                  onPress={() => setSelectedProduct(item)}
                >
                  <Text style={[styles.productChipText, { color: textColor }, selectedProduct?.name === item.name && { color: '#FFF', fontWeight: 'bold' }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input Display */}
            <View style={styles.qtyDisplayRow}>
               <View style={[styles.qtyInputContainer, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                 <Text style={[styles.qtyInputText, { color: textColor }]}>{orderQuantity || "0"}</Text>
                 <Text style={[styles.qtyUnitText, { color: textMuted }]}>{selectedProduct?.unit || 'unit'}</Text>
               </View>
               <TouchableOpacity 
                style={[styles.modeToggle, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                onPress={() => setShowNumpad(false)}
               >
                 <MessageSquare size={20} color={colors.primary} />
               </TouchableOpacity>
            </View>

            {/* Numpad */}
            <View style={styles.numpad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((btn) => (
                <TouchableOpacity 
                  key={btn} 
                  style={[styles.numpadBtn, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}
                  onPress={() => btn === "⌫" ? deleteLastDigit() : addToQuantity(btn)}
                >
                  <Text style={[styles.numpadBtnText, { color: textColor }]}>{btn}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Auto-send Switch */}
            <View style={styles.autoSendRow}>
              <TouchableOpacity 
                style={styles.autoSendAction}
                onPress={() => setIsAutoSend(!isAutoSend)}
              >
                <View style={[styles.miniSwitch, { backgroundColor: isAutoSend ? colors.primary : '#D1D5DB' }]}>
                  <View style={[styles.miniSwitchThumb, isAutoSend && { transform: [{ translateX: 14 }] }]} />
                </View>
                <Text style={[styles.autoSendText, { color: textColor }]}>Auto-send daily?</Text>
              </TouchableOpacity>

              {isAutoSend && (
                <TouchableOpacity style={[styles.timeSelector, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                  <Clock size={14} color={colors.primary} />
                  <Text style={[styles.timeText, { color: textColor }]}>{scheduleTime}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.panelActions}>
              <TouchableOpacity 
                style={styles.panelSmallActionBtn}
                onPress={handleSaveAsPreset}
              >
                <Calendar size={18} color={textMuted} />
                <Text style={styles.panelSmallActionBtnText}>Daily</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.panelSubBtn, showSubscriptionPanel && { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' }]}
                onPress={() => setShowSubscriptionPanel(!showSubscriptionPanel)}
              >
                <RefreshCw size={18} color="#9333EA" />
                <Text style={styles.panelSubBtnText}>Subscribe</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.panelSendBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendOrder}
              >
                <Send size={18} color="#FFF" />
                <Text style={styles.panelSendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>

            {/* Subscription Detail Panel */}
            {showSubscriptionPanel && (
              <View style={[styles.subDetailPanel, { backgroundColor: isDark ? '#1E293B' : '#F5F3FF' }]}>
                <View style={styles.subDetailHeader}>
                  <Text style={styles.subDetailTitle}>Setup Subscription</Text>
                  <View style={styles.freqTabs}>
                    {["daily", "weekly", "monthly"].map(f => (
                      <TouchableOpacity 
                        key={f}
                        style={[styles.freqTab, subFrequency === f && { backgroundColor: '#9333EA' }]}
                        onPress={() => setSubFrequency(f)}
                      >
                        <Text style={[styles.freqTabText, subFrequency === f && { color: '#FFF' }]}>{f.charAt(0).toUpperCase() + f.slice(1, 3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {subFrequency === 'weekly' && (
                  <View style={styles.dayPicker}>
                    {DAY_LABELS.map((day, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles.dayCircle, subDaysOfWeek.includes(i) && { backgroundColor: colors.primary }]}
                        onPress={() => toggleDay(i)}
                      >
                        <Text style={[styles.dayText, subDaysOfWeek.includes(i) && { color: '#FFF' }]}>{day.charAt(0)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <TouchableOpacity 
                  style={[styles.subConfirmBtn, { backgroundColor: '#9333EA' }]}
                  onPress={handleCreateSubscription}
                >
                  <Text style={styles.subConfirmBtnText}>Confirm {subFrequency} Subscription</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={() => setShowNumpad(true)} style={styles.modeReturnBtn}>
              <Calculator size={20} color={textMuted} />
            </TouchableOpacity>
            <TextInput 
              style={[styles.textInput, { backgroundColor: isDark ? '#374151' : '#F3F4F6', color: textColor }]} 
              placeholder="Type a message..." 
              placeholderTextColor={textMuted} 
              value={message} 
              onChangeText={setMessage} 
              multiline 
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: colors.primary }]} 
              onPress={() => { 
                if (!message.trim()) return; 
                sendMessageMutation.mutate({ customerId, milkmanId, message: message.trim(), messageType: "text", senderType: user?.userType }); 
                setMessage(""); 
              }}
            >
              <Send size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { flex: 1 },
  dateSeparator: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginVertical: 16 },
  dateSeparatorText: { fontSize: 12, color: 'rgba(0,0,0,0.5)', fontWeight: '600' },
  msgWrapper: { marginBottom: 12, maxWidth: '85%' },
  myMsgWrapper: { alignSelf: 'flex-end' },
  theirMsgWrapper: { alignSelf: 'flex-start' },
  bubble: { padding: 10, paddingHorizontal: 14, borderRadius: 16, minWidth: 80 },
  myBubble: { backgroundColor: '#16A34A', borderTopRightRadius: 4 },
  theirBubble: { borderTopLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  requestBanner: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 6, marginBottom: 8, gap: 6 },
  requestBannerText: { fontSize: 12, fontWeight: 'bold' },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#FFF' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { fontSize: 10 },
  myMsgTime: { color: 'rgba(255,255,255,0.8)' },
  bottomArea: { borderTopWidth: 1 },
  qtyDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  qtyInputContainer: { flex: 1, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between' },
  qtyInputText: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter-Bold' },
  qtyUnitText: { fontSize: 14, fontWeight: '600' },
  modeToggle: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  numpadBtn: { width: (width - 48) / 3, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  numpadBtnText: { fontSize: 20, fontWeight: '600' },
  panelActions: { flexDirection: 'row', gap: 8 },
  panelSmallActionBtn: { paddingHorizontal: 10, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  panelSmallActionBtnText: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 },
  panelSubBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  panelSubBtnText: { fontSize: 12, fontWeight: '700', color: '#9333EA' },
  panelSendBtn: { flex: 1.5, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  panelSendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  quickOrderBtn: { padding: 10, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  quickOrderBtnText: { fontSize: 13, fontWeight: '700' },
  autoSendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  autoSendAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniSwitch: { width: 34, height: 20, borderRadius: 10, padding: 2 },
  miniSwitchThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFF' },
  autoSendText: { fontSize: 13, fontWeight: '500' },
  timeSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timeText: { fontSize: 13, fontWeight: '600' },
  freqTabs: { flexDirection: 'row', gap: 4 },
  freqTab: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#DDD' },
  freqTabText: { fontSize: 11, fontWeight: '700', color: '#666' },
  subDetailPanel: { marginTop: 12, padding: 16, borderRadius: 12 },
  subDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subDetailTitle: { fontSize: 15, fontWeight: '700' },
  dayPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 12, fontWeight: '600' },
  subConfirmBtn: { height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  subConfirmBtnText: { color: '#FFF', fontWeight: 'bold' },
  subBar: { padding: 12, borderTopWidth: 1 },
  subBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subBarText: { flex: 1, fontSize: 13, fontWeight: '600' },
  subList: { maxHeight: 150, marginTop: 8 },
  subItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  subItemTitle: { fontSize: 14, fontWeight: '600' },
  subItemFreq: { fontSize: 11, color: '#666' },
  subActions: { flexDirection: 'row', alignItems: 'center' },
  modeReturnBtn: { padding: 8, marginRight: 4 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, gap: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#16A34A' },
  tabText: { fontSize: 14, fontWeight: '600' },
  orderPanel: { padding: 16 },
  productStrip: { marginBottom: 16 },
  productChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  productChipText: { fontSize: 14 },
  placeOrderBtn: { backgroundColor: '#16A34A', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  textInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  billMsgCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 200,
  },
  billMsgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  billMsgTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  billMsgText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  billPayBtn: {
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billPayBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

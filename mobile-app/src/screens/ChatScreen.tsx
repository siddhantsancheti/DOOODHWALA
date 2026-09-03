import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Dimensions,
  Modal, FlatList, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  ArrowLeft, Send, Package, MessageSquare,
  Clock, Check, User, Truck, X, Plus, Minus,
  MoreVertical, Phone, ShoppingCart, Users,
  IndianRupee, Receipt, Share, Camera, File, MapPin, BarChart3, Settings, CheckCheck, Mic, FileText,
  Image as ImageIcon, Download, Flag
, Edit3 as Edit} from 'lucide-react-native';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';
import { Language } from '../lib/translations';
import { uploadChatMedia, pickFromCamera, pickFromGallery, pickDocument, getLocationLink } from '../lib/chatMedia';
import { downloadBillPdf } from '../lib/billPdf';

const { width, height } = Dimensions.get('window');

// Reasons a delivered order can be reported. Short and concrete — a free-text
// box alone gets "problem" and nothing actionable.
const REPORT_REASONS: { key: string; label: string }[] = [
  { key: 'didnt_arrive', label: 'reasonDidntArrive' },
  { key: 'quantity',     label: 'reasonQuantity' },
  { key: 'quality',      label: 'reasonQuality' },
  { key: 'wrong_item',   label: 'reasonWrongItem' },
  { key: 'other',        label: 'reasonOther' },
];

// Format date helper
const getDateLabel = (date: Date, t: any) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return t('today');
  if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function ChatScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { t, language, setLanguage, fontFamily, fontFamilyBold, colors, isDark } = useTranslation();

  const styles = useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const { customerId, milkmanId, initialMode = 'message' } = route.params;

  const [message, setMessage] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<Array<{ product: string, quantity: number, price: number }>>([]);
  const [mode, setMode] = useState<'message' | 'order'>(initialMode);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Modals
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const isMilkman = user?.userType === 'milkman';
  // The delivered order a problem is being reported against, or null.
  const [reportFor, setReportFor] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportSending, setReportSending] = useState(false);

  // Services this customer orders, with the price that applies to them. Only
  // loaded for the milkman — the endpoint is scoped to their own customers.
  const { data: services, isLoading: servicesLoading } = useQuery<any>({
    queryKey: [`/api/customer-pricings/customer/${customerId}`],
    enabled: showGroupInfo && isMilkman && !!customerId,
  });

  const savePriceMutation = useMutation({
    mutationFn: async ({ product, price }: { product: string; price: string }) => {
      const res = await apiRequest({
        url: '/api/customer-pricings',
        method: 'POST',
        body: { customerId: Number(customerId), productName: product, pricePerLiter: price },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customer-pricings/customer/${customerId}`] });
      // The server posts the price-change notice into the chat, so refresh it.
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', customerId, milkmanId] });
      setEditingService(null);
    },
    onError: (e: any) => Alert.alert(t('error'), e?.message || 'Could not update the price'),
  });

  const savePrice = (product: string) => {
    const price = parseFloat(priceDraft);
    if (!(price > 0)) {
      Alert.alert(t('error'), t('enterValidPrice'));
      return;
    }
    savePriceMutation.mutate({ product, price: priceDraft });
  };
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMonthlyOrders, setShowMonthlyOrders] = useState(false);
  const [showBillSummary, setShowBillSummary] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const { isConnected, sendMessage: sendWSMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  // Queries
  const { data: customer } = useQuery<any>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: !!customerId,
  });

  const { data: milkman } = useQuery<any>({
    queryKey: [`/api/milkmen/${milkmanId}`],
    enabled: !!milkmanId,
  });

  const { data: groupMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/group/${milkmanId}`],
    enabled: !!milkmanId,
  });

  const { data: history = [], isLoading: isHistoryLoading } = useQuery<any[]>({
    queryKey: [`/api/chat/group/${milkmanId}`],
    enabled: !!milkmanId,
    // Poll as a fallback so messages still arrive even if the WebSocket drops.
    refetchInterval: 4000,
  });

  // Current Bill
  const { data: currentBill } = useQuery<any>({
    queryKey: [`/api/bills/current`],
    enabled: !!customerId,
  });

  useEffect(() => {
    if (history.length > 0) {
      setChatMessages(history);
    }
  }, [history]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      // Invalidate query to get rich object with items mapping correctly and DB IDs
      if (['new_message', 'message_sent', 'order_accepted', 'order_delivered'].includes(data.type)) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
        if (data.type === 'order_accepted' || data.type === 'order_delivered') {
          queryClient.invalidateQueries({ queryKey: [`/api/bills/current`] });
        }
      }
    };
    addMessageHandler('chat-screen', handleNewMessage);
    return () => removeMessageHandler('chat-screen');
  }, [customerId, milkmanId, addMessageHandler, removeMessageHandler]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest({ url: "/api/chat/send", method: "POST", body: messageData });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
      if (data.messageType === 'order') {
        queryClient.invalidateQueries({ queryKey: [`/api/bills/current`] });
      }
      sendWSMessage(customerId, milkmanId, data.message, (user?.userType as 'customer' | 'milkman') || 'customer');
    },
    onError: (error: any) => Alert.alert("Error", error.message || "Failed to send message"),
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest({ url: `/api/chat/messages/${messageId}/accepted`, method: "POST" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest({ url: `/api/chat/messages/${messageId}/delivered`, method: "POST" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
    },
  });

  const generateConsolidatedBillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({ url: `/api/bills/consolidated/${milkmanId}/generate`, method: "POST" });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bills/consolidated/${milkmanId}`] });
      Alert.alert("Consolidated Bill Generated", "Bill generated for all group members. Any member can pay it.");
    },
    onError: (error: any) => Alert.alert("Error", error.message || "Failed to generate bill"),
  });

  const getRequestedProducts = () => {
    if (!milkman?.dairyItems) return [];
    return milkman.dairyItems.filter((item: any) => item.isAvailable !== false);
  };
  const availableProducts = getRequestedProducts();

  // Selected product sync
  useEffect(() => {
    if (availableProducts.length > 0 && !selectedProduct) {
      setSelectedProduct(availableProducts[0]);
    }
  }, [availableProducts, selectedProduct]);

  // Actions
  const handleAddToCart = () => {
    if (!selectedProduct || !orderQuantity) return;
    
    // Attempt parse
    const qtyNum = parseFloat(orderQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const existingIndex = orderItems.findIndex(i => i.product === selectedProduct.name);
    if (existingIndex >= 0) {
      const newItems = [...orderItems];
      newItems[existingIndex].quantity += qtyNum;
      setOrderItems(newItems);
    } else {
      setOrderItems([...orderItems, {
        product: selectedProduct.name,
        quantity: qtyNum,
        price: parseFloat(selectedProduct.price || "0")
      }]);
    }
    setOrderQuantity("1");
  };

  const handlePlaceOrder = () => {
    let finalOrderItems = [...orderItems];
    
    // If empty cart but selection active
    if (finalOrderItems.length === 0 && selectedProduct) {
      const qtyNum = parseFloat(orderQuantity);
      if (!isNaN(qtyNum) && qtyNum > 0) {
        finalOrderItems.push({
          product: selectedProduct.name,
          quantity: qtyNum,
          price: parseFloat(selectedProduct.price || "0")
        });
      }
    }

    if (finalOrderItems.length === 0) return;

    const orderSummary = finalOrderItems.map(item => `${item.quantity} ${item.product} (₹${item.price} each)`).join(', ');
    const totalAmount = finalOrderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    sendMessageMutation.mutate({
      customerId: customerId,
      milkmanId: milkmanId,
      message: `${t('orderRequest')}: ${orderSummary}`,
      messageType: "order",
      orderProduct: finalOrderItems.map(i => i.product).join(', '),
      orderQuantity: finalOrderItems.reduce((sum, i) => sum + i.quantity, 0),
      orderTotal: totalAmount,
      orderItems: finalOrderItems,
      senderType: user?.userType,
    });

    setOrderItems([]);
    setMode('message');
    setMessage("");
  };

  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Pick (camera/gallery/document) → upload to Firebase Storage → send as a chat message.
  const handleShareMedia = async (kind: 'camera' | 'gallery' | 'document') => {
    setShowShareMenu(false);
    try {
      const media = kind === 'camera' ? await pickFromCamera()
        : kind === 'gallery' ? await pickFromGallery()
        : await pickDocument();
      if (!media) return;
      setUploadingMedia(true);
      const url = await uploadChatMedia(media);
      sendMessageMutation.mutate({
        customerId,
        milkmanId,
        message: url,
        messageType: media.kind, // 'image' | 'file'
        senderType: user?.userType,
      });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', 'Could not share the file. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleShareLocation = async () => {
    setShowShareMenu(false);
    try {
      const link = await getLocationLink();
      if (!link) return;
      sendMessageMutation.mutate({
        customerId,
        milkmanId,
        message: `📍 My location: ${link}`,
        messageType: 'text',
        senderType: user?.userType,
      });
    } catch {
      Alert.alert(t('error') || 'Error', 'Could not get your location.');
    }
  };

  const submitReport = async () => {
    if (!reportFor || !reportReason || reportSending) return;
    setReportSending(true);
    try {
      await apiRequest({
        url: `/api/chat/messages/${reportFor.id}/report`,
        method: 'POST',
        body: { reason: reportReason, note: reportNote.trim() || undefined },
      });
      // The report lands in this same conversation, so refreshing it is enough
      // to show what was sent — the customer sees exactly what the dairyman got.
      queryClient.invalidateQueries({ queryKey: [`/api/chat/group/${milkmanId}`] });
      setReportFor(null);
      setReportReason(null);
      setReportNote('');
    } catch (e: any) {
      Alert.alert(t('reportProblem'), e?.message || 'Could not send the report. Please try again.');
    } finally {
      setReportSending(false);
    }
  };

  const handleSendText = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({
      customerId: customerId,
      milkmanId: milkmanId,
      message: message.trim(),
      messageType: "text",
      senderType: user?.userType,
    });
    setMessage("");
  };

  const scrollToEnd = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Rendering Helpers
  const renderMessageStatus = (msg: any, isMe: boolean) => {
    if (!isMe) return null;
    if (msg.isDelivered) {
      return (
        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
          <Check size={12} color="#7FA5DA" /><Check size={12} color="#7FA5DA" style={{ marginLeft: -6 }} /><Check size={12} color="#7FA5DA" style={{ marginLeft: -6 }} />
        </View>
      );
    } else if (msg.isAccepted) {
      return (
        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
          <Check size={12} color="#A6C2E8" /><Check size={12} color="#A6C2E8" style={{ marginLeft: -6 }} />
        </View>
      );
    }
    return <Check size={12} color={isDark ? "#D5C8B5" : "#A99B89"} style={{ marginLeft: 4 }} />;
  };

  const otherPersonName = user?.userType === 'customer' 
    ? (milkman?.businessName || milkman?.contactName || "Milkman")
    : (customer?.name || milkman?.businessName || "Group Chat");

  const surfaceColor = colors.card;
  const textColor = colors.foreground;
  const textMuted = colors.mutedForeground;
  const borderColor = colors.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.success }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerInfo} onPress={() => setShowGroupInfo(true)}>
            <View style={styles.avatar}>
              <User size={20} color="#2F7D5B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>{otherPersonName}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {groupMembers.slice(0, 2).map((m:any) => m.name).join(', ')}
                {groupMembers.length > 2 ? ` +${groupMembers.length - 2}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Header Actions row just like web */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.headerActionsList}>
          {user?.userType === 'customer' && currentBill && (
             <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowBillSummary(true)}>
               <IndianRupee size={14} color="#FFFFFF" />
               <Text style={styles.headerActionText}>₹{Math.round(currentBill.totalAmount)}</Text>
             </TouchableOpacity>
          )}

          {user?.userType === 'milkman' && (
             <TouchableOpacity style={styles.headerActionBtn} onPress={() => generateConsolidatedBillMutation.mutate()}>
               <FileText size={14} color="#FFFFFF" />
               <Text style={styles.headerActionText}>{t('invoice')}</Text>
             </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowMonthlyOrders(true)}>
            <Package size={14} color="#FFFFFF" />
            <Text style={styles.headerActionText}>{t('orders')}</Text>
          </TouchableOpacity>

          {user?.userType === 'milkman' && (
             <TouchableOpacity style={styles.headerActionBtn} onPress={() => Alert.alert(t('manage'), "Group management via web sync")}>
               <Settings size={14} color="#FFFFFF" />
               <Text style={styles.headerActionText}>{t('manage')}</Text>
             </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowShareMenu(true)}>
            <Share size={14} color="#FFFFFF" />
            <Text style={styles.headerActionText}>{t('share')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Android needs "padding" too since SDK 55.
          Android 15 enforces edge-to-edge, which stops adjustResize from
          resizing the window — so leaving behavior undefined meant the
          composer stayed put under the keyboard and you could not see what
          you were typing. */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        {/* MESSAGES LIST */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={scrollToEnd}
        >
          {chatMessages.map((msg, idx) => {
            const isMe = msg.senderType === user?.userType && 
              (user?.userType === 'milkman' ? msg.milkmanId === Number(milkmanId) : msg.customerId === Number(customerId));
            
            // Date separator
            const msgDate = new Date(msg.createdAt);
            const prevMsgDate = idx > 0 ? new Date(chatMessages[idx-1].createdAt) : null;
            const isNewDay = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

            const isOrder = msg.messageType === 'order';
            const isBill = msg.messageType === 'bill';
            const isImage = msg.messageType === 'image';
            const isFile = msg.messageType === 'file';

            return (
              <View key={msg.id || idx}>
                {isNewDay && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>{getDateLabel(msgDate, t)}</Text>
                  </View>
                )}
                <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
                  <View style={[styles.bubble, isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: surfaceColor }]]}>
                    
                    {!isMe && (
                       <Text style={[styles.senderName, { color: '#7FA5DA' }]}>
                         {msg.senderType === 'milkman' ? milkman?.businessName : groupMembers.find((m:any) => m.id === msg.customerId)?.name || 'Customer'}
                       </Text>
                    )}

                    {isOrder && (
                      <View style={[styles.requestBanner, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(249,115,22,0.1)' }]}>
                        <Package size={14} color={isMe ? '#FFFFFF' : '#EA580C'} />
                        <Text style={[styles.requestBannerText, { color: isMe ? '#FFFFFF' : '#EA580C' }]}>{t('orderRequest')}</Text>
                      </View>
                    )}

                    {/* A delivered order can be reported on. Only after
                        delivery — before that, "where is it?" is an ordinary
                        message — and only by the customer, since the dairyman
                        reporting his own delivery makes no sense. Clause 7.3 of
                        the terms promises this route exists. */}
                    {isOrder && msg.isDelivered && !isMilkman && (
                      <TouchableOpacity
                        onPress={() => setReportFor(msg)}
                        style={styles.reportLink}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                      >
                        <Flag size={12} color={isMe ? 'rgba(255,255,255,0.85)' : '#A8322D'} />
                        <Text style={[styles.reportLinkText, { color: isMe ? 'rgba(255,255,255,0.85)' : '#A8322D' }]}>
                          {t('reportProblem')}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isBill && (
                      <View style={[styles.billCard, { backgroundColor: isDark ? '#332C25' : '#F0E9DE' }]}>
                        <View style={styles.billCardHead}>
                          <Receipt size={16} color="#2F7D5B" />
                          <Text style={styles.billCardTitle}>{t('invoice')}</Text>
                        </View>
                        <Text style={{ fontSize: 14, color: textColor, marginVertical: 4 }}>{t('amount')}: ₹{msg.orderTotal}</Text>
                        <Text style={{ fontSize: 12, color: textMuted }}>For latest unbilled orders.</Text>

                        {/* The full bill, as a PDF the customer keeps. The card
                            shows a single figure; the document behind it breaks
                            out the platform fee, which clause 8.7 of the terms
                            requires be visible before payment. */}
                        {!!msg.billId && (
                          <TouchableOpacity
                            onPress={() => downloadBillPdf(msg.billId)}
                            style={styles.billDownload}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={t('downloadBill')}
                          >
                            <Download size={14} color="#2F7D5B" />
                            <Text style={styles.billDownloadText}>{t('downloadBill')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Image attachment */}
                    {isImage && (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(msg.message)}>
                        <Image source={{ uri: msg.message }} style={{ width: 200, height: 200, borderRadius: 10, marginBottom: 4 }} resizeMode="cover" />
                      </TouchableOpacity>
                    )}

                    {/* File attachment */}
                    {isFile && (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                        onPress={() => Linking.openURL(msg.message)}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : (isDark ? '#332C25' : '#E6DCCD'), justifyContent: 'center', alignItems: 'center' }}>
                          <FileText size={18} color={isMe ? '#FFFFFF' : '#7FA5DA'} />
                        </View>
                        <Text style={[{ flex: 1, fontSize: 14, textDecorationLine: 'underline' }, isMe ? { color: '#FFFFFF' } : { color: textColor }]} numberOfLines={1}>
                          {decodeURIComponent((msg.message.split('/').pop() || 'file').split('?')[0].replace(/^\d+-\d+-/, ''))}
                        </Text>
                        <Download size={16} color={isMe ? '#FFFFFF' : textMuted} />
                      </TouchableOpacity>
                    )}

                    {/* Text content */}
                    {!isBill && !isImage && !isFile && (
                       <Text style={[styles.msgText, isMe ? styles.myMsgText : { color: textColor }]}>
                         {msg.message}
                       </Text>
                    )}

                    {/* Order Details list */}
                    {isOrder && msg.orderItems && msg.orderItems.length > 0 && (
                      <View style={[styles.orderItemsContainer, { borderColor: isMe ? 'rgba(255,255,255,0.3)' : borderColor }]}>
                        {msg.orderItems.map((item:any, itemIdx: number) => (
                           <View key={itemIdx} style={styles.orderItemRow}>
                             <Text style={[styles.orderItemText, { color: isMe ? '#FFFFFF' : textColor }]}>{item.quantity} x {item.product}</Text>
                             <Text style={[styles.orderItemPrice, { color: isMe ? '#FFFFFF' : textColor }]}>₹{item.price * item.quantity}</Text>
                           </View>
                        ))}
                        <View style={[styles.orderTotalRow, { borderTopColor: isMe ? 'rgba(255,255,255,0.3)' : borderColor }]}>
                           <Text style={[styles.orderTotalLabel, { color: isMe ? '#FFFFFF' : textColor }]}>Total</Text>
                           <Text style={[styles.orderTotalAmount, { color: isMe ? '#FFFFFF' : '#2F7D5B' }]}>₹{msg.orderTotal}</Text>
                        </View>
                      </View>
                    )}

                    {/* Order Actions */}
                    {isOrder && !isMe && user?.userType === 'milkman' && (
                        <View style={styles.orderActions}>
                          {!msg.isAccepted ? (
                            <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: '#7FA5DA' }]} onPress={() => acceptOrderMutation.mutate(msg.id)}>
                              <Check size={14} color="#FFF" />
                              <Text style={styles.orderActionBtnText}>{t('acceptOrder')}</Text>
                            </TouchableOpacity>
                          ) : !msg.isDelivered ? (
                            <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.success }]} onPress={() => markDeliveredMutation.mutate(msg.id)}>
                              <CheckCheck size={14} color="#FFF" />
                              <Text style={styles.orderActionBtnText}>{t('markDelivered')}</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.deliveredBadge}>
                              <Text style={styles.deliveredBadgeText}>✅ {t('delivered')}</Text>
                            </View>
                          )}
                        </View>
                    )}

                    <View style={styles.msgFooter}>
                      <Text style={[styles.msgTime, isMe ? styles.myMsgTime : { color: textMuted }]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {renderMessageStatus(msg, isMe)}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* BOTTOM AREA */}
        <View style={[styles.bottomArea, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
          {/* Tabs */}
          <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
            <TouchableOpacity style={[styles.tab, mode === 'message' && styles.activeTab]} onPress={() => setMode('message')}>
              <MessageSquare size={16} color={mode === 'message' ? '#2F7D5B' : textMuted} />
              <Text style={[styles.tabText, mode === 'message' && { color: colors.success }]}>{t('message')}</Text>
            </TouchableOpacity>
            {user?.userType === 'customer' && (
              <TouchableOpacity style={[styles.tab, mode === 'order' && styles.activeTab]} onPress={() => setMode('order')}>
                <ShoppingCart size={16} color={mode === 'order' ? '#2F7D5B' : textMuted} />
                <Text style={[styles.tabText, mode === 'order' && { color: colors.success }]}>{t('order')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {mode === 'order' && user?.userType === 'customer' ? (
             <View style={styles.orderPanel}>
               {/* Cart Summary */}
               {orderItems.length > 0 && (
                 <View style={[styles.cartSummary, { backgroundColor: isDark ? '#1A1714' : '#F0E9DE' }]}>
                   <Text style={[styles.cartTitle, { color: textColor }]}>Cart ({orderItems.length} items)</Text>
                   {orderItems.map((item, idx) => (
                     <View key={idx} style={styles.cartItemRow}>
                       <Text style={{ color: textMuted, fontSize: 12 }}>{item.quantity} x {item.product}</Text>
                       <TouchableOpacity onPress={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
                         <X size={14} color="#C0453B" />
                       </TouchableOpacity>
                     </View>
                   ))}
                   <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: borderColor, flexDirection: 'row', justifyContent: 'space-between' }}>
                     <Text style={{ fontWeight: 'bold', color: textColor }}>Total</Text>
                     <Text style={{ fontWeight: 'bold', color: colors.success }}>₹{orderItems.reduce((s, i) => s + i.price * i.quantity, 0)}</Text>
                   </View>
                 </View>
               )}

               <View style={styles.productStrip}>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                   {availableProducts.map((item: any, idx: number) => (
                     <TouchableOpacity 
                       key={idx} 
                       style={[
                         styles.productChip, 
                         { backgroundColor: isDark ? '#332C25' : '#F0E9DE', borderColor },
                         selectedProduct?.name === item.name && { backgroundColor: colors.success, borderColor: colors.success }
                       ]}
                       onPress={() => setSelectedProduct(item)}
                     >
                       <Text style={[
                         styles.productChipText, 
                         { color: textColor },
                         selectedProduct?.name === item.name && { color: '#FFF', fontWeight: 'bold' }
                       ]}>
                         {item.name}
                       </Text>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
               </View>

               <View style={styles.qtyRow}>
                 <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: isDark ? '#332C25' : '#E6DCCD' }]} onPress={() => {
                   const qty = parseFloat(orderQuantity);
                   if (qty > 1) setOrderQuantity((qty - 1).toString());
                 }}>
                   <Minus size={20} color={textColor} />
                 </TouchableOpacity>
                 <TextInput 
                   style={[styles.qtyInput, { color: textColor, borderColor }]}
                   keyboardType="decimal-pad"
                   value={orderQuantity}
                   onChangeText={setOrderQuantity}
                 />
                 <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: isDark ? '#332C25' : '#E6DCCD' }]} onPress={() => {
                   const qty = parseFloat(orderQuantity || "0");
                   setOrderQuantity((qty + 1).toString());
                 }}>
                   <Plus size={20} color={textColor} />
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.addCartBtn} onPress={handleAddToCart}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{t('addToOrder')}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.placeOrderBtn, orderItems.length === 0 && !selectedProduct && { opacity: 0.5 }]} 
                  onPress={handlePlaceOrder}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{t('sendOrder')}</Text>
                </TouchableOpacity>
             </View>
          ) : (
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachBtn} onPress={() => setShowShareMenu(true)} disabled={uploadingMedia}>
                {uploadingMedia ? <ActivityIndicator size="small" color={textMuted} /> : <Plus size={24} color={textMuted} />}
              </TouchableOpacity>
              <TextInput 
                style={[styles.textInput, { backgroundColor: isDark ? '#332C25' : '#F0E9DE', color: textColor }]}
                placeholder={t('message')}
                placeholderTextColor={textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
              />
              {message.trim() ? (
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendText}>
                  <Send size={18} color="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.success }]} onPress={() => Alert.alert(t('voiceMessage'), "Voice messages require microphone permissions and library installation on mobile. For now, text your dairyman.")}>
                  <Mic size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

      {/* Report a problem — a short sheet, not a form. Someone whose milk did
          not arrive is annoyed already; five taps is the whole budget. */}
      <Modal visible={!!reportFor} transparent animationType="slide" onRequestClose={() => setReportFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: surfaceColor }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>{t('reportProblem')}</Text>
            <Text style={[styles.sheetSub, { color: textMuted }]} numberOfLines={2}>
              {reportFor?.orderProduct || t('order')}
              {reportFor?.orderQuantity ? ` · ${reportFor.orderQuantity}` : ''}
            </Text>

            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.reasonRow,
                  { borderColor },
                  reportReason === r.key && { borderColor: colors.primary, backgroundColor: isDark ? '#1B2634' : '#E7EDF6' },
                ]}
                onPress={() => setReportReason(r.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, { borderColor: reportReason === r.key ? colors.primary : borderColor }]}>
                  {reportReason === r.key && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.reasonText, { color: textColor }]}>{t(r.label)}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[styles.reportNote, { color: textColor, borderColor, backgroundColor: isDark ? '#1A1714' : '#F7F3EC' }]}
              placeholder={t('addDetailsOptional')}
              placeholderTextColor={textMuted}
              value={reportNote}
              onChangeText={setReportNote}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[styles.reportSend, { backgroundColor: colors.primary }, (!reportReason || reportSending) && { opacity: 0.5 }]}
              onPress={submitReport}
              disabled={!reportReason || reportSending}
              activeOpacity={0.85}
            >
              <Text style={styles.reportSendText}>
                {reportSending ? t('sending') : t('sendReport')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setReportFor(null)} style={{ paddingVertical: 10 }} activeOpacity={0.7}>
              <Text style={[styles.sheetCancel, { color: textMuted }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      </KeyboardAvoidingView>

      {/* MODALS */}
      {/* Group Info Modal */}
      <Modal visible={showGroupInfo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{t('groupInfo')}</Text>
              <TouchableOpacity onPress={() => setShowGroupInfo(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            <ScrollView>
               <View style={styles.groupInfoHero}>
                 <View style={styles.groupAvatarHero}>
                   <Users size={32} color="#2F7D5B" />
                 </View>
                 <Text style={[styles.groupNameHero, { color: textColor }]}>{milkman?.businessName}</Text>
                  <Text style={{ color: textMuted }}>Group • {groupMembers.length} {t('members')}</Text>
               </View>
               <Text style={[styles.sectionTitleModal, { color: textColor }]}>{t('members')}</Text>
               <View style={{ marginTop: 8 }}>
                 {groupMembers.map((m:any) => (
                   <View key={m.id} style={styles.modalMemberRow}>
                     <View style={styles.modalMemberAvatar}><User size={16} color="#7FA5DA" /></View>
                     <View>
                       <Text style={{ fontWeight: '600', color: textColor }}>{m.name} {m.id === Number(customerId) ? '(You)' : ''}</Text>
                       <Text style={{ fontSize: 12, color: textMuted }}>{m.phone}</Text>
                     </View>
                   </View>
                 ))}
               </View>

               {/* Services opted — what this customer actually orders, with the
                   price that applies to them. The milkman can change a price
                   here; the customer sees the same list read-only. */}
               <Text style={[styles.sectionTitleModal, { color: textColor, marginTop: 20 }]}>
                 {t('servicesOpted')}
               </Text>
               {servicesLoading ? (
                 <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
               ) : (services?.services?.length ?? 0) === 0 ? (
                 <Text style={{ color: textMuted, marginTop: 8 }}>{t('noServicesYet')}</Text>
               ) : (
                 <View style={{ marginTop: 8 }}>
                   {services.services.map((svc: any) => {
                     const editing = editingService === svc.product;
                     return (
                       <View key={svc.product} style={styles.svcRow}>
                         <View style={styles.svcText}>
                           <Text style={[styles.svcName, { color: textColor }]} numberOfLines={1}>
                             {svc.product}
                           </Text>
                           <Text style={{ fontSize: 12, color: textMuted }} numberOfLines={1}>
                             {svc.opted ? t('ordering') : t('notOrdering')}
                             {svc.isCustom ? ` · ${t('customPrice')}` : ''}
                           </Text>
                         </View>

                         {editing ? (
                           <View style={styles.svcEditRow}>
                             <TextInput
                               style={[styles.svcInput, { color: textColor, borderColor }]}
                               value={priceDraft}
                               onChangeText={(v) => setPriceDraft(v.replace(/[^0-9.]/g, ''))}
                               keyboardType="decimal-pad"
                               autoFocus
                               placeholder={String(svc.listPrice)}
                               placeholderTextColor={textMuted}
                             />
                             <TouchableOpacity
                               style={[styles.svcSaveBtn, { backgroundColor: colors.primary }]}
                               onPress={() => savePrice(svc.product)}
                               disabled={savePriceMutation.isPending}
                             >
                               {savePriceMutation.isPending
                                 ? <ActivityIndicator size="small" color="#FFF" />
                                 : <Check size={16} color="#FFF" />}
                             </TouchableOpacity>
                             <TouchableOpacity onPress={() => setEditingService(null)} hitSlop={8}>
                               <X size={18} color={textMuted} />
                             </TouchableOpacity>
                           </View>
                         ) : (
                           <View style={styles.svcEditRow}>
                             <Text
                               style={[styles.svcPrice, { color: svc.isCustom ? colors.primary : textColor }]}
                               numberOfLines={1}
                             >
                               ₹{svc.effectivePrice}/{svc.unit}
                             </Text>
                             {isMilkman && (
                               <TouchableOpacity
                                 onPress={() => {
                                   setEditingService(svc.product);
                                   setPriceDraft(String(svc.effectivePrice));
                                 }}
                                 hitSlop={8}
                               >
                                 <Edit size={16} color={colors.primary} />
                               </TouchableOpacity>
                             )}
                           </View>
                         )}
                       </View>
                     );
                   })}
                 </View>
               )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Share Menu Modal */}
      <Modal visible={showShareMenu} animationType="fade" transparent>
        <TouchableOpacity style={styles.overlayClose} onPress={() => setShowShareMenu(false)} activeOpacity={1}>
          <View style={[styles.shareMenu, { backgroundColor: surfaceColor }]}>
            <View style={styles.shareGrid}>
              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareMedia('camera')}>
                <View style={[styles.shareIconBox, { backgroundColor: colors.primary }]}><Camera size={24} color="#FFF" /></View>
                <Text style={[styles.shareText, { color: textColor }]}>{t('camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareMedia('gallery')}>
                <View style={[styles.shareIconBox, { backgroundColor: '#B0563C' }]}><ImageIcon size={24} color="#FFF" /></View>
                <Text style={[styles.shareText, { color: textColor }]}>{t('gallery') || 'Gallery'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareMedia('document')}>
                <View style={[styles.shareIconBox, { backgroundColor: '#7FA5DA' }]}><File size={24} color="#FFF" /></View>
                <Text style={[styles.shareText, { color: textColor }]}>{t('document')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareItem} onPress={handleShareLocation}>
                <View style={[styles.shareIconBox, { backgroundColor: colors.destructive }]}><MapPin size={24} color="#FFF" /></View>
                <Text style={[styles.shareText, { color: textColor }]}>{t('location')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Monthly Orders Modal */}
      <Modal visible={showMonthlyOrders} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{t('monthlyOrders')}</Text>
              <TouchableOpacity onPress={() => setShowMonthlyOrders(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
               <BarChart3 size={48} color={textMuted} style={{ marginBottom: 16 }} />
               <Text style={{ color: textMuted, textAlign: 'center' }}>Detailed monthly analytics charts will appear here. Syncing with web dashboard.</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bill Summary Modal */}
      <Modal visible={showBillSummary} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor, padding: 24, paddingVertical: 32 }]}>
            <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: textColor, marginBottom: 8 }}>₹{currentBill?.totalAmount}</Text>
            <Text style={{ textAlign: 'center', color: textMuted, marginBottom: 24 }}>{t('unpaidBalance')}</Text>
            
            <View style={{ backgroundColor: isDark ? '#332C25' : '#F0E9DE', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                 <Text style={{ color: textColor }}>Month</Text>
                 <Text style={{ color: textColor, fontWeight: 'bold' }}>{currentBill?.billMonth}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Text style={{ color: textColor }}>{t('ordersIncluded')}</Text>
                 <Text style={{ color: textColor, fontWeight: 'bold' }}>{currentBill?.totalOrders}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={{ backgroundColor: colors.success, padding: 16, borderRadius: 12, alignItems: 'center' }} onPress={() => { setShowBillSummary(false); navigation.navigate('Checkout', { amount: currentBill?.totalAmount }); }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{t('payNow')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 16, alignItems: 'center', marginTop: 8 }} onPress={() => setShowBillSummary(false)}>
              <Text style={{ color: textColor }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerName: { fontSize: 18, fontWeight: 'bold', color: '#FFF', fontFamily: fontFamilyBold },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily },
  
  headerActionsList: { gap: 8 },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  headerActionText: { color: '#FFF', fontSize: 12, fontWeight: '600', fontFamily },
 
  messagesList: { flex: 1 },
  dateSeparator: { alignSelf: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginVertical: 16 },
  dateSeparatorText: { fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontWeight: '600', fontFamily: fontFamilyBold },
  
  msgWrapper: { marginBottom: 12, maxWidth: '85%' },
  myMsgWrapper: { alignSelf: 'flex-end' },
  theirMsgWrapper: { alignSelf: 'flex-start' },
  bubble: { padding: 10, paddingHorizontal: 14, borderRadius: 16, minWidth: 80 },
  myBubble: { backgroundColor: colors.success, borderTopRightRadius: 4 },
  theirBubble: { borderTopLeftRadius: 4, borderWidth: 1, borderColor: isDark ? '#332C25' : '#E6DCCD' },
  
  senderName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4, fontFamily: fontFamilyBold },
  requestBanner: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 6, marginBottom: 8, gap: 6 },
  requestBannerText: { fontSize: 12, fontWeight: 'bold', fontFamily: fontFamilyBold },
  msgText: { fontSize: 15, lineHeight: 20, fontFamily },
  myMsgText: { color: '#FFF' },
  
  orderItemsContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  orderItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderItemText: { fontSize: 14, fontFamily },
  orderItemPrice: { fontSize: 14, fontWeight: '600', fontFamily: fontFamilyBold },
  orderTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1 },
  orderTotalLabel: { fontSize: 14, fontWeight: 'bold', fontFamily: fontFamilyBold },
  orderTotalAmount: { fontSize: 16, fontWeight: 'bold', fontFamily: fontFamilyBold },
  
  orderActions: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 12 },
  orderActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, gap: 6 },
  orderActionBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', fontFamily: fontFamilyBold },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 26 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontFamily: fontFamilyBold, marginBottom: 2 },
  sheetSub: { fontSize: 12, fontFamily, marginBottom: 14 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  reasonText: { fontSize: 14, fontFamily, flex: 1 },
  reportNote: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 64, textAlignVertical: 'top', fontSize: 14, fontFamily, marginTop: 4, marginBottom: 12 },
  reportSend: { borderRadius: 12, padding: 14, alignItems: 'center' },
  reportSendText: { color: '#FFF', fontSize: 15, fontFamily: fontFamilyBold },
  sheetCancel: { textAlign: 'center', fontSize: 14, fontFamily },
  reportLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.35)',
  },
  reportLinkText: { fontSize: 11, fontFamily: fontFamilyBold },
  deliveredBadge: { backgroundColor: 'rgba(22,163,74,0.1)', padding: 8, borderRadius: 8, alignItems: 'center' },
  deliveredBadgeText: { color: colors.success, fontWeight: 'bold', fontSize: 13, fontFamily: fontFamilyBold },
  
  billCard: { padding: 12, borderRadius: 8, marginBottom: 8 },
  billCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  billCardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.success, fontFamily: fontFamilyBold },
  billDownload: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(47,125,91,0.3)',
  },
  billDownloadText: { fontSize: 12, color: '#2F7D5B', fontFamily: fontFamilyBold },
  
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { fontSize: 10, fontFamily },
  myMsgTime: { color: 'rgba(255,255,255,0.8)' },
  
  bottomArea: { borderTopWidth: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, gap: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.success },
  tabText: { fontSize: 14, fontWeight: '600', fontFamily: fontFamilyBold },
  
  orderPanel: { padding: 16 },
  cartSummary: { padding: 12, borderRadius: 8, marginBottom: 12 },
  cartTitle: { fontWeight: 'bold', marginBottom: 8, fontFamily: fontFamilyBold },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  productStrip: { marginBottom: 16 },
  productChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  productChipText: { fontSize: 14, fontFamily },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', fontFamily: fontFamilyBold },
  addCartBtn: { backgroundColor: '#7FA5DA', height: 44, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  placeOrderBtn: { backgroundColor: colors.success, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 12 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  textInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, fontFamily },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: 0 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', fontFamily: fontFamilyBold },
  
  groupInfoHero: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', marginBottom: 16 },
  groupAvatarHero: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(22,163,74,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  groupNameHero: { fontSize: 24, fontWeight: 'bold', marginBottom: 4, fontFamily: fontFamilyBold },
  sectionTitleModal: { fontSize: 16, fontWeight: 'bold', marginTop: 8, fontFamily: fontFamilyBold },
  // Service rows: name column flexes so a long product name shortens itself
  // rather than pushing the price and edit control off the row.
  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  svcText: { flex: 1, minWidth: 0 },
  svcName: { fontSize: 15, fontWeight: '600' },
  svcEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  svcPrice: { fontSize: 15, fontWeight: '700' },
  svcInput: {
    width: 74, height: 36, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, fontSize: 15, textAlign: 'right',
  },
  svcSaveBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalMemberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  modalMemberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  
  overlayClose: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  shareMenu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  shareItem: { width: '22%', alignItems: 'center' },
  shareIconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shareText: { fontSize: 12, fontWeight: '500', fontFamily }
});

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Dimensions, useColorScheme, Platform, TextInput, Linking, Switch, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle, X, Phone, MessageCircle, ChevronRight, TrendingUp, BarChart3, AlertCircle,
  Clock, Send, MessageSquare, Bell, Plus, IndianRupee, Edit, Trash2, Banknote, Receipt, Calendar, Wifi, WifiOff,
  Moon, Sun, Languages, LogOut, Headset, Check, Truck, Settings, User, Navigation, Package, DollarSign, Users, ClipboardList
} from 'lucide-react-native';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTranslation } from '../../contexts/LanguageContext';
import { Language } from '../../lib/translations';

const { width } = Dimensions.get('window');

/**
 * Square dashboard tile. Fixed height with the label pinned to the bottom, so
 * a one-word English label and a wrapped Hindi/Marathi one produce the same
 * tile — the grid stays even whatever the translation does.
 */
function ActionTile({ icon, tint, value, label, caption, badge, badgeColor, onPress, styles }: {
  icon: React.ReactNode;
  tint: string;
  value: string;
  label: string;
  caption?: string;
  badge?: number;
  badgeColor?: string;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: tint }]}>{icon}</View>
        {!!badge && badge > 0 && (
          <View style={[styles.tileBadge, { backgroundColor: badgeColor || '#EF4444' }]}>
            <Text style={styles.tileBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>

      {/* adjustsFontSizeToFit keeps a five-digit rupee total inside the tile
          instead of clipping it. */}
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
      {!!caption && <Text style={styles.tileCaption} numberOfLines={1}>{caption}</Text>}
    </TouchableOpacity>
  );
}

export default function MilkmanDashboardScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { t, language, setLanguage, fontFamily, fontFamilyBold, colors, isDark, themeMode, setThemeMode } = useTranslation();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [quotingServices, setQuotingServices] = useState<any>({});
  const [newProduct, setNewProduct] = useState({ name: "", price: "" });
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);
  const [showCODModal, setShowCODModal] = useState(false);
  const [codOtp, setCodOtp] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedAnalyticsCustomer, setSelectedAnalyticsCustomer] = useState<any>(null);
  const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [localQuantities, setLocalQuantities] = useState<Record<number, string>>({});
  const quantityTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const { logout } = useAuth();

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'English', name: 'English', nativeName: 'English' },
    { code: 'Hindi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'Marathi', name: 'Marathi', nativeName: 'मराठी' }
  ];

  const handleLogout = async () => {
    setShowSettingsDropdown(false);
    await logout();
  };

  // Permanently delete the account + all data (Google Play data-deletion policy).
  const handleDeleteAccount = () => {
    setShowSettingsDropdown(false);
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data (products, orders, bills, chats, customers). This cannot be undone. Continue?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiRequest({ url: '/api/auth/account', method: 'DELETE' });
              const data: any = await res.json();
              if (data?.success) {
                Alert.alert('Account Deleted', 'Your account and data have been removed.', [
                  { text: 'OK', onPress: () => logout() },
                ]);
              } else {
                throw new Error(data?.message || 'Failed to delete account');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete your account. Please try again or email supportdooodhwala@gmail.com.');
            }
          },
        },
      ],
    );
  };

  // One-tap logout with confirmation, used by the direct top-bar button
  const confirmLogout = () => {
    Alert.alert(
      t('logout') || 'Sign Out',
      t('logoutConfirm') || 'Are you sure you want to sign out?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('logout') || 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  // WebSocket for real-time updates
  const { isConnected, addMessageHandler, removeMessageHandler } = useWebSocket();

  useEffect(() => {
    const handler = (data: any) => {
      if (data.type === 'new_message' && data.message?.senderType === 'customer') {
        setHasNewActivity(true);
        queryClient.invalidateQueries({ queryKey: ['/api/orders/milkman'] });
      } else if (data.type === 'new_order') {
        setHasNewActivity(true);
        queryClient.invalidateQueries({ queryKey: ['/api/orders/milkman'] });
      } else if (data.type === 'service_request_update') {
        setHasNewActivity(true);
        queryClient.invalidateQueries({ queryKey: ['/api/service-requests/milkman'] });
      } else if (data.type === 'bill_paid') {
        // A customer just paid a bill — refresh earnings and order/customer views live.
        setHasNewActivity(true);
        queryClient.invalidateQueries({ queryKey: ['/api/orders/milkman'] });
        queryClient.invalidateQueries({ queryKey: ['/api/milkmen/profile'] });
      }
    };
    addMessageHandler('milkman-dashboard', handler);
    return () => removeMessageHandler('milkman-dashboard');
  }, [addMessageHandler, removeMessageHandler]);

  const { data: milkmanProfileData, isLoading: isProfileLoading } = useQuery<any>({
    queryKey: ['/api/milkmen/profile'], enabled: !!user,
  });

  // Sync local quantities from profile
  useEffect(() => {
    if (milkmanProfileData?.dairyItems) {
      const init: Record<number, string> = {};
      milkmanProfileData.dairyItems.forEach((item: any, idx: number) => { init[idx] = String(item.quantity || 0); });
      setLocalQuantities(init);
    } else if (!milkmanProfileData) {
      // Mock for bypass / dev mode
      const init: Record<number, string> = { 0: '40', 1: '15' };
      setLocalQuantities(init);
    }
  }, [milkmanProfileData]);

  const mockMilkmanProfile = useMemo(() => ({
    id: 1,
    businessName: "Dev Dairies",
    contactName: "Dev Milkman",
    pricePerLiter: "65.00",
    isAvailable: true,
    dairyItems: [
      { name: "Buffalo Milk", price: 70, unit: "liter", quantity: 40, isAvailable: true },
      { name: "Cow Milk", price: 60, unit: "liter", quantity: 15, isAvailable: true }
    ]
  }), []);

  const milkmanProfile = milkmanProfileData || mockMilkmanProfile;
  const { data: orders, isLoading: isOrdersLoading } = useQuery<any>({
    queryKey: ['/api/orders/milkman'], enabled: !!milkmanProfile,
  });
  const { data: customers, isLoading: isCustomersLoading } = useQuery<any>({
    queryKey: ['/api/milkmen/customers'], enabled: !!milkmanProfile,
  });

  const { data: serviceRequests = [], isLoading: isSrLoading } = useQuery<any[]>({
    queryKey: ['/api/service-requests/milkman'],
    enabled: !!milkmanProfile,
    refetchInterval: 12000, // live: new enrollment requests appear automatically
  });
  const pendingRequestsCount = serviceRequests.filter((r: any) => r.status === 'pending').length;

  const { data: customerPricings = [] } = useQuery<any[]>({
    queryKey: ["/api/customer-pricings"],
    enabled: !!milkmanProfile?.id,
  });

  // Notifications for the top-bar bell icon (with unread count).
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    enabled: !!milkmanProfile,
    refetchInterval: 30000, // poll every 30s so the badge stays fresh
  });
  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest({ url: '/api/notifications/mark-all-read', method: 'PATCH' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await apiRequest({ url: `/api/orders/${orderId}/status`, method: 'PATCH', body: { status } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/orders/milkman'] }),
    onError: (e: any) => Alert.alert(t('error'), e.message || t('waitTryAgain')),
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      await apiRequest({ url: '/api/milkmen/availability', method: 'PATCH', body: { isAvailable } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/milkmen/profile'] }),
    onError: (e: any) => Alert.alert(t('error'), e.message || t('waitTryAgain')),
  });

  const generateBillsMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await apiRequest({
        url: `/api/bills/generate`,
        method: 'POST',
        body: { customerId, milkmanId: milkmanProfile?.id },
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bills/milkman?milkmanId=${milkmanProfile?.id}`] });
      Alert.alert(t('success'), t('billGeneratedSuccess'));
    },
    onError: (e: any) => Alert.alert(t('error'), e.message || t('waitTryAgain')),
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (dairyItems: any[]) => {
      await apiRequest({ url: '/api/milkmen/products', method: 'PATCH', body: { dairyItems } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milkmen/profile'] });
    },
    onError: (e: any) => Alert.alert(t('error'), e.message || t('waitTryAgain')),
  });

  const provideQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest({
        url: `/api/service-requests/${data.requestId}/quote`,
        method: 'PATCH',
        body: {
          services: data.services,
          notes: data.notes,
        },
      });
      if (!response.ok) throw new Error('Failed to provide quote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      setSelectedRequest(null);
      Alert.alert(t('success'), t('quoteSent'));
    },
  });

  const acceptSrMutation = useMutation({
    mutationFn: async ({ requestId, services }: { requestId: number; services: any[] }) => {
      const res = await apiRequest({
        url: `/api/service-requests/${requestId}/approve`,
        method: 'POST',
        body: { services }
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/customers"] });
      setSelectedRequest(null);
      Alert.alert(t('success'), t('requestAccepted'));
    },
  });

  const rejectSrMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest({
        url: `/api/service-requests/${requestId}/reject`,
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      setSelectedRequest(null);
      Alert.alert(t('success'), t('requestRejected'));
    },
  });

  const addPricingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest({ url: "/api/customer-pricings", method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-pricings"] });
      Alert.alert(t('success'), t('pricingAdded'));
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest({ url: `/api/customer-pricings/${id}`, method: "PUT", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-pricings"] });
      setEditingPricing(null);
      Alert.alert(t('success'), t('pricingUpdated'));
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest({ url: `/api/customer-pricings/${id}`, method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-pricings"] });
      Alert.alert(t('success'), t('pricingDeleted'));
    },
  });

  const { data: codPayments = [], refetch: refetchCODPayments } = useQuery<any[]>({
    queryKey: ["/api/payments/cod/pending", milkmanProfile?.id],
    enabled: !!milkmanProfile?.id,
    refetchInterval: 12000, // live: pending cash payments appear automatically
  });

  const { data: milkmanBills = [] } = useQuery<any[]>({
    queryKey: [`/api/bills/milkman?milkmanId=${milkmanProfile?.id}`],
    enabled: !!milkmanProfile?.id,
  });

  const { data: groupChatMessages = [] } = useQuery<any[]>({
    queryKey: [`/api/chat/group/${milkmanProfile?.id}`],
    enabled: !!milkmanProfile?.id,
  });

  // Debounced inventory update
  const updateQuantityDebounced = (index: number, newQty: number) => {
    if (quantityTimersRef.current[index]) clearTimeout(quantityTimersRef.current[index]);
    quantityTimersRef.current[index] = setTimeout(() => {
      if (milkmanProfile?.dairyItems) {
        const updated = [...milkmanProfile.dairyItems];
        updated[index] = { ...updated[index], quantity: newQty };
        updateInventoryMutation.mutate(updated);
      }
    }, 800);
  };

  // Monthly analytics per customer
  const getCustomerMonthlyAnalytics = (customerId: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const msgs = Array.isArray(groupChatMessages) ? groupChatMessages.filter((m: any) => {
      const d = new Date(m.createdAt);
      return m.customerId === customerId && (m.messageType === 'order' || m.orderQuantity) &&
        d.getFullYear() === year && d.getMonth() === month - 1;
    }) : [];
    let total = 0;
    const byDate: Record<string, number> = {};
    msgs.forEach((m: any) => {
      const qty = parseFloat(m.orderQuantity) || 0;
      const price = parseFloat(milkmanProfile?.pricePerLiter || '0');
      const amt = qty * price;
      total += amt;
      const dateKey = new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      byDate[dateKey] = (byDate[dateKey] || 0) + qty;
    });
    return { total, byDate, orderCount: msgs.length };
  };

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ paymentId, otp }: { paymentId: number; otp: string }) => {
      return await apiRequest({
        url: "/api/payments/cod/verify-otp",
        method: "POST",
        body: { paymentId, otp }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/cod/pending", milkmanProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
      setShowCODModal(false);
      Alert.alert("Success", "COD payment verified successfully");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "OTP verification failed");
    }
  });

  const todaysDateString = useMemo(() => new Date().toDateString(), []);
  const todaysOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o) => {
      if (!o.deliveryDate) return false;
      const orderDateString = new Date(o.deliveryDate).toDateString();
      return orderDateString === todaysDateString;
    });
  }, [orders, todaysDateString]);
  const pendingOrders = useMemo(() => todaysOrders.filter((o) => o.status !== 'delivered'), [todaysOrders]);
  const completedOrders = useMemo(() => todaysOrders.filter((o) => o.status === 'delivered'), [todaysOrders]);
  // What customers still owe — the number the Hisaab tile leads with.
  const pendingBillsTotal = useMemo(() => (
    Array.isArray(milkmanBills)
      ? milkmanBills
          .filter((b: any) => b.status === 'pending')
          .reduce((sum: number, b: any) => sum + parseFloat(b.totalAmount || '0'), 0)
      : 0
  ), [milkmanBills]);
  const todaysEarnings = useMemo(() => completedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0), [completedOrders]);
  const totalCustomersCount = Array.isArray(customers) ? customers.length : 0;
  const progressPerc = todaysOrders.length > 0 ? (completedOrders.length / todaysOrders.length) * 100 : 0;


  const isLoading = isProfileLoading || isOrdersLoading || isCustomersLoading;

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={[styles.loadingText, { color: colors.primary, fontFamily }]}>{t('loadingDashboard')}</Text>
      </View>
    );
  }

  if (!milkmanProfile && !isProfileLoading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Truck size={48} color={isDark ? '#6B7280' : '#D1D5DB'} />
        <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827', fontFamily: fontFamilyBold }]}>{t('profileRequired')}</Text>
        <Text style={[styles.emptySub, { color: isDark ? '#9CA3AF' : '#6B7280', fontFamily }]}>{t('profileSetupRequired')}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MilkmanProfileSetup')} activeOpacity={0.8}>
          <Text style={[styles.primaryBtnText, { fontFamily: fontFamilyBold }]}>{t('setUpProfile')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const surfaceColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#F3F4F6';

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarBox, { backgroundColor: isDark ? '#1E40AF' : '#DBEAFE' }]}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563EB', fontFamily: fontFamilyBold }}>
                {milkmanProfile.businessName?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.greeting, { color: textMuted, fontFamily }]} numberOfLines={1}>{t('welcomeBack')}</Text>
              <Text style={[styles.businessName, { color: textColor, fontFamily: fontFamilyBold }]} numberOfLines={1}>{milkmanProfile.businessName || t('imMilkman')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {/* Notifications */}
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: surfaceColor, borderColor }]}
              onPress={() => setShowNotificationsModal(true)}
            >
              <Bell size={20} color={textMuted} />
              {unreadNotifications > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Settings (contains Language + Logout) */}
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: surfaceColor, borderColor }]}
              onPress={() => setShowSettingsDropdown(true)}
            >
              <Settings size={20} color={showSettingsDropdown ? colors.primary : textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Availability strip — moved below the header so the right-side
            action buttons (notifications / settings / logout) are always
            visible and never pushed off screen by this wider control. */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, backgroundColor: milkmanProfile.isAvailable ? (isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7') : (isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2'), borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isConnected ? <Wifi size={14} color="#16A34A" /> : <WifiOff size={14} color="#9CA3AF" />}
              <Text style={{ fontSize: 13, fontWeight: '700', color: milkmanProfile.isAvailable ? '#16A34A' : '#9CA3AF', fontFamily: fontFamilyBold }}>
                {milkmanProfile.isAvailable ? t('active') : t('disabledLabel')}
              </Text>
            </View>
            <Switch
              value={!!milkmanProfile.isAvailable}
              onValueChange={(v) => updateAvailabilityMutation.mutate(v)}
              trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
              thumbColor={milkmanProfile.isAvailable ? '#16A34A' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Settings Dropdown Modal */}
        <Modal
          visible={showSettingsDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSettingsDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay} 
            activeOpacity={1} 
            onPress={() => {
              setShowSettingsDropdown(false);
              setShowLanguageSubmenu(false);
            }}
          >
            <View style={[styles.dropdownContainer, { backgroundColor: surfaceColor, borderColor }]}>
              {!showLanguageSubmenu ? (
                <>
                  <Text style={[styles.dropdownLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('settings')}</Text>
                  <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />
                  
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      const next = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
                      setThemeMode(next);
                    }}
                  >
                    {isDark ? (
                      <Sun size={18} color={textMuted} style={styles.dropdownIcon} />
                    ) : (
                      <Moon size={18} color={textMuted} style={styles.dropdownIcon} />
                    )}
                    <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>
                      {themeMode === 'light' ? 'Theme: Light' : themeMode === 'dark' ? 'Theme: Dark' : 'Theme: System'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dropdownItem} 
                    onPress={() => setShowLanguageSubmenu(true)}
                  >
                    <View style={styles.dropdownOptionInfo}>
                      <Languages size={18} color={textMuted} />
                      <Text style={[styles.dropdownText, { color: textColor, fontFamily }]}>{t('language')}</Text>
                    </View>
                    <Text style={[styles.dropdownValue, { color: colors.primary, fontFamily }]}>{language}</Text>
                    <ChevronRight size={14} color={textMuted} />
                  </TouchableOpacity>

                  <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />

                  {/* Products and Earnings live here now that the dashboard
                      grid is the five primary actions — reached in one tap
                      from the header rather than competing for a tile. */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowSettingsDropdown(false);
                      setShowInventoryModal(true);
                    }}
                  >
                    <Truck size={18} color={textMuted} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]} numberOfLines={1}>{t('productsPricing')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowSettingsDropdown(false);
                      setShowEarningsModal(true);
                    }}
                  >
                    <IndianRupee size={18} color={textMuted} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]} numberOfLines={1}>{t('todaysEarnings')}</Text>
                  </TouchableOpacity>

                  <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowSettingsDropdown(false);
                      navigation.navigate('Profile');
                    }}
                  >
                    <User size={18} color={textMuted} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{t('profile')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dropdownItem} 
                    onPress={() => {
                      setShowSettingsDropdown(false);
                      navigation.navigate('CustomerCare');
                    }}
                  >
                    <Headset size={18} color={textMuted} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{t('customerCare')}</Text>
                  </TouchableOpacity>

                  <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />

                  <TouchableOpacity 
                    style={styles.dropdownItem} 
                    onPress={handleLogout}
                  >
                    <LogOut size={18} color="#EF4444" style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownItemText, { color: "#EF4444", fontFamily }]}>{t('logout')}</Text>
                  </TouchableOpacity>

                  {/* Delete Account — permanent, last item */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={handleDeleteAccount}
                  >
                    <Trash2 size={18} color="#EF4444" style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownItemText, { color: "#EF4444", fontFamily }]}>{t('deleteAccount') || 'Delete Account'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.submenuHeader}>
                    <TouchableOpacity onPress={() => setShowLanguageSubmenu(false)} style={styles.submenuBack}>
                      <ChevronRight size={18} color={textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                    <Text style={[styles.dropdownLabel, { color: textColor, marginBottom: 0, fontFamily: fontFamilyBold }]}>{t('selectLanguage')}</Text>
                  </View>
                  <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />
                  
                  {languages.map((lang) => (
                    <TouchableOpacity 
                      key={lang.code}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setLanguage(lang.code);
                        setShowLanguageSubmenu(false);
                        setShowSettingsDropdown(false);
                      }}
                    >
                      <View style={styles.langItemContent}>
                        <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{lang.name}</Text>
                        <Text style={[styles.dropdownItemValue, { color: textMuted, marginLeft: 8, fontFamily }]}>{lang.nativeName}</Text>
                      </View>
                      {language === lang.code && (
                        <Check size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Notifications Modal */}
        <Modal
          visible={showNotificationsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowNotificationsModal(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowNotificationsModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={{ backgroundColor: surfaceColor, maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}
            >
              <View style={{ paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Bell size={20} color={textColor} />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: textColor, fontFamily: fontFamilyBold }}>
                    {t('notifications') || 'Notifications'}
                  </Text>
                  {unreadNotifications > 0 && (
                    <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{unreadNotifications}</Text>
                    </View>
                  )}
                </View>
                {unreadNotifications > 0 && (
                  <TouchableOpacity onPress={() => markAllNotificationsReadMutation.mutate()}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', fontFamily }}>
                      {t('markAllRead') || 'Mark all read'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={{ maxHeight: 500 }}>
                {notifications.length === 0 ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Bell size={36} color={textMuted} />
                    <Text style={{ color: textMuted, marginTop: 12, fontSize: 14, fontFamily }}>
                      {t('noNotifications') || 'No notifications yet'}
                    </Text>
                  </View>
                ) : (
                  notifications.map((n: any) => (
                    <View key={n.id} style={[styles.notifItem, { borderBottomColor: borderColor, backgroundColor: n.isRead ? 'transparent' : (isDark ? 'rgba(37,99,235,0.08)' : '#EFF6FF') }]}>
                      <View style={[styles.notifDot, { backgroundColor: n.isRead ? '#9CA3AF' : '#2563EB' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.notifTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{n.title}</Text>
                        <Text style={[styles.notifBody, { color: textMuted, fontFamily }]}>{n.message}</Text>
                        <Text style={[styles.notifTime, { color: textMuted, fontFamily }]}>
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Start today's route ───────────────────────────────────────
            The one thing a milkman does first every morning, so it owns the
            top of the screen. Today's progress lives inside it rather than in
            a separate card — it is the status of this exact action. */}
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTextRow}>
            <Text style={styles.heroTitle} numberOfLines={2}>{t('startRoute')}</Text>
          </View>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            {t('turnOnLocation')}
          </Text>

          {todaysOrders.length > 0 && (
            <View style={styles.heroProgress}>
              <View style={styles.heroProgressLabels}>
                <Text style={styles.heroProgressText} numberOfLines={1}>
                  {completedOrders.length}/{todaysOrders.length} {t('ordersCompleted')}
                </Text>
                <Text style={styles.heroProgressPct}>{Math.round(progressPerc)}%</Text>
              </View>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${progressPerc}%` as any }]} />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate('DeliveryRun', { milkmanId: milkmanProfile?.id })}
            activeOpacity={0.9}
          >
            <Navigation size={20} color="#2563EB" />
            <Text style={styles.heroButtonText} numberOfLines={1}>{t('startRoute')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Action tiles ──────────────────────────────────────────────
            Four square tiles, then Orders full width. Each tile leads with
            its number because that is what the milkman scans for. */}
        <View style={styles.tileGrid}>
          <ActionTile
            icon={<Users size={22} color="#9333EA" />}
            tint={isDark ? 'rgba(147,51,234,0.18)' : '#F3E8FF'}
            value={String(totalCustomersCount)}
            label={t('myCustomers')}
            onPress={() => navigation.navigate('MilkmanCustomers', { milkmanId: milkmanProfile?.id })}
            styles={styles}
          />
          <ActionTile
            icon={<Receipt size={22} color="#16A34A" />}
            tint={isDark ? 'rgba(22,163,74,0.18)' : '#DCFCE7'}
            value={`₹${pendingBillsTotal.toFixed(0)}`}
            label={t('hisaab')}
            caption={t('pendingDues')}
            onPress={() => navigation.navigate('Hisaab', { milkmanId: milkmanProfile?.id })}
            styles={styles}
          />
          <ActionTile
            icon={<ClipboardList size={22} color="#2563EB" />}
            tint={isDark ? 'rgba(37,99,235,0.18)' : '#DBEAFE'}
            value={String(pendingRequestsCount)}
            label={t('acceptServiceRequests') || 'Service Requests'}
            badge={pendingRequestsCount}
            badgeColor="#EF4444"
            onPress={() => setShowRequestsModal(true)}
            styles={styles}
          />
          <ActionTile
            icon={<Banknote size={22} color="#CA8A04" />}
            tint={isDark ? 'rgba(234,179,8,0.18)' : '#FEF9C3'}
            value={String(codPayments.length)}
            label={t('acceptPayments')}
            badge={codPayments.length}
            badgeColor="#16A34A"
            onPress={() => setShowCODModal(true)}
            styles={styles}
          />
        </View>

        {/* Orders — full width: the list, not a number, is the point here. */}
        <TouchableOpacity
          style={[styles.wideTile, { backgroundColor: surfaceColor, borderColor }]}
          onPress={() => navigation.navigate('OrdersSummary')}
          activeOpacity={0.85}
        >
          <View style={[styles.tileIcon, { backgroundColor: isDark ? 'rgba(37,99,235,0.18)' : '#DBEAFE' }]}>
            <Package size={22} color="#2563EB" />
          </View>
          <View style={styles.wideTileText}>
            <Text style={[styles.wideTileTitle, { color: textColor }]} numberOfLines={1}>
              {t('orders')}
            </Text>
            <Text style={[styles.wideTileSub, { color: textMuted }]} numberOfLines={1}>
              {pendingOrders.length > 0
                ? `${pendingOrders.length} ${t('pendingDeliveries')}`
                : t('noPendingDeliveries')}
            </Text>
          </View>
          {pendingOrders.length > 0 && (
            <View style={styles.wideTileBadge}>
              <Text style={styles.tileBadgeText}>{pendingOrders.length}</Text>
            </View>
          )}
          <ChevronRight size={20} color={textMuted} />
        </TouchableOpacity>

        {hasNewActivity && (
          <TouchableOpacity
            style={[styles.activityBanner, { backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF' }]}
            onPress={() => setShowRequestsModal(true)}
            activeOpacity={0.85}
          >
            <Bell size={18} color="#2563EB" />
            <Text style={styles.activityBannerText} numberOfLines={2}>
              {t('newActivity')} — {t('checkRequests')}
            </Text>
          </TouchableOpacity>
        )}


      </ScrollView>

      {/* COD Verification Modal */}
      <Modal visible={showCODModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('codVerification')}</Text>
            <TouchableOpacity onPress={() => setShowCODModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            {codPayments.length === 0 ? (
              <View style={styles.emptyList}>
                <CheckCircle size={48} color="#16A34A" />
                <Text style={[styles.emptyListTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('noPendingCod')}</Text>
                <Text style={[styles.emptyListSub, { color: textMuted, fontFamily }]}>{t('allVerified')}</Text>
              </View>
            ) : (
              codPayments.map((payment: any) => (
                <View key={payment.id} style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.mOrderTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mOrderName, { color: textColor, fontFamily: fontFamilyBold }]}>{t('order')} #{payment.orderId}</Text>
                      <Text style={[styles.txDate, { color: textMuted, fontFamily }]}>{new Date(payment.createdAt).toLocaleString()}</Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#16A34A', fontFamily: fontFamilyBold }}>₹{payment.amount}</Text>
                  </View>
                  
                  <View style={{ marginTop: 16, backgroundColor: isDark ? '#374151' : '#F3F4F6', padding: 12, borderRadius: 8 }}>
                    <Text style={{ color: textMuted, fontSize: 12, marginBottom: 8, fontFamily: fontFamilyBold }}>{t('enterOtpPrompt')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor, color: textColor, borderWidth: 1, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: '700', fontFamily: fontFamilyBold }]}
                      placeholder="000000"
                      keyboardType="numeric"
                      maxLength={6}
                      value={codOtp}
                      onChangeText={setCodOtp}
                    />
                    <TouchableOpacity 
                      style={[styles.primaryBtn, { marginTop: 12, backgroundColor: codOtp.length === 6 ? '#16A34A' : '#9CA3AF' }]}
                      disabled={codOtp.length !== 6 || verifyOtpMutation.isPending}
                      onPress={() => verifyOtpMutation.mutate({ paymentId: payment.id, otp: codOtp })}
                    >
                      <Text style={[styles.primaryBtnText, { fontFamily: fontFamilyBold }]}>
                        {verifyOtpMutation.isPending ? t('verifying') : t('verifyPayment')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Service Requests Modal — accept & set pricing */}
      <Modal visible={showRequestsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('acceptServiceRequests') || 'Service Requests'}</Text>
            <TouchableOpacity onPress={() => setShowRequestsModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            {serviceRequests.filter((r: any) => r.status === 'pending').map((r: any) => {
              // Price only the products the customer requested; fall back to the
              // milkman's full product list if the request didn't carry items.
              const requested = (Array.isArray(r.services) && r.services.length > 0)
                ? r.services.map((s: any) => {
                    const di = milkmanProfile.dairyItems?.find((d: any) => d.name === s.name);
                    return { name: s.name, unit: s.unit || di?.unit || 'liter', price: di?.price ?? '' };
                  })
                : (milkmanProfile.dairyItems || []);
              const editable = quotingServices[r.id] || requested;
              return (
                <View key={`req-${r.id}`} style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor, padding: 16, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: textColor, fontSize: 15, fontFamily: fontFamilyBold }}>{r.customerName || r.customer?.name || t('newCustomer')}</Text>
                      <Text style={{ color: textMuted, fontSize: 12, marginTop: 2, fontFamily }}>{r.address || r.customer?.address}</Text>
                      {r.customerNotes ? <Text style={{ color: textMuted, fontSize: 12, marginTop: 4, fontStyle: 'italic', fontFamily }}>{r.customerNotes}</Text> : null}
                    </View>
                    <View style={{ backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: '#2563EB', fontSize: 10, fontWeight: '700', fontFamily: fontFamilyBold }}>{t('newLabel') || 'NEW'}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textColor, marginBottom: 8, fontFamily: fontFamilyBold }}>{t('setCustomPricing') || 'Set pricing for requested products'}</Text>
                    {editable.map((item: any, idx: number) => (
                      <View key={`reqprice-${r.id}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: textMuted, fontSize: 13, fontFamily }}>{item.name}{item.unit ? ` / ${item.unit}` : ''}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ color: textMuted, fontSize: 12, fontFamily }}>₹</Text>
                          <TextInput
                            style={{ color: textColor, fontWeight: '700', borderBottomWidth: 1, borderColor, width: 50, textAlign: 'right', padding: 2, fontFamily: fontFamilyBold }}
                            placeholder={String(item.price ?? '')}
                            defaultValue={item.price != null ? String(item.price) : ''}
                            keyboardType="numeric"
                            onChangeText={(v) => {
                              const updated = [...editable];
                              updated[idx] = { ...updated[idx], price: v };
                              setQuotingServices({ ...quotingServices, [r.id]: updated });
                            }}
                          />
                        </View>
                      </View>
                    ))}
                    {editable.length === 0 && (
                      <Text style={{ color: textMuted, fontSize: 12, fontFamily }}>No products to price.</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton, { marginTop: 16 }]}
                    onPress={() => {
                      const services = editable.map((i: any) => ({ name: i.name, unit: i.unit, price: i.price }));
                      acceptSrMutation.mutate({ requestId: r.id, services });
                      setShowRequestsModal(false);
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: fontFamilyBold }}>{t('acceptEnroll') || 'Accept & Enroll'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {pendingRequestsCount === 0 && (
              <View style={[styles.emptyList, { backgroundColor: surfaceColor, borderColor }]}>
                <ClipboardList size={32} color={textMuted} />
                <Text style={[styles.emptyListTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('noPendingRequests') || 'No pending requests'}</Text>
                <Text style={[styles.emptyListSub, { color: textMuted, fontFamily }]}>New service requests from customers will appear here.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Earnings Modal */}
      <Modal visible={showEarningsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('earningsOverview')}</Text>
            <TouchableOpacity onPress={() => setShowEarningsModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.earningsHero}
            >
              <Text style={[styles.earningsLabel, { fontFamily: fontFamilyBold }]}>{t('earningsToday')}</Text>
              <Text style={[styles.earningsAmount, { fontFamily: fontFamilyBold }]}>₹{todaysEarnings.toFixed(2)}</Text>
            </LinearGradient>

            <View style={[styles.mStatsCard, { backgroundColor: surfaceColor, borderColor, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 }]}>
              <Text style={[styles.sectionTitle, { color: textColor, fontSize: 16, fontFamily: fontFamilyBold }]}>{t('productSales')}</Text>
              <View style={{ marginTop: 12 }}>
                {milkmanProfile?.dairyItems?.filter((i:any)=>i.isAvailable).map((item: any, idx: number) => (
                  <View key={`breakdown-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: textMuted, fontFamily }}>{item.name}</Text>
                    <Text style={{ color: textColor, fontWeight: '600', fontFamily: fontFamilyBold }}>
                      ₹{(todaysEarnings * (0.6 - idx * 0.1)).toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 16, fontFamily: fontFamilyBold }]}>{t('recentTransactions')}</Text>
            {completedOrders.map((order) => {
              const cust = customers?.find((c: any) => c.id === order.customerId);
              return (
                <View key={`tx-${order.id}`} style={[styles.txCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.txIconBox, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
                      <DollarSign size={16} color="#16A34A" />
                    </View>
                    <View>
                      <Text style={[styles.txName, { color: textColor, fontFamily: fontFamilyBold }]}>{cust?.name || t('customer')}</Text>
                      <Text style={[styles.txDate, { color: textMuted, fontFamily }]}>{new Date(order.updatedAt || order.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: '#16A34A', fontFamily: fontFamilyBold }]}>+ ₹{order.totalAmount}</Text>
                </View>
              );
            })}
             {completedOrders.length === 0 && <Text style={[styles.modalEmpty, { color: textMuted, fontFamily }]}>{t('noTransactions')}</Text>}
          </ScrollView>
        </View>
      </Modal>

      {/* Inventory Modal */}
      <Modal visible={showInventoryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('manageInventory')}</Text>
            <TouchableOpacity onPress={() => { setShowInventoryModal(false); setEditingProduct(null); setIsAddingProduct(false); }} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Add Product Button */}
            {!isAddingProduct && !editingProduct && (
              <TouchableOpacity 
                style={[styles.primaryBtn, { marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                onPress={() => setIsAddingProduct(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={[styles.primaryBtnText, { fontFamily: fontFamilyBold }]}>{t('addNewProduct')}</Text>
              </TouchableOpacity>
            )}

            {/* Add/Edit Product Form */}
            {(isAddingProduct || editingProduct) && (
              <View style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor, marginBottom: 24, padding: 16 }]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: textColor, marginBottom: 16, fontFamily: fontFamilyBold }}>
                  {isAddingProduct ? t('addNewProduct') : t('editProduct')}
                </Text>
                
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: textMuted, marginBottom: 8, fontFamily }}>{t('productName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, borderWidth: 1, fontFamily }]}
                    placeholder={t('productNamePlaceholder')}
                    value={isAddingProduct ? newProduct.name : editingProduct.name}
                    onChangeText={(val) => isAddingProduct ? setNewProduct({ ...newProduct, name: val }) : setEditingProduct({...editingProduct, name: val})}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textMuted, marginBottom: 8, fontFamily }}>{t('price')} (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, borderWidth: 1, fontFamily }]}
                      placeholder="60"
                      keyboardType="numeric"
                      value={isAddingProduct ? newProduct.price : editingProduct.price?.toString()}
                      onChangeText={(val) => isAddingProduct ? setNewProduct({ ...newProduct, price: val.replace(/[^0-9.]/g, '') }) : setEditingProduct({...editingProduct, price: val})}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textMuted, marginBottom: 8, fontFamily }}>{t('unit')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, borderWidth: 1, fontFamily }]}
                      placeholder={t('liter')}
                      value={isAddingProduct ? t('liter') : editingProduct.unit}
                      onChangeText={(val) => isAddingProduct ? null : setEditingProduct({...editingProduct, unit: val})}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 48, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => { setIsAddingProduct(false); setEditingProduct(null); setNewProduct({ name: "", price: "" }); }}
                  >
                    <Text style={{ color: textColor, fontWeight: '600', fontFamily }}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 2, height: 48, borderRadius: 8, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => {
                      const updated = [...(milkmanProfile.dairyItems || [])];
                      if (isAddingProduct) {
                        if (!newProduct.name.trim() || !(parseFloat(newProduct.price) > 0)) {
                          Alert.alert(t('requiredFields'), t('productNamePriceRequired'));
                          return;
                        }
                        updated.push({ name: newProduct.name.trim(), price: newProduct.price, unit: 'liter', quantity: 0, isAvailable: true });
                      } else {
                        updated[editingProduct.index] = { ...editingProduct };
                        delete updated[editingProduct.index].index;
                      }
                      updateInventoryMutation.mutate(updated);
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                      setNewProduct({ name: "", price: "" });
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: fontFamilyBold }}>
                      {isAddingProduct ? t('saveProduct') : t('updateProduct')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isAddingProduct && !editingProduct && milkmanProfile.dairyItems?.map((item: any, index: number) => (
              <View key={index} style={[styles.invCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.invName, { color: textColor, fontFamily: fontFamilyBold }]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => setEditingProduct({ ...item, index })}>
                      <Edit size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.invPrice, { color: textMuted, fontFamily }]}>₹{item.price} {t('per')} {item.unit || t('liter')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <Text style={{ color: textMuted, fontSize: 13, fontFamily }}>{t('qty')}:</Text>
                    <TouchableOpacity
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? '#374151' : '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => {
                        const cur = parseFloat(localQuantities[index] || '0');
                        const next = Math.max(0, cur - 1);
                        setLocalQuantities(prev => ({ ...prev, [index]: String(next) }));
                        updateQuantityDebounced(index, next);
                      }}
                    >
                      <Text style={{ color: textColor, fontWeight: '700' }}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={{ width: 52, textAlign: 'center', color: textColor, fontWeight: '700', fontSize: 16, borderBottomWidth: 1, borderColor, fontFamily: fontFamilyBold }}
                      keyboardType="numeric"
                      value={localQuantities[index] ?? String(item.quantity || 0)}
                      onChangeText={(v) => {
                        setLocalQuantities(prev => ({ ...prev, [index]: v }));
                        updateQuantityDebounced(index, parseFloat(v) || 0);
                      }}
                    />
                    <TouchableOpacity
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => {
                        const cur = parseFloat(localQuantities[index] || '0');
                        const next = cur + 1;
                        setLocalQuantities(prev => ({ ...prev, [index]: String(next) }));
                        updateQuantityDebounced(index, next);
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.invToggle, { backgroundColor: item.isAvailable ? (isDark ? '#374151' : '#F3F4F6') : '#2563EB' }]}
                    onPress={() => {
                      const updated = [...milkmanProfile.dairyItems];
                      updated[index] = { ...item, isAvailable: !item.isAvailable };
                      updateInventoryMutation.mutate(updated);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.invToggleText, { color: item.isAvailable ? textColor : '#FFFFFF', fontFamily: fontFamilyBold }]}>
                      {item.isAvailable ? t('disableLabel') : t('activeLabel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      Alert.alert(t('deleteProduct'), `${t('deleteConfirm')} ${item.name}?`, [
                        { text: t('cancel'), style: "cancel" },
                        { 
                          text: t('deleteLabel'), 
                          style: "destructive", 
                          onPress: () => {
                            const updated = milkmanProfile.dairyItems.filter((_: any, i: number) => i !== index);
                            updateInventoryMutation.mutate(updated);
                          }
                        }
                      ]);
                    }}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500', fontFamily },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginTop: 24, fontFamily: fontFamilyBold },
  emptySub: { fontSize: 16, textAlign: 'center', marginVertical: 16, lineHeight: 24, fontFamily },
  primaryBtn: { backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: fontFamilyBold },

  scrollContent: { padding: 16, paddingBottom: 60 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  // flex + minWidth:0 is what stops a long business name from pushing the
  // notification and settings buttons off the right edge.
  headerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextCol: { flex: 1, minWidth: 0 },
  avatarBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 14, marginBottom: 2, fontFamily },
  businessName: { fontSize: 20, fontWeight: '700', fontFamily: fontFamilyBold },
  settingsBtn: {
    width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  // Compact header buttons (notifications / settings / logout) — sit on the
  // right side of the top bar in a row so all three are always visible.
  headerIconBtn: {
    width: 38, height: 38,
    borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, position: 'relative',
  },
  headerBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: '#DC2626', borderRadius: 10,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  headerBadgeText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700', lineHeight: 12,
  },
  // Notifications modal list items
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  notifTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  notifBody: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 11, marginTop: 4 },

  // Hero Card
  heroCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroTextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroTitle: { flex: 1, fontSize: 24, fontWeight: '700', color: '#FFFFFF', fontFamily: fontFamilyBold, lineHeight: 30 },

  // Progress inside the hero
  heroProgress: { marginBottom: 18 },
  heroProgressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  heroProgressText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.9)', fontFamily },
  heroProgressPct: { fontSize: 13, color: '#FFFFFF', fontWeight: '700', fontFamily: fontFamilyBold },
  heroProgressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },

  // ── Action tiles ──────────────────────────────────────────────────────
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    // Two per row, whatever the screen width. Fixed height keeps the grid
    // even when a translated label wraps to two lines.
    width: (width - 32 - 12) / 2,
    minHeight: 132,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'flex-start',
  },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  tileIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tileBadge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  tileBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', fontFamily: fontFamilyBold },
  tileValue: { fontSize: 26, fontWeight: '700', color: colors.foreground, fontFamily: fontFamilyBold, marginBottom: 2 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, fontFamily, lineHeight: 17 },
  tileCaption: { fontSize: 11, color: colors.mutedForeground, opacity: 0.75, fontFamily, marginTop: 1 },

  // Orders row
  wideTile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12,
  },
  wideTileText: { flex: 1, minWidth: 0 },
  wideTileTitle: { fontSize: 16, fontWeight: '700', fontFamily: fontFamilyBold },
  wideTileSub: { fontSize: 13, fontFamily, marginTop: 2 },
  wideTileBadge: {
    minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
  },
  activityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2563EB', marginBottom: 12,
  },
  activityBannerText: { flex: 1, fontSize: 13, color: '#2563EB', fontWeight: '600', fontFamily: fontFamilyBold },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 20, fontFamily },
  heroButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 8, gap: 8,
  },
  heroButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 16, fontFamily: fontFamilyBold },

  // Summary Card / Today's Progress
  card: {
    borderRadius: 12, borderWidth: 1, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: fontFamilyBold },

  // Web Grid Container

  // Section Header Generic

  // List Cards
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: fontFamilyBold },
  
  emptyList: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  emptyListTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 4, fontFamily: fontFamilyBold },
  emptyListSub: { fontSize: 14, textAlign: 'center', fontFamily },

  // Full Screen Modals
  modalWrapper: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700', fontFamily: fontFamilyBold },
  closeBtn: { padding: 4 },
  modalContent: { padding: 16 },
  modalEmpty: { textAlign: 'center', marginTop: 64, fontSize: 16, fontFamily },

  // Modal Order Card
  modalCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  mOrderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mOrderName: { fontSize: 16, fontWeight: '700', fontFamily: fontFamilyBold },
  mOrderItem: { fontSize: 14, marginTop: 4, fontFamily },
  mOrderAmount: { fontSize: 18, fontWeight: '700', fontFamily: fontFamilyBold },
  mOrderBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
  mOrderBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: fontFamilyBold },
  mOrderAddr: { fontSize: 14, marginVertical: 8, fontFamily },
  mOrderActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  mActionBtn: { flexDirection: 'row', paddingHorizontal: 16, height: 40, borderRadius: 8, alignItems: 'center', gap: 8 },
  mActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, fontFamily: fontFamilyBold },

  // Customer Detail Styles
  profileHeader: { padding: 24, alignItems: 'center', borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  profileName: { fontSize: 24, fontWeight: '800', marginBottom: 4, fontFamily: fontFamilyBold },
  profilePhone: { fontSize: 16, marginBottom: 16, fontFamily },
  smallActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statBoxValue: { fontSize: 18, fontWeight: '800', marginBottom: 2, fontFamily: fontFamilyBold },
  statBoxLabel: { fontSize: 11, fontWeight: '500', fontFamily },
  tinyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  bigActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 12 },

  // Modal Customer Card
  modalCardRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  mCustAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  mCustName: { fontSize: 16, fontWeight: '700', marginBottom: 2, fontFamily: fontFamilyBold },
  mCustPhone: { fontSize: 13, marginBottom: 2, fontFamily },
  mCustAddr: { fontSize: 12, fontFamily },
  mIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Earnings
  earningsHero: { borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24 },
  earningsLabel: { color: '#FFFFFF', fontSize: 16, opacity: 0.9, marginBottom: 8, fontFamily },
  earningsAmount: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', fontFamily: fontFamilyBold },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  txIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txName: { fontSize: 16, fontWeight: '600', marginBottom: 2, fontFamily: fontFamilyBold },
  txDate: { fontSize: 13, fontFamily },
  txAmount: { fontSize: 16, fontWeight: '700', fontFamily: fontFamilyBold },

  // Inventory
  invSubtitle: { fontSize: 14, marginBottom: 24, fontFamily },
  invCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  invName: { fontSize: 16, fontWeight: '700', marginBottom: 4, fontFamily: fontFamilyBold },
  invPrice: { fontSize: 14, marginBottom: 8, fontFamily },
  invBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  invBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: fontFamilyBold },
  invToggle: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  invToggleText: { fontWeight: '600', fontSize: 14, fontFamily: fontFamilyBold },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: fontFamily,
  },
  mStatsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily,
  },
  pricingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fontFamilyBold,
  },

  // Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dropdownContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    right: 16,
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    ...shadows.xl,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.8,
    fontFamily: fontFamilyBold,
  },
  dropdownSeparator: {
    height: 1,
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    fontFamily,
  },
  dropdownItemValue: {
    fontSize: 13,
    marginRight: 8,
    fontFamily,
  },
  submenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  submenuBack: {
    padding: 8,
    paddingLeft: 12,
  },
  langItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  baseText: { fontFamily },
  baseTextBold: { fontFamily: fontFamilyBold },
  dropdownOptionInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dropdownText: { fontSize: 15, fontWeight: '500', fontFamily },
  dropdownValue: { fontSize: 13, marginRight: 8, fontFamily },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#16A34A',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: fontFamilyBold,
  },
  rejectText: {
    color: '#EF4444',
  },
  badgeCount: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamilyBold,
  },
  cardHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamilyBold,
  },
});

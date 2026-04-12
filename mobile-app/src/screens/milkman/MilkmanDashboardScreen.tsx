import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Dimensions, useColorScheme, Platform, TextInput, Linking, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle, X, Phone, MessageCircle, MapPin, ChevronRight, TrendingUp, BarChart3, AlertCircle,
  Clock, Send, MessageSquare, Bell, Plus, IndianRupee, Edit, Trash2, Banknote, Receipt, Calendar, Wifi, WifiOff,
  Moon, Sun, Languages, LogOut, Headset, Check, Truck, Settings, User, Navigation, Package, DollarSign, Users
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTranslation } from '../../contexts/LanguageContext';
import { Language } from '../../lib/translations';

// ── Mapbox (native only) ────────────────────────────────────────────────────
let MapboxGL: any = null;
let mbxDirections: any = null;
let mbxOptimization: any = null;
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
try {
  MapboxGL = require('@rnmapbox/maps').default;
  if (MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);
  const mbxDir = require('@mapbox/mapbox-sdk/services/directions').default;
  mbxDirections = mbxDir({ accessToken: MAPBOX_TOKEN });
  const mbxOpt = require('@mapbox/mapbox-sdk/services/optimization').default;
  mbxOptimization = mbxOpt({ accessToken: MAPBOX_TOKEN });
} catch (_) {}

const { width } = Dimensions.get('window');

export default function MilkmanDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t, language, setLanguage, fontFamily, fontFamilyBold, colors, isDark } = useTranslation();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [quotingServices, setQuotingServices] = useState<any>({});
  const [milkmanNotes, setMilkmanNotes] = useState("");
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);
  const [showCODModal, setShowCODModal] = useState(false);
  const [codOtp, setCodOtp] = useState("");
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
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
  });

  const { data: customerPricings = [] } = useQuery<any[]>({
    queryKey: ["/api/milkmen", milkmanProfile?.id, "customer-pricings"],
    enabled: !!milkmanProfile?.id,
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
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen", milkmanProfile?.id, "customer-pricings"] });
      Alert.alert(t('success'), t('pricingAdded'));
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest({ url: `/api/customer-pricings/${id}`, method: "PUT", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen", milkmanProfile?.id, "customer-pricings"] });
      setEditingPricing(null);
      Alert.alert(t('success'), t('pricingUpdated'));
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest({ url: `/api/customer-pricings/${id}`, method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen", milkmanProfile?.id, "customer-pricings"] });
      Alert.alert(t('success'), t('pricingDeleted'));
    },
  });

  const { data: codPayments = [], refetch: refetchCODPayments } = useQuery<any[]>({
    queryKey: ["/api/payments/cod/pending", milkmanProfile?.id],
    enabled: !!milkmanProfile?.id,
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
  const todaysEarnings = useMemo(() => completedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0), [completedOrders]);
  const totalCustomersCount = Array.isArray(customers) ? customers.length : 0;
  const progressPerc = todaysOrders.length > 0 ? (completedOrders.length / todaysOrders.length) * 100 : 0;

  // Location broadcasting
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [pulseAnim, setPulseAnim] = useState(1);

  // Milkman map state
  const [myCoord, setMyCoord] = useState<number[] | null>(null);
  const [routeStops, setRouteStops] = useState<Array<{ coord: number[]; name: string; address: string; customerId?: number }>>([]);
  const [mapRouteGeoJSON, setMapRouteGeoJSON] = useState<any | null>(null);
  const milkmanMapCamRef = useRef<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // ── Optimize route order via Mapbox Optimization API ─────────────────────
  const optimizeRoute = async () => {
    if (!myCoord || routeStops.length < 2 || !mbxOptimization) {
      Alert.alert('Not Ready', routeStops.length < 2 ? 'Need at least 2 stops to optimize.' : 'Get your GPS location first by starting the route.');
      return;
    }
    if (routeStops.length > 11) {
      Alert.alert('Too Many Stops', 'Optimization supports up to 11 stops. Showing manual order.');
      return;
    }
    setIsOptimizing(true);
    try {
      // Build waypoints: milkman start + all customer stops
      const waypoints = [
        { coordinates: myCoord as [number, number] },
        ...routeStops.map(s => ({ coordinates: s.coord as [number, number] })),
      ];
      const res = await mbxOptimization.getOptimization({
        profile: 'driving',
        waypoints,
        roundtrip: false,
        source: 'first',
        destination: 'last',
        geometries: 'geojson',
      }).send();

      const body = res?.body;
      if (!body?.waypoints || body.code !== 'Ok') {
        Alert.alert('Optimization Failed', 'Could not calculate the optimal route. Please try again.');
        return;
      }

      // body.waypoints[i].waypoint_index gives the optimized visit order
      // Skip index 0 (that's the milkman start point)
      const optimizedIndices: number[] = body.waypoints
        .filter((w: any) => w.waypoint_index > 0)
        .sort((a: any, b: any) => a.trips_index !== undefined ? a.trips_index - b.trips_index : 0)
        .map((w: any) => w.waypoint_index - 1); // subtract 1 to get routeStops index

      // Reorder routeStops according to optimized indices
      const reordered = optimizedIndices.map(i => routeStops[i]).filter(Boolean);
      if (reordered.length !== routeStops.length) {
        // Fallback: use trip waypoints order directly
        reordered.splice(0);
        body.waypoints
          .slice(1) // skip milkman origin
          .forEach((w: any) => {
            const stop = routeStops[w.waypoint_index - 1];
            if (stop) reordered.push(stop);
          });
      }

      setRouteStops(reordered);

      // Update the route polyline with optimized geometry
      if (body.trips?.[0]?.geometry) {
        setMapRouteGeoJSON(body.trips[0].geometry);
      }

      // Persist the new order to the server
      const orderedIds = reordered.map(s => s.customerId).filter(Boolean) as number[];
      if (orderedIds.length > 0) {
        apiRequest({
          url: '/api/milkmen/routes',
          method: 'PATCH',
          body: { orderedCustomerIds: orderedIds },
        }).catch(() => {}); // best-effort save
      }

      Alert.alert('Route Optimized! ✨', `Reordered ${reordered.length} stops for the shortest total distance.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Optimization request failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isBroadcasting) {
      interval = setInterval(() => {
        setPulseAnim(prev => (prev === 1 ? 0.4 : 1));
      }, 800);
    } else {
      setPulseAnim(1);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  // Build route stops from customers whenever map modal opens
  useEffect(() => {
    if (!showMapModal || !Array.isArray(customers)) return;
    const stops = customers
      .filter((c: any) => c.latitude && c.longitude)
      .sort((a: any, b: any) => (a.routeOrder ?? 0) - (b.routeOrder ?? 0))
      .map((c: any) => ({
        coord: [parseFloat(c.longitude), parseFloat(c.latitude)] as number[],
        name: c.name || 'Customer',
        address: c.address || '',
        customerId: c.id,
      }));
    setRouteStops(stops);

    // Fetch multi-stop driving route via Mapbox Directions
    if (stops.length >= 1 && mbxDirections && myCoord) {
      const allWaypoints = [
        { coordinates: myCoord },
        ...stops.map(s => ({ coordinates: s.coord })),
      ];
      mbxDirections.getDirections({
        profile: 'driving',
        waypoints: allWaypoints,
        geometries: 'geojson',
      }).send().then((res: any) => {
        const route = res?.body?.routes?.[0];
        if (route) setMapRouteGeoJSON(route.geometry);
      }).catch(() => {});
    }
  }, [showMapModal, customers, myCoord]);

  const startBroadcast = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); return; }
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 8000, distanceInterval: 8 },
        (loc) => {
          const coord = [loc.coords.longitude, loc.coords.latitude];
          setMyCoord(coord);
          apiRequest({
            url: '/api/delivery/location', method: 'POST',
            body: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          }).catch(() => {});
        }
      );
      setIsBroadcasting(true);
    } catch (e) { console.error(e); }
  };
  const stopBroadcast = () => {
    locationSub.current?.remove();
    locationSub.current = null;
    setIsBroadcasting(false);
  };
  useEffect(() => () => stopBroadcast(), []);

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
            <View>
              <Text style={[styles.greeting, { color: textMuted, fontFamily }]}>{t('welcomeBack')}</Text>
              <Text style={[styles.businessName, { color: textColor, fontFamily: fontFamilyBold }]}>{milkmanProfile.businessName || t('imMilkman')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: milkmanProfile.isAvailable ? (isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7') : (isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2'), borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 }}>
              {isConnected ? <Wifi size={12} color="#16A34A" /> : <WifiOff size={12} color="#9CA3AF" />}
              <Switch
                value={!!milkmanProfile.isAvailable}
                onValueChange={(v) => updateAvailabilityMutation.mutate(v)}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={milkmanProfile.isAvailable ? '#16A34A' : '#9CA3AF'}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
              <Text style={{ fontSize: 11, fontWeight: '700', color: milkmanProfile.isAvailable ? '#16A34A' : '#9CA3AF', fontFamily: fontFamilyBold }}>
                {milkmanProfile.isAvailable ? t('active') : t('disabledLabel')}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.settingsBtn, { backgroundColor: surfaceColor, borderColor }]} 
              onPress={() => setShowSettingsDropdown(true)}
            >
              <Settings size={22} color={showSettingsDropdown ? colors.primary : textMuted} />
            </TouchableOpacity>
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
                      Alert.alert(t('info'), t('themeFollowsSystem'));
                      setShowSettingsDropdown(false);
                    }}
                  >
                    {isDark ? (
                      <Sun size={18} color={textMuted} style={styles.dropdownIcon} />
                    ) : (
                      <Moon size={18} color={textMuted} style={styles.dropdownIcon} />
                    )}
                    <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>
                      {isDark ? t('lightMode') : t('darkMode')}
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

        {/* Start Route Action Hero */}
        <LinearGradient
          colors={isBroadcasting ? ['#22C55E', '#16A34A'] : ['#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTextRow}>
            <Text style={[styles.heroTitle, { fontFamily: fontFamilyBold, color: '#FFFFFF' }]}>{isBroadcasting ? t('routeInProgress') : t('startRoute')}</Text>
            {isBroadcasting && <View style={[styles.liveDot, { opacity: pulseAnim }]} />}
          </View>
          <Text style={[styles.heroSubtitle, { fontFamily, color: 'rgba(255,255,255,0.8)' }]}>
            {isBroadcasting ? t('customersCanTrack') : t('turnOnLocation')}
          </Text>
          <TouchableOpacity 
            style={[styles.heroButton, isBroadcasting && { backgroundColor: '#FFFFFF', borderWidth: 0 }]} 
            onPress={() => isBroadcasting ? stopBroadcast() : setShowMapModal(true)}
            activeOpacity={0.9}
          >
            {isBroadcasting ? <X size={20} color="#16A34A" /> : <Navigation size={20} color="#2563EB" />}
            <Text style={[styles.heroButtonText, isBroadcasting && { color: '#16A34A' }, { fontFamily: fontFamilyBold }]}>
              {isBroadcasting ? t('stopRoute') : t('startRoute')}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.webGridContainer}>
          <TouchableOpacity 
            style={[styles.webStatCard, { backgroundColor: surfaceColor, borderColor }]} 
            onPress={() => setShowDeliveriesModal(true)} 
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
              <Package size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: textColor, fontFamily: fontFamilyBold }]}>{pendingOrders.length}</Text>
              <Text style={[styles.statLabel, { color: textMuted, fontFamily }]}>{t('pendingDeliveries')}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.webStatCard, { backgroundColor: surfaceColor, borderColor }]} 
            onPress={() => setShowEarningsModal(true)} 
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
              <DollarSign size={20} color="#16A34A" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: textColor, fontFamily: fontFamilyBold }]}>₹{todaysEarnings.toFixed(0)}</Text>
              <Text style={[styles.statLabel, { color: textMuted, fontFamily }]}>{t('todaysEarnings')}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={[styles.webStatCard, { backgroundColor: surfaceColor, borderColor }]} 
             onPress={() => setShowCustomersModal(true)} 
             activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : '#F3E8FF' }]}>
              <Users size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: textColor, fontFamily: fontFamilyBold }]}>{totalCustomersCount}</Text>
              <Text style={[styles.statLabel, { color: textMuted, fontFamily }]}>{t('activeCustomers')}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={[styles.webStatCard, { backgroundColor: surfaceColor, borderColor }]} 
             onPress={() => setShowInventoryModal(true)} 
             activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#FEF08A' }]}>
              <Truck size={20} color="#CA8A04" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: textColor, fontFamily: fontFamilyBold }]}>{milkmanProfile.dairyItems?.filter((i:any)=>i.isAvailable).length || 0}</Text>
              <Text style={[styles.statLabel, { color: textMuted, fontFamily }]}>{t('availableItems')}</Text>
            </View>
          </TouchableOpacity>

          {hasNewActivity && (
            <View style={[styles.webStatCard, { backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', borderColor: '#2563EB', borderWidth: 1.5, marginBottom: 12 }]}>
              <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(37,99,235,0.3)' : '#DBEAFE' }]}>
                <Bell size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: '#2563EB', fontFamily: fontFamilyBold }]}>{t('newActivity')}</Text>
                <Text style={[styles.statLabel, { color: '#2563EB', fontFamily }]}>{t('checkRequests')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Daily Progress */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 16, fontFamily: fontFamilyBold }]}>{t('todaysProgress')}</Text>
          <View style={styles.progressRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.progressCount, { color: textColor, fontFamily: fontFamilyBold }]}>{completedOrders.length} / {todaysOrders.length}</Text>
              <Text style={{ fontSize: 13, color: textMuted, fontFamily }}>{t('ordersCompleted')}</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563EB', fontFamily: fontFamilyBold }}>{Math.round(progressPerc)}%</Text>
            </View>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
            <View style={[styles.progressBarFill, { width: `${progressPerc}%` as any }]} />
          </View>
        </View>

        {/* My Customers & Quick Chat */}
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('myCustomers')}</Text>
          <TouchableOpacity onPress={() => setShowCustomersModal(true)}>
            <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '600', fontFamily: fontFamilyBold }}>{t('manageAll')}</Text>
          </TouchableOpacity>
        </View>

        {customers?.slice(0, 5).map((c: any) => {
          const hasPending = pendingOrders.some(o => o.customerId === c.id);
          return (
            <TouchableOpacity 
              key={c.id} 
              style={[styles.listCard, { backgroundColor: surfaceColor, borderColor }]} 
              onPress={() => navigation.navigate('Chat', { customerId: c.id, milkmanId: user?.id })}
              activeOpacity={0.8}
            >
              <View style={styles.listCardLeft}>
                 <View style={[styles.listAvatar, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#DBEAFE' }]}>
                   <User size={20} color="#2563EB" />
                 </View>
                 <View style={{ flex: 1 }}>
                   <Text style={[styles.listName, { color: textColor, fontFamily: fontFamilyBold }]}>{c.name}</Text>
                   <Text style={{ fontSize: 12, color: textMuted, marginTop: 2, fontFamily }} numberOfLines={1}>{c.address}</Text>
                 </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                 {hasPending && (
                   <View style={{ backgroundColor: '#FDE047', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                     <Text style={{ fontSize: 10, fontWeight: '700', color: '#854D0E', fontFamily: fontFamilyBold }}>{t('pendingLabel')}</Text>
                   </View>
                 )}
                 <MessageSquare size={20} color="#2563EB" />
                 <ChevronRight size={18} color={textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}
        
        {pendingOrders.length === 0 && (
          <View style={[styles.emptyList, { backgroundColor: surfaceColor, borderColor }]}>
            <CheckCircle size={32} color="#16A34A" />
            <Text style={[styles.emptyListTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('allCaughtUp')}</Text>
            <Text style={[styles.emptyListSub, { color: textMuted, fontFamily }]}>{t('noPendingDeliveries')}</Text>
          </View>
        )}

        {/* Route Map Section */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, marginTop: 8 }]}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <Text style={[styles.sectionTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('routeMap')}</Text>
             <TouchableOpacity 
                style={styles.langBtn} 
                onPress={() => {
                  const newLang = language === 'English' ? 'Hindi' : language === 'Hindi' ? 'Marathi' : 'English';
                  setLanguage(newLang);
                }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 12, fontFamily: fontFamilyBold }}>
                  {language === 'English' ? 'EN' : language === 'Hindi' ? 'HI' : 'MR'}
                </Text>
              </TouchableOpacity>
           </View>
           <View style={styles.routePreview}>
             {customers?.slice(0, 3).map((c: any, idx: number) => (
               <View key={`route-${idx}`} style={styles.routeItem}>
                 <View style={[styles.routeDot, { backgroundColor: (idx === 0 && isBroadcasting) ? '#22C55E' : '#2563EB' }]} />
                 {idx < 2 && <View style={styles.routeLine} />}
                 <Text style={[styles.routeText, { color: textColor, fontFamily }]} numberOfLines={1}>{c.address}</Text>
               </View>
             ))}
             {customers?.length > 3 && (
               <Text style={{ color: textMuted, fontSize: 12, marginTop: 8, marginLeft: 16, fontFamily }}>+ {customers.length - 3} {t('moreStops')}</Text>
             )}
           </View>
        </View>

      </ScrollView>

      {/* Map Modal — Real Mapbox route map */}
      <Modal visible={showMapModal} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('deliveryRoute')}</Text>
              <Text style={{ fontSize: 12, color: textMuted, fontFamily, marginTop: 2 }}>
                {isBroadcasting ? '🟢 Broadcasting your location to customers' : '⚪ Start route to begin broadcasting'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* ── Map ── */}
          <View style={{ flex: 1 }}>
            {MapboxGL ? (
              <MapboxGL.MapView
                style={{ flex: 1 }}
                styleURL="mapbox://styles/mapbox/streets-v12"
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled
              >
                <MapboxGL.Camera
                  ref={milkmanMapCamRef}
                  zoomLevel={13}
                  centerCoordinate={myCoord || [78.9629, 20.5937]}
                  animationMode="flyTo"
                  animationDuration={800}
                />

                {/* My position — green truck */}
                {myCoord && (
                  <MapboxGL.PointAnnotation id="my-pos" coordinate={myCoord}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 19, backgroundColor: '#16A34A',
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 3, borderColor: '#fff',
                      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
                    }}>
                      <Truck size={18} color="#fff" />
                    </View>
                  </MapboxGL.PointAnnotation>
                )}

                {/* Customer delivery stops — numbered blue pins */}
                {routeStops.map((stop, idx) => (
                  <MapboxGL.PointAnnotation key={`stop-${idx}`} id={`stop-${idx}`} coordinate={stop.coord}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: idx === 0 ? '#D97706' : '#2563EB',
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 2.5, borderColor: '#fff',
                      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, elevation: 5,
                    }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: fontFamilyBold }}>
                        {idx + 1}
                      </Text>
                    </View>
                  </MapboxGL.PointAnnotation>
                ))}

                {/* Driving route polyline through all stops */}
                {mapRouteGeoJSON && (
                  <MapboxGL.ShapeSource id="mk-route" shape={mapRouteGeoJSON}>
                    <MapboxGL.LineLayer
                      id="mk-route-halo"
                      style={{ lineColor: '#93C5FD', lineWidth: 8, lineOpacity: 0.4, lineCap: 'round', lineJoin: 'round' }}
                    />
                    <MapboxGL.LineLayer
                      id="mk-route-line"
                      style={{ lineColor: '#2563EB', lineWidth: 5, lineOpacity: 1, lineCap: 'round', lineJoin: 'round' }}
                    />
                  </MapboxGL.ShapeSource>
                )}
              </MapboxGL.MapView>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#111827' : '#F3F4F6' }}>
                <MapPin size={48} color={colors.primary} />
                <Text style={{ marginTop: 12, color: textColor, fontWeight: '600', fontFamily: fontFamilyBold }}>{t('liveTracker')}</Text>
                <Text style={{ fontSize: 12, color: textMuted, textAlign: 'center', marginTop: 6, fontFamily }}>Map requires a real device build</Text>
              </View>
            )}

            {/* ── Upcoming deliveries sheet ── */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: 280 }}>
              <View style={[styles.modalContent, { backgroundColor: surfaceColor, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor }]}>
                <Text style={{ fontWeight: '700', color: textColor, marginBottom: 14, fontSize: 15, fontFamily: fontFamilyBold }}>
                  {t('upcomingDeliveries')} ({pendingOrders.length})
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order: any, idx: number) => {
                      const cust = customers?.find((c: any) => c.id === order.customerId);
                      return (
                        <View key={order.id} style={{
                          flexDirection: 'row', alignItems: 'center', marginBottom: 12,
                          paddingBottom: 12,
                          borderBottomWidth: idx < pendingOrders.length - 1 ? StyleSheet.hairlineWidth : 0,
                          borderBottomColor: borderColor,
                        }}>
                          <View style={{
                            width: 30, height: 30, borderRadius: 15,
                            backgroundColor: idx === 0 ? '#D97706' : '#2563EB',
                            justifyContent: 'center', alignItems: 'center', marginRight: 12,
                          }}>
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12, fontFamily: fontFamilyBold }}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600', color: textColor, fontFamily: fontFamilyBold }}>{cust?.name || t('customer')}</Text>
                            <Text style={{ fontSize: 12, color: textMuted, fontFamily }}>{cust?.address || t('nearBy')}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontWeight: '700', color: '#16A34A', fontFamily: fontFamilyBold }}>{order.quantity}L</Text>
                            <Text style={{ fontSize: 11, color: textMuted, fontFamily }}>₹{parseFloat(order.totalAmount || '0').toFixed(0)}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: textMuted, textAlign: 'center', padding: 16, fontFamily }}>{t('noPendingDeliveries')}</Text>
                  )}
                </ScrollView>

                {/* ── Optimize Route button ── */}
                {routeStops.length >= 2 && (
                  <TouchableOpacity
                    style={[{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      paddingVertical: 12, borderRadius: 12, marginTop: 10,
                      backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : '#F5F3FF',
                      borderWidth: 1.5, borderColor: '#7C3AED',
                      opacity: isOptimizing ? 0.6 : 1,
                    }]}
                    onPress={optimizeRoute}
                    disabled={isOptimizing}
                    activeOpacity={0.8}
                  >
                    {isOptimizing
                      ? <ActivityIndicator size="small" color="#7C3AED" />
                      : <TrendingUp size={17} color="#7C3AED" />}
                    <Text style={{ color: '#7C3AED', fontWeight: '700', fontSize: 14, fontFamily: fontFamilyBold }}>
                      {isOptimizing ? 'Optimizing…' : '✨ Optimize Route'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Start/Stop Route Button inside sheet */}
                <TouchableOpacity
                  style={[{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    paddingVertical: 14, borderRadius: 12, marginTop: 8,
                    backgroundColor: isBroadcasting ? '#16A34A' : '#2563EB',
                  }]}
                  onPress={() => isBroadcasting ? stopBroadcast() : startBroadcast()}
                  activeOpacity={0.85}
                >
                  {isBroadcasting ? <X size={18} color="#fff" /> : <Navigation size={18} color="#fff" />}
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: fontFamilyBold }}>
                    {isBroadcasting ? t('stopRoute') : t('startRoute')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Deliveries Modal */}
      <Modal visible={showDeliveriesModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('todaysDeliveries')}</Text>
            <TouchableOpacity onPress={() => setShowDeliveriesModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            {todaysOrders.map((order) => {
              const cust = customers?.find((c: any) => c.id === order.customerId);
              return (
                <View key={order.id} style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.mOrderTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mOrderName, { color: textColor, fontFamily: fontFamilyBold }]}>{cust?.name || `${t('order')} #${order.id}`}</Text>
                      <Text style={[styles.mOrderItem, { color: textMuted, fontFamily }]}>{order.itemName || t('milk')} • {order.quantity}L</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.mOrderAmount, { color: '#16A34A', fontFamily: fontFamilyBold }]}>₹{order.totalAmount}</Text>
                      <View style={[styles.mOrderBadge, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#FEF08A' }]}>
                        <Text style={[styles.mOrderBadgeText, { color: isDark ? '#FDE047' : '#B45309', fontFamily: fontFamilyBold }]}>{t(order.status)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.mOrderAddr, { color: textMuted, fontFamily }]}>{order.deliveryAddress || cust?.address}</Text>
                  <View style={styles.mOrderActions}>
                    {['pending', 'accepted'].includes(order.status) && (
                      <TouchableOpacity style={[styles.mActionBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'out_for_delivery' })}>
                        <Text style={[styles.mActionText, { fontFamily: fontFamilyBold }]}>{t('startDelivery')}</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <TouchableOpacity style={[styles.mActionBtn, { backgroundColor: '#16A34A' }]}
                        onPress={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}>
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={[styles.mActionText, { fontFamily: fontFamilyBold }]}>{t('markDelivered')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            {todaysOrders.length === 0 && <Text style={[styles.modalEmpty, { color: textMuted, fontFamily }]}>{t('noOrdersToday')}</Text>}
          </ScrollView>
        </View>
      </Modal>

      {/* Customers Modal */}
      <Modal visible={showCustomersModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('myCustomers')}</Text>
            <TouchableOpacity onPress={() => setShowCustomersModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Pending Requests Section */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 12, fontSize: 16, fontFamily: fontFamilyBold }]}>{t('enrollmentRequests')}</Text>
              {serviceRequests.filter((r: any) => r.status === 'pending').map((r: any) => (
                <View key={`sr-${r.id}`} style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor, padding: 16, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: textColor, fontSize: 15, fontFamily: fontFamilyBold }}>{r.customerName || t('newCustomer')}</Text>
                      <Text style={{ color: textMuted, fontSize: 12, marginTop: 2, fontFamily }}>{r.address}</Text>
                    </View>
                    <View style={{ backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: '#2563EB', fontSize: 10, fontWeight: '700', fontFamily: fontFamilyBold }}>{t('newLabel')}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textColor, marginBottom: 8, fontFamily: fontFamilyBold }}>{t('setCustomPricing')}</Text>
                    {milkmanProfile.dairyItems?.map((item: any, idx: number) => (
                       <View key={`price-set-${r.id}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                         <Text style={{ color: textMuted, fontSize: 13, fontFamily }}>{item.name}</Text>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                           <Text style={{ color: textMuted, fontSize: 12, fontFamily }}>₹</Text>
                           <TextInput
                             style={{ color: textColor, fontWeight: '700', borderBottomWidth: 1, borderColor, width: 40, textAlign: 'right', padding: 2, fontFamily: fontFamilyBold }}
                             placeholder={String(item.price)}
                             defaultValue={String(item.price)}
                             keyboardType="numeric"
                             onChangeText={(v) => {
                               const updated = [...(quotingServices[r.id] || milkmanProfile.dairyItems)];
                               updated[idx] = { ...updated[idx], price: v };
                               setQuotingServices({ ...quotingServices, [r.id]: updated });
                             }}
                           />
                         </View>
                       </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => {
                        const services = (quotingServices[r.id] || milkmanProfile.dairyItems).map((i: any) => ({ 
                          name: i.name, 
                          price: i.price 
                        }));
                        acceptSrMutation.mutate({ requestId: r.id, services });
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: fontFamilyBold }}>{t('acceptEnroll')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {serviceRequests.filter((r: any) => r.status === 'pending').length === 0 && (
                <Text style={{ color: textMuted, fontSize: 13, fontStyle: 'italic', marginLeft: 4, fontFamily }}>{t('noPendingRequests')}</Text>
              )}
            </View>

            <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 24 }} />
            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 12, fontSize: 16, fontFamily: fontFamilyBold }]}>{t('activeCustomers')}</Text>
            {Array.isArray(customers) && customers.map((c: any) => (
              <TouchableOpacity 
                key={c.id} 
                style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor }]}
                onPress={() => { setSelectedDetailCustomer(c); setShowDetailModal(true); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.mCustAvatar, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE' }]}>
                    <Users size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.mCustName, { color: textColor, fontFamily: fontFamilyBold }]}>{c.name}</Text>
                    <Text style={[styles.mCustPhone, { color: textMuted, fontFamily }]}>{c.phone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={{ padding: 8 }}
                    onPress={() => {
                      setShowCustomersModal(false);
                      navigation.navigate('Chat', { customerId: c.id, milkmanId: user?.id });
                    }}
                  >
                    <MessageSquare size={22} color="#2563EB" />
                  </TouchableOpacity>
                  <ChevronRight size={20} color={textMuted} style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            ))}
            {(!customers || customers.length === 0) && <Text style={[styles.modalEmpty, { color: textMuted, fontFamily }]}>{t('noCustomersYet')}</Text>}
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
                    value={isAddingProduct ? milkmanNotes : editingProduct.name}
                    onChangeText={(val) => isAddingProduct ? setMilkmanNotes(val) : setEditingProduct({...editingProduct, name: val})}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textMuted, marginBottom: 8, fontFamily }}>{t('price')} (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, borderWidth: 1, fontFamily }]}
                      placeholder="60"
                      keyboardType="numeric"
                      value={isAddingProduct ? codOtp : editingProduct.price?.toString()}
                      onChangeText={(val) => isAddingProduct ? setCodOtp(val) : setEditingProduct({...editingProduct, price: val})}
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
                    onPress={() => { setIsAddingProduct(false); setEditingProduct(null); setMilkmanNotes(""); setCodOtp(""); }}
                  >
                    <Text style={{ color: textColor, fontWeight: '600', fontFamily }}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 2, height: 48, borderRadius: 8, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => {
                      const updated = [...milkmanProfile.dairyItems];
                      if (isAddingProduct) {
                        updated.push({ name: milkmanNotes, price: codOtp, unit: 'liter', quantity: 0, isAvailable: true });
                      } else {
                        updated[editingProduct.index] = { ...editingProduct };
                        delete updated[editingProduct.index].index;
                      }
                      updateInventoryMutation.mutate(updated);
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                      setMilkmanNotes("");
                      setCodOtp("");
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

      {/* Bills Modal */}
      <Modal visible={showBillsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('billsManagement')}</Text>
            <TouchableOpacity onPress={() => setShowBillsModal(false)} style={styles.closeBtn}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* Global Billing Summary */}
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 12, padding: 20, marginBottom: 24 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4, fontFamily }}>{t('totalOutstanding')}</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800', fontFamily: fontFamilyBold }}>
                ₹{Array.isArray(milkmanBills) ? milkmanBills.filter((b: any) => b.status === 'pending').reduce((s: number, b: any) => s + parseFloat(b.totalAmount || '0'), 0).toFixed(2) : '0.00'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                 <View>
                   <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily }}>{t('paidThisMonth')}</Text>
                   <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: fontFamilyBold }}>₹{Array.isArray(milkmanBills) ? milkmanBills.filter((b: any) => b.status === 'paid' && new Date(b.updatedAt).getMonth() === new Date().getMonth()).reduce((s: number, b: any) => s + parseFloat(b.totalAmount || '0'), 0).toFixed(0) : '0'}</Text>
                 </View>
                 <View>
                   <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily }}>{t('customersPending')}</Text>
                   <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: fontFamilyBold }}>{new Set(milkmanBills?.filter((b:any)=>b.status==='pending').map((b:any)=>b.customerId)).size}</Text>
                 </View>
              </View>
            </LinearGradient>

            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 16, fontFamily: fontFamilyBold }]}>{t('recentActivity')}</Text>
            {milkmanBills?.slice(0, 5).map((bill: any) => {
              const cust = customers?.find((c: any) => c.id === bill.customerId);
              return (
                <View key={`bill-act-${bill.id}`} style={[styles.tinyCard, { backgroundColor: surfaceColor, borderColor, paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#374151' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                      <User size={18} color={textMuted} />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '600', color: textColor, fontFamily: fontFamilyBold }}>{cust?.name || t('customer')}</Text>
                      <Text style={{ fontSize: 12, color: textMuted, fontFamily }}>{bill.status === 'paid' ? t('settledOn') : t('generatedOn')} {new Date(bill.updatedAt || bill.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', color: bill.status === 'paid' ? '#16A34A' : textColor, fontFamily: fontFamilyBold }}>₹{bill.totalAmount}</Text>
                    <Text style={{ fontSize: 10, color: bill.status === 'paid' ? '#16A34A' : '#CA8A04', fontWeight: '700', fontFamily: fontFamilyBold }}>{t(bill.status).toUpperCase()}</Text>
                  </View>
                </View>
              );
            })}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('manageByCustomer')}</Text>
              <TouchableOpacity onPress={() => Alert.alert(t('bulkActionLabel'), t('bulkActionDesc'), [
                { text: t('cancelLabel'), style: "cancel" },
                { text: t('generateAllLabel'), onPress: () => Alert.alert(t('success'), t('bulkStarted')) }
              ])}>
                <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 14, fontFamily: fontFamilyBold }}>{t('generateAllLabel')}</Text>
              </TouchableOpacity>
            </View>
            {Array.isArray(customers) && customers.map((c: any) => {
              const cBills = Array.isArray(milkmanBills) ? milkmanBills.filter((b: any) => b.customerId === c.id) : [];
              const pendingAmt = cBills.filter((b: any) => b.status === 'pending').reduce((s: number, b: any) => s + parseFloat(b.totalAmount || '0'), 0);
              return (
                <View key={c.id} style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={[styles.mOrderName, { color: textColor, fontFamily: fontFamilyBold }]}>{c.name}</Text>
                      <Text style={{ color: textMuted, fontSize: 13, fontFamily }}>{cBills.length} {t('billsLabel')} • ₹{pendingAmt.toFixed(2)} {t('pendingLabel')}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                      onPress={() => generateBillsMutation.mutate(c.id)}
                      disabled={generateBillsMutation.isPending}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, fontFamily: fontFamilyBold }}>{t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                  {cBills.map((b: any) => {
                    const isCash = b.paymentMethod === 'cash' || !b.paymentMethod;
                    return (
                      <TouchableOpacity 
                        key={b.id} 
                        style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: borderColor }}
                        onPress={() => {
                          if (b.status === 'pending' && isCash) {
                            Alert.alert(t('cashSettlement'), `${t('cashSettlementDesc')} ₹${b.totalAmount}.`, [
                              { text: t('cancelLabel'), style: "cancel" },
                              { text: t('enterOtpPrompt'), onPress: () => { setSelectedRequest({ id: b.id, type: 'bill' }); setShowCODModal(true); } }
                            ]);
                          }
                        }}
                      >
                        <View>
                          <Text style={{ color: textMuted, fontSize: 13, fontFamily }}>{new Date(b.createdAt).toLocaleDateString(language === 'English' ? 'en-IN' : 'mr-IN', { month: 'short', year: 'numeric' })}</Text>
                          <Text style={{ color: isCash ? '#CA8A04' : '#16A34A', fontSize: 10, fontWeight: '700', marginTop: 2, fontFamily: fontFamilyBold }}>
                            {isCash ? t('cashPayment') : t('onlinePaid')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <Text style={{ color: textColor, fontWeight: '700', fontFamily: fontFamilyBold }}>₹{b.totalAmount}</Text>
                          <View style={{ backgroundColor: b.status === 'paid' ? '#DCFCE7' : (isCash ? '#FEF9C3' : '#DBEAFE'), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: b.status === 'paid' ? '#16A34A' : (isCash ? '#CA8A04' : '#2563EB'), fontSize: 11, fontWeight: '700', fontFamily: fontFamilyBold }}>
                              {b.status === 'paid' ? t('settled') : (isCash ? t('payCash') : t('pendingLabel'))}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
            {(!customers || customers.length === 0) && <Text style={[styles.modalEmpty, { color: textMuted, fontFamily }]}>{t('noCustomersYet')}</Text>}
          </ScrollView>
        </View>
      </Modal>

    <Modal visible={showAnalyticsModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
          <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{selectedAnalyticsCustomer?.name} — {t('analytics')}</Text>
          <TouchableOpacity onPress={() => setShowAnalyticsModal(false)} style={styles.closeBtn}>
            <X size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const label = d.toLocaleDateString(language === 'English' ? 'en-IN' : 'mr-IN', { month: 'short', year: '2-digit' });
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setSelectedMonth(val)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: selectedMonth === val ? '#2563EB' : (isDark ? '#374151' : '#F3F4F6'), borderWidth: 1, borderColor: selectedMonth === val ? '#2563EB' : borderColor }}
                >
                  <Text style={{ color: selectedMonth === val ? '#FFFFFF' : textColor, fontWeight: '600', fontSize: 13, fontFamily }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedAnalyticsCustomer && (
            <View>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 16, padding: 16 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4, fontFamily }}>{t('revenue')}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', fontFamily: fontFamilyBold }}>₹{getCustomerMonthlyAnalytics(selectedAnalyticsCustomer.id).total.toFixed(0)}</Text>
                </LinearGradient>
                <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 16, padding: 16 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4, fontFamily }}>{t('volume')}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', fontFamily: fontFamilyBold }}>{Object.values(getCustomerMonthlyAnalytics(selectedAnalyticsCustomer.id).byDate).reduce((a:number, b:number) => a + b, 0).toFixed(1)}L</Text>
                </LinearGradient>
              </View>

              <View style={[styles.modalCard, { backgroundColor: surfaceColor, borderColor, padding: 16, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: textMuted, fontSize: 12, fontFamily }}>{t('topProduct')}</Text>
                    <Text style={{ color: textColor, fontWeight: '700', fontSize: 16, fontFamily: fontFamilyBold }}>{t('buffaloMilk')}</Text>
                  </View>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                    <TrendingUp size={20} color="#D97706" />
                  </View>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: textColor, fontSize: 15, marginBottom: 16, fontFamily: fontFamilyBold }]}>{t('deliveryHistory')}</Text>
              {Object.keys(getCustomerMonthlyAnalytics(selectedAnalyticsCustomer.id).byDate).length > 0 ? (
                Object.entries(getCustomerMonthlyAnalytics(selectedAnalyticsCustomer.id).byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, qty]) => (
                  <View key={date} style={[styles.tinyCard, { backgroundColor: surfaceColor, borderColor, paddingVertical: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Calendar size={16} color={textMuted} />
                      <Text style={{ color: textColor, fontWeight: '500', fontFamily }}>{date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: textColor, fontWeight: '700', fontFamily: fontFamilyBold }}>{qty as any}L</Text>
                      <CheckCircle size={14} color="#16A34A" />
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.emptyList, { borderColor }]}>
                  <Calendar size={32} color={textMuted} />
                  <Text style={[styles.emptyListTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('noOrdersLabel')}</Text>
                  <Text style={[styles.emptyListSub, { color: textMuted, fontFamily }]}>{t('noOrdersFound')}</Text>
                </View>
              )}
            </View>
          )}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 14, marginBottom: 2, fontFamily },
  businessName: { fontSize: 20, fontWeight: '700', fontFamily: fontFamilyBold },
  settingsBtn: {
    width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },

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
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', fontFamily: fontFamilyBold },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', alignSelf: 'center' },
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
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressCount: { fontSize: 28, fontWeight: '800', marginBottom: 4, fontFamily: fontFamilyBold },
  progressCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(37, 99, 235, 0.1)', justifyContent: 'center', alignItems: 'center' },
  progressBarBg: { height: 8, borderRadius: 4, width: '100%' },
  progressBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#2563EB' },

  // Web Grid Container
  webGridContainer: { flexDirection: 'column', gap: 12, marginBottom: 24 },
  webStatCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  statIconWrap: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 4, fontFamily: fontFamilyBold },
  statLabel: { fontSize: 12, fontWeight: '500', fontFamily },

  // Section Header Generic
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

  // List Cards
  listCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  listCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  listName: { fontSize: 16, fontWeight: '600', fontFamily: fontFamilyBold },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: fontFamilyBold },
  
  emptyList: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  emptyListTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 4, fontFamily: fontFamilyBold },
  emptyListSub: { fontSize: 14, textAlign: 'center', fontFamily },

  // Full Screen Modals
  modalWrapper: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 44 : 16, borderBottomWidth: 1 },
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
  routePreview: { marginTop: 8 },
  routeItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, height: 24 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, zIndex: 1 },
  routeLine: { position: 'absolute', left: 3, top: 12, width: 2, height: 20, backgroundColor: '#E5E7EB' },
  routeText: { fontSize: 14, flex: 1, fontFamily },
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

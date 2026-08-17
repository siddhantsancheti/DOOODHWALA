import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Share, useColorScheme, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import {
  Truck, Package, Clock, CheckCircle, MapPin, ArrowLeft,
  User, Star, Phone, MessageCircle, Share2, AlertCircle,
  Navigation, Route, Wifi, WifiOff,
} from 'lucide-react-native';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTranslation } from '../../contexts/LanguageContext';

// ─── Mapbox Directions (headless) ─────────────────────────────────────────────
// No map is rendered on this screen — the Directions API is used only to turn
// the milkman's live position into an ETA.
let directionsClient: any = null;
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

try {
  const mbxDirections = require('@mapbox/mapbox-sdk/services/directions').default;
  directionsClient = mbxDirections({ accessToken: MAPBOX_TOKEN });
} catch (_e) {
  // SDK not available (web preview)
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ROUTE_REFRESH_DISTANCE = 30; // metres milkman must move before recalculating route
const POLL_INTERVAL_MS = 8000;     // fallback polling when WS unavailable

// ─── Helpers ───────────────────────────────────────────────────────────────────
function haversineDistanceMetres(a: number[], b: number[]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 * Math.atan2(
      Math.sqrt(sinLat * sinLat + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * sinLon * sinLon),
      Math.sqrt(1 - sinLat * sinLat - Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * sinLon * sinLon),
    );
  return R * c;
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatETA(seconds: number): string {
  if (seconds < 60) return 'Under 1 min';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrackingScreen({ navigation }: any) {
  const { t, colors, isDark } = useTranslation();

  const surfaceColor = isDark ? '#1F1B17' : '#FFFFFF';
  const textColor    = isDark ? '#F5EFE5' : '#1A1714';
  const textMuted    = isDark ? '#A99B89' : '#5C5248';
  const borderColor  = isDark ? '#332C25' : '#E6DCCD';

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ['/api/orders/customer'],
    enabled: !!customerProfile,
    // Poll so the status flips to "out for delivery" live when the milkman starts.
    refetchInterval: 15000,
  });

  const { data: milkmanProfile } = useQuery<any>({
    queryKey: [`/api/milkmen/${customerProfile?.assignedMilkmanId || 0}`],
    enabled: !!customerProfile?.assignedMilkmanId,
  });

  // The customer's position in the milkman's delivery route.
  const { data: queue } = useQuery<any>({
    queryKey: ['/api/delivery/queue'],
    enabled: !!customerProfile?.assignedMilkmanId,
    refetchInterval: 15000,
  });

  // ── Tracking state ───────────────────────────────────────────────────────────
  const lastRouteCalcCoord     = useRef<number[] | null>(null);
  const pollTimerRef           = useRef<NodeJS.Timeout | null>(null);

  const [milkmanCoord, setMilkmanCoord]   = useState<number[] | null>(null);
  const [customerCoord, setCustomerCoord] = useState<number[] | null>(null);
  const [etaSeconds, setEtaSeconds]       = useState<number | null>(null);
  const [isGeocodingAddr, setIsGeocodingAddr] = useState(false);

  // ── Derive active order ───────────────────────────────────────────────────────
  const activeOrder = Array.isArray(orders)
    ? orders.find(o => ['pending', 'confirmed', 'out_for_delivery'].includes(o.status))
    : null;
  const isDelivered = Array.isArray(orders)
    ? orders.some(o => o.status === 'delivered' && new Date(o.updatedAt) > new Date(Date.now() - 2 * 60 * 60 * 1000))
    : false;

  // Live tracking (map/route) only once the milkman is actually out for delivery.
  const isOutForDelivery = activeOrder?.status === 'out_for_delivery';

  // Distance remaining + "arriving now" detection.
  const distanceM = (milkmanCoord && customerCoord)
    ? haversineDistanceMetres(milkmanCoord, customerCoord)
    : null;
  const isArriving = distanceM !== null && distanceM <= 150 && !isDelivered;

  // Buzz once when the milkman is arriving.
  const arrivedBuzzed = useRef(false);
  useEffect(() => {
    if (isArriving && !arrivedBuzzed.current) {
      arrivedBuzzed.current = true;
      try { Vibration.vibrate(400); } catch {}
    }
    if (!isArriving) arrivedBuzzed.current = false;
  }, [isArriving]);

  // ── Step 1: Geocode customer address ─────────────────────────────────────────
  useEffect(() => {
    if (!customerProfile?.address || customerCoord) return;
    // First try stored coords on profile
    if (customerProfile.latitude && customerProfile.longitude) {
      setCustomerCoord([parseFloat(customerProfile.longitude), parseFloat(customerProfile.latitude)]);
      return;
    }
    // Geocode via our server proxy
    setIsGeocodingAddr(true);
    apiRequest({
      url: `/api/delivery/geocode?address=${encodeURIComponent(customerProfile.address)}`,
      method: 'GET',
    })
      .then(r => r.json())
      .then((geo: any) => {
        if (geo.latitude && geo.longitude) {
          setCustomerCoord([geo.longitude, geo.latitude]);
        }
      })
      .catch(() => {})
      .finally(() => setIsGeocodingAddr(false));
  }, [customerProfile]);

  // ── Step 2: Fetch route (Mapbox Directions) ───────────────────────────────────
  const fetchRoute = useCallback(async (milkCoord: number[], custCoord: number[]) => {
    if (!directionsClient) return;
    try {
      const res = await directionsClient.getDirections({
        profile: 'driving-traffic',
        waypoints: [
          { coordinates: milkCoord },
          { coordinates: custCoord },
        ],
        geometries: 'geojson',
        overview: 'full',
        steps: false,
      }).send();

      const route = res?.body?.routes?.[0];
      if (!route) return;

      setEtaSeconds(route.duration);
    } catch (_) {}
  }, []);

  // ── Step 4: Handle incoming location (from WS or poll) ───────────────────────
  const handleNewLocation = useCallback((lat: number, lng: number) => {
    const newCoord: number[] = [lng, lat];
    setMilkmanCoord(newCoord);

    // Recalculate route only when milkman has moved enough
    if (!customerCoord) return;
    const shouldRecalc = !lastRouteCalcCoord.current ||
      haversineDistanceMetres(lastRouteCalcCoord.current, newCoord) >= ROUTE_REFRESH_DISTANCE;

    if (shouldRecalc) {
      lastRouteCalcCoord.current = newCoord;
      fetchRoute(newCoord, customerCoord);
    }
  }, [customerCoord, fetchRoute]);

  // ── WebSocket listener ────────────────────────────────────────────────────────
  const { isConnected, addMessageHandler, removeMessageHandler } = useWebSocket();

  useEffect(() => {
    if (!activeOrder || !milkmanProfile) return;
    const milkmanId = milkmanProfile.id || customerProfile?.assignedMilkmanId;

    const handler = (data: any) => {
      if (data.type === 'location_update' && data.milkmanId === milkmanId) {
        handleNewLocation(data.latitude, data.longitude);
      }
    };
    addMessageHandler('tracking-screen', handler);
    return () => removeMessageHandler('tracking-screen');
  }, [activeOrder, milkmanProfile, handleNewLocation, addMessageHandler, removeMessageHandler]);

  // ── Polling fallback (when WS unavailable) ────────────────────────────────────
  useEffect(() => {
    if (!activeOrder) return;

    const poll = async () => {
      try {
        const r = await apiRequest({ url: `/api/delivery/location/${activeOrder.id}`, method: 'GET' });
        const data: any = await r.json();
        if (data?.latitude && data?.longitude) {
          handleNewLocation(data.latitude, data.longitude);
        }
      } catch (_) {}
    };

    poll(); // immediate fetch

    if (!isConnected) {
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeOrder, isConnected, handleNewLocation]);

  // Stop polling once WS connects
  useEffect(() => {
    if (isConnected && pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [isConnected]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (profileLoading || ordersLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#22406E" />
        <Text style={{ marginTop: 12, color: textMuted }}>Loading tracking…</Text>
      </View>
    );
  }

  if (!activeOrder && !isDelivered) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.navBar, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: textColor }]}>{t('trackDelivery')}</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Package size={56} color="#A99B89" />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>{t('noActiveOrder')}</Text>
          <Text style={[styles.emptyDesc, { color: textMuted }]}>
            Place an order to track your milkman in real-time.
          </Text>
          <TouchableOpacity style={styles.placeOrderBtn} onPress={() => navigation.navigate('CustomerHome')}>
            <Package size={16} color="#fff" />
            <Text style={styles.placeOrderBtnText}>{t('placeNewOrder')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const milkman = milkmanProfile || {};
  const deliveryStatus: 'confirmed' | 'out_for_delivery' | 'delivered' = isDelivered
    ? 'delivered'
    : (activeOrder?.status === 'out_for_delivery' ? 'out_for_delivery' : 'confirmed');

  const statusConfig = {
    confirmed:        { label: 'Order Confirmed',    color: colors.primary, bg: '#F2F5FA', icon: CheckCircle },
    out_for_delivery: { label: 'Out for Delivery',   color: '#D97706', bg: '#FFFBEB', icon: Truck },
    delivered:        { label: 'Delivered! 🎉',      color: colors.success, bg: '#F1F8F3', icon: CheckCircle },
  };
  const sc = statusConfig[deliveryStatus];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ── Nav Bar ─────────────────────────────────────────────────────────── */}
      <View style={[styles.navBar, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textColor }]}>Track Order #{activeOrder?.id ?? ''}</Text>
        <View style={[styles.wsBadge, { backgroundColor: isConnected ? '#DFF0E6' : '#F0E9DE' }]}>
          {isConnected
            ? <Wifi size={13} color="#2F7D5B" />
            : <WifiOff size={13} color="#A99B89" />}
          <Text style={[styles.wsBadgeText, { color: isConnected ? '#2F7D5B' : '#A99B89' }]}>
            {isConnected ? 'Live' : 'Polling'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── ARRIVING NOW banner ──────────────────────────────────────────── */}
        {isArriving && (
          <View style={styles.arrivingBanner}>
            <Truck size={20} color="#fff" />
            <Text style={styles.arrivingText}>Arriving now — please be ready! 🥛</Text>
          </View>
        )}

        {/* ── STATUS BADGE ─────────────────────────────────────────────────── */}
        <View style={[styles.statusBanner, { backgroundColor: sc.bg }]}>
          <sc.icon size={20} color={sc.color} />
          <Text style={[styles.statusBannerText, { color: sc.color }]}>{sc.label}</Text>
          {milkmanCoord && distanceM !== null && deliveryStatus !== 'delivered' && (
            <View style={styles.etaChip}>
              <MapPin size={13} color={sc.color} />
              <Text style={[styles.etaChipText, { color: sc.color }]}>{formatDistance(distanceM)}</Text>
            </View>
          )}
          {milkmanCoord && etaSeconds !== null && deliveryStatus !== 'delivered' && (
            <View style={styles.etaChip}>
              <Clock size={13} color={sc.color} />
              <Text style={[styles.etaChipText, { color: sc.color }]}>{formatETA(etaSeconds)}</Text>
            </View>
          )}
        </View>

        {/* ── STOPS-AWAY (position in milkman's route) ──────────────────────── */}
        {deliveryStatus !== 'delivered' && queue?.yourStop && (queue.totalStops > 1) && (
          <View style={[styles.stopsCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Route size={16} color="#22406E" />
            <Text style={[styles.stopsText, { color: textColor }]}>
              You're stop <Text style={{ fontWeight: '800' }}>#{queue.yourStop}</Text> of {queue.totalStops}
              {typeof queue.stopsAhead === 'number'
                ? (queue.stopsAhead === 0
                    ? ' · you’re next!'
                    : ` · ~${queue.stopsAhead} stop${queue.stopsAhead === 1 ? '' : 's'} ahead of you`)
                : ''}
            </Text>
          </View>
        )}

        {/* ── ARRIVAL ──────────────────────────────────────────────────────────
            Two facts, large enough to read at a glance from a doorway: when the
            milk arrives, and how many stops are still ahead. No map — the
            numbers are what the customer actually acts on. */}
        <View style={[styles.arrivalCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.arrivalCol}>
            <View style={styles.arrivalLabelRow}>
              <Clock size={13} color={textMuted} />
              <Text style={[styles.arrivalLabel, { color: textMuted }]} numberOfLines={1}>
                Arriving in
              </Text>
            </View>
            <Text
              style={[styles.arrivalValue, { color: textColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {deliveryStatus === 'delivered'
                ? 'Delivered'
                : etaSeconds !== null
                  ? formatETA(etaSeconds)
                  : '—'}
            </Text>
            {deliveryStatus !== 'delivered' && etaSeconds === null && (
              <Text style={[styles.arrivalHint, { color: textMuted }]} numberOfLines={2}>
                {isOutForDelivery ? 'Waiting for location…' : 'Starts when your milkman sets off'}
              </Text>
            )}
          </View>

          <View style={[styles.arrivalDivider, { backgroundColor: borderColor }]} />

          <View style={styles.arrivalCol}>
            <View style={styles.arrivalLabelRow}>
              <Route size={13} color={textMuted} />
              <Text style={[styles.arrivalLabel, { color: textMuted }]} numberOfLines={1}>
                Before you
              </Text>
            </View>
            <Text
              style={[styles.arrivalValue, { color: textColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {deliveryStatus === 'delivered'
                ? '0'
                : typeof queue?.stopsAhead === 'number'
                  ? queue.stopsAhead
                  : '—'}
            </Text>
            <Text style={[styles.arrivalHint, { color: textMuted }]} numberOfLines={2}>
              {deliveryStatus === 'delivered'
                ? 'Order complete'
                : queue?.stopsAhead === 0
                  ? "You're next"
                  : typeof queue?.stopsAhead === 'number'
                    ? `${queue.stopsAhead === 1 ? 'delivery' : 'deliveries'} to go`
                    : ''}
            </Text>
          </View>
        </View>

        {/* ── MILKMAN INFO CARD ─────────────────────────────────────────────── */}
        <View style={[styles.milkmanCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.milkmanAvatar}>
            <Truck size={22} color="#22406E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.milkmanName, { color: textColor }]}>
              {milkman.contactName || milkman.businessName || 'Your Milkman'}
            </Text>
            <Text style={[styles.milkmanBiz, { color: textMuted }]}>
              {milkman.businessName || ''}
            </Text>
            <View style={styles.ratingRow}>
              <Star size={13} color="#D97706" fill="#D97706" />
              <Text style={styles.ratingText}>
                {milkman.rating ? parseFloat(milkman.rating).toFixed(1) : '4.8'}
                {milkman.totalReviews ? ` (${milkman.totalReviews} reviews)` : ' (verified)'}
              </Text>
            </View>
          </View>
          <View style={styles.milkmanActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.successLight }]}
              onPress={() => milkman.phone && Linking.openURL(`tel:${milkman.phone}`)}
              activeOpacity={0.8}
            >
              <Phone size={18} color="#2F7D5B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => navigation.navigate('YDPage')}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color="#22406E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DELIVERY TIMELINE ─────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{t('deliveryTimeline')}</Text>

          <View style={styles.timeline}>
            {/* Step 1 */}
            <View style={styles.timelineRow}>
              <View style={[styles.tlDot, { backgroundColor: colors.success }]}>
                <CheckCircle size={12} color="#fff" />
              </View>
              <View style={styles.tlLine} />
              <View style={styles.tlContent}>
                <Text style={[styles.tlTitle, { color: textColor }]}>{t('orderConfirmedLabel')}</Text>
                <Text style={[styles.tlSub, { color: textMuted }]}>{t('milkmanAcceptedOrder')}</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.timelineRow}>
              <View style={[styles.tlDot, {
                backgroundColor: deliveryStatus === 'confirmed' ? (isDark ? '#332C25' : '#E6DCCD') : '#D97706'
              }]}>
                <Truck size={12} color={deliveryStatus === 'confirmed' ? '#7A6E60' : '#fff'} />
              </View>
              <View style={styles.tlLine} />
              <View style={styles.tlContent}>
                <Text style={[styles.tlTitle, { color: deliveryStatus === 'confirmed' ? textMuted : textColor }]}>
                  Out for Delivery
                </Text>
                <Text style={[styles.tlSub, { color: textMuted }]}>
                  {deliveryStatus !== 'confirmed'
                    ? `${milkman.contactName || 'Your milkman'} is on the way`
                    : 'Preparing your delivery'}
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.timelineRow, { marginBottom: 0 }]}>
              <View style={[styles.tlDot, {
                backgroundColor: deliveryStatus === 'delivered' ? '#2F7D5B' : (isDark ? '#332C25' : '#E6DCCD')
              }]}>
                <CheckCircle size={12} color={deliveryStatus === 'delivered' ? '#fff' : '#7A6E60'} />
              </View>
              <View style={styles.tlContent}>
                <Text style={[styles.tlTitle, { color: deliveryStatus === 'delivered' ? '#2F7D5B' : textMuted }]}>
                  {deliveryStatus === 'delivered' ? '🎉 Delivered!' : 'Delivery Pending'}
                </Text>
                <Text style={[styles.tlSub, { color: textMuted }]}>
                  {deliveryStatus === 'delivered'
                    ? 'Your order has been delivered successfully'
                    : `Estimated: ${etaSeconds !== null ? formatETA(etaSeconds) : '—'}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── ORDER DETAILS ─────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{t('orderDetailsLabel')}</Text>
          <View style={styles.detailRow}>
            <Package size={16} color={textMuted} />
            <Text style={[styles.detailLabel, { color: textMuted }]}>{t('orderIdLabel')}</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>#{activeOrder?.id || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color={textMuted} />
            <Text style={[styles.detailLabel, { color: textMuted }]}>{t('deliveryTo')}</Text>
            <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>
              {customerProfile?.address || 'Your address'}
            </Text>
          </View>
          {activeOrder?.quantity && (
            <View style={styles.detailRow}>
              <Truck size={16} color={textMuted} />
              <Text style={[styles.detailLabel, { color: textMuted }]}>Quantity</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {activeOrder.quantity} L — ₹{parseFloat(activeOrder.totalAmount || '0').toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        {/* ── SHARE BUTTON ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => Share.share({ message: `Track my DOOODHWALA delivery in real-time! Order #${activeOrder?.id}` })}
          activeOpacity={0.8}
        >
          <Share2 size={16} color="#5C5248" />
          <Text style={styles.shareBtnText}>{t('shareTrackingInfo')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:   { padding: 16 },

  // Nav
  navBar: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, gap: 12,
  },
  backBtn:    { padding: 4 },
  navTitle:   { flex: 1, fontSize: 18, fontWeight: '700' },
  wsBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  wsBadgeText:{ fontSize: 11, fontWeight: '600' },

  // Empty state
  emptyWrap:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 60 },
  emptyIconWrap:  { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0E9DE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle:     { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  emptyDesc:      { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  placeOrderBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#22406E', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  placeOrderBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Arriving banner
  arrivingBanner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 12, backgroundColor: '#2F7D5B' },
  arrivingText:    { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Stops-away card
  // Arrival panel — two facts side by side. Each column flexes with
  // minWidth:0 and the numbers shrink to fit, so a long ETA string cannot
  // push the divider or the other column out of the card.
  arrivalCard:     { flexDirection: 'row', alignItems: 'stretch', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, ...shadows.md },
  arrivalCol:      { flex: 1, minWidth: 0 },
  arrivalDivider:  { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 16 },
  arrivalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  arrivalLabel:    { fontSize: 12, fontWeight: '600' },
  arrivalValue:    { fontSize: 30, fontWeight: '800' },
  arrivalHint:     { fontSize: 11, marginTop: 2, lineHeight: 15 },
  stopsCard:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  stopsText:       { fontSize: 13, flex: 1 },

  // Recenter button (floats over map)
  recenterBtn:     { position: 'absolute', right: 12, bottom: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5 },

  // Status banner
  statusBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  statusBannerText:{ fontSize: 15, fontWeight: '700', flex: 1 },
  etaChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  etaChipText:     { fontSize: 12, fontWeight: '700' },

  // Map
  mapUnavailableTitle: { fontSize: 15, fontWeight: '600', marginTop: 8 },

  // Markers
  customerPin: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#22406E',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  milkmanPinContainer: { alignItems: 'center', justifyContent: 'center' },
  milkmanPulse: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  milkmanPin: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#2F7D5B',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },

  // Map legend
  legendDotGreen:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2F7D5B' },
  legendDotBlue:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22406E' },
  legendLineBlue:  { width: 18, height: 3, borderRadius: 2, backgroundColor: '#22406E' },
  legendLineGrey:  { width: 18, height: 3, borderRadius: 2, backgroundColor: '#7A6E60' },

  // Milkman card
  milkmanCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16, ...shadows.sm,
  },
  milkmanAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#E4EAF3',
    justifyContent: 'center', alignItems: 'center',
  },
  milkmanName:    { fontSize: 16, fontWeight: '700' },
  milkmanBiz:     { fontSize: 13, marginTop: 1 },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText:     { fontSize: 12, color: '#D97706', fontWeight: '600' },
  milkmanActions: { gap: 8 },
  iconBtn:        { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  // Generic card
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16, ...shadows.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },

  // Detail rows
  detailRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  detailLabel:  { fontSize: 13, flex: 1 },
  detailValue:  { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  // Timeline
  timeline:     { gap: 0 },
  timelineRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  tlDot:        { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2, marginRight: 14 },
  tlLine: {
    position: 'absolute', left: 13, top: 30, bottom: -20, width: 2,
    backgroundColor: '#E6DCCD',
  },
  tlContent:    { flex: 1 },
  tlTitle:      { fontSize: 14, fontWeight: '600' },
  tlSub:        { fontSize: 12, marginTop: 2, lineHeight: 18 },

  // Share button
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F5EFE5', borderWidth: 1, borderColor: '#E6DCCD',
    paddingVertical: 14, borderRadius: 12, marginBottom: 16,
  },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: '#332C25' },
});

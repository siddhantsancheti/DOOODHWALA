import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Share, useColorScheme, Animated,
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

// ─── Mapbox native import (works on iOS & Android, not in web browser) ────────
let MapboxGL: any = null;
let directionsClient: any = null;
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

try {
  MapboxGL = require('@rnmapbox/maps').default;
  if (MAPBOX_TOKEN) {
    MapboxGL.setAccessToken(MAPBOX_TOKEN);
  }
  const mbxDirections = require('@mapbox/mapbox-sdk/services/directions').default;
  directionsClient = mbxDirections({ accessToken: MAPBOX_TOKEN });
} catch (_e) {
  // Native module not available (web preview)
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const MAP_HEIGHT = 380;
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
  const colorScheme = useColorScheme() || 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const isDark = colorScheme === 'dark';

  const surfaceColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColor    = isDark ? '#F9FAFB' : '#111827';
  const textMuted    = isDark ? '#9CA3AF' : '#4B5563';
  const borderColor  = isDark ? '#374151' : '#E5E7EB';

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ['/api/orders/customer'],
    enabled: !!customerProfile,
  });

  const { data: milkmanProfile } = useQuery<any>({
    queryKey: [`/api/milkmen/${customerProfile?.assignedMilkmanId || 0}`],
    enabled: !!customerProfile?.assignedMilkmanId,
  });

  // ── Map State ────────────────────────────────────────────────────────────────
  const cameraRef              = useRef<any>(null);
  const lastRouteCalcCoord     = useRef<number[] | null>(null);
  const pollTimerRef           = useRef<NodeJS.Timeout | null>(null);

  const [milkmanCoord, setMilkmanCoord]   = useState<number[] | null>(null);
  const [customerCoord, setCustomerCoord] = useState<number[] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON]   = useState<any | null>(null);
  const [breadcrumbs, setBreadcrumbs]     = useState<number[][]>([]);
  const [etaSeconds, setEtaSeconds]       = useState<number | null>(null);
  const [isGeocodingAddr, setIsGeocodingAddr] = useState(false); // shown in awaiting chip

  // ── Animated pulse for milkman marker ────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Derive active order ───────────────────────────────────────────────────────
  const activeOrder = Array.isArray(orders)
    ? orders.find(o => ['pending', 'confirmed', 'out_for_delivery'].includes(o.status))
    : null;
  const isDelivered = Array.isArray(orders)
    ? orders.some(o => o.status === 'delivered' && new Date(o.updatedAt) > new Date(Date.now() - 2 * 60 * 60 * 1000))
    : false;

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
  }, [customerProfile, customerCoord]);

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

      setRouteGeoJSON(route.geometry);
      setEtaSeconds(route.duration);

      // Fit camera to show both endpoints
      if (cameraRef.current) {
        const minLng = Math.min(milkCoord[0], custCoord[0]);
        const minLat = Math.min(milkCoord[1], custCoord[1]);
        const maxLng = Math.max(milkCoord[0], custCoord[0]);
        const maxLat = Math.max(milkCoord[1], custCoord[1]);
        cameraRef.current.fitBounds([minLng, minLat], [maxLng, maxLat], 60, 800);
      }
    } catch (_) {}
  }, []);

  // ── Step 3: Fetch location history for breadcrumbs ───────────────────────────
  const fetchBreadcrumbs = useCallback(async (orderId: number) => {
    try {
      const r = await apiRequest({ url: `/api/delivery/location/${orderId}/history`, method: 'GET' });
      const data: any = await r.json();
      if (data?.history?.length) {
        setBreadcrumbs(data.history.map((p: any) => [p.longitude, p.latitude]));
      }
    } catch (_) {}
  }, []);

  // ── Step 4: Handle incoming location (from WS or poll) ───────────────────────
  const handleNewLocation = useCallback((lat: number, lng: number) => {
    const newCoord: number[] = [lng, lat];
    setMilkmanCoord(newCoord);

    // Update breadcrumb trail
    setBreadcrumbs(prev => {
      const last = prev[prev.length - 1];
      if (!last || haversineDistanceMetres(last, newCoord) > 5) {
        return [...prev.slice(-49), newCoord]; // keep last 50 points
      }
      return prev;
    });

    // Recalculate route only when milkman has moved enough
    if (!customerCoord) return;
    const shouldRecalc = !lastRouteCalcCoord.current ||
      haversineDistanceMetres(lastRouteCalcCoord.current, newCoord) >= ROUTE_REFRESH_DISTANCE;

    if (shouldRecalc) {
      lastRouteCalcCoord.current = newCoord;
      fetchRoute(newCoord, customerCoord);
    }

    // Animate camera to follow milkman (gentle follow)
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: newCoord,
        zoomLevel: 15,
        animationDuration: 1500,
        animationMode: 'flyTo',
      });
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

    // Load initial location + breadcrumbs
    fetchBreadcrumbs(activeOrder.id);

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
  }, [activeOrder, isConnected, fetchBreadcrumbs, handleNewLocation]);

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
        <ActivityIndicator size="large" color="#2563EB" />
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
          <Text style={[styles.navTitle, { color: textColor }]}>Track Delivery</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Package size={56} color="#9CA3AF" />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>No Active Order</Text>
          <Text style={[styles.emptyDesc, { color: textMuted }]}>
            Place an order to track your milkman in real-time.
          </Text>
          <TouchableOpacity style={styles.placeOrderBtn} onPress={() => navigation.navigate('CustomerHome')}>
            <Package size={16} color="#fff" />
            <Text style={styles.placeOrderBtnText}>Place New Order</Text>
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
    confirmed:        { label: 'Order Confirmed',    color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle },
    out_for_delivery: { label: 'Out for Delivery',   color: '#D97706', bg: '#FFFBEB', icon: Truck },
    delivered:        { label: 'Delivered! 🎉',      color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle },
  };
  const sc = statusConfig[deliveryStatus];

  const breadcrumbGeoJSON = breadcrumbs.length > 1 ? {
    type: 'LineString' as const,
    coordinates: breadcrumbs,
  } : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ── Nav Bar ─────────────────────────────────────────────────────────── */}
      <View style={[styles.navBar, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textColor }]}>Track Order #{activeOrder?.id ?? ''}</Text>
        <View style={[styles.wsBadge, { backgroundColor: isConnected ? '#DCFCE7' : '#F3F4F6' }]}>
          {isConnected
            ? <Wifi size={13} color="#16A34A" />
            : <WifiOff size={13} color="#9CA3AF" />}
          <Text style={[styles.wsBadgeText, { color: isConnected ? '#16A34A' : '#9CA3AF' }]}>
            {isConnected ? 'Live' : 'Polling'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── STATUS BADGE ─────────────────────────────────────────────────── */}
        <View style={[styles.statusBanner, { backgroundColor: sc.bg }]}>
          <sc.icon size={20} color={sc.color} />
          <Text style={[styles.statusBannerText, { color: sc.color }]}>{sc.label}</Text>
          {milkmanCoord && etaSeconds !== null && deliveryStatus !== 'delivered' && (
            <View style={styles.etaChip}>
              <Clock size={13} color={sc.color} />
              <Text style={[styles.etaChipText, { color: sc.color }]}>{formatETA(etaSeconds)}</Text>
            </View>
          )}
        </View>

        {/* ── MAP ──────────────────────────────────────────────────────────── */}
        <View style={[styles.mapCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.mapCardHeader}>
            <Route size={18} color={textColor} />
            <Text style={[styles.mapCardTitle, { color: textColor }]}>Live Route</Text>
            {!milkmanCoord && (
              <View style={styles.awaitingChip}>
                <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.awaitingText}>
                  {isGeocodingAddr ? 'Locating your address…' : 'Awaiting milkman location…'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.mapWrap}>
            {MapboxGL ? (
              <MapboxGL.MapView
                style={{ flex: 1 }}
                styleURL="mapbox://styles/mapbox/streets-v12"
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled
                rotateEnabled={false}
              >
                <MapboxGL.Camera
                  ref={cameraRef}
                  zoomLevel={14}
                  centerCoordinate={
                    milkmanCoord || customerCoord || [78.9629, 20.5937] // India center fallback
                  }
                  animationMode="flyTo"
                  animationDuration={1000}
                />

                {/* ── POI labels — direct child of MapView, references built-in style source ── */}
                {MapboxGL.SymbolLayer && (
                  <MapboxGL.SymbolLayer
                    id="poi-labels"
                    sourceID="composite"
                    sourceLayerID="poi_label"
                    style={{
                      textField: '{name}',
                      textSize: 11,
                      textOffset: [0, 1.2],
                      textAnchor: 'top',
                      textColor: isDark ? '#93C5FD' : '#2563EB',
                      textHaloColor: isDark ? '#111827' : '#FFFFFF',
                      textHaloWidth: 1.5,
                    }}
                    filter={['any',
                      ['==', ['get', 'category'], 'hospital'],
                      ['==', ['get', 'category'], 'school'],
                      ['==', ['get', 'category'], 'pharmacy'],
                      ['==', ['get', 'category'], 'restaurant'],
                      ['==', ['get', 'category'], 'cafe'],
                      ['==', ['get', 'category'], 'grocery'],
                    ]}
                  />
                )}

                {/* ── Customer destination pin ───────────────────────────── */}
                {customerCoord && (
                  <MapboxGL.PointAnnotation id="customer-pin" coordinate={customerCoord}>
                    <View style={styles.customerPin}>
                      <MapPin size={14} color="#fff" />
                    </View>
                  </MapboxGL.PointAnnotation>
                )}

                {/* ── Milkman truck marker with pulse ring ──────────────── */}
                {milkmanCoord && (
                  <MapboxGL.PointAnnotation id="milkman-pin" coordinate={milkmanCoord}>
                    <View style={styles.milkmanPinContainer}>
                      <Animated.View style={[styles.milkmanPulse, { transform: [{ scale: pulseAnim }] }]} />
                      <View style={styles.milkmanPin}>
                        <Truck size={16} color="#fff" />
                      </View>
                    </View>
                  </MapboxGL.PointAnnotation>
                )}

                {/* ── Blue driving-route polyline ────────────────────────── */}
                {routeGeoJSON && (
                  <MapboxGL.ShapeSource id="route-source" shape={routeGeoJSON}>
                    <MapboxGL.LineLayer
                      id="route-shadow"
                      style={{ lineColor: '#93C5FD', lineWidth: 9, lineOpacity: 0.4, lineCap: 'round', lineJoin: 'round' }}
                    />
                    <MapboxGL.LineLayer
                      id="route-line"
                      style={{ lineColor: '#2563EB', lineWidth: 5, lineOpacity: 1, lineCap: 'round', lineJoin: 'round' }}
                    />
                    <MapboxGL.LineLayer
                      id="route-dash"
                      style={{ lineColor: '#FFFFFF', lineWidth: 2, lineDasharray: [2, 3], lineCap: 'round' }}
                    />
                  </MapboxGL.ShapeSource>
                )}

                {/* ── Grey breadcrumb trail (path already traveled) ─────── */}
                {breadcrumbGeoJSON && breadcrumbs.length > 1 && (
                  <MapboxGL.ShapeSource id="breadcrumb-source" shape={breadcrumbGeoJSON}>
                    <MapboxGL.LineLayer
                      id="breadcrumb-line"
                      style={{ lineColor: '#6B7280', lineWidth: 3, lineOpacity: 0.6, lineCap: 'round', lineDasharray: [1, 2] }}
                    />
                  </MapboxGL.ShapeSource>
                )}
              </MapboxGL.MapView>
            ) : (
              /* Fallback for when native module isn't loaded */
              <View style={[styles.mapUnavailable, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <Navigation size={40} color="#2563EB" />
                <Text style={[styles.mapUnavailableTitle, { color: textColor }]}>Map Loading…</Text>
                <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Ensure you are running on a real device or emulator
                </Text>
              </View>
            )}
          </View>

          {/* ── Map legend ─────────────────────────────────────────────────── */}
          <View style={[styles.mapLegend, { borderTopColor: borderColor }]}>
            <View style={styles.legendItem}>
              <View style={styles.legendDotGreen} />
              <Text style={[styles.legendText, { color: textMuted }]}>Your Milkman</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDotBlue} />
              <Text style={[styles.legendText, { color: textMuted }]}>Your Home</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendLineBlue} />
              <Text style={[styles.legendText, { color: textMuted }]}>Route</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendLineGrey} />
              <Text style={[styles.legendText, { color: textMuted }]}>Path taken</Text>
            </View>
          </View>
        </View>

        {/* ── MILKMAN INFO CARD ─────────────────────────────────────────────── */}
        <View style={[styles.milkmanCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.milkmanAvatar}>
            <Truck size={22} color="#2563EB" />
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
              style={[styles.iconBtn, { backgroundColor: '#DCFCE7' }]}
              onPress={() => milkman.phone && Linking.openURL(`tel:${milkman.phone}`)}
              activeOpacity={0.8}
            >
              <Phone size={18} color="#16A34A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#EFF6FF' }]}
              onPress={() => navigation.navigate('YDPage')}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DELIVERY TIMELINE ─────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Delivery Timeline</Text>

          <View style={styles.timeline}>
            {/* Step 1 */}
            <View style={styles.timelineRow}>
              <View style={[styles.tlDot, { backgroundColor: '#16A34A' }]}>
                <CheckCircle size={12} color="#fff" />
              </View>
              <View style={styles.tlLine} />
              <View style={styles.tlContent}>
                <Text style={[styles.tlTitle, { color: textColor }]}>Order Confirmed</Text>
                <Text style={[styles.tlSub, { color: textMuted }]}>Milkman has accepted your order</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.timelineRow}>
              <View style={[styles.tlDot, {
                backgroundColor: deliveryStatus === 'confirmed' ? (isDark ? '#374151' : '#E5E7EB') : '#D97706'
              }]}>
                <Truck size={12} color={deliveryStatus === 'confirmed' ? '#6B7280' : '#fff'} />
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
                backgroundColor: deliveryStatus === 'delivered' ? '#16A34A' : (isDark ? '#374151' : '#E5E7EB')
              }]}>
                <CheckCircle size={12} color={deliveryStatus === 'delivered' ? '#fff' : '#6B7280'} />
              </View>
              <View style={styles.tlContent}>
                <Text style={[styles.tlTitle, { color: deliveryStatus === 'delivered' ? '#16A34A' : textMuted }]}>
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
          <Text style={[styles.sectionTitle, { color: textColor }]}>Order Details</Text>
          <View style={styles.detailRow}>
            <Package size={16} color={textMuted} />
            <Text style={[styles.detailLabel, { color: textMuted }]}>Order ID</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>#{activeOrder?.id || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color={textMuted} />
            <Text style={[styles.detailLabel, { color: textMuted }]}>Delivery To</Text>
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
          <Share2 size={16} color="#4B5563" />
          <Text style={styles.shareBtnText}>Share Tracking Info</Text>
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
  emptyIconWrap:  { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle:     { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  emptyDesc:      { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  placeOrderBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  placeOrderBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Status banner
  statusBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  statusBannerText:{ fontSize: 15, fontWeight: '700', flex: 1 },
  etaChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  etaChipText:     { fontSize: 12, fontWeight: '700' },

  // Map
  mapCard:       { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden', ...shadows.md },
  mapCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 12 },
  mapCardTitle:  { fontSize: 16, fontWeight: '700', flex: 1 },
  awaitingChip:  { flexDirection: 'row', alignItems: 'center' },
  awaitingText:  { fontSize: 11, color: '#6B7280' },
  mapWrap:       { height: MAP_HEIGHT },
  mapUnavailable:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  mapUnavailableTitle: { fontSize: 15, fontWeight: '600', marginTop: 8 },

  // Markers
  customerPin: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB',
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
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#16A34A',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },

  // Map legend
  mapLegend:    { flexDirection: 'row', padding: 12, gap: 14, flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText:   { fontSize: 11 },
  legendDotGreen:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A' },
  legendDotBlue:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  legendLineBlue:  { width: 18, height: 3, borderRadius: 2, backgroundColor: '#2563EB' },
  legendLineGrey:  { width: 18, height: 3, borderRadius: 2, backgroundColor: '#9CA3AF' },

  // Milkman card
  milkmanCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16, ...shadows.sm,
  },
  milkmanAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFF6FF',
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
    backgroundColor: '#E5E7EB',
  },
  tlContent:    { flex: 1 },
  tlTitle:      { fontSize: 14, fontWeight: '600' },
  tlSub:        { fontSize: 12, marginTop: 2, lineHeight: 18 },

  // Share button
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 14, borderRadius: 12, marginBottom: 16,
  },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});

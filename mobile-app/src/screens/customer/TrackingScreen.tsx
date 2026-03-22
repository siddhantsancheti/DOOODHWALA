import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import {
  Truck, Package, Clock, CheckCircle, MapPin, ArrowLeft,
  User, Star, Phone, MessageCircle, Share2, Timer, AlertCircle, Navigation
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const isExpoGo = Constants.appOwnership === 'expo';

let Mapbox: any = null;
let directionsClient: any = null;
if (!isExpoGo) {
  try {
    Mapbox = require('@rnmapbox/maps').default;
    const mbxDirections = require('@mapbox/mapbox-sdk/services/directions').default;
    const MapboxToken: string = (Mapbox.getAccessToken() as unknown as string) || (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
    directionsClient = mbxDirections({ accessToken: MapboxToken });
  } catch(e) { /* ignore map error */ }
}

export default function TrackingScreen({ navigation }: any) {
  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({ queryKey: ['/api/customers/profile'] });
  const { data: orders, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ['/api/orders/customer'], enabled: !!customerProfile,
  });

  const { data: milkmanProfile } = useQuery<any>({
    queryKey: [`/api/milkmen/${customerProfile?.assignedMilkmanId || 1}`],
    enabled: true,
  });

  const [milkmanLocation, setMilkmanLocation] = useState<number[] | null>(null);
  const [customerCoords, setCustomerCoords] = useState<number[] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.LineString | null>(null);
  const [breadcrumbSteps, setBreadcrumbSteps] = useState<number[][]>([]);
  const [routeDuration, setRouteDuration] = useState<string>('15 mins');
  const [progress, setProgress] = useState(0);
  const [deliveryStatus, setDeliveryStatus] = useState<'confirmed' | 'out_for_delivery' | 'nearby' | 'delivered'>('confirmed');
  const cameraRef = useRef<any>(null);

  const activeOrder = Array.isArray(orders)
    ? orders.find((o) => ['pending', 'confirmed', 'out_for_delivery', 'delivered'].includes(o.status))
    : null;

  useEffect(() => {
    if (customerProfile?.address) {
      setCustomerCoords([79.0882, 21.1458]);
    }
  }, [customerProfile]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeOrder) {
      const fetchLocation = async () => {
        try {
          const res = await apiRequest({ url: `/api/delivery/location/${activeOrder.id}`, method: 'GET' });
          const rawData = await res.json();
          if (rawData.latitude && rawData.longitude) {
            const newLoc = [rawData.longitude, rawData.latitude];
            setMilkmanLocation(newLoc);
            setBreadcrumbSteps((prev) => {
              if (prev.length === 0 || prev[prev.length - 1][0] !== newLoc[0]) return [...prev, newLoc];
              return prev;
            });
          }
        } catch (e) { /* offline/no data */ }
      };
      fetchLocation();
      interval = setInterval(fetchLocation, 10000);
    }
    return () => clearInterval(interval);
  }, [activeOrder]);

  useEffect(() => {
    if (milkmanLocation && customerCoords && directionsClient) {
      directionsClient.getDirections({
        profile: 'driving-traffic',
        waypoints: [{ coordinates: milkmanLocation }, { coordinates: customerCoords }],
        geometries: 'geojson',
      }).send().then((response: any) => {
        const route = response.body.routes[0];
        if (route) {
          setRouteGeoJSON(route.geometry as GeoJSON.LineString);
          setRouteDuration(`${Math.max(1, Math.round(route.duration / 60))} mins`);
          if (cameraRef.current) {
            cameraRef.current.fitBounds(
              [Math.min(milkmanLocation[0], customerCoords[0]), Math.min(milkmanLocation[1], customerCoords[1])],
              [Math.max(milkmanLocation[0], customerCoords[0]), Math.max(milkmanLocation[1], customerCoords[1])],
              50, 1000
            );
          }
        }
      }).catch(() => {});
    }
  }, [milkmanLocation, customerCoords]);

  // Simulate progress
  useEffect(() => {
    if (activeOrder?.status === 'delivered') {
      setProgress(100);
      setDeliveryStatus('delivered');
      return;
    }
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 2, 95);
        if (newProgress >= 90) {
          setDeliveryStatus('nearby');
          setRouteDuration('2 mins');
        } else if (newProgress >= 50) {
          setDeliveryStatus('out_for_delivery');
          setRouteDuration('8 mins');
        } else {
          setDeliveryStatus('confirmed');
          setRouteDuration('15 mins');
        }
        return newProgress;
      });
    }, 3000);
    return () => clearInterval(progressTimer);
  }, [activeOrder?.status]);

  if (profileLoading || ordersLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
           <TouchableOpacity style={styles.backBtnHeader} onPress={() => navigation.goBack()} activeOpacity={0.8}>
             <ArrowLeft size={20} color={colors.foreground} />
           </TouchableOpacity>
           <Text style={styles.pageTitleHeader}>Track Delivery</Text>
        </View>
        <View style={styles.emptyState}>
          <Package size={64} color={colors.gray400} />
          <Text style={styles.emptyTitle}>No Active Orders</Text>
          <Text style={styles.emptyDesc}>You don't have any active orders at the moment. Place an order to track your delivery in real-time.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CustomerDashboard')}>
            <Package size={16} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.emptyBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getProgressColor = () => {
    switch (deliveryStatus) {
      case 'confirmed': return '#3B82F6';
      case 'out_for_delivery': return '#10B981';
      case 'nearby': return '#EF4444';
      case 'delivered': return '#10B981';
      default: return colors.gray500;
    }
  };

  const currentMilkman = milkmanProfile || {
    contactName: "Rajesh Kumar",
    businessName: "Fresh Milk Dairy",
    phone: "+919876543200",
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
           <TouchableOpacity style={styles.backBtnHeader} onPress={() => navigation.goBack()} activeOpacity={0.8}>
             <ArrowLeft size={24} color={colors.foreground} />
           </TouchableOpacity>
           <Text style={styles.pageTitleHeader}>Track Delivery</Text>
        </View>

        {/* Order Summary Card */}
        <View style={[styles.card, { paddingBottom: spacing.md }]}>
          <View style={styles.orderSummaryHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Package size={20} color={colors.primary} />
              <Text style={styles.orderIdText}>Order #{activeOrder.id}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveBadgeText}>Live Tracking</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryGrid}>
            <View style={styles.gridItem}>
              <View style={styles.gridLabelRow}>
                <Clock size={14} color={colors.gray500} />
                <Text style={styles.gridLabel}>Estimated Delivery</Text>
              </View>
              <Text style={styles.gridValGreen}>{routeDuration}</Text>
            </View>
            
            <View style={styles.gridItem}>
              <View style={styles.gridLabelRow}>
                <User size={14} color={colors.gray500} />
                <Text style={styles.gridLabel}>Delivery Partner</Text>
              </View>
              <Text style={styles.gridValBold}>{currentMilkman.contactName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Star size={12} color="#D97706" fill="#D97706" />
                <Text style={styles.gridValSub}>4.8 (127 reviews)</Text>
              </View>
            </View>
            
            <View style={styles.gridItemFull}>
              <View style={styles.gridLabelRow}>
                <MapPin size={14} color={colors.gray500} />
                <Text style={styles.gridLabel}>Delivery Address</Text>
              </View>
              <Text style={styles.gridValNormal}>{customerProfile.address || 'Your Address'}</Text>
            </View>
          </View>
        </View>

        {/* Progress Bar Card */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Order Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}% Complete</Text>
          </View>
          
          <View style={styles.progressTrackBg}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: getProgressColor() }]} />
          </View>
          
          <View style={styles.progressStepsRow}>
             <View style={styles.progressStep}>
               <CheckCircle size={20} color={progress >= 0 ? '#16A34A' : colors.gray400} />
               <Text style={[styles.progressStepText, { color: progress >= 0 ? '#16A34A' : colors.gray400 }]}>Confirmed</Text>
             </View>
             <View style={styles.progressStep}>
               <Truck size={20} color={progress >= 50 ? '#16A34A' : colors.gray400} />
               <Text style={[styles.progressStepText, { color: progress >= 50 ? '#16A34A' : colors.gray400 }]}>Out for Delivery</Text>
             </View>
             <View style={styles.progressStep}>
               <CheckCircle size={20} color={progress >= 100 ? '#16A34A' : colors.gray400} />
               <Text style={[styles.progressStepText, { color: progress >= 100 ? '#16A34A' : colors.gray400 }]}>Delivered</Text>
             </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${currentMilkman.phone}`)} activeOpacity={0.8}>
            <Phone size={18} color={colors.white} />
            <Text style={styles.callBtnText}>Call Partner</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRowSecondary}>
          <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('YDPage')} activeOpacity={0.8}>
            <MessageCircle size={18} color="#2563EB" />
            <Text style={styles.chatBtnText}>Chat with Partner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => Share.share({ message: 'Track my DOOODHWALA delivery here!' })} activeOpacity={0.8}>
            <Share2 size={18} color={colors.gray600} />
            <Text style={styles.shareBtnText}>Share Tracking</Text>
          </TouchableOpacity>
        </View>

        {/* Map Card */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          <View style={styles.cardHeaderWithIcon}>
             <Navigation size={18} color={colors.foreground} />
             <Text style={styles.cardTitle}>Delivery Route</Text>
          </View>
          <View style={styles.mapWrap}>
            {isExpoGo ? (
              <View style={styles.mapPlaceholder}>
                <Text style={{ fontSize: 32 }}>🗺️</Text>
                <Text style={styles.mapPlaceholderTitle}>Map available in production</Text>
              </View>
            ) : (
              <Mapbox.MapView style={{ flex: 1 }} logoEnabled={false} compassEnabled scrollEnabled={false}>
                <Mapbox.Camera ref={cameraRef} zoomLevel={14} centerCoordinate={customerCoords || [79.0882, 21.1458]} />
                {customerCoords && (
                  <Mapbox.PointAnnotation id="cust" coordinate={customerCoords}>
                    <View style={styles.customerPin}><MapPin color={colors.white} size={14} /></View>
                  </Mapbox.PointAnnotation>
                )}
                {milkmanLocation && (
                  <Mapbox.PointAnnotation id="milk" coordinate={milkmanLocation}>
                    <View style={styles.milkmanPin}><Truck color={colors.white} size={16} /></View>
                  </Mapbox.PointAnnotation>
                )}
                {routeGeoJSON && (
                  <Mapbox.ShapeSource id="route" shape={routeGeoJSON}>
                    <Mapbox.LineLayer id="routeL" style={{ lineColor: colors.primary, lineWidth: 4 }} />
                  </Mapbox.ShapeSource>
                )}
              </Mapbox.MapView>
            )}
          </View>
        </View>

        {/* Timeline Card */}
        <View style={[styles.card, { marginBottom: 40 }]}>
          <View style={styles.cardHeaderWithIcon}>
            <Timer size={18} color={colors.foreground} />
            <Text style={styles.cardTitle}>Delivery Timeline</Text>
          </View>
          <View style={styles.timelineList}>
            <View style={[styles.timelineItem, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle size={20} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.tlTitle}>Order Confirmed</Text>
                <Text style={styles.tlDesc}>Your order has been confirmed and is being prepared</Text>
              </View>
            </View>
            {progress >= 50 && (
              <View style={[styles.timelineItem, { backgroundColor: '#EFF6FF' }]}>
                <Truck size={20} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tlTitle}>Out for Delivery</Text>
                  <Text style={styles.tlDesc}>{currentMilkman.contactName} is on the way</Text>
                </View>
              </View>
            )}
            {progress >= 90 && (
              <View style={[styles.timelineItem, { backgroundColor: '#FEF2F2' }]}>
                <AlertCircle size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tlTitle}>Nearby</Text>
                  <Text style={styles.tlDesc}>Your delivery partner is almost at your location</Text>
                </View>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingHorizontal: spacing.xl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, marginTop: spacing.sm },
  backBtnHeader: { padding: spacing.xs },
  pageTitleHeader: { fontSize: 22, fontWeight: '700', color: colors.foreground },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing['2xl'] },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginTop: spacing.xl },
  emptyDesc: { fontSize: fontSize.base, color: colors.gray600, textAlign: 'center', marginVertical: spacing.lg, lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: borderRadius.md },
  emptyBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  cardHeaderWithIcon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  // Summary
  orderSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdText: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  liveBadgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  gridItem: { width: '45%' },
  gridItemFull: { width: '100%' },
  gridLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  gridLabel: { fontSize: 13, color: colors.gray600, fontWeight: '500' },
  gridValGreen: { fontSize: 22, fontWeight: '800', color: '#16A34A' },
  gridValBold: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  gridValSub: { fontSize: 12, color: '#B45309' },
  gridValNormal: { fontSize: 14, color: colors.gray700 },

  // Progress Bar
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  progressTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  progressPercent: { fontSize: 14, color: colors.gray600 },
  progressTrackBg: { width: '100%', height: 8, backgroundColor: colors.gray200, borderRadius: 4, marginBottom: spacing.lg },
  progressFill: { height: '100%', borderRadius: 4 },
  progressStepsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.sm },
  progressStep: { alignItems: 'center', gap: 4 },
  progressStepText: { fontSize: 11, fontWeight: '500' },

  // Actions
  actionsRow: { marginBottom: spacing.sm },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#16A34A', height: 48, borderRadius: borderRadius.md },
  callBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
  
  actionsRowSecondary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#F8FAFC' },
  chatBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  shareBtnText: { color: colors.gray600, fontSize: 14, fontWeight: '600' },

  // Map
  mapWrap: { height: 250, width: '100%', backgroundColor: colors.gray100 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapPlaceholderTitle: { fontSize: 13, marginTop: 8, color: colors.gray500, fontWeight: '500' },
  customerPin: { backgroundColor: colors.destructive, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white, ...shadows.sm },
  milkmanPin: { backgroundColor: colors.success, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white, ...shadows.sm },

  // Timeline
  timelineList: { gap: spacing.sm },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.md },
  tlTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 2 },
  tlDesc: { fontSize: 13, color: colors.gray600, lineHeight: 18 },
});

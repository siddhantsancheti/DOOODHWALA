import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Truck, Package, Clock, CheckCircle, MapPin } from 'lucide-react-native';
import Constants from 'expo-constants';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const isExpoGo = Constants.appOwnership === 'expo';

let Mapbox: any = null;
let directionsClient: any = null;
if (!isExpoGo) {
  Mapbox = require('@rnmapbox/maps').default;
  const mbxDirections = require('@mapbox/mapbox-sdk/services/directions').default;
  const MapboxToken: string = (Mapbox.getAccessToken() as unknown as string) || (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
  directionsClient = mbxDirections({ accessToken: MapboxToken });
}

export default function TrackingScreen() {
  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({ queryKey: ['/api/customers/profile'] });
  const { data: orders, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ['/api/orders/customer'], enabled: !!customerProfile,
  });

  const [milkmanLocation, setMilkmanLocation] = useState<number[] | null>(null);
  const [customerCoords, setCustomerCoords] = useState<number[] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.LineString | null>(null);
  const [breadcrumbSteps, setBreadcrumbSteps] = useState<number[][]>([]);
  const [routeDuration, setRouteDuration] = useState<string>('Calculating...');
  const cameraRef = useRef<any>(null);

  const activeOrder = Array.isArray(orders)
    ? orders.find((o) => ['pending', 'confirmed', 'out_for_delivery'].includes(o.status))
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
          setRouteDuration(`${Math.round(route.duration / 60)} min`);
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

  if (profileLoading || ordersLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!activeOrder) {
    return (
      <View style={styles.emptyState}>
        <Package size={64} color={colors.gray300} />
        <Text style={styles.emptyTitle}>No Active Deliveries</Text>
        <Text style={styles.emptyDesc}>You have no orders currently out for delivery.</Text>
      </View>
    );
  }

  const renderStatusPanel = () => (
    <View style={styles.bottomPanel}>
      <View style={styles.statusHeader}>
        <View style={styles.statusIconBox}>
          <Truck size={28} color={colors.success} />
        </View>
        <View style={{ marginLeft: spacing.lg }}>
          <Text style={styles.statusText}>
            {activeOrder.status === 'out_for_delivery' ? 'On The Way' : 'Order Confirmed'}
          </Text>
          {milkmanLocation ? (
            <Text style={styles.statusSub}>Arriving in ~{routeDuration}</Text>
          ) : (
            <Text style={styles.statusSub}>Waiting for milkman location...</Text>
          )}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineRow}>
          <CheckCircle size={20} color={colors.success} />
          <View style={[styles.timelineLine, { backgroundColor: colors.success }]} />
          <CheckCircle size={20} color={activeOrder.status === 'out_for_delivery' ? colors.success : colors.gray300} />
          <View style={[styles.timelineLine, { backgroundColor: activeOrder.status === 'out_for_delivery' ? colors.success : colors.gray300 }]} />
          <Clock size={20} color={colors.gray300} />
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabelActive}>Confirmed</Text>
          <Text style={activeOrder.status === 'out_for_delivery' ? styles.timelineLabelActive : styles.timelineLabelInactive}>
            Out for Delivery
          </Text>
          <Text style={styles.timelineLabelInactive}>Delivered</Text>
        </View>
      </View>

      <View style={styles.orderSummary}>
        <Text style={styles.summaryTitle}>Tracking Order #{activeOrder.id}</Text>
        <Text style={styles.summaryText}>
          {activeOrder.quantity}x {activeOrder.itemName || 'Milk'} • ₹{activeOrder.totalAmount}
        </Text>
      </View>
    </View>
  );

  if (isExpoGo) {
    return (
      <View style={styles.container}>
        <View style={styles.mapPlaceholder}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text style={styles.mapPlaceholderTitle}>Map available in production build</Text>
          <Text style={styles.mapPlaceholderSub}>Tracking data works — map requires EAS build</Text>
        </View>
        {renderStatusPanel()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Mapbox.MapView style={styles.map} logoEnabled={false} compassEnabled>
          <Mapbox.Camera ref={cameraRef} zoomLevel={14} centerCoordinate={customerCoords || [79.0882, 21.1458]} animationMode="flyTo" animationDuration={1500} />
          {customerCoords && (
            <Mapbox.PointAnnotation id="customer" coordinate={customerCoords}>
              <View style={styles.customerPin}><MapPin color={colors.white} size={16} /></View>
            </Mapbox.PointAnnotation>
          )}
          {milkmanLocation && (
            <Mapbox.PointAnnotation id="milkman" coordinate={milkmanLocation}>
              <View style={styles.milkmanPin}><Truck color={colors.white} size={18} /></View>
            </Mapbox.PointAnnotation>
          )}
          {routeGeoJSON && (
            <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
              <Mapbox.LineLayer id="routeFill" style={{ lineColor: colors.primary, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} />
            </Mapbox.ShapeSource>
          )}
          {breadcrumbSteps.length > 1 && (
            <Mapbox.ShapeSource id="breadcrumbSource" shape={{ type: 'LineString', coordinates: breadcrumbSteps }}>
              <Mapbox.LineLayer id="breadcrumbFill" style={{ lineColor: colors.gray400, lineWidth: 4, lineDasharray: [1, 2] }} />
            </Mapbox.ShapeSource>
          )}
        </Mapbox.MapView>
      </View>
      {renderStatusPanel()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  mapContainer: { flex: 1, backgroundColor: colors.gray200 },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1, backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center',
  },
  mapPlaceholderTitle: {
    fontSize: fontSize.base, color: colors.mutedForeground, fontWeight: fontWeight.semibold, marginTop: spacing.md,
  },
  mapPlaceholderSub: {
    fontSize: fontSize.sm, color: colors.gray400, marginTop: spacing.xs,
  },

  // Pins
  customerPin: {
    backgroundColor: colors.destructive, width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white,
    ...shadows.md,
  },
  milkmanPin: {
    backgroundColor: colors.success, width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white,
    ...shadows.md,
  },

  // Bottom Panel
  bottomPanel: {
    backgroundColor: colors.card, borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'], padding: spacing['2xl'],
    paddingBottom: spacing['4xl'], ...shadows.xl,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  statusIconBox: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.successLight, justifyContent: 'center', alignItems: 'center',
  },
  statusText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground },
  statusSub: { fontSize: fontSize.sm, color: colors.success, marginTop: 4, fontWeight: fontWeight.semibold },

  // Timeline
  timelineContainer: { marginVertical: spacing.lg },
  timelineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  timelineLine: { flex: 1, height: 3, marginHorizontal: spacing.sm, borderRadius: 2 },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  timelineLabelActive: {
    fontSize: 11, fontWeight: fontWeight.bold, color: colors.foreground, width: 80, textAlign: 'center',
  },
  timelineLabelInactive: {
    fontSize: 11, fontWeight: fontWeight.semibold, color: colors.gray400, width: 80, textAlign: 'center',
  },

  // Order Summary
  orderSummary: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  summaryTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.mutedForeground,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  summaryText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.foreground },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], backgroundColor: colors.background },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground, marginTop: spacing.xl },
  emptyDesc: { fontSize: fontSize.base, color: colors.mutedForeground, marginTop: spacing.md, textAlign: 'center' },
});

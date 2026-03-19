import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Truck, Package, Clock, CheckCircle, MapPin } from 'lucide-react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally load native Mapbox modules (crash in Expo Go)
let Mapbox: any = null;
let directionsClient: any = null;
if (!isExpoGo) {
    Mapbox = require('@rnmapbox/maps').default;
    const mbxDirections = require('@mapbox/mapbox-sdk/services/directions').default;
    const MapboxToken: string = (Mapbox.getAccessToken() as unknown as string) || (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
    directionsClient = mbxDirections({ accessToken: MapboxToken });
}

export default function TrackingScreen() {
    const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({ queryKey: ["/api/customers/profile"] });
    const { data: orders, isLoading: ordersLoading } = useQuery<any>({
        queryKey: ["/api/orders/customer"],
        enabled: !!customerProfile
    });

    const [milkmanLocation, setMilkmanLocation] = useState<number[] | null>(null);
    const [customerCoords, setCustomerCoords] = useState<number[] | null>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.LineString | null>(null);
    const [breadcrumbSteps, setBreadcrumbSteps] = useState<number[][]>([]);
    const [routeDuration, setRouteDuration] = useState<string>('Calculating...');
    const cameraRef = useRef<any>(null);

    const activeOrder = Array.isArray(orders) ? orders.find(o => ['pending', 'confirmed', 'out_for_delivery'].includes(o.status)) : null;

    // Simulate geocoding customer profile address into coordinates (Normally done on backend and saved)
    useEffect(() => {
        if (customerProfile?.address) {
            // For demo purposes, assigning a static lat/lng close to assumed milkman starting point
            // Hardcoding coordinates since we don't have a Mapbox geocoding token active here.
            setCustomerCoords([79.0882, 21.1458]); // Nagpur approximate
        }
    }, [customerProfile]);

    // Polling milkman location
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeOrder) {
            const fetchLocation = async () => {
                try {
                    const res = await apiRequest({ url: `/api/delivery/location/${activeOrder.id}`, method: "GET" });
                    const rawData = await res.json();

                    if (rawData.latitude && rawData.longitude) {
                        const newLoc = [rawData.longitude, rawData.latitude];
                        setMilkmanLocation(newLoc);

                        setBreadcrumbSteps(prev => {
                            if (prev.length === 0 || prev[prev.length - 1][0] !== newLoc[0]) {
                                return [...prev, newLoc];
                            }
                            return prev;
                        });
                    }
                } catch (e) {
                    console.log('Failed to fetch milkman location (might be offline/no data yet)');
                }
            };

            fetchLocation();
            interval = setInterval(fetchLocation, 10000); // 10s polling
        }
        return () => clearInterval(interval);
    }, [activeOrder]);

    // Fetch Directions Route
    useEffect(() => {
        if (milkmanLocation && customerCoords) {
            const waypoints = [
                { coordinates: milkmanLocation },
                { coordinates: customerCoords }
            ];

            directionsClient.getDirections({
                profile: 'driving-traffic',
                waypoints: waypoints as any,
                geometries: 'geojson',
            })
                .send()
                .then((response: any) => {
                    const route = response.body.routes[0];
                    if (route) {
                        setRouteGeoJSON(route.geometry as GeoJSON.LineString);
                        const mins = Math.round(route.duration / 60);
                        setRouteDuration(`${mins} min`);

                        // Fit bounds to show both pins
                        if (cameraRef.current) {
                            cameraRef.current.fitBounds(
                                [Math.min(milkmanLocation[0], customerCoords[0]), Math.min(milkmanLocation[1], customerCoords[1])],
                                [Math.max(milkmanLocation[0], customerCoords[0]), Math.max(milkmanLocation[1], customerCoords[1])],
                                50,
                                1000
                            );
                        }
                    }
                })
                .catch((error: any) => console.error(error));
        }
    }, [milkmanLocation, customerCoords]);


    if (profileLoading || ordersLoading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    if (!activeOrder) {
        return (
            <View style={styles.emptyState}>
                <Package size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Active Deliveries</Text>
                <Text style={styles.emptyDesc}>You have no orders currently out for delivery.</Text>
            </View>
        );
    }

    // Show placeholder map in Expo Go
    if (isExpoGo) {
        return (
            <View style={styles.container}>
                <View style={[styles.mapContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 48 }}>🗺️</Text>
                    <Text style={{ fontSize: 16, color: '#64748b', marginTop: 12, fontWeight: '600' }}>Map available in production build</Text>
                    <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Tracking data still works — map rendering requires EAS build</Text>
                </View>

                {/* Bottom Status Panel (still functional) */}
                <View style={styles.bottomPanel}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusIconBox}>
                            <Truck size={28} color="#10b981" />
                        </View>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={styles.statusText}>
                                {activeOrder.status === 'out_for_delivery' ? 'On The Way' : 'Order Confirmed'}
                            </Text>
                            <Text style={styles.statusSub}>Tracking Order #{activeOrder.id}</Text>
                        </View>
                    </View>
                    <View style={styles.orderSummary}>
                        <Text style={styles.summaryTitle}>Order Details</Text>
                        <Text style={styles.summaryText}>{activeOrder.quantity}x {activeOrder.itemName || 'Milk'} • ₹{activeOrder.totalAmount}</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map Container */}
            <View style={styles.mapContainer}>
                <Mapbox.MapView style={styles.map} logoEnabled={false} compassEnabled>
                    <Mapbox.Camera
                        ref={cameraRef}
                        zoomLevel={14}
                        centerCoordinate={customerCoords || [79.0882, 21.1458]}
                        animationMode="flyTo"
                        animationDuration={1500}
                    />

                    {/* Customer Destination Pin */}
                    {customerCoords && (
                        <Mapbox.PointAnnotation id="customer" coordinate={customerCoords}>
                            <View style={styles.customerPin}>
                                <MapPin color="#fff" size={16} />
                            </View>
                        </Mapbox.PointAnnotation>
                    )}

                    {/* Milkman Live Location Pin */}
                    {milkmanLocation && (
                        <Mapbox.PointAnnotation id="milkman" coordinate={milkmanLocation}>
                            <View style={styles.milkmanPin}>
                                <Truck color="#fff" size={18} />
                            </View>
                        </Mapbox.PointAnnotation>
                    )}

                    {/* Pending Route Line */}
                    {routeGeoJSON && (
                        <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
                            <Mapbox.LineLayer
                                id="routeFill"
                                style={{
                                    lineColor: '#3b82f6',
                                    lineWidth: 5,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* Breadcrumbs (Traveled Path) */}
                    {breadcrumbSteps.length > 1 && (
                        <Mapbox.ShapeSource id="breadcrumbSource" shape={{ type: 'LineString', coordinates: breadcrumbSteps }}>
                            <Mapbox.LineLayer
                                id="breadcrumbFill"
                                style={{
                                    lineColor: '#94a3b8',
                                    lineWidth: 4,
                                    lineDasharray: [1, 2],
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}
                </Mapbox.MapView>
            </View>

            {/* Bottom Status Panel */}
            <View style={styles.bottomPanel}>
                <View style={styles.statusHeader}>
                    <View style={styles.statusIconBox}>
                        <Truck size={28} color="#10b981" />
                    </View>
                    <View style={{ marginLeft: 16 }}>
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

                {/* Progress Bar Timeline */}
                <View style={styles.timelineContainer}>
                    <View style={styles.timelineRow}>
                        <CheckCircle size={20} color="#10b981" />
                        <View style={[styles.timelineLine, { backgroundColor: '#10b981' }]} />

                        <CheckCircle size={20} color={activeOrder.status === 'out_for_delivery' ? "#10b981" : "#cbd5e1"} />
                        <View style={[styles.timelineLine, { backgroundColor: activeOrder.status === 'out_for_delivery' ? '#10b981' : '#cbd5e1' }]} />

                        <Clock size={20} color="#cbd5e1" />
                    </View>
                    <View style={styles.timelineLabels}>
                        <Text style={styles.timelineLabelActive}>Confirmed</Text>
                        <Text style={activeOrder.status === 'out_for_delivery' ? styles.timelineLabelActive : styles.timelineLabelInactive}>Out for Delivery</Text>
                        <Text style={styles.timelineLabelInactive}>Delivered</Text>
                    </View>
                </View>

                <View style={styles.orderSummary}>
                    <Text style={styles.summaryTitle}>Tracking Order #{activeOrder.id}</Text>
                    <Text style={styles.summaryText}>{activeOrder.quantity}x {activeOrder.itemName || 'Milk'} • ₹{activeOrder.totalAmount}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    mapContainer: { flex: 1, backgroundColor: '#e2e8f0' },
    map: { flex: 1 },

    customerPin: { backgroundColor: '#ef4444', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 4 },
    milkmanPin: { backgroundColor: '#10b981', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 4 },

    bottomPanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },

    statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    statusIconBox: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
    statusText: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
    statusSub: { fontSize: 13, color: '#059669', marginTop: 4, fontWeight: '600' },

    timelineContainer: { marginVertical: 16 },
    timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
    timelineLine: { flex: 1, height: 3, marginHorizontal: 8, borderRadius: 2 },
    timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    timelineLabelActive: { fontSize: 11, fontWeight: 'bold', color: '#0f172a', width: 80, textAlign: 'center' },
    timelineLabelInactive: { fontSize: 11, fontWeight: '600', color: '#94a3b8', width: 80, textAlign: 'center' },

    orderSummary: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    summaryTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    summaryText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginTop: 20 },
    emptyDesc: { fontSize: 15, color: '#64748b', marginTop: 10, textAlign: 'center' }
});

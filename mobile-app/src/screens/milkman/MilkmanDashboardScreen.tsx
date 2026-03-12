import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, SafeAreaView, Dimensions
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import {
    Truck, Users, Package, DollarSign, Settings,
    CheckCircle, X, ChevronRight, Phone, MessageCircle, MapPin
} from 'lucide-react-native';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function MilkmanDashboardScreen({ navigation }: any) {
    const { user } = useAuth();

    // UI State for Modals
    const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [showCustomersModal, setShowCustomersModal] = useState(false);
    const [showEarningsModal, setShowEarningsModal] = useState(false);

    // Data Fetching
    const { data: milkmanProfile, isLoading: isProfileLoading } = useQuery<any>({
        queryKey: ["/api/milkmen/profile"],
        enabled: !!user
    });

    const { data: orders, isLoading: isOrdersLoading } = useQuery<any>({
        queryKey: ["/api/orders/milkman"],
        enabled: !!milkmanProfile
    });

    const { data: customers, isLoading: isCustomersLoading } = useQuery<any>({
        queryKey: ["/api/milkmen/customers"],
        enabled: !!milkmanProfile
    });

    // Mutations
    const updateOrderStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
            await apiRequest({ url: `/api/orders/${orderId}/status`, method: "PATCH", body: { status } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/orders/milkman"] });
        },
        onError: (e: any) => Alert.alert("Error", e.message)
    });

    const updateInventoryMutation = useMutation({
        mutationFn: async (dairyItems: any[]) => {
            await apiRequest({ url: "/api/milkmen/inventory", method: "POST", body: { dairyItems } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
            Alert.alert("Success", "Inventory updated successfully");
        },
        onError: (e: any) => Alert.alert("Error", "Failed to update inventory: " + e.message)
    });

    // Computed Data
    const todaysDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todaysOrders = useMemo(() => {
        if (!Array.isArray(orders)) return [];
        return orders.filter(o => o.deliveryDate === todaysDateStr || o.status === 'out_for_delivery' || o.status === 'pending');
    }, [orders, todaysDateStr]);

    const pendingOrders = useMemo(() => todaysOrders.filter(o => ['pending', 'accepted', 'out_for_delivery'].includes(o.status)), [todaysOrders]);
    const completedOrders = useMemo(() => todaysOrders.filter(o => o.status === 'delivered'), [todaysOrders]);

    const todaysEarnings = useMemo(() => {
        return completedOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    }, [completedOrders]);

    const totalCustomersCount = Array.isArray(customers) ? customers.length : 0;
    const progressPerc = todaysOrders.length > 0 ? (completedOrders.length / todaysOrders.length) * 100 : 0;

    // --- Location Broadcasting Logic ---
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const startLocationBroadcasting = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            // Watch position every 15 seconds (15000ms) or 10 meters
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 15000,
                    distanceInterval: 10,
                },
                (location) => {
                    // Send to backend
                    apiRequest({
                        url: "/api/delivery/location",
                        method: "POST",
                        body: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude
                        }
                    }).catch(err => console.log('Failed to broadcast location:', err));
                }
            );
            setIsBroadcasting(true);
            console.log('Started broadcasting milkman location');
        } catch (error) {
            console.error('Error starting location broadcast:', error);
        }
    };

    const stopLocationBroadcasting = () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
        setIsBroadcasting(false);
        console.log('Stopped broadcasting milkman location');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopLocationBroadcasting();
        };
    }, []);

    const isLoading = isProfileLoading || isOrdersLoading || isCustomersLoading;

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading Dashboard...</Text>
            </View>
        );
    }

    if (!milkmanProfile) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Profile Required</Text>
                <Text style={styles.emptySub}>You have not set up your milkman business profile yet.</Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('MilkmanProfileSetup')}>
                    <Text style={styles.btnPrimaryText}>Set Up Profile Now</Text>
                </TouchableOpacity>
            </View>
        );
    }


    // Components
    const QuickActionButton = ({ icon: Icon, title, subtitle, color, bgColor, onPress }: any) => (
        <TouchableOpacity style={styles.actionCard} onPress={onPress}>
            <View style={[styles.actionIconContainer, { backgroundColor: bgColor }]}>
                <Icon size={24} color={color} />
            </View>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );

    // Render Main Dashboard
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <View>
                            <Text style={styles.greeting}>Hello,</Text>
                            <Text style={styles.businessName}>{milkmanProfile.businessName}</Text>
                        </View>
                        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Profile')}>
                            <Settings size={22} color="#1e293b" />
                        </TouchableOpacity>
                    </View>

                    {/* Route Tracking Toggle */}
                    <TouchableOpacity
                        style={[
                            styles.broadcastBtn,
                            { backgroundColor: isBroadcasting ? '#fee2e2' : '#dcfce7' }
                        ]}
                        onPress={isBroadcasting ? stopLocationBroadcasting : startLocationBroadcasting}
                    >
                        <MapPin size={20} color={isBroadcasting ? '#ef4444' : '#22c55e'} />
                        <Text style={[
                            styles.broadcastBtnText,
                            { color: isBroadcasting ? '#b91c1c' : '#15803d' }
                        ]}>
                            {isBroadcasting ? 'Stop Sharing Location' : 'Start My Route (Share Location)'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Grid */}
                <View style={styles.gridContainer}>
                    <QuickActionButton
                        icon={Truck} title="Deliveries" subtitle={`${pendingOrders.length} Pending`}
                        color="#2563eb" bgColor="#dbeafe"
                        onPress={() => setShowDeliveriesModal(true)}
                    />
                    <QuickActionButton
                        icon={Package} title="Inventory" subtitle="Update Stock"
                        color="#d97706" bgColor="#fef3c7"
                        onPress={() => setShowInventoryModal(true)}
                    />
                    <QuickActionButton
                        icon={Users} title="Customers" subtitle={`${totalCustomersCount} Total`}
                        color="#059669" bgColor="#d1fae5"
                        onPress={() => setShowCustomersModal(true)}
                    />
                    <QuickActionButton
                        icon={DollarSign} title="Earnings" subtitle={`₹${todaysEarnings} Today`}
                        color="#7c3aed" bgColor="#ede9fe"
                        onPress={() => setShowEarningsModal(true)}
                    />
                </View>

                {/* Daily Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.sectionTitle}>Daily Summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Orders Completed</Text>
                        <Text style={styles.summaryValue}>{completedOrders.length} / {todaysOrders.length}</Text>
                    </View>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progressPerc}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progressPerc)}% of daily target completed</Text>

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Earnings Today</Text>
                        <Text style={[styles.summaryValue, { color: '#059669', fontSize: 18 }]}>₹{todaysEarnings.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Next Deliveries Snapshot */}
                <View style={styles.deliveriesSnapshot}>
                    <View style={styles.snapshotHeader}>
                        <Text style={styles.sectionTitle}>Next Deliveries</Text>
                        <TouchableOpacity onPress={() => setShowDeliveriesModal(true)}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {pendingOrders.slice(0, 3).map((order) => {
                        const customer = customers?.find((c: any) => c.id === order.customerId);
                        return (
                            <TouchableOpacity key={order.id} style={styles.snapshotCard} onPress={() => setShowDeliveriesModal(true)}>
                                <View style={styles.snapshotTop}>
                                    <Text style={styles.snapshotName}>{customer?.name || 'Customer'}</Text>
                                    <View style={styles.badgeSmall}>
                                        <Text style={styles.badgeSmallText}>{order.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.snapshotAddress} numberOfLines={1}>
                                    <MapPin size={12} color="#64748b" style={{ marginRight: 4 }} />
                                    {order.deliveryAddress || customer?.address || 'No address'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {pendingOrders.length === 0 && (
                        <View style={styles.emptySnapshot}>
                            <CheckCircle size={32} color="#cbd5e1" />
                            <Text style={styles.emptySnapshotText}>All caught up for now!</Text>
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* ---> MODALS <--- */}

            {/* Deliveries Modal */}
            <Modal visible={showDeliveriesModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Today's Deliveries</Text>
                        <TouchableOpacity onPress={() => setShowDeliveriesModal(false)} style={styles.closeBtn}>
                            <X size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        {todaysOrders.map(order => {
                            const customer = customers?.find((c: any) => c.id === order.customerId);
                            return (
                                <View key={order.id} style={styles.orderCard}>
                                    <View style={styles.orderHeader}>
                                        <View>
                                            <Text style={styles.orderCustomer}>{customer?.name || `Order #${order.id}`}</Text>
                                            <Text style={styles.orderItem}>{order.itemName || 'Milk'} • {order.quantity}L</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
                                            <Text style={styles.orderStatusBadge}>{order.status.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.orderAddress}>{order.deliveryAddress || customer?.address}</Text>

                                    <View style={styles.orderActionsRow}>
                                        {['pending', 'accepted'].includes(order.status) && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                                                onPress={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'out_for_delivery' })}
                                            >
                                                <Text style={styles.actionBtnText}>Start Delivery</Text>
                                            </TouchableOpacity>
                                        )}
                                        {order.status === 'out_for_delivery' && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                                                onPress={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
                                            >
                                                <CheckCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                                                <Text style={styles.actionBtnText}>Mark Delivered</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )
                        })}
                        {todaysOrders.length === 0 && (
                            <Text style={styles.emptyStateText}>No orders for today.</Text>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Customers Modal */}
            <Modal visible={showCustomersModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>My Customers</Text>
                        <TouchableOpacity onPress={() => setShowCustomersModal(false)} style={styles.closeBtn}>
                            <X size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        {Array.isArray(customers) && customers.map(cust => (
                            <View key={cust.id} style={styles.customerCard}>
                                <View style={styles.customerAvatar}>
                                    <Users size={20} color="#3b82f6" />
                                </View>
                                <View style={styles.customerInfo}>
                                    <Text style={styles.customerName}>{cust.name}</Text>
                                    <Text style={styles.customerPhone}>{cust.phone}</Text>
                                    <Text style={styles.customerAddress} numberOfLines={1}>{cust.address}</Text>
                                </View>
                                <View style={styles.customerActions}>
                                    <TouchableOpacity style={styles.iconButton}>
                                        <MessageCircle size={20} color="#3b82f6" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconButton}>
                                        <Phone size={20} color="#10b981" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        {(!customers || customers.length === 0) && (
                            <Text style={styles.emptyStateText}>No customers assigned yet.</Text>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Earnings Modal (Placeholder Details) */}
            <Modal visible={showEarningsModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Earnings Overview</Text>
                        <TouchableOpacity onPress={() => setShowEarningsModal(false)} style={styles.closeBtn}>
                            <X size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={[styles.summaryCard, { backgroundColor: '#10b981' }]}>
                            <Text style={{ color: '#fff', fontSize: 16 }}>Earnings Today</Text>
                            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>₹{todaysEarnings.toFixed(2)}</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        {completedOrders.map((order) => {
                            const customer = customers?.find((c: any) => c.id === order.customerId);
                            return (
                                <View key={`tx-${order.id}`} style={styles.txCard}>
                                    <View>
                                        <Text style={styles.txName}>{customer?.name || 'Customer'}</Text>
                                        <Text style={styles.txDate}>{new Date(order.updatedAt || order.createdAt).toLocaleString()}</Text>
                                    </View>
                                    <Text style={styles.txAmount}>+ ₹{order.totalAmount}</Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Inventory Modal */}
            <Modal visible={showInventoryModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Manage Inventory</Text>
                        <TouchableOpacity onPress={() => setShowInventoryModal(false)} style={styles.closeBtn}>
                            <X size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inventoryHeader}>
                            <Text style={styles.inventorySubtitle}>Update items you carry today</Text>
                        </View>
                        {milkmanProfile.dairyItems?.map((item: any, index: number) => (
                            <View key={index} style={styles.inventoryCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inventoryItemName}>{item.name}</Text>
                                    <Text style={styles.inventoryItemPrice}>₹{item.price} per unit</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: item.isAvailable ? '#d1fae5' : '#fee2e2' }]}>
                                        <Text style={[styles.statusBadgeText, { color: item.isAvailable ? '#059669' : '#dc2626' }]}>
                                            {item.isAvailable ? 'Available' : 'Unavailable'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.inventoryControls}>
                                    <TouchableOpacity
                                        style={styles.toggleBtn}
                                        onPress={() => {
                                            const updated = [...milkmanProfile.dairyItems];
                                            updated[index] = { ...item, isAvailable: !item.isAvailable };
                                            updateInventoryMutation.mutate(updated);
                                        }}
                                    >
                                        <Text style={styles.toggleBtnText}>{item.isAvailable ? 'Disable' : 'Enable'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
    emptySub: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 24 },
    btnPrimary: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    header: { marginBottom: 24, marginTop: 10 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { fontSize: 16, color: '#64748b' },
    businessName: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
    settingsBtn: { width: 44, height: 44, backgroundColor: '#f1f5f9', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    broadcastBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginTop: 16, gap: 8 },
    broadcastBtnText: { fontSize: 15, fontWeight: 'bold' },

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
    actionCard: { width: (width - 44) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    actionIconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    actionSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },

    summaryCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    summaryLabel: { fontSize: 15, color: '#475569' },
    summaryValue: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
    progressContainer: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginVertical: 8, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
    progressText: { fontSize: 13, color: '#64748b', marginTop: 4 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },

    deliveriesSnapshot: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    snapshotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    seeAllText: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
    snapshotCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    snapshotTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    snapshotName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
    badgeSmall: { backgroundColor: '#fdf2f8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeSmallText: { fontSize: 10, color: '#db2777', fontWeight: 'bold', textTransform: 'uppercase' },
    snapshotAddress: { fontSize: 13, color: '#64748b' },
    emptySnapshot: { alignItems: 'center', paddingVertical: 20 },
    emptySnapshotText: { fontSize: 14, color: '#94a3b8', marginTop: 8 },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    closeBtn: { padding: 4 },
    modalContent: { padding: 16 },
    emptyStateText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 16 },

    // Order Card
    orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    orderCustomer: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    orderItem: { fontSize: 14, color: '#64748b', marginTop: 2 },
    orderAmount: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
    orderStatusBadge: { fontSize: 11, fontWeight: 'bold', color: '#f59e0b', marginTop: 4, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    orderAddress: { fontSize: 14, color: '#475569', marginVertical: 8 },
    orderActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
    actionBtn: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    // Customer Card
    customerCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 1 },
    customerAvatar: { width: 44, height: 44, backgroundColor: '#eff6ff', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    customerInfo: { flex: 1, marginLeft: 12 },
    customerName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    customerPhone: { fontSize: 13, color: '#64748b', marginTop: 2 },
    customerAddress: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    customerActions: { flexDirection: 'row', gap: 8 },
    iconButton: { width: 36, height: 36, backgroundColor: '#f8fafc', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    // Tx Card
    txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10 },
    txName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
    txDate: { fontSize: 12, color: '#64748b', marginTop: 4 },
    txAmount: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },

    // Inventory Card
    inventoryHeader: { marginBottom: 16 },
    inventorySubtitle: { fontSize: 14, color: '#64748b' },
    inventoryCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 1 },
    inventoryItemName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    inventoryItemPrice: { fontSize: 14, color: '#64748b', marginTop: 4 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
    statusBadgeText: { fontSize: 12, fontWeight: 'bold' },
    inventoryControls: { flexDirection: 'row', alignItems: 'center' },
    toggleBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    toggleBtnText: { color: '#334155', fontWeight: '600', fontSize: 14 }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Package, CheckCircle } from 'lucide-react-native';

export default function ViewOrdersScreen() {
    const [tab, setTab] = useState<'active' | 'history'>('active');

    const { data: customerProfile, isLoading: profileLoading } = useQuery({ queryKey: ["/api/customers/profile"] });
    const { data: orders, isLoading: ordersLoading } = useQuery({
        queryKey: ["/api/orders/customer"],
        enabled: !!customerProfile
    });

    if (profileLoading || ordersLoading) {
        return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;
    }

    const orderList = Array.isArray(orders) ? orders : [];
    const activeOrders = orderList.filter(o => o.status === 'pending' || o.status === 'confirmed');
    const historyOrders = orderList.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled');

    const displayedOrders = tab === 'active' ? activeOrders : historyOrders;

    return (
        <View style={styles.container}>
            <Text style={styles.pageTitle}>Your Orders</Text>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, tab === 'active' && styles.activeTab]} onPress={() => setTab('active')}>
                    <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>Active Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'history' && styles.activeTab]} onPress={() => setTab('history')}>
                    <Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>Order History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {displayedOrders.length > 0 ? (
                    displayedOrders.map((order: any) => (
                        <View key={order.id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <View>
                                    <Text style={styles.orderId}>Order #{order.id}</Text>
                                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.orderTotal}>₹{order.totalAmount}</Text>
                                    <View style={[styles.badge, order.status === 'delivered' ? styles.badgeGreen : styles.badgeBlue]}>
                                        <Text style={styles.badgeText}>{order.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.orderDetails}>
                                <View style={styles.detailCol}>
                                    <Text style={styles.detailLabel}>Item</Text>
                                    <Text style={styles.detailValue}>{order.itemName || 'Milk'}</Text>
                                </View>
                                <View style={styles.detailCol}>
                                    <Text style={styles.detailLabel}>Qty</Text>
                                    <Text style={styles.detailValue}>{order.quantity}</Text>
                                </View>
                                <View style={styles.detailCol}>
                                    <Text style={styles.detailLabel}>Time</Text>
                                    <Text style={styles.detailValue}>{order.deliveryTime}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Package size={48} color="#94a3b8" />
                        <Text style={styles.emptyTitle}>No {tab === 'active' ? 'Active' : 'Past'} Orders</Text>
                        <Text style={styles.emptyDesc}>Place an order to see it here!</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginTop: 20, marginBottom: 10, paddingHorizontal: 16 },
    tabsContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', marginHorizontal: 16, borderRadius: 8, padding: 2 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    tabText: { fontWeight: '500', color: '#64748b' },
    activeTabText: { color: '#0f172a', fontWeight: 'bold' },
    orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
    orderId: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    orderDate: { fontSize: 13, color: '#64748b', marginTop: 2 },
    orderTotal: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
    badgeBlue: { backgroundColor: '#dbeafe' },
    badgeGreen: { backgroundColor: '#dcfce3' },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#1e40af' },
    orderDetails: { flexDirection: 'row', justifyContent: 'space-between' },
    detailCol: { alignItems: 'flex-start' },
    detailLabel: { fontSize: 12, color: '#64748b' },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 16 },
    emptyDesc: { fontSize: 14, color: '#64748b', marginTop: 8 }
});

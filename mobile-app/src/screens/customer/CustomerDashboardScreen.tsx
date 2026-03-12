import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Truck, ShoppingCart, User, Clock } from 'lucide-react-native';

export default function CustomerDashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { data: profile, isLoading: profileLoading } = useQuery<any>({ queryKey: ["/api/customers/profile"], enabled: !!user });
    const { data: milkmen } = useQuery<any[]>({ queryKey: ["/api/milkmen"], enabled: !!user });
    const { data: orders } = useQuery<any[]>({ queryKey: ["/api/orders/customer"], enabled: !!profile });

    if (profileLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {profile?.name || 'Customer'}!</Text>
                    <View style={styles.locationContainer}>
                        <MapPin size={14} color="#64748b" />
                        <Text style={styles.address}>{profile?.address || 'No location set'}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.profileBtn}>
                    <User size={24} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('OrderPage')}>
                    <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                        <ShoppingCart size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.actionText}>New Order</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Tracking')}>
                    <View style={[styles.iconBox, { backgroundColor: '#dcfce3' }]}>
                        <Truck size={24} color="#10b981" />
                    </View>
                    <Text style={styles.actionText}>Track</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard}>
                    <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                        <Clock size={24} color="#f59e0b" />
                    </View>
                    <Text style={styles.actionText}>Schedule</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Milkmen in your Area</Text>
                {Array.isArray(milkmen) && milkmen.length > 0 ? milkmen.map((milkman: any) => (
                    <TouchableOpacity key={milkman.id} style={styles.milkmanCard}>
                        <View style={styles.milkmanHeader}>
                            <Text style={styles.milkmanName}>{milkman.businessName || milkman.contactName}</Text>
                            <Text style={styles.price}>₹{milkman.pricePerLiter}/L</Text>
                        </View>
                        <Text style={styles.milkmanDesc}>{milkman.address}</Text>
                        <View style={styles.milkmanFooter}>
                            <Text style={styles.timing}>Delivers {milkman.deliveryTimeStart} - {milkman.deliveryTimeEnd}</Text>
                            <TouchableOpacity style={styles.orderBtn}>
                                <Text style={styles.orderBtnText}>Order</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )) : (
                    <Text style={styles.emptyText}>No milkmen available right now.</Text>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                {Array.isArray(orders) && orders.length > 0 ? (
                    orders.map((order: any) => (
                        <View key={order.id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <Text style={styles.orderId}>Order #{order.id}</Text>
                                <Text style={styles.orderStatus}>{order.status}</Text>
                            </View>
                            <Text style={styles.orderTotal}>Total: ₹{order.totalAmount}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>You typically place your orders here.</Text>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    address: { fontSize: 14, color: '#64748b', marginLeft: 4 },
    profileBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
    quickActions: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    actionCard: { alignItems: 'center' },
    iconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionText: { fontSize: 14, fontWeight: '500', color: '#334155' },
    section: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
    milkmanCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    milkmanHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    milkmanName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    price: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
    milkmanDesc: { fontSize: 14, color: '#64748b', marginBottom: 12 },
    milkmanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timing: { fontSize: 12, color: '#0f172a', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    orderBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
    orderBtnText: { color: '#fff', fontWeight: 'bold' },
    emptyText: { color: '#64748b', fontStyle: 'italic' },
    orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    orderId: { fontWeight: 'bold', color: '#0f172a' },
    orderStatus: { color: '#f59e0b', fontWeight: 'bold' },
    orderTotal: { color: '#64748b' }
});

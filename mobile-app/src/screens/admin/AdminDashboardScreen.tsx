import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Users, Truck, ShoppingCart, DollarSign, LogOut } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';

export default function AdminDashboardScreen() {
    const { logout } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    const { data: stats, isLoading, refetch } = useQuery<any>({
        queryKey: ["/api/admin/stats"],
        refetchOnMount: true
    });

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        refetch().then(() => setRefreshing(false));
    }, [refetch]);

    if (isLoading && !refreshing) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.greeting}>Admin Overview</Text>
                        <Text style={styles.subGreeting}>Platform Management</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <LogOut size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Text style={styles.sectionTitle}>Key Metrics</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Text style={styles.statTitle}>Total Users</Text>
                            <Users size={16} color="#64748b" />
                        </View>
                        <Text style={styles.statNum}>{stats?.totalUsers || 0}</Text>
                        <Text style={styles.statSub}>{stats?.activeUsers || 0} active</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Text style={styles.statTitle}>Milkmen</Text>
                            <Truck size={16} color="#64748b" />
                        </View>
                        <Text style={styles.statNum}>{stats?.totalMilkmen || 0}</Text>
                        <Text style={styles.statSub}>Total registered</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Text style={styles.statTitle}>Orders</Text>
                            <ShoppingCart size={16} color="#64748b" />
                        </View>
                        <Text style={styles.statNum}>{stats?.totalOrders || 0}</Text>
                        <Text style={styles.statSub}>{stats?.dailyOrders || 0} today</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Text style={styles.statTitle}>Revenue</Text>
                            <DollarSign size={16} color="#64748b" />
                        </View>
                        <Text style={styles.statNum}>₹{stats?.totalRevenue || 0}</Text>
                        <Text style={styles.statSub}>₹{stats?.weeklyRevenue || 0} weekly</Text>
                    </View>
                </View>

                <View style={styles.actionsCard}>
                    <Text style={styles.sectionTitle}>Management Links</Text>
                    <Text style={{ color: '#64748b', marginBottom: 15 }}>Detailed management interfaces are best accessed via the web dashboard for full functionality.</Text>

                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionText}>User Management (Web Only)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionText}>Milkman Verification (Web Only)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionText}>Generate Monthly Bills (Web Only)</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: '#1e293b', padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    subGreeting: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 },
    content: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15, marginTop: 10 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
    statCard: { width: '47%', backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2, marginBottom: 5 },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statTitle: { fontSize: 13, fontWeight: '600', color: '#475569' },
    statNum: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
    statSub: { fontSize: 11, color: '#94a3b8', marginTop: 5 },
    actionsCard: { backgroundColor: '#fff', marginTop: 25, padding: 20, borderRadius: 12, elevation: 1 },
    actionBtn: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
    actionText: { color: '#475569', fontWeight: 'bold' }
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Users, Truck, ShoppingCart, DollarSign, ArrowLeft, TrendingUp, Activity } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const ADMIN_DARK = '#1E293B';

const STATUS_COLORS: Record<string, string> = {
  pending: '#EAB308',
  confirmed: '#3B82F6',
  delivered: '#16A34A',
  cancelled: '#EF4444',
};

export default function CustomerAnalyticsScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ['/api/admin/stats'], refetchOnMount: true,
  });

  const { data: earnings, isLoading: earningsLoading, refetch: refetchEarnings } = useQuery<any[]>({
    queryKey: ['/api/admin/earnings'], refetchOnMount: true,
  });

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ['/api/admin/orders'], refetchOnMount: true,
  });

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([refetchStats(), refetchEarnings(), refetchOrders()]).then(() => setRefreshing(false));
  };

  const isLoading = statsLoading || earningsLoading || ordersLoading;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      sub: `${stats?.activeUsers || 0} active this week`,
      icon: Users,
      color: colors.primary,
      bg: colors.primaryLight,
    },
    {
      title: 'Total Milkmen',
      value: stats?.totalMilkmen || 0,
      sub: 'Registered vendors',
      icon: Truck,
      color: '#F97316',
      bg: '#FFF7ED',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      sub: `${stats?.dailyOrders || 0} today`,
      icon: ShoppingCart,
      color: colors.success,
      bg: colors.successLight,
    },
    {
      title: 'Total Revenue',
      value: `₹${Number(stats?.totalRevenue || 0).toLocaleString()}`,
      sub: `₹${Number(stats?.weeklyRevenue || 0).toLocaleString()} this week`,
      icon: DollarSign,
      color: '#7C3AED',
      bg: '#EDE9FE',
    },
  ];

  const totalAdminEarnings = (earnings || []).reduce((s: number, e: any) => s + (e.adminEarnings || 0), 0);
  const avgRate = (earnings && earnings.length > 0)
    ? (earnings.reduce((s: number, e: any) => s + (e.sharePercentage || 0), 0) / earnings.length).toFixed(1)
    : '0';

  const recentOrders = (orders || []).slice(0, 20);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Customer Analytics</Text>
          <Text style={styles.headerSub}>Platform Performance</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statTitle}>{s.title}</Text>
                <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                  <s.icon size={16} color={s.color} />
                </View>
              </View>
              <Text style={styles.statNum}>{s.value}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        {/* Platform earnings summary */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <TrendingUp size={18} color="#7C3AED" />
            <Text style={styles.sectionTitle}>Earnings Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>₹{totalAdminEarnings.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Total Platform Commission</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{avgRate}%</Text>
              <Text style={styles.summaryLabel}>Avg Commission Rate</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{(earnings || []).length}</Text>
              <Text style={styles.summaryLabel}>Active Milkmen</Text>
            </View>
          </View>
        </View>

        {/* Earnings breakdown table */}
        {(earnings || []).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Activity size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Milkman Earnings Breakdown</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Milkman</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Rate</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Our Cut</Text>
            </View>
            {(earnings || []).map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.milkmanName} numberOfLines={1}>
                    {item.businessName || item.contactName || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                  ₹{parseFloat(item.totalRevenue).toFixed(0)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {item.sharePercentage}%
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: colors.success }]}>
                  ₹{(item.adminEarnings || 0).toFixed(0)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent orders */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <ShoppingCart size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Recent Orders</Text>
          </View>
          {recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>No orders yet</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Order #</Text>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Status</Text>
              </View>
              {recentOrders.map((o: any, i: number) => {
                const statusColor = STATUS_COLORS[o.status] || '#6B7280';
                const dateStr = o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString()
                  : 'N/A';
                return (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1 }]}>#{o.id}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{dateStr}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                      ₹{parseFloat(o.totalAmount || '0').toFixed(0)}
                    </Text>
                    <View style={[styles.statusBadge, { flex: 1.5, alignItems: 'flex-end' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {(o.status || 'unknown').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ADMIN_DARK },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    backgroundColor: ADMIN_DARK,
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  headerSub: { fontSize: fontSize.sm, color: colors.gray400, marginTop: 2 },
  content: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%', backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.xl, marginBottom: spacing.md, ...shadows.md,
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  statTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray600 },
  statIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statNum: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground },
  statSub: { fontSize: 11, color: colors.gray400, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.card, marginTop: spacing.lg, padding: spacing.xl,
    borderRadius: borderRadius.xl, ...shadows.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground },
  summaryLabel: { fontSize: 10, color: colors.mutedForeground, textAlign: 'center', marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingBottom: spacing.sm, marginBottom: spacing.sm,
  },
  tableHeaderText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.mutedForeground, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  milkmanName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.foreground },
  tableCell: { fontSize: fontSize.xs, color: colors.mutedForeground },
  statusBadge: { justifyContent: 'center' },
  statusText: { fontSize: 10, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl, fontStyle: 'italic' },
});

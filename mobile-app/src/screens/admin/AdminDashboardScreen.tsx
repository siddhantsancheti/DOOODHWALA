import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Users, Truck, ShoppingCart, DollarSign, LogOut, Globe } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const ADMIN_DARK = '#1E293B';

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/admin/stats'], refetchOnMount: true,
  });

  const onRefresh = () => {
    setRefreshing(true);
    refetch().then(() => setRefreshing(false));
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats?.totalUsers || 0, sub: `${stats?.activeUsers || 0} active`, icon: Users, color: colors.primary, bg: colors.primaryLight },
    { title: 'Milkmen', value: stats?.totalMilkmen || 0, sub: 'Total registered', icon: Truck, color: colors.brandAccent, bg: '#FFF7ED' },
    { title: 'Orders', value: stats?.totalOrders || 0, sub: `${stats?.dailyOrders || 0} today`, icon: ShoppingCart, color: colors.success, bg: colors.successLight },
    { title: 'Revenue', value: `₹${stats?.totalRevenue || 0}`, sub: `₹${stats?.weeklyRevenue || 0} weekly`, icon: DollarSign, color: '#7C3AED', bg: '#EDE9FE' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Overview</Text>
          <Text style={styles.headerSub}>Platform Management</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <LogOut size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Management Links</Text>
          <Text style={styles.actionsDesc}>
            Detailed management interfaces are best accessed via the web dashboard.
          </Text>
          {['User Management', 'Milkman Verification', 'Generate Monthly Bills'].map((text, i) => (
            <TouchableOpacity key={i} style={styles.actionBtn} activeOpacity={0.7}>
              <Globe size={16} color={colors.mutedForeground} />
              <Text style={styles.actionText}>{text} (Web Only)</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ADMIN_DARK },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: ADMIN_DARK, padding: spacing.xl, paddingTop: spacing['3xl'],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  headerSub: { fontSize: fontSize.sm, color: colors.gray400, marginTop: 4 },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },

  content: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.lg },

  // Stats Grid
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

  // Actions
  actionsCard: {
    backgroundColor: colors.card, marginTop: spacing.lg, padding: spacing.xl,
    borderRadius: borderRadius.xl, ...shadows.sm,
  },
  actionsDesc: { color: colors.mutedForeground, marginBottom: spacing.lg, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, padding: spacing.lg,
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
  },
  actionText: { color: colors.gray600, fontWeight: fontWeight.semibold },
});

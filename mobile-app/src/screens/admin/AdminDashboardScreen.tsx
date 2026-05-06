import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Users, Truck, ShoppingCart, DollarSign, LogOut, Globe } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const ADMIN_DARK = '#1E293B';

export default function AdminDashboardScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [pendingRates, setPendingRates] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/admin/stats'], refetchOnMount: true,
  });

  const { data: earnings, isLoading: isEarningsLoading, refetch: refetchEarnings } = useQuery<any[]>({
    queryKey: ['/api/admin/earnings'], refetchOnMount: true,
  });

  const { data: pending, isLoading: isPendingLoading, refetch: refetchPending } = useQuery<any[]>({
    queryKey: ['/api/admin/milkmen/pending-commission'], refetchOnMount: true,
  });

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([refetch(), refetchEarnings(), refetchPending()]).then(() => setRefreshing(false));
  };

  const handleSetRate = async (id: number) => {
    const rate = pendingRates[id];
    const parsed = parseFloat(rate);
    if (!rate || isNaN(parsed) || parsed < 0 || parsed > 100) {
      return Alert.alert('Error', 'Please enter a percentage between 0 and 100');
    }

    try {
      const { apiRequest } = await import('../../lib/queryClient');
      await apiRequest({
        url: `/api/admin/milkmen/${id}/commission`,
        method: 'PATCH',
        body: { percentage: parsed }
      });
      refetchPending();
      refetchEarnings();
      setPendingRates(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
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
    { title: 'Total Revenue', value: `₹${Number(stats?.totalRevenue || 0).toLocaleString()}`, sub: `₹${Number(stats?.weeklyRevenue || 0).toLocaleString()} weekly`, icon: DollarSign, color: '#7C3AED', bg: '#EDE9FE' },
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

        <View style={styles.earningsCard}>
          <Text style={styles.sectionTitle}>Commission Setup Required</Text>
          <Text style={styles.actionsDesc}>Set a commission rate for these newly registered milkmen to enable earnings tracking.</Text>
          
          {isPendingLoading ? (
             <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
          ) : pending && pending.length > 0 ? (
            pending.map((m, i) => (
              <View key={i} style={styles.pendingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.milkmanName} numberOfLines={1}>{m.businessName}</Text>
                  <Text style={styles.tableCell}>{m.contactName}</Text>
                </View>
                <View style={styles.rateInputContainer}>
                  <TextInput
                    style={styles.rateInput}
                    placeholder="10"
                    placeholderTextColor={colors.gray400}
                    keyboardType="numeric"
                    value={pendingRates[m.id] || ''}
                    onChangeText={(val) => setPendingRates(prev => ({ ...prev, [m.id]: val }))}
                  />
                  <Text style={styles.percentageSymbol}>%</Text>
                  <TouchableOpacity 
                    style={styles.setRateBtn} 
                    onPress={() => handleSetRate(m.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.setRateBtnText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No new registrations pending setup</Text>
          )}
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.sectionTitle}>Platform Earnings</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Milkman</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Share %</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Our Earnings</Text>
          </View>
          {isEarningsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
          ) : earnings && earnings.length > 0 ? (
            earnings.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.milkmanName} numberOfLines={1}>{item.businessName || item.contactName || 'N/A'}</Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>₹{parseFloat(item.totalRevenue).toFixed(0)}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.sharePercentage}%</Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: colors.success }]}>₹{item.adminEarnings.toFixed(0)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No earnings data available</Text>
          )}
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Management</Text>
          <Text style={styles.actionsDesc}>
            Tap to open in-app management screens. Full admin features are available on the web dashboard.
          </Text>
          {[
            { text: 'Customer Analytics', icon: Users, screen: 'CustomerAnalytics' },
            { text: 'Location Recommendations', icon: Globe, screen: 'LocationRecommendations' },
            { text: 'SMS Gateway', icon: ShoppingCart, screen: 'Gateway' },
          ].map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.actionBtn} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate(item.screen)}
            >
              <item.icon size={16} color={colors.mutedForeground} />
              <Text style={styles.actionText}>{item.text}</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Open →</Text>
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

  // Earnings Table
  earningsCard: {
    backgroundColor: colors.card,
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  milkmanName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  tableCell: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    padding: spacing.xl,
    fontStyle: 'italic',
  },

  // Pending Commission Styles
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  rateInput: {
    backgroundColor: colors.surfaceSecondary,
    width: 50,
    height: 36,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.foreground,
    textAlign: 'center',
    fontWeight: fontWeight.bold,
  },
  percentageSymbol: {
    marginHorizontal: spacing.xs,
    color: colors.mutedForeground,
    fontWeight: fontWeight.bold,
  },
  setRateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setRateBtnText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.xs,
  },
});

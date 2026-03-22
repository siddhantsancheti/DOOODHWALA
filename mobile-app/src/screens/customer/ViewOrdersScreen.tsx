import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function ViewOrdersScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const { data: customerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/customers/profile'],
  });
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders/customer'],
    enabled: !!customerProfile,
  });

  if (profileLoading || ordersLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const orderList = Array.isArray(orders) ? orders : [];
  const activeOrders = orderList.filter((o) => o.status === 'pending' || o.status === 'confirmed');
  const historyOrders = orderList.filter(
    (o) => o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled'
  );
  const displayedOrders = tab === 'active' ? activeOrders : historyOrders;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered': case 'completed': return { bg: colors.successLight, color: colors.success, icon: CheckCircle };
      case 'cancelled': return { bg: colors.errorLight, color: colors.destructive, icon: XCircle };
      case 'pending': return { bg: colors.warningLight, color: colors.warning, icon: Clock };
      default: return { bg: colors.infoLight, color: colors.info, icon: Package };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.pageTitle}>Your Orders</Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.activeTab]}
          onPress={() => setTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.activeTab]}
          onPress={() => setTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>
            History ({historyOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayedOrders.length > 0 ? (
          displayedOrders.map((order: any) => {
            const status = getStatusStyle(order.status);
            const StatusIcon = status.icon;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderId}>Order #{order.id}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderTotal}>₹{order.totalAmount}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <StatusIcon size={12} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                      </Text>
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
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Package size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>
              No {tab === 'active' ? 'Active' : 'Past'} Orders
            </Text>
            <Text style={styles.emptyDesc}>Place an order to see it here!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  pageTitle: {
    fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', backgroundColor: colors.gray200,
    marginHorizontal: spacing.xl, borderRadius: borderRadius.md, padding: 3,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.sm },
  activeTab: { backgroundColor: colors.white, ...shadows.sm },
  tabText: { fontWeight: fontWeight.medium, color: colors.mutedForeground, fontSize: fontSize.sm },
  activeTabText: { color: colors.foreground, fontWeight: fontWeight.bold },

  scrollContent: { padding: spacing.xl, paddingBottom: spacing['4xl'] },

  // Order Cards
  orderCard: {
    backgroundColor: colors.card, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.sm, borderWidth: 1, borderColor: colors.border,
  },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.md, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingBottom: spacing.md,
  },
  orderId: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  orderDate: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  orderTotal: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, marginTop: 4,
  },
  statusText: { fontSize: 11, fontWeight: fontWeight.bold },
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailCol: {},
  detailLabel: { fontSize: fontSize.xs, color: colors.mutedForeground },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.foreground, marginTop: 2 },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginTop: spacing.lg },
  emptyDesc: { fontSize: fontSize.base, color: colors.mutedForeground, marginTop: spacing.sm },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, XCircle, ShoppingBag, Download, ArrowLeft, Calendar } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function ViewOrdersScreen({ navigation }: any) {
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ShoppingBag size={24} color={colors.primary} />
          <Text style={styles.pageTitle}>Orders</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === 'active' && styles.activeTab]}
            onPress={() => setTab('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>
              Active Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'history' && styles.activeTab]}
            onPress={() => setTab('history')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>
              Order History
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ordersListContainer}>
          {displayedOrders.length > 0 ? (
            displayedOrders.map((order: any) => {
              const status = getStatusStyle(order.status);
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <View>
                      <Text style={styles.orderId}>Order #{order.id}</Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.orderTotal}>₹{order.totalAmount}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text style={styles.detailValue}>{order.quantity}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Milk Type</Text>
                      <Text style={styles.detailValue}>{order.milkType || 'Fresh Milk'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Delivery Time</Text>
                      <Text style={styles.detailValue}>{order.deliveryTime}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={[styles.inlineStatusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.inlineStatusText, { color: status.color }]}>
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.orderActions}>
                    {tab === 'active' && (
                      <TouchableOpacity style={styles.trackBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Tracking')}>
                        <Package size={16} color={colors.white} />
                        <Text style={styles.trackBtnText}>Track Delivery</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.receiptBtn, tab === 'history' && styles.receiptBtnFull]} activeOpacity={0.8}>
                      <Download size={16} color={colors.foreground} />
                      <Text style={styles.receiptBtnText}>Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <ShoppingBag size={48} color={colors.gray300} />
              <Text style={styles.emptyTitle}>
                {tab === 'active' ? 'No Active Orders' : 'No Payment History'}
              </Text>
              <Text style={styles.emptyDesc}>
                {tab === 'active' ? 'Place an order to see it here!' : 'Your payment history will appear here.'}
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Calendar size={20} color={colors.foreground} />
            <Text style={styles.summaryTitle}>Order Summary</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, { backgroundColor: '#EFF6FF' }]}> {/* Blue 50 */}
              <Text style={styles.summaryLabel}>Total Orders</Text>
              <Text style={[styles.summaryNumber, { color: '#2563EB' }]}>{orderList.length}</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#F0FDF4' }]}> {/* Green 50 */}
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={[styles.summaryNumber, { color: '#16A34A' }]}>{historyOrders.length}</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#FFF7ED' }]}> {/* Orange 50 */}
              <Text style={styles.summaryLabel}>Active Orders</Text>
              <Text style={[styles.summaryNumber, { color: '#EA580C' }]}>{activeOrders.length}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.foreground },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
  },
  backBtnText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },

  scrollContent: { padding: spacing.xl, paddingBottom: spacing['4xl'] },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', backgroundColor: colors.gray100,
    borderRadius: borderRadius.md, padding: 4, marginBottom: spacing.xl,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm },
  activeTab: { backgroundColor: colors.white, ...shadows.sm },
  tabText: { fontWeight: '500', color: colors.gray500, fontSize: fontSize.sm },
  activeTabText: { color: colors.foreground, fontWeight: '700' },

  ordersListContainer: { marginBottom: spacing.xl },

  // Order Cards
  orderCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.sm, borderWidth: 1, borderColor: colors.border,
  },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.md, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingBottom: spacing.md,
  },
  orderId: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  orderDate: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 2 },
  orderTotal: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, marginTop: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  detailCol: { flex: 1, minWidth: '40%', marginBottom: spacing.sm },
  detailLabel: { fontSize: fontSize.xs, color: colors.gray500, marginBottom: 2 },
  detailValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.foreground },
  inlineStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  inlineStatusText: { fontSize: 10, fontWeight: '600' },

  orderActions: {
    flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm,
  },
  trackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.foreground, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
  },
  trackBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '500' },
  receiptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
  },
  receiptBtnFull: { flex: 0, paddingHorizontal: spacing.xl },
  receiptBtnText: { color: colors.foreground, fontSize: fontSize.sm, fontWeight: '500' },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  summaryTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  summaryGrid: { flexDirection: 'row', gap: spacing.sm },
  summaryItem: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: colors.gray500, marginBottom: 4, textAlign: 'center' },
  summaryNumber: { fontSize: 24, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: spacing['3xl'] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.foreground, marginTop: spacing.lg },
  emptyDesc: { fontSize: fontSize.base, color: colors.gray500, marginTop: spacing.sm },
});

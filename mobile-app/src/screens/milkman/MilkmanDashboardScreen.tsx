import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import {
  Truck, Users, Package, DollarSign, Settings,
  CheckCircle, X, Phone, MessageCircle, MapPin,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const { width } = Dimensions.get('window');

export default function MilkmanDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);

  const { data: milkmanProfile, isLoading: isProfileLoading } = useQuery<any>({
    queryKey: ['/api/milkmen/profile'], enabled: !!user,
  });
  const { data: orders, isLoading: isOrdersLoading } = useQuery<any>({
    queryKey: ['/api/orders/milkman'], enabled: !!milkmanProfile,
  });
  const { data: customers, isLoading: isCustomersLoading } = useQuery<any>({
    queryKey: ['/api/milkmen/customers'], enabled: !!milkmanProfile,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await apiRequest({ url: `/api/orders/${orderId}/status`, method: 'PATCH', body: { status } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/orders/milkman'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (dairyItems: any[]) => {
      await apiRequest({ url: '/api/milkmen/inventory', method: 'POST', body: { dairyItems } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milkmen/profile'] });
      Alert.alert('Success', 'Inventory updated');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const todaysDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o) => o.deliveryDate === todaysDateStr || o.status === 'out_for_delivery' || o.status === 'pending');
  }, [orders, todaysDateStr]);
  const pendingOrders = useMemo(() => todaysOrders.filter((o) => ['pending', 'accepted', 'out_for_delivery'].includes(o.status)), [todaysOrders]);
  const completedOrders = useMemo(() => todaysOrders.filter((o) => o.status === 'delivered'), [todaysOrders]);
  const todaysEarnings = useMemo(() => completedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0), [completedOrders]);
  const totalCustomersCount = Array.isArray(customers) ? customers.length : 0;
  const progressPerc = todaysOrders.length > 0 ? (completedOrders.length / todaysOrders.length) * 100 : 0;

  // Location broadcasting
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const startBroadcast = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); return; }
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 10 },
        (loc) => {
          apiRequest({
            url: '/api/delivery/location', method: 'POST',
            body: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          }).catch(() => {});
        }
      );
      setIsBroadcasting(true);
    } catch (e) { console.error(e); }
  };
  const stopBroadcast = () => {
    locationSub.current?.remove();
    locationSub.current = null;
    setIsBroadcasting(false);
  };
  useEffect(() => () => stopBroadcast(), []);

  const isLoading = isProfileLoading || isOrdersLoading || isCustomersLoading;

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  if (!milkmanProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Truck size={48} color={colors.gray300} />
        <Text style={styles.emptyTitle}>Profile Required</Text>
        <Text style={styles.emptySub}>Set up your milkman business profile first.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MilkmanProfileSetup')}>
          <Text style={styles.primaryBtnText}>Set Up Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.businessName}>{milkmanProfile.businessName}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Profile')}>
            <Settings size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Location Toggle */}
        <TouchableOpacity
          style={[styles.broadcastBtn, { backgroundColor: isBroadcasting ? colors.errorLight : colors.successLight }]}
          onPress={isBroadcasting ? stopBroadcast : startBroadcast}
          activeOpacity={0.8}
        >
          <MapPin size={20} color={isBroadcasting ? colors.destructive : colors.success} />
          <Text style={[styles.broadcastText, { color: isBroadcasting ? colors.destructive : colors.success }]}>
            {isBroadcasting ? 'Stop Sharing Location' : 'Start My Route (Share Location)'}
          </Text>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
          {[
            { icon: Truck, title: 'Deliveries', sub: `${pendingOrders.length} Pending`, color: colors.primary, bg: colors.primaryLight, onPress: () => setShowDeliveriesModal(true) },
            { icon: Package, title: 'Inventory', sub: 'Update Stock', color: colors.warning, bg: colors.warningLight, onPress: () => setShowInventoryModal(true) },
            { icon: Users, title: 'Customers', sub: `${totalCustomersCount} Total`, color: colors.success, bg: colors.successLight, onPress: () => setShowCustomersModal(true) },
            { icon: DollarSign, title: 'Earnings', sub: `₹${todaysEarnings} Today`, color: '#7C3AED', bg: '#EDE9FE', onPress: () => setShowEarningsModal(true) },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.9}>
              <View style={[styles.actionIconBox, { backgroundColor: a.bg }]}>
                <a.icon size={24} color={a.color} />
              </View>
              <Text style={styles.actionTitle}>{a.title}</Text>
              <Text style={styles.actionSub}>{a.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Daily Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Orders Completed</Text>
            <Text style={styles.summaryValue}>{completedOrders.length} / {todaysOrders.length}</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progressPerc}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPerc)}% of daily target</Text>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Earnings Today</Text>
            <Text style={[styles.summaryValue, { color: colors.success, fontSize: fontSize.xl }]}>₹{todaysEarnings.toFixed(2)}</Text>
          </View>
        </View>

        {/* Next Deliveries */}
        <View style={styles.deliveriesCard}>
          <View style={styles.deliveriesHeader}>
            <Text style={styles.sectionTitle}>Next Deliveries</Text>
            <TouchableOpacity onPress={() => setShowDeliveriesModal(true)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {pendingOrders.slice(0, 3).map((order) => {
            const cust = customers?.find((c: any) => c.id === order.customerId);
            return (
              <TouchableOpacity key={order.id} style={styles.snapshotRow} onPress={() => setShowDeliveriesModal(true)} activeOpacity={0.8}>
                <View style={styles.snapshotTop}>
                  <Text style={styles.snapshotName}>{cust?.name || 'Customer'}</Text>
                  <View style={styles.snapshotBadge}>
                    <Text style={styles.snapshotBadgeText}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.snapshotAddr} numberOfLines={1}>{order.deliveryAddress || cust?.address || 'No address'}</Text>
              </TouchableOpacity>
            );
          })}
          {pendingOrders.length === 0 && (
            <View style={styles.emptySnapshot}>
              <CheckCircle size={32} color={colors.gray300} />
              <Text style={styles.emptySnapshotText}>All caught up!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Deliveries Modal */}
      <Modal visible={showDeliveriesModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Today's Deliveries</Text>
            <TouchableOpacity onPress={() => setShowDeliveriesModal(false)} style={styles.closeBtn}><X size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {todaysOrders.map((order) => {
              const cust = customers?.find((c: any) => c.id === order.customerId);
              return (
                <View key={order.id} style={styles.mOrderCard}>
                  <View style={styles.mOrderTop}>
                    <View>
                      <Text style={styles.mOrderName}>{cust?.name || `Order #${order.id}`}</Text>
                      <Text style={styles.mOrderItem}>{order.itemName || 'Milk'} • {order.quantity}L</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.mOrderAmount}>₹{order.totalAmount}</Text>
                      <View style={styles.mOrderBadge}>
                        <Text style={styles.mOrderBadgeText}>{order.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.mOrderAddr}>{order.deliveryAddress || cust?.address}</Text>
                  <View style={styles.mOrderActions}>
                    {['pending', 'accepted'].includes(order.status) && (
                      <TouchableOpacity style={[styles.mActionBtn, { backgroundColor: colors.warning }]}
                        onPress={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'out_for_delivery' })}>
                        <Text style={styles.mActionText}>Start Delivery</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <TouchableOpacity style={[styles.mActionBtn, { backgroundColor: colors.success }]}
                        onPress={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}>
                        <CheckCircle size={16} color={colors.white} />
                        <Text style={styles.mActionText}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            {todaysOrders.length === 0 && <Text style={styles.modalEmpty}>No orders today.</Text>}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Customers Modal */}
      <Modal visible={showCustomersModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Customers</Text>
            <TouchableOpacity onPress={() => setShowCustomersModal(false)} style={styles.closeBtn}><X size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {Array.isArray(customers) && customers.map((c: any) => (
              <View key={c.id} style={styles.mCustCard}>
                <View style={styles.mCustAvatar}><Users size={20} color={colors.primary} /></View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.mCustName}>{c.name}</Text>
                  <Text style={styles.mCustPhone}>{c.phone}</Text>
                  <Text style={styles.mCustAddr} numberOfLines={1}>{c.address}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity style={styles.mIconBtn}><MessageCircle size={20} color={colors.primary} /></TouchableOpacity>
                  <TouchableOpacity style={styles.mIconBtn}><Phone size={20} color={colors.success} /></TouchableOpacity>
                </View>
              </View>
            ))}
            {(!customers || customers.length === 0) && <Text style={styles.modalEmpty}>No customers yet.</Text>}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Earnings Modal */}
      <Modal visible={showEarningsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Earnings Overview</Text>
            <TouchableOpacity onPress={() => setShowEarningsModal(false)} style={styles.closeBtn}><X size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.earningsHero}>
              <Text style={styles.earningsLabel}>Earnings Today</Text>
              <Text style={styles.earningsAmount}>₹{todaysEarnings.toFixed(2)}</Text>
            </View>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {completedOrders.map((order) => {
              const cust = customers?.find((c: any) => c.id === order.customerId);
              return (
                <View key={`tx-${order.id}`} style={styles.txCard}>
                  <View>
                    <Text style={styles.txName}>{cust?.name || 'Customer'}</Text>
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
            <TouchableOpacity onPress={() => setShowInventoryModal(false)} style={styles.closeBtn}><X size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.invSubtitle}>Update items you carry today</Text>
            {milkmanProfile.dairyItems?.map((item: any, index: number) => (
              <View key={index} style={styles.invCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invName}>{item.name}</Text>
                  <Text style={styles.invPrice}>₹{item.price} per unit</Text>
                  <View style={[styles.invBadge, { backgroundColor: item.isAvailable ? colors.successLight : colors.errorLight }]}>
                    <Text style={[styles.invBadgeText, { color: item.isAvailable ? colors.success : colors.destructive }]}>
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.invToggle}
                  onPress={() => {
                    const updated = [...milkmanProfile.dairyItems];
                    updated[index] = { ...item, isAvailable: !item.isAvailable };
                    updateInventoryMutation.mutate(updated);
                  }}
                >
                  <Text style={styles.invToggleText}>{item.isAvailable ? 'Disable' : 'Enable'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.base, color: colors.mutedForeground },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'], backgroundColor: colors.background },
  emptyTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground, marginTop: spacing.lg },
  emptySub: { fontSize: fontSize.base, color: colors.mutedForeground, textAlign: 'center', marginVertical: spacing.md },
  primaryBtn: { backgroundColor: colors.brandAccent, paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  primaryBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: fontWeight.bold },

  scrollContent: { padding: spacing.xl, paddingBottom: spacing['4xl'] },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  greeting: { fontSize: fontSize.base, color: colors.mutedForeground },
  businessName: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.foreground },
  settingsBtn: {
    width: 44, height: 44, backgroundColor: colors.surfaceSecondary,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },

  // Broadcast
  broadcastBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.xl, gap: spacing.sm,
  },
  broadcastText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },

  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.xl },
  actionCard: {
    width: (width - 52) / 2, backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.xl, marginBottom: spacing.md, ...shadows.md,
  },
  actionIconBox: {
    width: 48, height: 48, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  actionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  actionSub: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 4 },

  // Summary
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.lg },
  summaryCard: {
    backgroundColor: colors.card, padding: spacing.xl,
    borderRadius: borderRadius.xl, marginBottom: spacing.xl, ...shadows.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  summaryLabel: { fontSize: fontSize.base, color: colors.gray600 },
  summaryValue: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  progressContainer: {
    height: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 4,
    marginVertical: spacing.sm, overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },

  // Deliveries
  deliveriesCard: {
    backgroundColor: colors.card, padding: spacing.xl,
    borderRadius: borderRadius.xl, ...shadows.md,
  },
  deliveriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  snapshotRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  snapshotTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  snapshotName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.foreground },
  snapshotBadge: { backgroundColor: '#FDF2F8', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  snapshotBadgeText: { fontSize: 10, color: '#DB2777', fontWeight: fontWeight.bold, textTransform: 'uppercase' },
  snapshotAddr: { fontSize: fontSize.sm, color: colors.mutedForeground },
  emptySnapshot: { alignItems: 'center', paddingVertical: spacing.xl },
  emptySnapshotText: { fontSize: fontSize.sm, color: colors.gray400, marginTop: spacing.sm },

  // Modals
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.xl, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  closeBtn: { padding: 4 },
  modalContent: { padding: spacing.xl },
  modalEmpty: { textAlign: 'center', color: colors.mutedForeground, marginTop: spacing['4xl'], fontSize: fontSize.base },

  // Modal Order Card
  mOrderCard: {
    backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  mOrderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  mOrderName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  mOrderItem: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  mOrderAmount: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.success },
  mOrderBadge: { backgroundColor: colors.warningLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  mOrderBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.warning },
  mOrderAddr: { fontSize: fontSize.sm, color: colors.gray600, marginVertical: spacing.sm },
  mOrderActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  mActionBtn: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, height: 40,
    borderRadius: borderRadius.md, alignItems: 'center', gap: spacing.xs,
  },
  mActionText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },

  // Customer Card
  mCustCard: {
    flexDirection: 'row', backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.md, alignItems: 'center', ...shadows.sm,
  },
  mCustAvatar: {
    width: 44, height: 44, backgroundColor: colors.primaryLight,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  mCustName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  mCustPhone: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  mCustAddr: { fontSize: fontSize.xs, color: colors.gray400, marginTop: 2 },
  mIconBtn: {
    width: 36, height: 36, backgroundColor: colors.surfaceSecondary,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },

  // Earnings
  earningsHero: {
    backgroundColor: colors.success, borderRadius: borderRadius.xl,
    padding: spacing['2xl'], alignItems: 'center', marginBottom: spacing.xl,
  },
  earningsLabel: { color: colors.white, fontSize: fontSize.base },
  earningsAmount: { color: colors.white, fontSize: 36, fontWeight: fontWeight.bold, marginTop: spacing.sm },

  // Transactions
  txCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  txName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.foreground },
  txDate: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
  txAmount: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.success },

  // Inventory
  invSubtitle: { fontSize: fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.lg },
  invCard: {
    flexDirection: 'row', backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.md, alignItems: 'center', ...shadows.sm,
  },
  invName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  invPrice: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 4 },
  invBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, marginTop: spacing.sm },
  invBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  invToggle: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  invToggleText: { color: colors.foreground, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
});

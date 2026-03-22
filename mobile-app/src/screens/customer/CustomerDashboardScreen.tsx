import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Truck, ShoppingCart, User, Clock, ChevronRight,
  Package, Star, Bell,
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function CustomerDashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });
  const { data: milkmen } = useQuery<any[]>({
    queryKey: ['/api/milkmen'], enabled: !!user,
  });
  const { data: orders } = useQuery<any[]>({
    queryKey: ['/api/orders/customer'], enabled: !!profile,
  });

  if (profileLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const recentOrders = Array.isArray(orders) ? orders.slice(0, 3) : [];
  const milkmenList = Array.isArray(milkmen) ? milkmen : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {profile?.name || 'Customer'}! 👋</Text>
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.mutedForeground} />
              <Text style={styles.addressText} numberOfLines={1}>
                {profile?.address || 'No location set'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.bellBtn}>
              <Bell size={22} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn}>
              <User size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('OrderPage')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <ShoppingCart size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>New Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Tracking')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.successLight }]}>
              <Truck size={24} color={colors.success} />
            </View>
            <Text style={styles.actionLabel}>Track</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <View style={[styles.actionIcon, { backgroundColor: colors.warningLight }]}>
              <Clock size={24} color={colors.warning} />
            </View>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ViewOrders')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Package size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>Orders</Text>
          </TouchableOpacity>
        </View>

        {/* Milkmen Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Milkmen</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {milkmenList.length > 0 ? (
            milkmenList.map((milkman: any) => (
              <TouchableOpacity key={milkman.id} style={styles.milkmanCard} activeOpacity={0.9}>
                <View style={styles.milkmanTop}>
                  <View style={styles.milkmanAvatar}>
                    <Truck size={20} color={colors.primary} />
                  </View>
                  <View style={styles.milkmanInfo}>
                    <Text style={styles.milkmanName}>
                      {milkman.businessName || milkman.contactName}
                    </Text>
                    <Text style={styles.milkmanAddress} numberOfLines={1}>
                      {milkman.address}
                    </Text>
                  </View>
                  <Text style={styles.milkmanPrice}>₹{milkman.pricePerLiter}/L</Text>
                </View>

                <View style={styles.milkmanBottom}>
                  <View style={styles.timeBadge}>
                    <Clock size={12} color={colors.foreground} />
                    <Text style={styles.timeText}>
                      {milkman.deliveryTimeStart} - {milkman.deliveryTimeEnd}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Star size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>4.5</Text>
                  </View>
                  <TouchableOpacity style={styles.orderSmallBtn}>
                    <Text style={styles.orderSmallText}>Order</Text>
                    <ChevronRight size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Truck size={32} color={colors.gray300} />
              <Text style={styles.emptyText}>No milkmen available right now</Text>
            </View>
          )}
        </View>

        {/* Recent Orders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ViewOrders')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((order: any) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <View style={[
                    styles.statusBadge,
                    order.status === 'delivered' ? styles.statusDelivered :
                    order.status === 'pending' ? styles.statusPending : styles.statusActive
                  ]}>
                    <Text style={[
                      styles.statusText,
                      order.status === 'delivered' ? { color: colors.success } :
                      order.status === 'pending' ? { color: colors.warning } : { color: colors.info }
                    ]}>
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Package size={32} color={colors.gray300} />
              <Text style={styles.emptyText}>No orders yet. Place your first order!</Text>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.card, ...shadows.sm,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  greeting: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addressText: { fontSize: fontSize.sm, color: colors.mutedForeground, marginLeft: 4, flex: 1 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick Actions
  actionsContainer: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    backgroundColor: colors.card, marginBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  actionCard: { alignItems: 'center' },
  actionIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.foreground },

  // Section
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  seeAll: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },

  // Milkman Cards
  milkmanCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.md,
  },
  milkmanTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  milkmanAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  milkmanInfo: { flex: 1, marginLeft: spacing.md },
  milkmanName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  milkmanAddress: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  milkmanPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  milkmanBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: borderRadius.full,
  },
  timeText: { fontSize: 11, color: colors.foreground, fontWeight: fontWeight.medium },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.warningLight, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: borderRadius.full,
  },
  ratingText: { fontSize: 11, fontWeight: fontWeight.bold, color: '#92400E' },
  orderSmallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, borderRadius: borderRadius.md,
    marginLeft: 'auto',
  },
  orderSmallText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  // Order Cards
  orderCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  statusPending: { backgroundColor: colors.warningLight },
  statusDelivered: { backgroundColor: colors.successLight },
  statusActive: { backgroundColor: colors.infoLight },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  orderAmount: { fontSize: fontSize.base, color: colors.mutedForeground },

  // Empty state
  emptyCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing['3xl'], alignItems: 'center', ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontSize: fontSize.base, color: colors.mutedForeground, marginTop: spacing.md },

  // Logout
  logoutBtn: {
    marginHorizontal: spacing.xl, marginTop: spacing['2xl'],
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    height: 48, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.destructive,
  },
  logoutText: { color: colors.destructive, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});

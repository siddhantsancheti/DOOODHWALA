import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Star, Crown, Zap, Phone, CheckCircle, Minus, Plus, Truck,
  Calendar, Edit, Percent, CalendarCheck, CreditCard, History, Headphones,
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const PURPLE = '#9333EA';
const PURPLE_LIGHT = '#F3E8FF';

export default function YDPageScreen() {
  const { user } = useAuth();
  const [orderQuantity, setOrderQuantity] = useState(2);
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);

  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const assignedMilkmanId = customerProfile?.assignedMilkmanId;
  const { data: assignedMilkman } = useQuery<any>({
    queryKey: [`/api/milkmen/${assignedMilkmanId}`], enabled: !!assignedMilkmanId,
  });

  const { data: currentBill } = useQuery<any>({
    queryKey: ['/api/bills/current'], enabled: !!customerProfile,
  });

  const { data: milkmen } = useQuery<any>({
    queryKey: ['/api/milkmen'], enabled: !!user && !assignedMilkmanId,
  });

  const assignYDMutation = useMutation({
    mutationFn: async (milkmanId: number) => {
      await apiRequest({ url: '/api/customers/assign-yd', method: 'PATCH', body: { milkmanId } });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Your dedicated milkman has been assigned!');
      queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest({ url: '/api/orders', method: 'POST', body: data });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Your one-click order has been placed!');
      queryClient.invalidateQueries({ queryKey: ['/api/orders/customer'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleOneClickOrder = () => {
    if (!assignedMilkman) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    placeOrderMutation.mutate({
      milkmanId: assignedMilkman.id,
      quantity: orderQuantity.toString(),
      pricePerLiter: assignedMilkman.pricePerLiter,
      totalAmount: (orderQuantity * parseFloat(assignedMilkman.pricePerLiter)).toString(),
      deliveryDate: tomorrow.toISOString().split('T')[0],
      deliveryTime: '07:00-08:00',
      status: 'pending',
      itemName: 'Milk (Fresh)',
    });
  };

  if (profileLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header - using LinearGradient to match web */}
        <LinearGradient
          colors={['#A855F7', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Star size={64} color={colors.white} />
          <Text style={styles.headerTitle}>Your Doodhwala (YD)</Text>
          <Text style={styles.headerSub}>
            Assign your dedicated milkman & enjoy hassle-free daily milk delivery with one-click ordering
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {assignedMilkman ? (
            <>
              {/* YD Card */}
              <View style={styles.ydCard}>
                <View style={styles.ydHeader}>
                  <View style={styles.ydAvatar}>
                    <Text style={{ fontSize: 30 }}>👨‍🌾</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.lg }}>
                    <View style={styles.ydNameRow}>
                      <Text style={styles.ydName}>{assignedMilkman.businessName}</Text>
                      <View style={styles.ydBadge}>
                        <Crown size={12} color={PURPLE} />
                        <Text style={styles.ydBadgeText}>Your YD</Text>
                      </View>
                    </View>
                    <Text style={styles.ydStats}>
                      <Star size={12} color={colors.warning} />
                      {' '}{assignedMilkman.rating} ({assignedMilkman.totalReviews} reviews) • Serving you since Mar 2024
                    </Text>
                    <Text style={styles.ydStatsSub}>Your trusted daily milk partner</Text>
                  </View>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8}>
                    <Phone size={16} color={colors.white} />
                    <Text style={styles.contactBtnText}>Contact YD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8}>
                    <Text style={styles.outlineBtnText}>Change YD</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Order & Billing Rows */}
              <View style={styles.gridContainer}>
                {/* Quick Order Card */}
                <View style={styles.gridCard}>
                  <Text style={styles.cardTitle}>One-Click Daily Order</Text>
                  <View style={styles.orderBox}>
                    <Text style={styles.orderBoxTitle}>Your Regular Order</Text>
                    <View style={styles.orderRow}>
                      <Text style={{ fontSize: fontSize.lg }}>🥛 Milk (Fresh)</Text>
                      <View style={styles.qtyControls}>
                        <TouchableOpacity onPress={() => setOrderQuantity(Math.max(0.5, orderQuantity - 0.5))} style={styles.qtyBtn}>
                          <Minus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{orderQuantity}L</Text>
                        <TouchableOpacity onPress={() => setOrderQuantity(orderQuantity + 0.5)} style={styles.qtyBtn}>
                          <Plus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.deliveryTimeRow}>
                      <Text style={styles.deliveryTimeLabel}>Delivery Time</Text>
                      <Text style={styles.deliveryTimeValue}>7:00 AM - 8:00 AM</Text>
                    </View>
                    <Text style={styles.orderTotal}>
                      ₹{(orderQuantity * parseFloat(assignedMilkman.pricePerLiter)).toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.oneClickBtn} onPress={handleOneClickOrder} activeOpacity={0.8}>
                    {placeOrderMutation.isPending ? (
                       <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Zap size={20} color={colors.white} />
                        <Text style={styles.oneClickText}>Order for Tomorrow (One-Click)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modernBtnBlack} activeOpacity={0.8}>
                    <Calendar size={18} color={colors.white} />
                    <Text style={styles.modernBtnBlackText}>Order for Next 7 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.outlineBorderBtn} activeOpacity={0.8}>
                    <Edit size={18} color={PURPLE} />
                    <Text style={styles.outlineBorderBtnText}>Modify Regular Order</Text>
                  </TouchableOpacity>

                  <View style={styles.orderHistorySummary}>
                    <Text style={styles.orderBoxTitle}>This Month with YD</Text>
                    <View style={styles.historyGrid}>
                      <View style={styles.historyStat}>
                        <Text style={[styles.historyVal, { color: PURPLE }]}>22</Text>
                        <Text style={styles.historyLabel}>Orders</Text>
                      </View>
                      <View style={styles.historyStat}>
                        <Text style={[styles.historyVal, { color: colors.success }]}>44L</Text>
                        <Text style={styles.historyLabel}>Milk</Text>
                      </View>
                      <View style={styles.historyStat}>
                        <Text style={[styles.historyVal, { color: colors.brandAccent }]}>₹1,100</Text>
                        <Text style={styles.historyLabel}>Amount</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* YD Billing Card */}
                <View style={[styles.gridCard, { marginTop: spacing.lg }]}>
                  <Text style={styles.cardTitle}>YD Monthly Billing</Text>
                  
                  <View style={styles.billingCurrentBox}>
                    <View style={styles.billingHeader}>
                      <Text style={styles.billingTitle}>Current Month Bill</Text>
                      <View style={styles.billingBadge}><Text style={styles.billingBadgeText}>Day 22/30</Text></View>
                    </View>
                    <View style={styles.billingRow}>
                      <Text style={styles.billingLabel}>Orders completed</Text>
                      <Text style={styles.billingValue}>{currentBill?.totalOrders || '22'}</Text>
                    </View>
                    <View style={styles.billingRow}>
                      <Text style={styles.billingLabel}>Total quantity</Text>
                      <Text style={styles.billingValue}>{currentBill?.totalQuantity || '44L'}</Text>
                    </View>
                    <View style={styles.billingRow}>
                      <Text style={styles.billingLabel}>Subtotal</Text>
                      <Text style={styles.billingValue}>₹{currentBill?.totalAmount || '1,100'}</Text>
                    </View>
                    <View style={styles.billingRow}>
                      <Text style={styles.billingLabel}>YD Loyalty Discount</Text>
                      <Text style={[styles.billingValue, { color: colors.success }]}>-₹{currentBill?.discount || '55'}</Text>
                    </View>
                    <View style={styles.billingDivider} />
                    <View style={styles.billingRow}>
                      <Text style={styles.billingTotalLabel}>Current Total</Text>
                      <Text style={styles.billingTotalValue}>₹{currentBill?.totalAmount || '1,045'}</Text>
                    </View>
                  </View>

                  <View style={styles.billingSettings}>
                    <View style={styles.autoPayRow}>
                      <View>
                        <Text style={styles.autoPayTitle}>Auto-pay on 30th</Text>
                        <Text style={styles.autoPaySub}>Automatic payment enabled</Text>
                      </View>
                      <Switch value={autoPayEnabled} onValueChange={setAutoPayEnabled} trackColor={{ true: PURPLE }} />
                    </View>
                    <TouchableOpacity style={styles.modernBtnBlack} activeOpacity={0.8}>
                      <CreditCard size={18} color={colors.white} />
                      <Text style={styles.modernBtnBlackText}>Pay Current Bill Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.outlineBorderBtn} activeOpacity={0.8}>
                      <History size={18} color={PURPLE} />
                      <Text style={styles.outlineBorderBtnText}>View Billing History</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Benefits */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>YD Premium Benefits</Text>
                
                <View style={styles.benefitsGrid}>
                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBoxPurple}>
                      <Zap size={24} color={PURPLE} />
                    </View>
                    <Text style={styles.benefitTitle}>One-Click Ordering</Text>
                    <Text style={styles.benefitDesc}>Order your regular milk with just one tap</Text>
                  </View>
                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBoxGreen}>
                      <Percent size={24} color={colors.success} />
                    </View>
                    <Text style={styles.benefitTitle}>Loyalty Discounts</Text>
                    <Text style={styles.benefitDesc}>5% discount on all orders with your YD</Text>
                  </View>
                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBoxBlue}>
                      <CalendarCheck size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.benefitTitle}>Priority Delivery</Text>
                    <Text style={styles.benefitDesc}>Get priority slot for your preferred time</Text>
                  </View>
                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBoxOrange}>
                      <Headphones size={24} color={colors.brandAccent} />
                    </View>
                    <Text style={styles.benefitTitle}>Dedicated Support</Text>
                    <Text style={styles.benefitDesc}>Direct contact with your assigned milkman</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitleCenter}>Choose Your Doodhwala</Text>
                <Text style={styles.cardSubCenter}>Select a milkman to become your dedicated YD for one-click ordering.</Text>
                {milkmen?.map((m: any) => (
                  <View key={m.id} style={styles.milkmanCard}>
                    <View style={styles.milkmanTop}>
                      <View style={styles.milkmanAvatar}>
                        <Truck size={20} color={PURPLE} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={styles.ydName}>{m.businessName}</Text>
                        <Text style={styles.ydStats}>⭐ {m.rating} ({m.totalReviews} reviews) • ₹{m.pricePerLiter}/L</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => assignYDMutation.mutate(m.id)}
                      activeOpacity={0.8}
                    >
                      <Crown size={16} color={colors.white} />
                      <Text style={styles.contactBtnText}>Assign as YD</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PURPLE },
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Header
  header: {
    padding: spacing['3xl'], alignItems: 'center',
    paddingBottom: spacing['4xl'], // Allow space for overlapping items if needed
  },
  headerTitle: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.md },
  headerSub: { fontSize: fontSize.lg, color: PURPLE_LIGHT, textAlign: 'center', marginTop: spacing.sm },

  content: { padding: spacing.xl, marginTop: -spacing.lg },

  // YD Card
  ydCard: {
    backgroundColor: colors.card, padding: spacing.xl,
    borderRadius: borderRadius.xl, marginBottom: spacing.lg, ...shadows.md,
  },
  ydHeader: { flexDirection: 'row', alignItems: 'center' },
  ydAvatar: { width: 64, height: 64, backgroundColor: colors.gray100, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  ydNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  ydName: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground },
  ydBadge: { flexDirection: 'row', backgroundColor: PURPLE_LIGHT, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, marginLeft: spacing.sm, alignItems: 'center', gap: 4 },
  ydBadgeText: { fontSize: 11, color: PURPLE, fontWeight: fontWeight.bold },
  ydStats: { fontSize: fontSize.sm, color: colors.gray600, marginTop: 4 },
  ydStatsSub: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 2 },
  contactActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  contactBtn: { flex: 1, flexDirection: 'row', backgroundColor: PURPLE, padding: spacing.md, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  contactBtnText: { color: colors.white, fontWeight: fontWeight.bold },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: PURPLE, padding: spacing.md, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  outlineBtnText: { color: PURPLE, fontWeight: fontWeight.bold },

  gridContainer: { flexDirection: 'column', marginBottom: spacing.lg },
  gridCard: { backgroundColor: colors.card, padding: spacing.xl, borderRadius: borderRadius.xl, ...shadows.md },

  // Cards
  card: { backgroundColor: colors.card, padding: spacing.xl, borderRadius: borderRadius.xl, marginBottom: spacing.lg, ...shadows.md },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.lg },
  cardTitleCenter: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.sm, textAlign: 'center' },
  cardSubCenter: { fontSize: fontSize.base, color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.xl },

  // Order Box
  orderBox: { backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  orderBoxTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.foreground, marginBottom: spacing.md },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 34, height: 34, borderWidth: 1, borderColor: colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginHorizontal: spacing.lg, color: colors.foreground },
  deliveryTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  deliveryTimeLabel: { fontSize: fontSize.sm, color: colors.gray600 },
  deliveryTimeValue: { fontSize: fontSize.sm, color: colors.gray600 },
  orderTotal: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground, marginTop: spacing.md, textAlign: 'right' },

  // Buttons
  oneClickBtn: { flexDirection: 'row', padding: spacing.lg, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  oneClickText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.lg },
  modernBtnBlack: { flexDirection: 'row', backgroundColor: colors.foreground, padding: spacing.lg, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  modernBtnBlackText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  outlineBorderBtn: { flexDirection: 'row', borderWidth: 1, borderColor: PURPLE, padding: spacing.lg, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  outlineBorderBtnText: { color: PURPLE, fontWeight: fontWeight.semibold, fontSize: fontSize.base },

  // History Summary
  orderHistorySummary: { marginTop: spacing['2xl'], paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border },
  historyGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  historyStat: { flex: 1, alignItems: 'center' },
  historyVal: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  historyLabel: { fontSize: fontSize.xs, color: colors.gray600, marginTop: 4 },

  // Billing
  billingCurrentBox: { backgroundColor: PURPLE_LIGHT, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.xl },
  billingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  billingTitle: { fontWeight: fontWeight.semibold, color: colors.foreground },
  billingBadge: { backgroundColor: PURPLE, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4 },
  billingBadgeText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  billingLabel: { color: colors.gray600, fontSize: fontSize.sm },
  billingValue: { fontWeight: fontWeight.medium, color: colors.foreground, fontSize: fontSize.sm },
  billingDivider: { height: 1, backgroundColor: 'rgba(147, 51, 234, 0.2)', marginVertical: spacing.md },
  billingTotalLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  billingTotalValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: PURPLE },
  billingSettings: { gap: spacing.md },
  autoPayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: borderRadius.lg },
  autoPayTitle: { fontWeight: fontWeight.medium, color: colors.foreground },
  autoPaySub: { fontSize: fontSize.sm, color: colors.gray600 },

  // Benefits
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm },
  benefitBox: { width: '50%', padding: spacing.sm, alignItems: 'center' },
  benefitIconBoxPurple: { width: 64, height: 64, borderRadius: 32, backgroundColor: PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  benefitIconBoxGreen: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  benefitIconBoxBlue: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  benefitIconBoxOrange: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md }, // placeholder light orange
  benefitTitle: { fontWeight: fontWeight.semibold, color: colors.foreground, marginBottom: 4, textAlign: 'center' },
  benefitDesc: { fontSize: fontSize.xs, color: colors.gray600, textAlign: 'center' },

  // Milkman selection
  milkmanCard: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.sm },
  milkmanTop: { flexDirection: 'row', alignItems: 'center' },
  milkmanAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center' },
  assignBtn: { flexDirection: 'row', backgroundColor: PURPLE, padding: spacing.md, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
});

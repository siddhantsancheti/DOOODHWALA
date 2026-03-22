import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import {
  Star, Crown, Zap, Phone, CheckCircle, Minus, Plus, Truck,
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const PURPLE = '#9333EA';
const PURPLE_LIGHT = '#F3E8FF';

export default function YDPageScreen() {
  const { user } = useAuth();
  const [orderQuantity, setOrderQuantity] = useState(2);

  const { data: customerProfile, isLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const assignedMilkmanId = customerProfile?.assignedMilkmanId;
  const { data: assignedMilkman } = useQuery<any>({
    queryKey: [`/api/milkmen/${assignedMilkmanId}`], enabled: !!assignedMilkmanId,
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

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Star size={32} color={colors.white} />
          </View>
          <Text style={styles.headerTitle}>Your Doodhwala (YD)</Text>
          <Text style={styles.headerSub}>
            Assign your dedicated milkman & enjoy one-click ordering
          </Text>
        </View>

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
                      ⭐ {assignedMilkman.rating} ({assignedMilkman.totalReviews} reviews)
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8}>
                  <Phone size={16} color={colors.white} />
                  <Text style={styles.contactBtnText}>Contact YD</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Order */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>One-Click Daily Order</Text>

                <View style={styles.orderBox}>
                  <Text style={styles.orderBoxTitle}>Your Regular Order</Text>
                  <View style={styles.orderRow}>
                    <Text style={{ fontSize: fontSize.lg }}>🥛 Milk (Fresh)</Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() => setOrderQuantity(Math.max(0.5, orderQuantity - 0.5))}
                        style={styles.qtyBtn} activeOpacity={0.7}
                      >
                        <Minus size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{orderQuantity}L</Text>
                      <TouchableOpacity
                        onPress={() => setOrderQuantity(orderQuantity + 0.5)}
                        style={styles.qtyBtn} activeOpacity={0.7}
                      >
                        <Plus size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.orderTotal}>
                    Total: ₹{(orderQuantity * parseFloat(assignedMilkman.pricePerLiter)).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity style={styles.oneClickBtn} onPress={handleOneClickOrder} activeOpacity={0.8}>
                  <Zap size={20} color={colors.white} />
                  <Text style={styles.oneClickText}>Order for Tomorrow</Text>
                </TouchableOpacity>
              </View>

              {/* Benefits */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>YD Premium Benefits</Text>
                {[
                  { icon: <Zap size={20} color={PURPLE} />, text: 'One-Click Ordering' },
                  { icon: <CheckCircle size={20} color={colors.success} />, text: 'Priority Delivery' },
                  { icon: <CheckCircle size={20} color={colors.primary} />, text: '5% Loyalty Discount' },
                ].map((b, i) => (
                  <View key={i} style={styles.benefitRow}>
                    {b.icon}
                    <Text style={styles.benefitText}>{b.text}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Choose Your Doodhwala</Text>
              <Text style={styles.cardSub}>Select a milkman to become your dedicated YD.</Text>
              {milkmen?.map((m: any) => (
                <View key={m.id} style={styles.milkmanCard}>
                  <View style={styles.milkmanTop}>
                    <View style={styles.milkmanAvatar}>
                      <Truck size={20} color={PURPLE} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.ydName}>{m.businessName}</Text>
                      <Text style={styles.ydStats}>⭐ {m.rating} • ₹{m.pricePerLiter}/L</Text>
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
    backgroundColor: PURPLE, padding: spacing['3xl'],
    alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.md },
  headerSub: { fontSize: fontSize.base, color: PURPLE_LIGHT, textAlign: 'center', marginTop: spacing.sm },

  content: { padding: spacing.xl },

  // YD Card
  ydCard: {
    backgroundColor: colors.card, padding: spacing.xl,
    borderRadius: borderRadius.xl, marginBottom: spacing.lg, ...shadows.lg,
  },
  ydHeader: { flexDirection: 'row', alignItems: 'center' },
  ydAvatar: {
    width: 60, height: 60, backgroundColor: colors.gray100, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  ydNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  ydName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  ydBadge: {
    flexDirection: 'row', backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, marginLeft: spacing.sm, alignItems: 'center', gap: 4,
  },
  ydBadgeText: { fontSize: 11, color: PURPLE, fontWeight: fontWeight.bold },
  ydStats: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 4 },
  contactBtn: {
    flexDirection: 'row', backgroundColor: PURPLE, padding: spacing.md,
    borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.lg, gap: spacing.sm,
  },
  contactBtnText: { color: colors.white, fontWeight: fontWeight.bold },

  // Cards
  card: {
    backgroundColor: colors.card, padding: spacing.xl,
    borderRadius: borderRadius.xl, marginBottom: spacing.lg, ...shadows.md,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.lg },
  cardSub: { fontSize: fontSize.base, color: colors.mutedForeground, marginBottom: spacing.lg },

  // Order Box
  orderBox: {
    backgroundColor: colors.surfaceSecondary, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.lg,
  },
  orderBoxTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.foreground, marginBottom: spacing.md },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 34, height: 34, backgroundColor: colors.gray200, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyVal: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginHorizontal: spacing.lg,
    color: colors.foreground,
  },
  orderTotal: {
    fontSize: fontSize.base, fontWeight: fontWeight.bold,
    color: colors.foreground, marginTop: spacing.md, textAlign: 'right',
  },

  // One-Click
  oneClickBtn: {
    flexDirection: 'row', backgroundColor: PURPLE, padding: spacing.lg,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
    ...shadows.md,
  },
  oneClickText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.base },

  // Benefits
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  benefitText: { fontSize: fontSize.base, color: colors.foreground },

  // Milkman selection
  milkmanCard: {
    backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  milkmanTop: { flexDirection: 'row', alignItems: 'center' },
  milkmanAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center',
  },
  assignBtn: {
    flexDirection: 'row', backgroundColor: PURPLE, padding: spacing.md,
    borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.md, gap: spacing.sm,
  },
});

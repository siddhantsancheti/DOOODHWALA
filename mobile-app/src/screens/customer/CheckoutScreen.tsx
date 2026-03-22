import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Banknote, CreditCard, ShieldCheck } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function CheckoutScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const amount = route.params?.amount || 100;
  const description = route.params?.description || 'Milk Delivery Payment';
  const orderId = route.params?.orderId || `ORDER_${Date.now()}`;
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const resp: any = await apiRequest({
        url: '/api/payments/razorpay/create-order', method: 'POST',
        body: { amount, orderId, description },
      });
      const { razorpayOrderId, key } = resp;

      if (!key || key === 'rzp_test_placeholder') {
        Alert.alert('Test Mode', 'Simulating successful payment.');
        setTimeout(() => {
          Alert.alert('Success', 'Test payment processed!');
          navigation.navigate('CustomerDashboard');
        }, 1500);
        setIsProcessing(false);
        return;
      }

      Alert.alert('Expo Go Test Mode', 'Razorpay not supported in Expo Go. Simulating payment.', [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsProcessing(false) },
        {
          text: 'Simulate Success',
          onPress: async () => {
            try {
              const verifyResp = await apiRequest({
                url: '/api/payments/razorpay/verify', method: 'POST',
                body: {
                  razorpay_order_id: razorpayOrderId,
                  razorpay_payment_id: `mock_pay_${Date.now()}`,
                  razorpay_signature: 'mock_signature_for_expo_go',
                },
              });
              // @ts-ignore
              if (verifyResp.success) {
                Alert.alert('Success', 'Test payment processed!');
                navigation.navigate('CustomerDashboard');
              } else throw new Error('Verification failed');
            } catch (e: any) {
              Alert.alert('Failed', 'Verification failed.');
            } finally { setIsProcessing(false); }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Payment Failed', e.message);
      setIsProcessing(false);
    }
  };

  const handleCODOrder = async () => {
    setIsProcessing(true);
    try {
      const resp: any = await apiRequest({
        url: '/api/payments/cod/create-order', method: 'POST',
        body: {
          amount, orderId,
          customerId: customerProfile?.id || 0,
          milkmanId: customerProfile?.assignedMilkmanId || 1,
          description,
          customerPhone: user?.phone?.replace('+91', '') || user?.phone,
          deliveryAddress: customerProfile?.address || 'Delivery location',
          userId: user?.id,
        },
      });
      // @ts-ignore
      if (resp.success) {
        Alert.alert('Order Confirmed', `Pay ₹${amount} in cash upon delivery.${resp.codOTP ? ' OTP: ' + resp.codOTP : ''}`);
        navigation.navigate('CustomerDashboard');
      } else throw new Error(resp.message || 'Failed');
    } catch (e: any) {
      Alert.alert('Order Failed', e.message);
    } finally { setIsProcessing(false); }
  };

  if (profileLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Secure Checkout</Text>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{amount}</Text>
          <Text style={styles.descText}>{description}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {/* Online Payment */}
        <TouchableOpacity
          style={styles.paymentMethod}
          onPress={handleRazorpayPayment}
          disabled={isProcessing}
          activeOpacity={0.9}
        >
          <View style={styles.methodIconOnline}>
            <CreditCard size={24} color={colors.primary} />
          </View>
          <View style={styles.methodDetails}>
            <Text style={styles.methodTitle}>Pay Online (UPI / Cards)</Text>
            <Text style={styles.methodSub}>Instant checkout via Razorpay</Text>
          </View>
        </TouchableOpacity>

        {/* COD */}
        <TouchableOpacity
          style={styles.paymentMethod}
          onPress={handleCODOrder}
          disabled={isProcessing}
          activeOpacity={0.9}
        >
          <View style={styles.methodIconCOD}>
            <Banknote size={24} color={colors.success} />
          </View>
          <View style={styles.methodDetails}>
            <Text style={styles.methodTitle}>Cash on Delivery</Text>
            <Text style={styles.methodSub}>Pay cash when order arrives</Text>
          </View>
        </TouchableOpacity>

        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}

        <View style={styles.secureBadge}>
          <ShieldCheck size={16} color={colors.success} />
          <Text style={styles.secureText}>100% Secure Payment</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  pageTitle: {
    fontSize: fontSize['2xl'], fontWeight: fontWeight.bold,
    color: colors.foreground, marginBottom: spacing.xl,
  },

  // Amount Card
  amountCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    padding: spacing['3xl'], alignItems: 'center', marginBottom: spacing['3xl'],
    ...shadows.lg,
  },
  amountLabel: { fontSize: fontSize.base, color: colors.mutedForeground, marginBottom: spacing.sm },
  amountValue: { fontSize: 42, fontWeight: fontWeight.bold, color: colors.primary },
  descText: { fontSize: fontSize.sm, color: colors.gray600, marginTop: spacing.sm, textAlign: 'center' },

  // Section
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.foreground, marginBottom: spacing.lg,
  },

  // Payment Methods
  paymentMethod: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  methodIconOnline: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  methodIconCOD: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.successLight, justifyContent: 'center', alignItems: 'center',
  },
  methodDetails: { marginLeft: spacing.lg, flex: 1 },
  methodTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  methodSub: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },

  // Secure Badge
  secureBadge: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: spacing['4xl'], gap: spacing.sm,
  },
  secureText: { color: colors.success, fontWeight: fontWeight.medium },

  // Processing
  loadingOverlay: {
    backgroundColor: 'rgba(255,255,255,0.9)', padding: spacing['3xl'],
    borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.xl,
  },
  processingText: { marginTop: spacing.md, color: colors.foreground, fontWeight: fontWeight.medium },
});

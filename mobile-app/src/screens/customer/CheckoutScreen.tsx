import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Banknote, CreditCard, Wallet, ShieldCheck, ArrowLeft, Check, Smartphone } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function CheckoutScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const amount = route.params?.amount || 100;
  const description = route.params?.description || 'Milk Delivery Payment';
  const orderId = route.params?.orderId || `ORDER_${Date.now()}`;
  const paymentType = route.params?.paymentType || 'single';
  const groupId = route.params?.groupId || null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [tab, setTab] = useState<'cod' | 'razorpay' | 'stripe'>('cod');

  const { data: groupBill, isLoading: groupLoading } = useQuery<any>({
    queryKey: [`/api/groups/${groupId}/bill`],
    enabled: paymentType === 'consolidated' && !!groupId,
  });

  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const resp: any = await apiRequest({
        url: '/api/payments/razorpay/create-order', method: 'POST',
        body: { 
          amount, 
          orderId, 
          description,
          paymentType,
          groupId
        },
      });
      const { razorpayOrderId, key } = resp;

      if (!key || key === 'rzp_test_placeholder') {
        Alert.alert('Test Mode Active', 'Simulating successful payment.', [{ text: 'OK' }]);
        setTimeout(() => {
          Alert.alert('Payment Successful', 'Test payment processed successfully!');
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
                  orderId: orderId, // Pass internal orderId (e.g. BILL_XX) for bill status update
                  amount: amount, // Pass amount for record keeping
                },
              });
              // @ts-ignore
              if (verifyResp.success) {
                Alert.alert('Payment Successful', 'Your payment has been processed successfully!');
                navigation.navigate('CustomerDashboard');
              } else throw new Error('Payment verification failed');
            } catch (e: any) {
              Alert.alert('Payment Verification Failed', 'Please contact support if money was deducted.');
            } finally { setIsProcessing(false); }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Payment Failed', e.message || "Failed to initialize payment. Check internet connection.");
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
          paymentType,
          groupId,
        },
      });
      // @ts-ignore
      if (resp.success) {
        if (resp.codOTP && resp.otpSent) {
           Alert.alert('Payment OTP Generated', `Your COD OTP is: ${resp.codOTP}. This has been sent to you via SMS and YD Chat. Present this to your milkman when paying cash.`);
        } else {
           Alert.alert('COD Order Created Successfully!', `Your order for ₹${amount} has been confirmed. Pay ₹${amount} in cash upon delivery.`);
        }
        setTimeout(() => navigation.navigate('CustomerDashboard'), 2000);
      } else throw new Error(resp.message || 'Failed to place COD order');
    } catch (e: any) {
      Alert.alert('Order Failed', e.message || "Failed to place order. Please try again.");
      setIsProcessing(false);
    }
  };

  if (profileLoading || (paymentType === 'consolidated' && groupLoading)) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Secure Checkout</Text>
          <Text style={styles.pageSubtitle}>Choose your preferred payment method</Text>
        </View>

        {/* Merchant Card */}
        <View style={styles.card}>
          <View style={styles.merchantHeader}>
            <View style={styles.merchantIcon}>
              <Text style={styles.merchantIconText}>D</Text>
            </View>
            <Text style={styles.merchantName}>DOOODHWALA</Text>
          </View>
          <Text style={styles.merchantDesc}>{description}</Text>

          <View style={styles.divider} />

          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Total Amount:</Text>
              {paymentType === 'consolidated' && (
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>Group Bill</Text>
                </View>
              )}
            </View>
            <Text style={styles.amountValue}>₹{amount}</Text>
          </View>
        </View>

        {/* Payment Tabs Card */}
        <View style={styles.card}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, tab === 'cod' && styles.activeTab]} 
              onPress={() => setTab('cod')} activeOpacity={0.8}
            >
              <Banknote size={16} color={tab === 'cod' ? colors.foreground : colors.mutedForeground} />
              <Text style={[styles.tabText, tab === 'cod' && styles.activeTabText]}>Cash on Delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, tab === 'razorpay' && styles.activeTab]} 
              onPress={() => setTab('razorpay')} activeOpacity={0.8}
            >
              <CreditCard size={16} color={tab === 'razorpay' ? colors.foreground : colors.mutedForeground} />
              <Text style={[styles.tabText, tab === 'razorpay' && styles.activeTabText]}>UPI & Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, tab === 'stripe' && styles.activeTab]} 
              onPress={() => setTab('stripe')} activeOpacity={0.8}
            >
              <Wallet size={16} color={tab === 'stripe' ? colors.foreground : colors.mutedForeground} />
              <Text style={[styles.tabText, tab === 'stripe' && styles.activeTabText]}>International</Text>
            </TouchableOpacity>
          </View>

          {/* COD Tab Content */}
          {tab === 'cod' && (
            <View style={styles.tabContent}>
              <View style={styles.codBanner}>
                <View style={styles.codIconBg}>
                  <Banknote size={24} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codTitle}>Cash on Delivery</Text>
                  <Text style={styles.codDesc}>Pay with cash when your order is delivered. No online payment required.</Text>
                  
                  <View style={styles.codFeatureRow}>
                    <Check size={14} color="#15803d" />
                    <Text style={styles.codFeatureText}>No payment gateway charges</Text>
                  </View>
                  <View style={styles.codFeatureRow}>
                    <Check size={14} color="#15803d" />
                    <Text style={styles.codFeatureText}>Pay only when you receive your order</Text>
                  </View>
                  <View style={styles.codFeatureRow}>
                    <Check size={14} color="#15803d" />
                    <Text style={styles.codFeatureText}>Secure OTP verification for payment confirmation</Text>
                  </View>
                </View>
              </View>

              <View style={styles.codInstructions}>
                <Text style={styles.codInsTitle}>Payment Instructions</Text>
                <Text style={styles.codInsText}>1. Keep exact change ready: ₹{amount}</Text>
                <Text style={styles.codInsText}>2. You'll receive an OTP via SMS</Text>
                <Text style={styles.codInsText}>3. Share the OTP with your milkman when paying</Text>
              </View>

              <TouchableOpacity 
                style={styles.payBtnGreen} 
                onPress={handleCODOrder} 
                disabled={isProcessing} 
                activeOpacity={0.8}
              >
                {isProcessing ? (
                   <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.payBtnText}>Confirm Cash on Delivery - ₹{amount}</Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.secureBottom}>
                <Check size={16} color={colors.success} />
                <Text style={styles.secureBottomText}>No payment required now - Pay on delivery</Text>
              </View>
            </View>
          )}

          {/* Razorpay Tab Content */}
          {tab === 'razorpay' && (
            <View style={styles.tabContent}>
              <View style={styles.rzpSection}>
                <View style={styles.rzpHeader}>
                  <Smartphone size={20} color={colors.primary} />
                  <Text style={styles.rzpTitle}>UPI Payments</Text>
                  <View style={styles.instantBadge}>
                    <Text style={styles.instantBadgeText}>Instant</Text>
                  </View>
                </View>
                <View style={styles.rzpGrid}>
                  {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                    <TouchableOpacity key={app} style={styles.rzpGridItem} onPress={handleRazorpayPayment} disabled={isProcessing}>
                      <Text style={styles.rzpGridItemText}>{app}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.rzpSection}>
                <View style={styles.rzpHeader}>
                  <CreditCard size={20} color={colors.success} />
                  <Text style={styles.rzpTitle}>Cards & Banking</Text>
                </View>
                <View style={styles.rzpGrid3}>
                  {['Credit Card', 'Debit Card', 'Net Banking'].map(method => (
                    <TouchableOpacity key={method} style={styles.rzpGridItem} onPress={handleRazorpayPayment} disabled={isProcessing}>
                      <Text style={styles.rzpGridItemText}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.rzpSection}>
                <View style={styles.rzpHeader}>
                  <Wallet size={20} color="#9333ea" />
                  <Text style={styles.rzpTitle}>Wallets</Text>
                </View>
                <View style={styles.rzpGrid3}>
                  {['Paytm Wallet', 'Amazon Pay', 'Mobikwik'].map(wallet => (
                    <TouchableOpacity key={wallet} style={styles.rzpGridItem} onPress={handleRazorpayPayment} disabled={isProcessing}>
                      <Text style={styles.rzpGridItemText}>{wallet}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.payBtnBlue} 
                onPress={handleRazorpayPayment} 
                disabled={isProcessing} 
                activeOpacity={0.8}
              >
                {isProcessing ? (
                   <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.payBtnText}>Pay ₹{amount} with Razorpay</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Stripe Tab Content */}
          {tab === 'stripe' && (
            <View style={styles.tabContent}>
              <View style={styles.stripeEmpty}>
                <Text style={styles.stripeEmptyTitle}>International payments currently unavailable</Text>
                <Text style={styles.stripeEmptyDesc}>Please use Cash on Delivery or UPI payments</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.secureFooter}>
          <ShieldCheck size={16} color={colors.gray500} />
          <Text style={styles.secureFooterTitle}>Your payment information is encrypted and secure</Text>
        </View>
        <Text style={styles.secureFooterSub}>Powered by Razorpay & Stripe</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' },
  container: { flex: 1, padding: spacing.xl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EFF6FF' },
  
  backBtn: {
    alignSelf: 'flex-start',
    width: 40, height: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  header: { alignItems: 'center', marginBottom: spacing.xl },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  pageSubtitle: { fontSize: fontSize.base, color: colors.gray600 },

  // Card Structure
  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.xl, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  
  // Merchant Info
  merchantHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  merchantIcon: { width: 32, height: 32, backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  merchantIconText: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  merchantName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  merchantDesc: { fontSize: fontSize.base, color: colors.gray600 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: fontSize.lg, fontWeight: '600', color: colors.foreground },
  amountValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
  groupBadge: { backgroundColor: '#DBEAFE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  groupBadgeText: { fontSize: 10, fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase' },

  // Tabs
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.gray100, borderRadius: borderRadius.md, padding: 4 },
  tab: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 6, paddingVertical: spacing.sm, borderRadius: borderRadius.sm 
  },
  activeTab: { backgroundColor: colors.white, ...shadows.sm },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  activeTabText: { color: colors.foreground, fontWeight: '700' },
  tabContent: { marginTop: spacing.xl },

  // COD Section
  codBanner: { backgroundColor: '#F0FDF4', padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', gap: spacing.md },
  codIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center' },
  codTitle: { fontSize: fontSize.base, fontWeight: '700', color: '#14532D', marginBottom: 4 },
  codDesc: { fontSize: 13, color: '#166534', marginBottom: spacing.md },
  codFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  codFeatureText: { fontSize: 13, color: '#15803D' },
  
  codInstructions: { backgroundColor: '#FFF7ED', padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#FED7AA', marginTop: spacing.lg, marginBottom: spacing.xl },
  codInsTitle: { fontSize: 14, fontWeight: '600', color: '#7C2D12', marginBottom: 4 },
  codInsText: { fontSize: 13, color: '#9A3412', marginBottom: 2 },
  
  payBtnGreen: { backgroundColor: '#16A34A', height: 52, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  payBtnBlue: { backgroundColor: colors.primary, height: 52, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  payBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
  
  secureBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  secureBottomText: { fontSize: 13, color: colors.gray500 },

  // RZP Section
  rzpSection: { marginBottom: spacing.sm },
  rzpHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  rzpTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  instantBadge: { backgroundColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  instantBadgeText: { fontSize: 10, fontWeight: '600', color: colors.gray600 },
  
  rzpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rzpGrid3: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rzpGridItem: { 
    width: '48%', height: 44, borderWidth: 1, borderColor: colors.border, 
    borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white
  },
  rzpGridItemText: { fontSize: 12, fontWeight: '500', color: colors.foreground },

  // Stripe
  stripeEmpty: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  stripeEmptyTitle: { fontSize: fontSize.base, color: colors.gray500, textAlign: 'center', marginBottom: 4 },
  stripeEmptyDesc: { fontSize: 13, color: colors.gray400, textAlign: 'center' },

  // Footer
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  secureFooterTitle: { fontSize: 12, color: colors.gray500 },
  secureFooterSub: { fontSize: 12, color: colors.gray500, textAlign: 'center', marginTop: 2 },
});

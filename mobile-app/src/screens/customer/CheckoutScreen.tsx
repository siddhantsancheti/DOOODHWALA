import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Banknote, ShieldCheck, ArrowLeft, Smartphone } from 'lucide-react-native';
import { useTranslation } from '../../contexts/LanguageContext';
// Lazy import to prevent native module crash on startup
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.warn('react-native-razorpay not available:', e);
}

export default function CheckoutScreen({ route, navigation }: any) {
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );
  const { user } = useAuth();
  const amount = route.params?.amount || 100;
  const description = route.params?.description || 'Milk Delivery Payment';
  const orderId = route.params?.orderId || `ORDER_${Date.now()}`;
  const paymentType = route.params?.paymentType || 'single';
  const groupId = route.params?.groupId || null;
  const unassignAfter = route.params?.unassignAfter || false;
  const [isProcessing, setIsProcessing] = useState(false);
  const [method, setMethod] = useState<'online' | 'cod'>('online');

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
      // Step 1: Create Razorpay order on our server
      const createRes = await apiRequest({
        url: '/api/payments/razorpay/create-order',
        method: 'POST',
        body: { amount, orderId, description, paymentType, groupId },
      });
      const resp: any = await createRes.json();

      const { razorpayOrderId, key } = resp;

      if (!key || !razorpayOrderId) {
        throw new Error('Payment initialization failed. Please try again.');
      }

      // Step 2: Open Razorpay checkout (real SDK)
      const options = {
        description,
        image: 'https://dooodhwala.com/logo.png',
        currency: 'INR',
        key,
        amount: Math.round(amount * 100), // paise
        name: 'DOOODHWALA',
        order_id: razorpayOrderId,
        prefill: {
          email: user?.email || '',
          contact: user?.phone || '',
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer',
        },
        theme: { color: '#22406E' },
      };

      const paymentData = await RazorpayCheckout.open(options);

      // Step 3: Verify payment signature on server
      const verifyRes = await apiRequest({
        url: '/api/payments/razorpay/verify',
        method: 'POST',
        body: {
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          orderId,   // internal bill ID e.g. BILL_42
          amount,
        },
      });
      const verifyResp: any = await verifyRes.json();

      if (verifyResp?.success) {
        // If this payment was the final settlement before discontinuing,
        // unassign the dairyman (or delete the group) now that the bill is paid.
        if (unassignAfter) {
          try {
            if (groupId) {
              await apiRequest({ url: `/api/groups/${groupId}/discontinue`, method: 'POST' });
            } else {
              await apiRequest({ url: '/api/customers/unassign-yd', method: 'POST' });
            }
          } catch (err) {
            console.warn('Unassign after payment failed:', err);
          }
          Alert.alert('Service Discontinued', `Bill of ₹${amount} paid. You have been unassigned from this dairyman.`, [
            { text: 'OK', onPress: () => navigation.navigate('CustomerHome') },
          ]);
        } else {
          Alert.alert('Payment Successful! 🎉', `₹${amount} paid successfully via Razorpay.`, [
            { text: 'OK', onPress: () => navigation.navigate('CustomerHome') },
          ]);
        }
      } else {
        throw new Error('Payment verification failed. Please contact support.');
      }
    } catch (e: any) {
      // Razorpay SDK throws when user cancels — code 0 or 2
      if (e?.code === 0 || e?.code === 2) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else {
        Alert.alert('Payment Failed', e.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCODOrder = async () => {
    setIsProcessing(true);
    try {
      const codRes = await apiRequest({
        url: '/api/payments/cod/create-order', method: 'POST',
        body: {
          amount, orderId,
          // No fake fallbacks — the server derives customer/milkman from the bill.
          customerId: customerProfile?.id ?? null,
          milkmanId: customerProfile?.assignedMilkmanId ?? null,
          description,
          customerPhone: user?.phone?.replace('+91', '') || user?.phone,
          deliveryAddress: customerProfile?.address || 'Delivery location',
          userId: user?.id,
          paymentType,
          groupId,
        },
      });
      const resp: any = await codRes.json();
      if (resp.success) {
        if (resp.codOTP && resp.otpSent) {
           Alert.alert('Payment OTP Generated', `Your COD OTP is: ${resp.codOTP}. This has been sent to you via SMS and YD Chat. Present this to your milkman when paying cash.`);
        } else {
           Alert.alert('COD Order Created Successfully!', `Your order for ₹${amount} has been confirmed. Pay ₹${amount} in cash upon delivery.`);
        }
        setTimeout(() => navigation.navigate('CustomerHome'), 2000);
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{t('payment')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* What you are paying for, and how much. The amount is the largest
            thing on the screen because it is the fact being confirmed. */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel} numberOfLines={1}>{t('amountToPay')}</Text>
          <Text
            style={styles.amountValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            ₹{amount}
          </Text>
          <Text style={styles.amountDesc} numberOfLines={2}>{description}</Text>
          {paymentType === 'consolidated' && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText} numberOfLines={1}>{t('groupBill')}</Text>
            </View>
          )}
        </View>

        {/* Two real choices. The old screen listed ten payment buttons — Google
            Pay, PhonePe, cards, wallets — that every one opened the same
            Razorpay sheet, which then asked for the method again. Razorpay owns
            method selection; this screen only asks pay-now or pay-on-delivery. */}
        <Text style={styles.sectionLabel} numberOfLines={1}>{t('howToPay')}</Text>

        <TouchableOpacity
          style={[styles.option, method === 'online' && styles.optionActive]}
          onPress={() => setMethod('online')}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: method === 'online' }}
        >
          <View style={[styles.optionIcon, { backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : '#E4EAF3' }]}>
            <Smartphone size={20} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle} numberOfLines={1}>{t('payOnline')}</Text>
            <Text style={styles.optionDesc} numberOfLines={2}>{t('payOnlineDesc')}</Text>
          </View>
          <View style={[styles.radio, method === 'online' && styles.radioOn]}>
            {method === 'online' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, method === 'cod' && styles.optionActive]}
          onPress={() => setMethod('cod')}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: method === 'cod' }}
        >
          <View style={[styles.optionIcon, { backgroundColor: isDark ? 'rgba(22,163,74,0.2)' : '#DFF0E6' }]}>
            <Banknote size={20} color="#2F7D5B" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle} numberOfLines={1}>{t('cashOnDelivery')}</Text>
            <Text style={styles.optionDesc} numberOfLines={2}>{t('codDesc')}</Text>
          </View>
          <View style={[styles.radio, method === 'cod' && styles.radioOn]}>
            {method === 'cod' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* Only what changes by choice — three lines, not a wall of features. */}
        {method === 'cod' && (
          <View style={styles.note}>
            <Text style={styles.noteTitle} numberOfLines={1}>{t('atDelivery')}</Text>
            <Text style={styles.noteLine}>1. {t('codStep1')} ₹{amount}</Text>
            <Text style={styles.noteLine}>2. {t('codStep2')}</Text>
            <Text style={styles.noteLine}>3. {t('codStep3')}</Text>
          </View>
        )}
      </ScrollView>

      {/* The action stays pinned so it is reachable without scrolling back. */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, method === 'cod' && styles.payBtnCod, isProcessing && styles.payBtnBusy]}
          onPress={method === 'cod' ? handleCODOrder : handleRazorpayPayment}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing
            ? <ActivityIndicator color="#FFFFFF" />
            : (
              <Text style={styles.payBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {method === 'cod' ? `${t('confirmOrder')} · ₹${amount}` : `${t('pay')} ₹${amount}`}
              </Text>
            )}
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <ShieldCheck size={13} color={colors.mutedForeground} />
          <Text style={styles.secureText} numberOfLines={2}>
            {method === 'cod' ? t('nothingChargedNow') : t('securedByRazorpay')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },

  // Amount — the fact being confirmed, so it leads.
  amountCard: {
    alignItems: 'center', backgroundColor: colors.card, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, padding: 24, marginBottom: 24,
  },
  amountLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily },
  amountValue: {
    fontSize: 44, color: colors.foreground, fontFamily: fontFamilyBold,
    fontWeight: '800', marginTop: 2, marginBottom: 6,
  },
  amountDesc: { fontSize: 14, color: colors.mutedForeground, fontFamily, textAlign: 'center', lineHeight: 20 },
  groupBadge: {
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : '#E4EAF3',
  },
  groupBadgeText: { fontSize: 11, color: colors.primary, fontFamily: fontFamilyBold, fontWeight: '700' },

  sectionLabel: {
    fontSize: 13, color: colors.mutedForeground, fontFamily: fontFamilyBold,
    fontWeight: '600', marginBottom: 8, marginLeft: 2,
  },

  // Options — text column flexes so a translated description cannot push the
  // radio off the row.
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border, padding: 16, marginBottom: 10,
  },
  optionActive: { borderColor: colors.primary },
  optionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1, minWidth: 0 },
  optionTitle: { fontSize: 16, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
  optionDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily, marginTop: 2, lineHeight: 18 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  note: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    borderRadius: 14, padding: 16, marginTop: 6, gap: 4,
  },
  noteTitle: { fontSize: 13, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700', marginBottom: 2 },
  noteLine: { fontSize: 13, color: colors.mutedForeground, fontFamily, lineHeight: 20 },

  footer: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, gap: 10,
  },
  payBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16,
  },
  payBtnCod: { backgroundColor: '#2F7D5B' },
  payBtnBusy: { opacity: 0.7 },
  payBtnText: { fontSize: 17, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '700' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureText: { fontSize: 12, color: colors.mutedForeground, fontFamily, textAlign: 'center' },
});

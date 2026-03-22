import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import {
  User, MapPin, Clock, Phone, Minus, Plus, ShoppingCart, Star, CheckCircle, ArrowLeft
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function OrderScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const milkmanId = route.params?.milkmanId || 1;

  const { data: milkman, isLoading } = useQuery<any>({
    queryKey: [`/api/milkmen/${milkmanId}`], enabled: !!milkmanId,
  });
  const { data: customerProfile } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const [formData, setFormData] = useState({
    customerName: customerProfile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    deliveryDate: '',
    deliveryTime: '07:00-08:00',
    deliveryAddress: customerProfile?.address || '',
    specialInstructions: '',
  });
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [focusedField, setFocusedField] = useState('');

  const handleQtyChange = (name: string, diff: number, max: number = 99) => {
    setSelectedItems((prev) => {
      const current = prev[name] || 0;
      const next = Math.max(0, Math.min(max, current + diff));
      return { ...prev, [name]: next };
    });
  };

  const calculateTotal = () => {
    if (!milkman?.dairyItems) return 0;
    return milkman.dairyItems.reduce((acc: number, item: any) => {
      return acc + (selectedItems[item.name] || 0) * parseFloat(item.price);
    }, 0);
  };

  const placeOrder = async () => {
    if (!formData.customerName || !formData.deliveryDate || !formData.deliveryAddress) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    const total = calculateTotal();
    if (total === 0) {
      Alert.alert('Empty Cart', 'Please add at least one item.');
      return;
    }
    try {
      const itemNames = Object.keys(selectedItems).filter((k) => selectedItems[k] > 0);
      for (const itemName of itemNames) {
        const qty = selectedItems[itemName];
        const item = milkman.dairyItems.find((i: any) => i.name === itemName);
        await apiRequest({
          url: '/api/orders', method: 'POST',
          body: {
            milkmanId, quantity: qty.toString(),
            pricePerLiter: item.price,
            totalAmount: (qty * parseFloat(item.price)).toString(),
            deliveryDate: formData.deliveryDate,
            deliveryTime: formData.deliveryTime,
            status: 'pending',
            specialInstructions: formData.specialInstructions,
            itemName,
          },
        });
      }
      Alert.alert('Order Placed!', 'Your order has been successfully placed.');
      queryClient.invalidateQueries({ queryKey: ['/api/orders/customer'] });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to place order.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const total = calculateTotal();
  const selectedItemsList = milkman?.dairyItems?.filter((i: any) => selectedItems[i.name] > 0) || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Place Your Order</Text>
          <Text style={styles.pageDesc}>Complete your order details below</Text>
        </View>

        {/* Milkman Info */}
        {milkman && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <User size={20} color={colors.foreground} />
              <Text style={styles.cardTitle}>Milkman Details</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.milkmanName}>{milkman.businessName}</Text>
              <Text style={styles.milkmanSub}>{milkman.contactName}</Text>

              <View style={styles.infoRow}>
                <Phone size={16} color={colors.gray500} />
                <Text style={styles.infoText}>{milkman.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin size={16} color={colors.gray500} />
                <Text style={styles.infoText}>{milkman.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Star size={16} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.infoTextBold}>{milkman.rating || '4.8'}</Text>
                <Text style={styles.infoTextLight}>({milkman.totalReviews || 124} reviews)</Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={16} color={colors.success} />
                <Text style={styles.infoText}>
                  Available: {milkman.deliveryTimeStart || '06:00'} - {milkman.deliveryTimeEnd || '09:00'}
                </Text>
              </View>
              
              {milkman.verified !== false && (
                <View style={styles.badgeSuccess}>
                  <CheckCircle size={14} color="#16A34A" />
                  <Text style={styles.badgeSuccessText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Products */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShoppingCart size={20} color={colors.foreground} />
            <Text style={styles.cardTitle}>Services & Pricing</Text>
          </View>
          <View style={styles.cardContentSectionless}>
            {milkman?.dairyItems?.map((item: any) => (
              <View key={item.name} style={styles.productRow}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productPrice}>₹{item.price} {item.unit}</Text>
                  <Text style={styles.productStock}>
                    {item.isAvailable !== false ? `${item.quantity || 100} available` : 'Out of stock'}
                  </Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    onPress={() => handleQtyChange(item.name, -1)}
                    style={[styles.qtyBtn, selectedItems[item.name] === 0 && styles.qtyBtnDisabled]}
                    activeOpacity={0.7}
                    disabled={item.isAvailable === false}
                  >
                    <Minus size={16} color={selectedItems[item.name] ? colors.primary : colors.gray400} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{selectedItems[item.name] || 0}</Text>
                  <TouchableOpacity
                    onPress={() => handleQtyChange(item.name, 1, item.quantity || 99)}
                    style={[styles.qtyBtn, item.isAvailable === false && styles.qtyBtnDisabled]}
                    activeOpacity={0.7}
                    disabled={item.isAvailable === false || (selectedItems[item.name] || 0) >= (item.quantity || 99)}
                  >
                    <Plus size={16} color={item.isAvailable === false ? colors.gray400 : colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBorderless}>
            <Text style={styles.cardTitle}>Order Details</Text>
          </View>
          <View style={styles.cardContent}>

            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              style={[styles.input, focusedField === 'name' && styles.inputFocused]}
              placeholder="Enter your name"
              placeholderTextColor={colors.gray400}
              value={formData.customerName}
              onChangeText={(t) => setFormData({ ...formData, customerName: t })}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField('')}
            />

            <Text style={styles.label}>Delivery Address</Text>
            <TextInput
              style={[styles.input, styles.textArea, focusedField === 'address' && styles.inputFocused]}
              placeholder="Enter complete delivery address"
              placeholderTextColor={colors.gray400}
              multiline
              value={formData.deliveryAddress}
              onChangeText={(t) => setFormData({ ...formData, deliveryAddress: t })}
              onFocus={() => setFocusedField('address')}
              onBlur={() => setFocusedField('')}
            />

            <Text style={styles.label}>Delivery Date</Text>
            <TextInput
              style={[styles.input, focusedField === 'date' && styles.inputFocused]}
              placeholder="e.g. 2024-05-15"
              placeholderTextColor={colors.gray400}
              value={formData.deliveryDate}
              onChangeText={(t) => setFormData({ ...formData, deliveryDate: t })}
              onFocus={() => setFocusedField('date')}
              onBlur={() => setFocusedField('')}
            />

            <Text style={styles.label}>Delivery Time</Text>
            <TextInput
              style={[styles.input, focusedField === 'time' && styles.inputFocused]}
              placeholder="e.g. 07:00-08:00"
              placeholderTextColor={colors.gray400}
              value={formData.deliveryTime}
              onChangeText={(t) => setFormData({ ...formData, deliveryTime: t })}
              onFocus={() => setFocusedField('time')}
              onBlur={() => setFocusedField('')}
            />

            <Text style={styles.label}>Special Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, focusedField === 'inst' && styles.inputFocused]}
              placeholder="Any special instructions for delivery..."
              placeholderTextColor={colors.gray400}
              multiline
              value={formData.specialInstructions}
              onChangeText={(t) => setFormData({ ...formData, specialInstructions: t })}
              onFocus={() => setFocusedField('inst')}
              onBlur={() => setFocusedField('')}
            />

            <View style={styles.divider} />

            {/* Order Summary inside the form card */}
            <Text style={styles.summaryTitle}>Order Summary</Text>
            
            {selectedItemsList.length > 0 ? (
              <View style={styles.itemizedList}>
                {selectedItemsList.map((item: any) => (
                  <View key={item.name} style={styles.itemizedRow}>
                    <Text style={styles.itemizedText}>{item.name} x {selectedItems[item.name]}</Text>
                    <Text style={styles.itemizedText}>₹{(selectedItems[item.name] * parseFloat(item.price)).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.placeOrderBtn, (total === 0 || createOrderMutationPending) && styles.placeOrderBtnDisabled]}
              onPress={placeOrder}
              disabled={total === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.placeOrderText}>Place Order</Text>
            </TouchableOpacity>

          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Just a dummy to avoid red line since mutation is not using tanstack here but the manual placeOrder func
const createOrderMutationPending = false;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' }, // Match the gradient-like background roughly
  container: { flex: 1, padding: spacing.xl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EFF6FF' },
  
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md, alignSelf: 'flex-start' },
  backBtnText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },
  
  header: { marginBottom: spacing.xl },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  pageDesc: { fontSize: fontSize.base, color: colors.gray600 },

  // Cards
  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, 
    marginBottom: spacing.xl, ...shadows.sm, borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, 
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardHeaderBorderless: {
    padding: spacing.lg, paddingBottom: 0,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  cardContent: { padding: spacing.lg },
  cardContentSectionless: { padding: spacing.md },

  // Milkman Details
  milkmanName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  milkmanSub: { fontSize: fontSize.sm, color: colors.gray600, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoText: { fontSize: fontSize.sm, color: colors.gray600 },
  infoTextBold: { fontSize: fontSize.sm, fontWeight: '600', color: colors.foreground },
  infoTextLight: { fontSize: fontSize.sm, color: colors.gray500 },
  badgeSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  badgeSuccessText: { color: '#16A34A', fontSize: 12, fontWeight: '600' },

  // Products
  productRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  productName: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  productPrice: { fontSize: fontSize.sm, color: colors.gray600, marginVertical: 2 },
  productStock: { fontSize: 12, color: colors.gray500 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: {
    width: 32, height: 32, borderRadius: borderRadius.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { backgroundColor: colors.gray100, borderColor: colors.gray200 },
  qtyText: { fontSize: fontSize.base, fontWeight: '600', width: 24, textAlign: 'center', color: colors.foreground },

  // Form Details
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: fontSize.base, backgroundColor: colors.white, color: colors.foreground,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 2 },
  textArea: { height: 80, textAlignVertical: 'top' },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },

  // Summary inline
  summaryTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.foreground, marginBottom: spacing.sm },
  itemizedList: { gap: spacing.sm, marginBottom: spacing.sm },
  itemizedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemizedText: { fontSize: fontSize.sm, color: colors.foreground },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  totalLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  totalAmount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },

  placeOrderBtn: {
    backgroundColor: colors.foreground, height: 48,
    borderRadius: borderRadius.md, justifyContent: 'center',
    alignItems: 'center', flexDirection: 'row', gap: spacing.sm,
  },
  placeOrderBtnDisabled: { backgroundColor: colors.gray400 },
  placeOrderText: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
});

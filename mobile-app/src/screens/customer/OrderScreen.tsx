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
  ShoppingCart, MapPin, Clock, Phone, Minus, Plus, FileText,
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
    if (!formData.deliveryDate) {
      Alert.alert('Missing Fields', 'Please enter a delivery date.');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Place Your Order</Text>

        {/* Milkman Info */}
        {milkman && (
          <View style={styles.card}>
            <View style={styles.milkmanHeader}>
              <View style={styles.milkmanAvatar}>
                <ShoppingCart size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.milkmanName}>{milkman.businessName}</Text>
                <Text style={styles.milkmanSub}>{milkman.contactName}</Text>
              </View>
            </View>
            <View style={styles.milkmanInfoRow}>
              <Phone size={14} color={colors.mutedForeground} />
              <Text style={styles.milkmanInfoText}>{milkman.phone}</Text>
            </View>
            <View style={styles.milkmanInfoRow}>
              <MapPin size={14} color={colors.mutedForeground} />
              <Text style={styles.milkmanInfoText}>{milkman.address}</Text>
            </View>
            <View style={styles.milkmanInfoRow}>
              <Clock size={14} color={colors.mutedForeground} />
              <Text style={styles.milkmanInfoText}>
                {milkman.deliveryTimeStart} - {milkman.deliveryTimeEnd}
              </Text>
            </View>
          </View>
        )}

        {/* Products */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Products</Text>
          {milkman?.dairyItems?.map((item: any) => (
            <View key={item.name} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>₹{item.price} {item.unit}</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  onPress={() => handleQtyChange(item.name, -1)}
                  style={[styles.qtyBtn, selectedItems[item.name] === 0 && styles.qtyBtnDisabled]}
                  activeOpacity={0.7}
                >
                  <Minus size={16} color={selectedItems[item.name] ? colors.primary : colors.gray400} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{selectedItems[item.name] || 0}</Text>
                <TouchableOpacity
                  onPress={() => handleQtyChange(item.name, 1, item.quantity)}
                  style={styles.qtyBtn}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>

          <Text style={styles.label}>Delivery Date <Text style={{ color: colors.destructive }}>*</Text></Text>
          <TextInput
            style={[styles.input, focusedField === 'date' && styles.inputFocused]}
            placeholder="e.g. 2024-05-15"
            placeholderTextColor={colors.mutedForeground}
            value={formData.deliveryDate}
            onChangeText={(t) => setFormData({ ...formData, deliveryDate: t })}
            onFocus={() => setFocusedField('date')}
            onBlur={() => setFocusedField('')}
          />

          <Text style={styles.label}>Delivery Time</Text>
          <TextInput
            style={[styles.input, focusedField === 'time' && styles.inputFocused]}
            placeholder="e.g. 07:00-08:00"
            placeholderTextColor={colors.mutedForeground}
            value={formData.deliveryTime}
            onChangeText={(t) => setFormData({ ...formData, deliveryTime: t })}
            onFocus={() => setFocusedField('time')}
            onBlur={() => setFocusedField('')}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea, focusedField === 'address' && styles.inputFocused]}
            placeholder="Delivery address"
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={formData.deliveryAddress}
            onChangeText={(t) => setFormData({ ...formData, deliveryAddress: t })}
            onFocus={() => setFocusedField('address')}
            onBlur={() => setFocusedField('')}
          />

          <Text style={styles.label}>Special Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea, focusedField === 'inst' && styles.inputFocused]}
            placeholder="Any special instructions..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={formData.specialInstructions}
            onChangeText={(t) => setFormData({ ...formData, specialInstructions: t })}
            onFocus={() => setFocusedField('inst')}
            onBlur={() => setFocusedField('')}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryTotal}>₹{total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, total === 0 && styles.placeOrderBtnDisabled]}
            onPress={placeOrder}
            disabled={total === 0}
            activeOpacity={0.8}
          >
            <FileText size={20} color={colors.white} />
            <Text style={styles.placeOrderText}>Confirm Order</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    color: colors.foreground, marginBottom: spacing.lg,
  },

  // Cards
  card: {
    backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.sm,
  },

  // Milkman
  milkmanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  milkmanAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight, justifyContent: 'center',
    alignItems: 'center', marginRight: spacing.md,
  },
  milkmanName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  milkmanSub: { fontSize: fontSize.sm, color: colors.mutedForeground },
  milkmanInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  milkmanInfoText: { fontSize: fontSize.sm, color: colors.gray600 },

  // Section
  sectionTitle: {
    fontSize: fontSize.base, fontWeight: fontWeight.bold,
    color: colors.foreground, marginBottom: spacing.md,
  },

  // Products
  productRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  productName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.foreground },
  productPrice: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { backgroundColor: colors.gray100 },
  qtyText: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    width: 24, textAlign: 'center', color: colors.foreground,
  },

  // Form
  label: {
    fontSize: fontSize.sm, fontWeight: fontWeight.medium,
    color: colors.foreground, marginBottom: spacing.xs, marginTop: spacing.md,
  },
  input: {
    borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.base, backgroundColor: colors.surfaceSecondary, color: colors.foreground,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 2 },
  textArea: { height: 70, textAlignVertical: 'top' },

  // Summary
  summaryCard: {
    backgroundColor: colors.card, padding: spacing.xl,
    borderRadius: borderRadius.xl, ...shadows.lg,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  summaryLabel: { fontSize: fontSize.base, color: colors.mutedForeground },
  summaryTotal: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground },
  placeOrderBtn: {
    backgroundColor: colors.primary, height: 52,
    borderRadius: borderRadius.lg, justifyContent: 'center',
    alignItems: 'center', flexDirection: 'row', gap: spacing.sm, ...shadows.md,
  },
  placeOrderBtnDisabled: { backgroundColor: colors.gray400 },
  placeOrderText: { color: colors.white, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});

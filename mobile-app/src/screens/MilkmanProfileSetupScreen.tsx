import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin, Truck, Clock, CreditCard } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../theme';

export default function MilkmanProfileSetupScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const [formData, setFormData] = useState({
    contactName: '',
    businessName: '',
    address: '',
    pricePerLiter: '50',
    deliveryTimeStart: '06:00',
    deliveryTimeEnd: '09:00',
    bankAccountHolderName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    upiId: '',
  });

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      Alert.alert('Location Captured', 'Coordinates saved successfully.');
    } catch (error) {
      Alert.alert('Error', 'Unable to retrieve location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.contactName || !formData.businessName || !formData.address) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const profileData = {
        ...formData,
        dairyItems: [{ name: 'Fresh Milk', unit: 'per litre', price: formData.pricePerLiter }],
        deliverySlots: [{ name: 'Morning', startTime: formData.deliveryTimeStart, endTime: formData.deliveryTimeEnd }],
      };
      const res = await apiRequest({ url: '/api/milkmen', method: 'POST', body: profileData });
      await res.json();
      Alert.alert('Profile Created!', 'Your milkman profile is complete.');
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      navigation.replace('MilkmanHome');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (key: string, val: string) => setFormData({ ...formData, [key]: val });
  const isValid = formData.contactName && formData.businessName && formData.address;

  const renderInput = (key: string, placeholder: string, opts?: any) => (
    <View style={[styles.inputRow, focusedField === key && styles.inputFocused, opts?.style]}>
      <TextInput
        style={[styles.input, opts?.inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={(formData as any)[key]}
        onChangeText={(val) => update(key, val)}
        onFocus={() => setFocusedField(key)}
        onBlur={() => setFocusedField('')}
        keyboardType={opts?.keyboardType}
        autoCapitalize={opts?.autoCapitalize}
        multiline={opts?.multiline}
        numberOfLines={opts?.numberOfLines}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Truck size={32} color={colors.white} />
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Set up your dairy business to start serving customers
            </Text>
          </View>

          {/* Contact Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Truck size={20} color={colors.brandAccent} />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              {renderInput('contactName', 'Enter your full name')}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
              {renderInput('businessName', 'Enter your business name')}
            </View>
          </View>

          {/* Service Area Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <MapPin size={20} color={colors.brandAccent} />
              <Text style={styles.sectionTitle}>Service Area</Text>
            </View>
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={getCurrentLocation}
              disabled={isLocating}
              activeOpacity={0.7}
            >
              {isLocating ? (
                <ActivityIndicator color={colors.brandAccent} style={{ marginRight: 8 }} />
              ) : (
                <MapPin size={20} color={colors.brandAccent} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.locationBtnText}>Use Current Location</Text>
            </TouchableOpacity>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
              {renderInput('address', 'Complete Address', {
                multiline: true,
                numberOfLines: 3,
                style: { height: 80 },
                inputStyle: { height: 80, textAlignVertical: 'top', paddingVertical: spacing.md },
              })}
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={20} color={colors.brandAccent} />
              <Text style={styles.sectionTitle}>Products & Delivery</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Price Per Liter (₹) <Text style={styles.required}>*</Text></Text>
              {renderInput('pricePerLiter', '50', { keyboardType: 'numeric' })}
            </View>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.label}>Start Time</Text>
                {renderInput('deliveryTimeStart', '06:00')}
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>End Time</Text>
                {renderInput('deliveryTimeEnd', '09:00')}
              </View>
            </View>
          </View>

          {/* Bank Details Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={20} color={colors.brandAccent} />
              <Text style={styles.sectionTitle}>Bank Details (Optional)</Text>
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('bankAccountHolderName', 'Account Holder Name')}
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('bankAccountNumber', 'Account Number', { keyboardType: 'numeric' })}
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('bankIfscCode', 'IFSC Code', { autoCapitalize: 'characters' })}
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('upiId', 'UPI ID', { autoCapitalize: 'none' })}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !isValid}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },

  // Header
  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.brandAccent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'], fontWeight: fontWeight.bold,
    color: colors.foreground, textAlign: 'center', marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base, color: colors.mutedForeground,
    textAlign: 'center', lineHeight: fontSize.base * 1.5,
  },

  // Sections
  sectionCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    padding: spacing['2xl'], marginBottom: spacing.lg, ...shadows.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.foreground, marginLeft: spacing.md,
  },

  // Fields
  fieldGroup: { marginBottom: spacing.lg },
  label: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.foreground, marginBottom: spacing.sm,
  },
  required: { color: colors.destructive },
  inputRow: {
    borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary, height: 48,
    paddingHorizontal: spacing.lg, justifyContent: 'center',
  },
  inputFocused: { borderColor: colors.brandAccent, borderWidth: 2 },
  input: {
    fontSize: fontSize.base, color: colors.foreground, height: '100%',
  },

  // Time row
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1 },

  // Location
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.brandAccent, borderStyle: 'dashed',
    borderRadius: borderRadius.md, paddingVertical: 14,
    backgroundColor: '#FFF7ED', marginBottom: spacing.lg,
  },
  locationBtnText: {
    color: colors.brandAccent, fontSize: fontSize.base, fontWeight: fontWeight.medium,
  },

  // Submit
  submitBtn: {
    backgroundColor: colors.brandAccent, height: 52, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', ...shadows.md,
  },
  submitBtnDisabled: { backgroundColor: colors.gray400 },
  submitBtnText: {
    color: colors.white, fontSize: fontSize.lg, fontWeight: fontWeight.bold,
  },
});

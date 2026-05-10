import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin, Truck, Clock, CreditCard } from 'lucide-react-native';
import { useTranslation } from '../contexts/LanguageContext';

export default function MilkmanProfileSetupScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = React.useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAutoCapture, setLocationAutoCapture] = useState<'idle' | 'capturing' | 'captured' | 'failed'>('idle');
  const [focusedField, setFocusedField] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const isMounted = useRef(true);

  const [formData, setFormData] = useState({
    contactName: '',
    businessName: '',
    houseNumber: '',
    buildingName: '',
    streetName: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    bankAccountHolderName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    upiId: '',
    latitude: '',
    longitude: '',
  });

  const [dairyItems, setDairyItems] = useState([
    { name: t('freshMilk'), unit: 'per litre', price: '50', isCustom: false },
    { name: t('buffaloMilk'), unit: 'per litre', price: '', isCustom: false },
  ]);

  const [deliverySlots, setDeliverySlots] = useState([
    { id: '1', name: t('morning'), startTime: '06:00', endTime: '09:00', isActive: true },
    { id: '2', name: t('evening'), startTime: '17:00', endTime: '20:00', isActive: true },
  ]);

  // Auto-capture location silently on screen load
  useEffect(() => {
    isMounted.current = true;
    captureLocationSilently();
    return () => { isMounted.current = false; };
  }, []);

  const captureLocationSilently = async () => {
    try {
      setLocationAutoCapture('capturing');
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted.current) setLocationAutoCapture('failed');
          return;
        }
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!isMounted.current) return;
      setFormData(prev => ({
        ...prev,
        latitude: loc.coords.latitude.toString(),
        longitude: loc.coords.longitude.toString(),
      }));
      setLocationAutoCapture('captured');
    } catch {
      if (isMounted.current) setLocationAutoCapture('failed');
    }
  };

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permission in Settings.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      }));
      setLocationAutoCapture('captured');
    } catch (error) {
      Alert.alert(t('error'), 'Could not get your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!formData.contactName || !formData.businessName || !formData.streetName || !formData.area || !formData.city || !formData.pincode) {
      Alert.alert(t('requiredFields'), t('fillRequired'));
      return;
    }

    // Concatenate address
    const addressParts = [
      formData.houseNumber,
      formData.buildingName,
      formData.streetName,
      formData.area,
      formData.landmark,
      formData.city,
      formData.state,
      formData.pincode,
      'India'
    ].filter(part => part.trim());
    
    const fullAddress = addressParts.join(', ');

    // Filter active products and slots
    const activeProducts = dairyItems.filter(item => item.price && parseFloat(item.price) > 0);
    const activeSlots = deliverySlots.filter(slot => slot.isActive);

    if (activeSlots.length === 0) {
      Alert.alert('Delivery Slots', 'Please enable at least one delivery slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use first active product's price as the base price per litre
      const basePricePerLiter = activeProducts[0]?.price || '50';

      const profileData = {
        contactName: formData.contactName,
        businessName: formData.businessName,
        address: fullAddress,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        bankAccountHolderName: formData.bankAccountHolderName || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIfscCode: formData.bankIfscCode || undefined,
        bankName: formData.bankName || undefined,
        upiId: formData.upiId || undefined,
        pricePerLiter: basePricePerLiter,
        deliveryTimeStart: activeSlots[0].startTime,
        deliveryTimeEnd: activeSlots[0].endTime,
        dairyItems: activeProducts,
        deliverySlots: activeSlots.map(s => ({ name: s.name, startTime: s.startTime, endTime: s.endTime })),
      };
      const res = await apiRequest({ url: '/api/milkmen', method: 'POST', body: profileData });
      await res.json();
      Alert.alert(t('profileUpdated'), 'Welcome to DOOODHWALA! Your milkman profile is ready.');
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/milkmen/profile'] });
      navigation.replace('MilkmanHome');
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (key: string, val: string) => setFormData({ ...formData, [key]: val });
  const isValid = formData.contactName && formData.businessName && formData.streetName && formData.area && formData.city && formData.pincode;

  const errorColor = '#DC2626';
  const errorBorder = '#EF4444';
  const fieldError = (field: string) => submitAttempted && !(formData as any)[field];

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
              <Truck size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{t('completeProfile')}</Text>
            <Text style={styles.subtitle}>
              {t('setupBusiness')}
            </Text>
          </View>

          {/* Contact Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Truck size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>{t('contactInfo')}</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: fieldError('contactName') ? colors.destructive : colors.foreground }]}>{t('fullName')} <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, focusedField === 'contactName' && styles.inputFocused, fieldError('contactName') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enterName')}
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.contactName}
                  onChangeText={(val) => update('contactName', val)}
                  onFocus={() => setFocusedField('contactName')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="next"
                />
              </View>
              {fieldError('contactName') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily }}>{t('nameRequired')}</Text>}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: fieldError('businessName') ? colors.destructive : colors.foreground }]}>{t('businessName')} <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, focusedField === 'businessName' && styles.inputFocused, fieldError('businessName') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('enterBusinessName')}
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.businessName}
                  onChangeText={(val) => update('businessName', val)}
                  onFocus={() => setFocusedField('businessName')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="next"
                />
              </View>
              {fieldError('businessName') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily }}>{t('businessNameRequired')}</Text>}
            </View>
          </View>

          {/* Service Area Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <MapPin size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>{t('serviceArea')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.locationBtn,
                formData.latitude ? { borderColor: '#22C55E', backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : '#F0FDF4' } : {},
              ]}
              onPress={getCurrentLocation}
              disabled={isLocating || locationAutoCapture === 'capturing'}
              activeOpacity={0.7}
            >
              {(isLocating || locationAutoCapture === 'capturing') ? (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />
              ) : (
                <MapPin size={20} color={formData.latitude ? '#22C55E' : '#2563EB'} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.locationBtnText, formData.latitude ? { color: '#22C55E' } : {}]}>
                {locationAutoCapture === 'capturing'
                  ? 'Detecting location…'
                  : formData.latitude
                  ? `✓ Location captured (${parseFloat(formData.latitude).toFixed(4)}, ${parseFloat(formData.longitude).toFixed(4)})`
                  : t('getCurrentLocation')}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.subLabel}>{t('houseNo')}</Text>
                {renderInput('houseNumber', 'e.g. 123')}
              </View>
              <View style={[styles.gridCol, { marginLeft: 10 }]}>
                <Text style={styles.subLabel}>{t('buildingSoc')}</Text>
                {renderInput('buildingName', 'e.g. Society')}
              </View>
            </View>

            <View style={styles.marginTop}>
              <Text style={[styles.label, { color: fieldError('streetName') ? colors.destructive : colors.foreground }]}>{t('streetName')} <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, focusedField === 'streetName' && styles.inputFocused, fieldError('streetName') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                <TextInput style={styles.input} placeholder="e.g. MG Road" placeholderTextColor={colors.mutedForeground} value={formData.streetName} onChangeText={(val) => update('streetName', val)} onFocus={() => setFocusedField('streetName')} onBlur={() => setFocusedField('')} returnKeyType="next" />
              </View>
              {fieldError('streetName') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('streetRequired')}</Text>}
            </View>

            <View style={styles.marginTop}>
              <Text style={[styles.label, { color: fieldError('area') ? colors.destructive : colors.foreground }]}>{t('areaLoc')} <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, focusedField === 'area' && styles.inputFocused, fieldError('area') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                <TextInput style={styles.input} placeholder="e.g. Koregaon Park" placeholderTextColor={colors.mutedForeground} value={formData.area} onChangeText={(val) => update('area', val)} onFocus={() => setFocusedField('area')} onBlur={() => setFocusedField('')} returnKeyType="next" />
              </View>
              {fieldError('area') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('areaRequired')}</Text>}
            </View>

            <View style={[styles.gridRow, styles.marginTop]}>
              <View style={styles.gridCol}>
                <Text style={[styles.label, { color: fieldError('city') ? colors.destructive : colors.foreground }]}>{t('city')} <Text style={styles.required}>*</Text></Text>
                <View style={[styles.inputRow, focusedField === 'city' && styles.inputFocused, fieldError('city') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                  <TextInput style={styles.input} placeholder="e.g. Mumbai" placeholderTextColor={colors.mutedForeground} value={formData.city} onChangeText={(val) => update('city', val)} onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField('')} returnKeyType="next" />
                </View>
                {fieldError('city') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('cityRequired')}</Text>}
              </View>
              <View style={[styles.gridCol, { marginLeft: 10 }]}>
                <Text style={[styles.label, { color: fieldError('pincode') ? colors.destructive : colors.foreground }]}>{t('pincode')} <Text style={styles.required}>*</Text></Text>
                <View style={[styles.inputRow, focusedField === 'pincode' && styles.inputFocused, fieldError('pincode') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                  <TextInput style={styles.input} placeholder="123456" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" value={formData.pincode} onChangeText={(val) => update('pincode', val)} onFocus={() => setFocusedField('pincode')} onBlur={() => setFocusedField('')} returnKeyType="next" />
                </View>
                {fieldError('pincode') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('pincodeRequired')}</Text>}
              </View>
            </View>

            <View style={styles.marginTop}>
              <Text style={styles.label}>{t('state')}</Text>
              <View style={[styles.inputRow, focusedField === 'state' && styles.inputFocused]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Maharashtra"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.state}
                  onChangeText={(val) => update('state', val)}
                  onFocus={() => setFocusedField('state')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.marginTop}>
              <Text style={styles.label}>{t('landmark')}</Text>
              <View style={[styles.inputRow, focusedField === 'landmark' && styles.inputFocused]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Near City Mall"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.landmark}
                  onChangeText={(val) => update('landmark', val)}
                  onFocus={() => setFocusedField('landmark')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>{t('productsPricing')}</Text>
            </View>
            
            {dairyItems.map((item, index) => (
              <View key={index} style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productUnit}>{item.unit}</Text>
                </View>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={item.price}
                  onChangeText={(val) => {
                    const newItems = [...dairyItems];
                    newItems[index].price = val;
                    setDairyItems(newItems);
                  }}
                />
              </View>
            ))}
          </View>

          {/* Delivery Slots Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>{t('deliverySlots')}</Text>
            </View>
            {deliverySlots.map((slot, index) => (
              <View key={slot.id} style={styles.slotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotName}>{slot.name}</Text>
                  <Text style={styles.slotTime}>{slot.startTime} - {slot.endTime}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    const newSlots = [...deliverySlots];
                    newSlots[index].isActive = !newSlots[index].isActive;
                    setDeliverySlots(newSlots);
                  }}
                  style={[styles.toggleBtn, slot.isActive && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, slot.isActive && styles.toggleBtnTextActive]}>
                    {slot.isActive ? t('activeLabel') : t('disabledLabel')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Bank Details Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>{t('bankDetailsOptional')}</Text>
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('bankAccountHolderName', t('accountHolder'))}
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('bankAccountNumber', t('accountNo'), { keyboardType: 'numeric' })}
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('bankIfscCode', t('ifscCode'), { autoCapitalize: 'characters' })}
            </View>
            <View style={styles.fieldGroup}>
              {renderInput('upiId', t('upiId'), { autoCapitalize: 'none' })}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>{t('completeSetup')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    padding: 24, // spacing['2xl']
    paddingBottom: 48, // spacing['4xl']
  },

  // Header
  header: { alignItems: 'center', marginBottom: 24 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24, fontWeight: '700',
    color: colors.foreground, textAlign: 'center', marginBottom: 8,
    fontFamily: fontFamilyBold,
  },
  subtitle: {
    fontSize: 16, color: colors.mutedForeground,
    textAlign: 'center', lineHeight: 24,
    fontFamily,
  },

  // Sections
  sectionCard: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 24, marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700',
    color: colors.foreground, marginLeft: 12,
    fontFamily: fontFamilyBold,
  },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 14, fontWeight: '600',
    color: colors.foreground, marginBottom: 8,
    fontFamily: fontFamilyBold,
  },
  required: { color: colors.destructive },
  inputRow: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.surfaceSecondary || (isDark ? '#374151' : '#F9FAFB'), height: 48,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  inputFocused: { borderColor: '#2563EB', borderWidth: 2 },
  input: {
    fontSize: 16, color: colors.foreground, height: '100%',
    fontFamily,
  },

  // Location
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2563EB', borderStyle: 'dashed',
    borderRadius: 8, paddingVertical: 14,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#EFF6FF', marginBottom: 16,
  },
  locationBtnText: {
    color: '#2563EB', fontSize: 16, fontWeight: '500',
    fontFamily,
  },

  // Submit
  submitBtn: {
    backgroundColor: '#2563EB', height: 52, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '700',
    fontFamily: fontFamilyBold,
  },
  gridRow: { flexDirection: 'row' },
  gridCol: { flex: 1 },
  subLabel: { fontSize: 12, color: colors.mutedForeground, marginBottom: 4, fontFamily },
  marginTop: { marginTop: 12 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  productName: { fontSize: 16, fontWeight: '600', color: colors.foreground, fontFamily: fontFamilyBold },
  productUnit: { fontSize: 12, color: colors.mutedForeground, fontFamily },
  priceInput: {
    width: 80, height: 40, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, textAlign: 'center', fontSize: 16, color: colors.foreground,
    fontFamily,
  },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  slotName: { fontSize: 16, fontWeight: '600', color: colors.foreground, fontFamily: fontFamilyBold },
  slotTime: { fontSize: 12, color: colors.mutedForeground, fontFamily },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
  },
  toggleBtnActive: { backgroundColor: '#2563EB' },
  toggleBtnText: { fontSize: 12, color: isDark ? '#D1D5DB' : '#4B5563', fontWeight: '600', fontFamily },
  toggleBtnTextActive: { color: '#FFFFFF' },
});

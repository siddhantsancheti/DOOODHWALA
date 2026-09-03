import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin, Truck, Clock, CreditCard, Plus, X, Camera, Check } from 'lucide-react-native';
import { pickAndUploadPan } from '../lib/panUpload';
import { useTranslation } from '../contexts/LanguageContext';
import SelectField from '../components/SelectField';
import { INDIA_STATES } from '../lib/indiaStates';

export default function MilkmanProfileSetupScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = React.useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAutoCapture, setLocationAutoCapture] = useState<'idle' | 'capturing' | 'captured' | 'failed'>('idle');
  const [focusedField, setFocusedField] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Whether a PAN photo has been uploaded in this session or already exists.
  const [panUploaded, setPanUploaded] = useState(false);
  const [panUploading, setPanUploading] = useState(false);
  const isMounted = useRef(true);

  const [formData, setFormData] = useState({
    contactName: '',
    businessName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bankAccountHolderName: '',
    bankAccountNumber: '',
    panNumber: '',
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
    if (!formData.contactName || !formData.businessName || !formData.address || !formData.city) {
      Alert.alert(t('requiredFields'), t('fillRequired'));
      return;
    }

    // Bank details and PAN are how a milkman gets paid and who we are paying.
    // Collected before he is listed rather than chased afterwards, when he has
    // customers waiting and no way to receive their money.
    if (!formData.bankAccountNumber || !formData.bankIfscCode || !formData.panNumber) {
      Alert.alert(t('requiredFields'), t('bankAndPanRequired'));
      return;
    }

    if (!panUploaded) {
      Alert.alert(t('requiredFields'), t('panPhotoRequired'));
      return;
    }

    // Ten characters, five letters, four digits, one letter. Catching a typo
    // here is far cheaper than a failed payout weeks later.
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panNumber.trim().toUpperCase())) {
      Alert.alert(t('requiredFields'), t('panInvalid'));
      return;
    }

    // IFSC is four letters, a zero, then six characters.
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankIfscCode.trim().toUpperCase())) {
      Alert.alert(t('requiredFields'), t('ifscInvalid'));
      return;
    }

    // Concatenate address
    const addressParts = [
      formData.address,
      formData.city,
      formData.state,
      formData.pincode,
      'India'
    ].filter(part => part.trim());
    
    const fullAddress = addressParts.join(', ');

    // Filter active products (named + priced) and active slots (named + timed)
    const activeProducts = dairyItems.filter(item => item.name && item.name.trim() && item.price && parseFloat(item.price) > 0);
    const activeSlots = deliverySlots.filter(slot => slot.isActive && slot.name && slot.name.trim() && slot.startTime && slot.endTime);

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
        panNumber: formData.panNumber.trim().toUpperCase(),
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
  const isValid = formData.contactName && formData.businessName && formData.address && formData.city
    && formData.bankAccountNumber && formData.bankIfscCode && formData.panNumber && panUploaded;

  const errorColor = '#A8382F';
  const errorBorder = '#C0453B';
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
              <Truck size={20} color="#22406E" />
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
              <MapPin size={20} color="#22406E" />
              <Text style={styles.sectionTitle}>{t('serviceArea')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.locationBtn,
                formData.latitude ? { borderColor: '#3E9B72', backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : '#F1F8F3' } : {},
              ]}
              onPress={getCurrentLocation}
              disabled={isLocating || locationAutoCapture === 'capturing'}
              activeOpacity={0.7}
            >
              {(isLocating || locationAutoCapture === 'capturing') ? (
                <ActivityIndicator size="small" color="#22406E" style={{ marginRight: 8 }} />
              ) : (
                <MapPin size={20} color={formData.latitude ? '#3E9B72' : '#22406E'} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.locationBtnText, formData.latitude ? { color: '#3E9B72' } : {}]}>
                {locationAutoCapture === 'capturing'
                  ? 'Detecting location…'
                  : formData.latitude
                  ? `✓ Location captured (${parseFloat(formData.latitude).toFixed(4)}, ${parseFloat(formData.longitude).toFixed(4)})`
                  : t('getCurrentLocation')}
              </Text>
            </TouchableOpacity>
            
            {/* One address field instead of four — a milkman types their
                address the way they'd say it, and the map pin above already
                carries the precision that separate fields were trying to. */}
            <View>
              <Text style={[styles.label, { color: fieldError('address') ? colors.destructive : colors.foreground }]}>
                {t('address')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.textAreaRow,
                focusedField === 'address' && styles.inputFocused,
                fieldError('address') && { borderColor: colors.destructive, borderWidth: 2 },
              ]}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Flat / building, street, area"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.address}
                  onChangeText={(val) => update('address', val)}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField('')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {fieldError('address') && <Text style={styles.fieldErrorText}>{t('addressRequired')}</Text>}
            </View>

            <View style={[styles.gridRow, styles.marginTop]}>
              <View style={styles.gridCol}>
                <Text style={[styles.label, { color: fieldError('city') ? colors.destructive : colors.foreground }]} numberOfLines={1}>
                  {t('city')} <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputRow, focusedField === 'city' && styles.inputFocused, fieldError('city') && { borderColor: colors.destructive, borderWidth: 2 }]}>
                  <TextInput style={styles.input} placeholder="Mumbai" placeholderTextColor={colors.mutedForeground} value={formData.city} onChangeText={(val) => update('city', val)} onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField('')} returnKeyType="next" />
                </View>
                {fieldError('city') && <Text style={styles.fieldErrorText}>{t('cityRequired')}</Text>}
              </View>
              <View style={[styles.gridCol, { marginLeft: 10 }]}>
                <Text style={styles.label} numberOfLines={1}>{t('pincode')}</Text>
                <View style={[styles.inputRow, focusedField === 'pincode' && styles.inputFocused]}>
                  <TextInput style={styles.input} placeholder="411001" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={6} value={formData.pincode} onChangeText={(val) => update('pincode', val.replace(/[^0-9]/g, ''))} onFocus={() => setFocusedField('pincode')} onBlur={() => setFocusedField('')} returnKeyType="next" />
                </View>
              </View>
            </View>

            <View style={styles.marginTop}>
              <Text style={styles.label}>{t('state')}</Text>
              <SelectField
                value={formData.state}
                options={INDIA_STATES}
                onChange={(val) => update('state', val)}
                placeholder="Select state"
                title="Select state"
                searchable
              />
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={20} color="#22406E" />
              <Text style={styles.sectionTitle}>{t('productsPricing')}</Text>
            </View>
            
            {dairyItems.map((item, index) => (
              <View key={index} style={styles.productRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TextInput
                    style={styles.productNameInput}
                    placeholder={t('productNamePlaceholder') || 'e.g. Cow Milk'}
                    value={item.name}
                    onChangeText={(val) => {
                      const newItems = [...dairyItems];
                      newItems[index].name = val;
                      setDairyItems(newItems);
                    }}
                  />
                  <Text style={styles.productUnit}>per litre</Text>
                </View>
                <Text style={{ color: colors.mutedForeground, marginRight: 4, fontFamily }}>₹</Text>
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
                {dairyItems.length > 1 && (
                  <TouchableOpacity style={{ marginLeft: 8, padding: 4 }} onPress={() => setDairyItems(dairyItems.filter((_, i) => i !== index))}>
                    <X size={18} color="#C0453B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addRowBtn}
              onPress={() => setDairyItems([...dairyItems, { name: '', unit: 'per litre', price: '', isCustom: true }])}
            >
              <Plus size={18} color="#22406E" />
              <Text style={styles.addRowText}>{t('addNewProduct') || 'Add Product'}</Text>
            </TouchableOpacity>
          </View>

          {/* Delivery Slots Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={20} color="#22406E" />
              <Text style={styles.sectionTitle}>{t('deliverySlots')}</Text>
            </View>
            {deliverySlots.map((slot, index) => (
              <View key={slot.id} style={styles.slotRowEdit}>
                <TextInput
                  style={styles.slotNameInput}
                  placeholder="Slot name (e.g. Morning)"
                  value={slot.name}
                  onChangeText={(val) => { const n = [...deliverySlots]; n[index].name = val; setDeliverySlots(n); }}
                />
                <View style={styles.slotTimeRow}>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="06:00"
                    value={slot.startTime}
                    onChangeText={(val) => { const n = [...deliverySlots]; n[index].startTime = val; setDeliverySlots(n); }}
                  />
                  <Text style={{ color: colors.mutedForeground }}>—</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="09:00"
                    value={slot.endTime}
                    onChangeText={(val) => { const n = [...deliverySlots]; n[index].endTime = val; setDeliverySlots(n); }}
                  />
                  <TouchableOpacity
                    onPress={() => { const n = [...deliverySlots]; n[index].isActive = !n[index].isActive; setDeliverySlots(n); }}
                    style={[styles.toggleBtn, slot.isActive && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleBtnText, slot.isActive && styles.toggleBtnTextActive]}>
                      {slot.isActive ? t('activeLabel') : t('disabledLabel')}
                    </Text>
                  </TouchableOpacity>
                  {deliverySlots.length > 1 && (
                    <TouchableOpacity style={{ padding: 4 }} onPress={() => setDeliverySlots(deliverySlots.filter((_, i) => i !== index))}>
                      <X size={18} color="#C0453B" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addRowBtn}
              onPress={() => setDeliverySlots([...deliverySlots, { id: String(Date.now()), name: '', startTime: '10:00', endTime: '12:00', isActive: true }])}
            >
              <Plus size={18} color="#22406E" />
              <Text style={styles.addRowText}>{t('addDeliverySlot')}</Text>
            </TouchableOpacity>
          </View>

          {/* Bank Details Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={20} color="#22406E" />
              <Text style={styles.sectionTitle}>{t('bankAndVerification')}</Text>
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
            <View style={styles.fieldGroup}>
              {renderInput('panNumber', t('panNumber'), { autoCapitalize: 'characters', maxLength: 10 })}
            </View>
            <TouchableOpacity
              style={[styles.panUpload, panUploaded && styles.panUploadDone]}
              onPress={() => {
                Alert.alert(t('panPhoto'), t('panPhotoHow'), [
                  { text: t('camera'), onPress: async () => {
                      setPanUploading(true);
                      const ok = await pickAndUploadPan('camera');
                      setPanUploading(false);
                      if (ok) setPanUploaded(true);
                    } },
                  { text: t('gallery'), onPress: async () => {
                      setPanUploading(true);
                      const ok = await pickAndUploadPan('library');
                      setPanUploading(false);
                      if (ok) setPanUploaded(true);
                    } },
                  { text: t('cancel'), style: 'cancel' },
                ]);
              }}
              disabled={panUploading}
              activeOpacity={0.75}
            >
              {panUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Camera size={18} color={panUploaded ? '#2F6B45' : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.panUploadTitle, { color: colors.foreground }]}>
                      {t('panPhoto')}
                    </Text>
                    <Text style={[styles.panUploadSub, { color: colors.mutedForeground }]}>
                      {panUploaded ? t('panPhotoUploaded') : t('panPhotoTapToAdd')}
                    </Text>
                  </View>
                  {panUploaded
                    ? <Check size={18} color="#2F6B45" />
                    : <Text style={styles.panRequiredTag}>{t('required')}</Text>}
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.verifyNote}>{t('verificationNote')}</Text>
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
    backgroundColor: colors.primary,
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
  panUpload: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 12, padding: 14, marginTop: 4,
  },
  panUploadDone: { borderStyle: 'solid', borderColor: '#2F6B45' },
  panUploadTitle: { fontSize: 14, fontFamily: fontFamilyBold },
  panUploadSub: { fontSize: 12, fontFamily, marginTop: 1 },
  panRequiredTag: {
    fontSize: 11, color: '#A8322D', fontFamily: fontFamilyBold,
    backgroundColor: 'rgba(168,50,45,0.1)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
  },
  verifyNote: {
    fontSize: 12, color: colors.mutedForeground, fontFamily,
    marginTop: 4, lineHeight: 17,
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
  productNameInput: {
    fontSize: 16, fontWeight: '600', color: colors.foreground, fontFamily: fontFamilyBold,
    borderBottomWidth: 1, borderBottomColor: isDark ? '#332C25' : '#E6DCCD', paddingVertical: 2,
  },
  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: 10, borderRadius: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary,
  },
  addRowText: { color: colors.primary, fontWeight: '700', fontSize: 14, fontFamily: fontFamilyBold },
  slotRowEdit: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#332C25' : '#F0E9DE' },
  slotNameInput: {
    fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: fontFamilyBold,
    borderBottomWidth: 1, borderBottomColor: isDark ? '#332C25' : '#E6DCCD', paddingVertical: 2,
  },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  timeInput: {
    width: 64, height: 36, borderWidth: 1, borderColor: isDark ? '#332C25' : '#E6DCCD',
    borderRadius: 8, textAlign: 'center', fontSize: 14, color: colors.foreground, fontFamily,
  },
  inputRow: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.surfaceSecondary || (isDark ? '#332C25' : '#F5EFE5'), height: 48,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 2 },
  input: {
    fontSize: 16, color: colors.foreground, height: '100%',
    fontFamily,
  },

  // Location
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed',
    borderRadius: 8, paddingVertical: 14,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#F2F5FA', marginBottom: 16,
  },
  locationBtnText: {
    color: colors.primary, fontSize: 16, fontWeight: '500',
    fontFamily,
  },

  // Submit
  submitBtn: {
    backgroundColor: colors.primary, height: 52, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: colors.mutedForeground },
  submitBtnText: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '700',
    fontFamily: fontFamilyBold,
  },
  textAreaRow: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.surfaceSecondary || (isDark ? '#332C25' : '#F5EFE5'),
    paddingHorizontal: 16, paddingVertical: 12, minHeight: 88,
  },
  textArea: {
    fontSize: 16, color: colors.foreground, fontFamily,
    padding: 0, minHeight: 64, lineHeight: 22,
  },
  fieldErrorText: { color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily },
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
    backgroundColor: isDark ? '#5C5248' : '#F0E9DE',
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleBtnText: { fontSize: 12, color: isDark ? '#D5C8B5' : '#5C5248', fontWeight: '600', fontFamily },
  toggleBtnTextActive: { color: '#FFFFFF' },
});

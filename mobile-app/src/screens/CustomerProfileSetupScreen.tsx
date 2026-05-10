import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, Image,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';

const logo = require('../../assets/logo.png');

export default function CustomerProfileSetupScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { t, language, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  
  const styles = React.useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const [formData, setFormData] = useState({
    name: '', 
    email: '', 
    houseNumber: '',
    buildingName: '',
    streetName: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '', 
    longitude: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAutoCapture, setLocationAutoCapture] = useState<'idle' | 'capturing' | 'captured' | 'failed'>('idle');
  const [focusedField, setFocusedField] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const isMounted = useRef(true);

  // ── Auto-capture location silently on screen load ──────────────────────────
  useEffect(() => {
    isMounted.current = true;
    captureLocationSilently();
    return () => { isMounted.current = false; };
  }, []);

  const captureLocationSilently = async () => {
    try {
      setLocationAutoCapture('capturing');
      // Check existing permission first — don't prompt on load, just use if already granted
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing !== 'granted') {
        // Not yet granted — request permission (system dialog)
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

  // ── Manual re-capture (button press) ──────────────────────────────────────
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
    if (!formData.name || !formData.email || !formData.streetName || !formData.area || !formData.city || !formData.pincode) {
      Alert.alert(t('requiredFields'), t('fillRequired'));
      return;
    }
    
    // Concatenate address for the API
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

    setIsSubmitting(true);
    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        address: fullAddress,
        houseNumber: formData.houseNumber,
        buildingName: formData.buildingName,
        streetName: formData.streetName,
        area: formData.area,
        landmark: formData.landmark,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      };
      // Only include coordinates if captured
      if (formData.latitude && formData.longitude) {
        body.latitude = formData.latitude;
        body.longitude = formData.longitude;
      }
      const res = await apiRequest({
        url: '/api/customers/profile',
        method: 'PATCH',
        body,
      });
      await res.json();
      Alert.alert(t('profileUpdated'), t('welcomeDoodhwala'));
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      navigation.replace('CustomerHome');
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.name && formData.email && formData.streetName && formData.area && formData.city && formData.pincode;

  const fieldError = (field: string) => submitAttempted && !(formData as any)[field];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo Area */}
          <View style={styles.photoContainer}>
            <View style={styles.photoCircle}>
              <Image source={logo} style={styles.photoImage} resizeMode="contain" />
            </View>
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8} onPress={() => Alert.alert('Coming Soon', 'Profile picture upload is currently under development.')}>
              <Camera size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Welcome Text */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t('completeProfile').split(' ')[0]} {t('completeProfile').split(' ')[1]}{' '}
              <Text style={styles.titleGradient}>Customer</Text>
              {' '}!
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {t('setupPreferences')}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            
            {/* Profile Type Icon inside Card */}
            <View style={styles.cardIconContainer}>
              <LinearGradient
                colors={['#3B82F6', '#A855F7', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardIconGradient}
              >
                <View style={styles.cardIconInner}>
                  <Image source={logo} style={styles.cardIconImage} resizeMode="contain" />
                </View>
              </LinearGradient>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: fieldError('name') ? colors.destructive : colors.foreground }]}>{t('fullName')} *</Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: fieldError('name') ? colors.destructive : colors.border, color: colors.foreground },
                  focusedField === 'name' && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                placeholder={t('enterName')}
                placeholderTextColor={colors.mutedForeground}
                value={formData.name}
                onChangeText={(val) => setFormData({ ...formData, name: val })}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField('')}
                returnKeyType="next"
              />
              {fieldError('name') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily }}>{t('nameRequired')}</Text>}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: fieldError('email') ? colors.destructive : colors.foreground }]}>{t('emailAddr')} *</Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: fieldError('email') ? colors.destructive : colors.border, color: colors.foreground },
                  focusedField === 'email' && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                placeholder={t('enterEmail')}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(val) => setFormData({ ...formData, email: val })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                returnKeyType="next"
              />
              {fieldError('email') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4, fontFamily }}>{t('emailRequired')}</Text>}
            </View>

            {/* Structured Address Fields */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t('deliveryAddress')}</Text>
              
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('houseNo')}</Text>
                  <TextInput
                    style={[styles.inputSmall, { borderColor: colors.border, color: colors.foreground }, focusedField === 'houseNumber' && { borderColor: colors.primary, borderWidth: 1 }]}
                    placeholder="e.g. 123"
                    value={formData.houseNumber}
                    onChangeText={(val) => setFormData({ ...formData, houseNumber: val })}
                    onFocus={() => setFocusedField('houseNumber')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
                <View style={[styles.gridCol, { marginLeft: 10 }]}>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('buildingSoc')}</Text>
                  <TextInput
                    style={[styles.inputSmall, { borderColor: colors.border, color: colors.foreground }, focusedField === 'buildingName' && { borderColor: colors.primary, borderWidth: 1 }]}
                    placeholder="e.g. Sunshine"
                    value={formData.buildingName}
                    onChangeText={(val) => setFormData({ ...formData, buildingName: val })}
                    onFocus={() => setFocusedField('buildingName')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              </View>

              <View style={styles.marginTop}>
                <Text style={[styles.subLabel, { color: fieldError('streetName') ? colors.destructive : colors.mutedForeground }]}>{t('streetName')} *</Text>
                <TextInput
                  style={[styles.inputSmall, { borderColor: fieldError('streetName') ? colors.destructive : colors.border, color: colors.foreground }, focusedField === 'streetName' && { borderColor: colors.primary, borderWidth: 1 }]}
                  placeholder="e.g. MG Road"
                  value={formData.streetName}
                  onChangeText={(val) => setFormData({ ...formData, streetName: val })}
                  onFocus={() => setFocusedField('streetName')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="next"
                />
                {fieldError('streetName') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('streetRequired')}</Text>}
              </View>

              <View style={styles.marginTop}>
                <Text style={[styles.subLabel, { color: fieldError('area') ? colors.destructive : colors.mutedForeground }]}>{t('areaLoc')} *</Text>
                <TextInput
                  style={[styles.inputSmall, { borderColor: fieldError('area') ? colors.destructive : colors.border, color: colors.foreground }, focusedField === 'area' && { borderColor: colors.primary, borderWidth: 1 }]}
                  placeholder="e.g. Koregaon Park"
                  value={formData.area}
                  onChangeText={(val) => setFormData({ ...formData, area: val })}
                  onFocus={() => setFocusedField('area')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="next"
                />
                {fieldError('area') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('areaRequired')}</Text>}
              </View>

              <View style={styles.marginTop}>
                <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('landmark')}</Text>
                <TextInput
                  style={[styles.inputSmall, { borderColor: colors.border, color: colors.foreground }, focusedField === 'landmark' && { borderColor: colors.primary, borderWidth: 1 }]}
                  placeholder="e.g. Near Park"
                  value={formData.landmark}
                  onChangeText={(val) => setFormData({ ...formData, landmark: val })}
                  onFocus={() => setFocusedField('landmark')}
                  onBlur={() => setFocusedField('')}
                />
              </View>

              <View style={[styles.gridRow, styles.marginTop]}>
                <View style={styles.gridCol}>
                  <Text style={[styles.subLabel, { color: fieldError('city') ? colors.destructive : colors.mutedForeground }]}>{t('city')} *</Text>
                  <TextInput
                    style={[styles.inputSmall, { borderColor: fieldError('city') ? colors.destructive : colors.border, color: colors.foreground }, focusedField === 'city' && { borderColor: colors.primary, borderWidth: 1 }]}
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChangeText={(val) => setFormData({ ...formData, city: val })}
                    onFocus={() => setFocusedField('city')}
                    onBlur={() => setFocusedField('')}
                    returnKeyType="next"
                  />
                  {fieldError('city') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('cityRequired')}</Text>}
                </View>
                <View style={[styles.gridCol, { marginLeft: 10 }]}>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('state')} *</Text>
                  <TextInput
                    style={[styles.inputSmall, { borderColor: colors.border, color: colors.foreground }, focusedField === 'state' && { borderColor: colors.primary, borderWidth: 1 }]}
                    placeholder="e.g. MH"
                    value={formData.state}
                    onChangeText={(val) => setFormData({ ...formData, state: val })}
                    onFocus={() => setFocusedField('state')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              </View>

              <View style={styles.marginTop}>
                <Text style={[styles.subLabel, { color: fieldError('pincode') ? colors.destructive : colors.mutedForeground }]}>{t('pincode')} *</Text>
                <TextInput
                  style={[styles.inputSmall, { borderColor: fieldError('pincode') ? colors.destructive : colors.border, color: colors.foreground }, focusedField === 'pincode' && { borderColor: colors.primary, borderWidth: 1 }]}
                  placeholder="e.g. 400001"
                  keyboardType="numeric"
                  maxLength={6}
                  value={formData.pincode}
                  onChangeText={(val) => setFormData({ ...formData, pincode: val })}
                  onFocus={() => setFocusedField('pincode')}
                  onBlur={() => setFocusedField('')}
                  returnKeyType="done"
                />
                {fieldError('pincode') && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 2, fontFamily }}>{t('pincodeRequired')}</Text>}
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t('locationCoords')}{' '}
                <Text style={{ fontSize: 13, fontWeight: '400', color: colors.mutedForeground }}>(auto-detected)</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.locationBtn,
                  {
                    borderColor: formData.latitude ? '#22C55E' : colors.border,
                    backgroundColor: formData.latitude ? 'rgba(34,197,94,0.06)' : 'transparent',
                  }
                ]}
                onPress={getCurrentLocation}
                disabled={isLocating || locationAutoCapture === 'capturing'}
                activeOpacity={0.7}
              >
                {(isLocating || locationAutoCapture === 'capturing') ? (
                  <ActivityIndicator color={colors.mutedForeground} style={{ marginRight: 8 }} />
                ) : (
                  <MapPin
                    size={20}
                    color={formData.latitude ? '#22C55E' : colors.mutedForeground}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={[
                  styles.locationBtnText,
                  { color: formData.latitude ? '#22C55E' : colors.mutedForeground }
                ]}>
                  {locationAutoCapture === 'capturing'
                    ? 'Detecting location…'
                    : formData.latitude
                      ? `✓ Location saved (${parseFloat(formData.latitude).toFixed(4)}, ${parseFloat(formData.longitude).toFixed(4)})`
                      : t('getCurrentLocation')}
                </Text>
              </TouchableOpacity>
              {locationAutoCapture === 'failed' && (
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4, fontFamily }}>
                  Could not auto-detect — tap above to try manually.
                </Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
              style={{ marginTop: 24, opacity: isSubmitting ? 0.7 : 1 }}
            >
              <LinearGradient
                colors={['#2563EB', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {t('completeSetup')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: 16, // px-4
    paddingVertical: 64, // py-16
    alignItems: 'center',
  },

  // Profile Photo
  photoContainer: {
    marginBottom: 32, // mb-8
    position: 'relative',
    alignSelf: 'center',
  },
  photoCircle: {
    width: 160, // w-40
    height: 160, // h-40
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: 96, // w-24
    height: 96, // h-24
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    right: 20,
    transform: [{ translateY: 10 }],
    backgroundColor: '#2563EB', // bg-primary
    padding: 12, // p-3
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },

  // Header Text
  header: {
    alignItems: 'center',
    marginBottom: 64, // mb-16
    maxWidth: 800,
  },
  title: {
    fontSize: 42, // text-5xl
    fontWeight: '700', // font-bold
    textAlign: 'center',
    marginBottom: 24, // mb-6
    lineHeight: 48,
    fontFamily: fontFamilyBold,
  },
  titleGradient: {
    color: '#0EA5E9', // Fallback for bg-gradient-to-r from-blue-600 via-teal-500 to-green-500
    fontFamily: fontFamilyBold,
  },
  subtitle: {
    fontSize: 20, // text-xl
    fontWeight: '500', // font-medium
    textAlign: 'center',
    fontFamily,
  },

  // Form Card
  formCard: {
    width: '100%',
    maxWidth: 672, // max-w-2xl
    borderRadius: 16, // rounded-2xl
    padding: 48, // p-12
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  // Card Icon
  cardIconContainer: {
    alignItems: 'center',
    marginBottom: 32, // mb-8
  },
  cardIconGradient: {
    width: 80, // w-20
    height: 80, // h-20
    borderRadius: 24, // rounded-3xl
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardIconInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // bg-white/20
    padding: 4, // p-1
    borderRadius: 8, // rounded-lg
  },
  cardIconImage: {
    width: 40, // w-10
    height: 40, // h-10
  },

  // Form Elements
  fieldGroup: {
    marginBottom: 24, // space-y-6 inside form
  },
  label: {
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    marginBottom: 12, // space-y-3 gap
    fontFamily: fontFamilyBold,
  },
  input: {
    height: 56, // h-14
    fontSize: 18, // text-lg
    borderWidth: 2,
    borderRadius: 12, // rounded-xl
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    fontFamily,
  },
  textArea: {
    height: 120, // min-h-[100px]
    textAlignVertical: 'top',
    paddingVertical: 16,
    fontFamily,
  },

  // Location Button
  locationBtn: {
    height: 48, // h-12
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8, // rounded-lg roughly (variant=outline)
  },
  locationBtnText: {
    fontSize: 16, // text-base
    fontWeight: '500', // font-medium
    fontFamily,
  },

  // Submit Button
  submitBtn: {
    height: 64, // h-16
    borderRadius: 12, // rounded-xl
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    fontFamily: fontFamilyBold,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCol: {
    flex: 1,
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 4,
    marginTop: 8,
    fontFamily,
  },
  inputSmall: {
    height: 48,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily,
  },
  marginTop: {
    marginTop: 10,
  },
});

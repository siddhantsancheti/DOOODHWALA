import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin, User, Mail, Home } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../theme';

export default function CustomerProfileSetupScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '', email: '', address: '', latitude: '', longitude: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      }));
      Alert.alert('Location Captured', 'Your current location has been saved.');
    } catch (error) {
      Alert.alert('Error', 'Unable to retrieve your location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.email) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiRequest({
        url: '/api/customers/profile',
        method: 'PATCH',
        body: formData,
      });
      await res.json();
      Alert.alert('Profile Updated!', 'Welcome to DOOODHWALA!');
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      navigation.replace('CustomerHome');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.name && formData.email && formData.address;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <User size={32} color={colors.white} />
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Set up your delivery preferences to start ordering fresh milk
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, focusedField === 'name' && styles.inputFocused]}>
                <User size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.name}
                  onChangeText={(val) => setFormData({ ...formData, name: val })}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, focusedField === 'email' && styles.inputFocused]}>
                <Mail size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(val) => setFormData({ ...formData, email: val })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Delivery Address <Text style={styles.required}>*</Text></Text>
              <View style={[styles.textAreaRow, focusedField === 'address' && styles.inputFocused]}>
                <Home size={18} color={colors.mutedForeground} style={[styles.inputIcon, { marginTop: 14 }]} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your complete delivery address"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={4}
                  value={formData.address}
                  onChangeText={(val) => setFormData({ ...formData, address: val })}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Location</Text>
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={getCurrentLocation}
                disabled={isLocating}
                activeOpacity={0.7}
              >
                {isLocating ? (
                  <ActivityIndicator color={colors.brandPrimary} style={{ marginRight: 8 }} />
                ) : (
                  <MapPin
                    size={20}
                    color={formData.latitude ? colors.success : colors.brandPrimary}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={[styles.locationBtnText, formData.latitude ? { color: colors.success } : {}]}>
                  {formData.latitude
                    ? `Location Captured (${formData.latitude.slice(0, 7)}, ${formData.longitude.slice(0, 7)})`
                    : 'Get Current Location'}
                </Text>
              </TouchableOpacity>
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
              <Text style={styles.submitBtnText}>Complete Setup & Get Started</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.5,
  },

  // Form Card
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
    ...shadows.md,
  },

  // Fields
  fieldGroup: { marginBottom: spacing.xl },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  required: { color: colors.destructive },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  textAreaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputIcon: { marginRight: spacing.md },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.foreground,
    height: '100%',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: spacing.md,
  },

  // Location
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    backgroundColor: colors.infoLight,
  },
  locationBtnText: {
    color: colors.brandPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },

  // Submit
  submitBtn: {
    backgroundColor: colors.brandPrimary,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  submitBtnDisabled: { backgroundColor: colors.gray400 },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

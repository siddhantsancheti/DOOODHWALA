import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../theme';

const logo = require('../../assets/logo.png');

export default function LoginScreen({ navigation }: any) {
  const { sendOtp, login, isOtpLoading, isLoginLoading } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const e164Phone = `+91${phone}`;
      const data = await sendOtp({ phone: e164Phone });
      if (data.success) {
        setStep('otp');
        setResendTimer(300);
      } else {
        Alert.alert('Failed to Send OTP', data.message || 'Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const e164Phone = `+91${phone}`;
      const data = await login({ phone: e164Phone, otp });
      if (data.success) {
        // AppNavigator handles navigation automatically
      } else {
        Alert.alert('Invalid OTP', data.message || 'Please check your code and try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed');
    }
  };

  const handleResendOTP = async () => {
    try {
      const e164Phone = `+91${phone}`;
      const data = await sendOtp({ phone: e164Phone });
      if (data.success) {
        setResendTimer(300);
        setOtp('');
        Alert.alert('OTP Resent', 'A new verification code has been sent to your phone.');
      } else {
        Alert.alert('Failed to Resend', data.message || 'Please wait and try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>

            {/* Title with gradient effect (simulated) */}
            <Text style={styles.title}>DOOODHWALA</Text>
            <Text style={styles.subtitle}>Your trusted dairy delivery marketplace</Text>

            {/* Login Header */}
            <Text style={styles.header}>Sign in to your account</Text>

            {/* Phone Step */}
            {step === 'phone' ? (
              <View style={styles.form}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[styles.inputContainer, phoneFocused && styles.inputFocused]}>
                  <Text style={styles.phoneIcon}>📱</Text>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="98765 43210"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    value={formatPhoneNumber(phone)}
                    onChangeText={handlePhoneChange}
                    maxLength={11}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={phone.length !== 10 || isOtpLoading}
                  activeOpacity={0.8}
                >
                  {isOtpLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Continue with Phone</Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Step */
              <View style={styles.form}>
                <Text style={styles.label}>Enter Verification Code</Text>
                <Text style={styles.subLabel}>We sent a code to {formatPhoneNumber(phone)}</Text>

                <TextInput
                  style={[styles.otpInput, otpFocused && styles.inputFocused]}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  textAlign="center"
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                />

                <TouchableOpacity
                  style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={otp.length !== 6 || isLoginLoading}
                  activeOpacity={0.8}
                >
                  {isLoginLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    {resendTimer > 0
                      ? `Resend OTP in ${resendTimer}s`
                      : "Didn't receive the code?"}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={resendTimer > 0 || isOtpLoading}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resendButton}>
                      <Text style={styles.resendIcon}>↻</Text>
                      <Text
                        style={[
                          styles.resendLink,
                          resendTimer > 0 && styles.resendLinkDisabled,
                        ]}
                      >
                        Resend OTP
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                    setResendTimer(0);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changePhoneText}>Use a different number</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By signing in, you agree to our{' '}
                <Text style={styles.footerLink}>Terms & Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing['3xl'],
    ...shadows['2xl'],
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 128,
    height: 128,
  },

  // Title
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    color: colors.brandPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    color: colors.mutedForeground,
    marginBottom: spacing['3xl'],
  },

  // Header
  header: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    color: colors.foreground,
    marginBottom: spacing['2xl'],
  },

  // Form
  form: {
    gap: spacing.lg,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subLabel: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },

  // Phone Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  phoneIcon: {
    fontSize: 16,
    marginRight: spacing.md,
  },
  phoneInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.foreground,
    height: '100%',
  },

  // OTP Input
  otpInput: {
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    height: 56,
    fontSize: fontSize['2xl'],
    letterSpacing: 8,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.background,
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
  },

  // Button
  button: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  buttonDisabled: {
    backgroundColor: colors.gray400,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  buttonArrow: {
    color: colors.primaryForeground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },

  // Resend
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  resendIcon: {
    fontSize: 16,
    color: colors.brandPrimary,
  },
  resendLink: {
    color: colors.brandPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
  resendLinkDisabled: {
    color: colors.gray400,
  },

  // Change phone
  changePhoneText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
  },

  // Footer
  footer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.brandPrimary,
    fontWeight: fontWeight.medium,
  },
});

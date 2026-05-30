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
import { Phone, ArrowRight, RotateCcw, Loader2, Globe, Check } from 'lucide-react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';
import { Language } from '../lib/translations';

const logo = require('../../assets/logo.png');

export default function LoginScreen({ navigation }: any) {
  const { firebaseLogin } = useAuth();
  const { t, language, setLanguage, fontFamily, fontFamilyBold, colors, isDark } = useTranslation();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const styles = React.useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

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

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Map common Firebase auth error codes to friendly messages.
  const firebaseErrorMessage = (error: any): string => {
    switch (error?.code) {
      case 'auth/invalid-phone-number': return t('invalidPhone') || 'Invalid phone number.';
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
      case 'auth/invalid-verification-code': return t('checkOtp') || 'Incorrect code. Please check and try again.';
      case 'auth/session-expired': return 'Code expired. Please request a new one.';
      case 'auth/quota-exceeded': return 'SMS limit reached. Please try again later.';
      default: return error?.message || t('waitTryAgain') || 'Something went wrong.';
    }
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      showAlert(t('invalidPhone'), t('phone10Digits'));
      return;
    }
    setIsOtpLoading(true);
    try {
      const e164Phone = `+91${phone}`;
      const conf = await auth().signInWithPhoneNumber(e164Phone);
      setConfirmation(conf);
      setStep('otp');
      setResendTimer(60);
    } catch (error: any) {
      showAlert(t('failedSendOtp') || 'Failed to send OTP', firebaseErrorMessage(error));
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!confirmation) {
      showAlert(t('error'), t('waitTryAgain') || 'Please request a new code.');
      return;
    }
    setIsLoginLoading(true);
    try {
      // Confirm the OTP with Firebase, then exchange the verified ID token
      // for our app JWT via the backend.
      const credential = await confirmation.confirm(otp);
      const idToken = await credential?.user.getIdToken();
      if (!idToken) throw new Error(t('verificationFailed') || 'Verification failed');
      await firebaseLogin({ idToken });
      // AppNavigator handles navigation automatically once the JWT is stored.
    } catch (error: any) {
      showAlert(t('invalidOtp') || 'Invalid OTP', firebaseErrorMessage(error));
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsOtpLoading(true);
    try {
      const e164Phone = `+91${phone}`;
      const conf = await auth().signInWithPhoneNumber(e164Phone, true);
      setConfirmation(conf);
      setResendTimer(60);
      setOtp('');
      showAlert(t('otpResent'), t('newCodeSent'));
    } catch (error: any) {
      showAlert(t('failedResend') || 'Failed to resend', firebaseErrorMessage(error));
    } finally {
      setIsOtpLoading(false);
    }
  };

    const content = (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.headerTopActions}>
                <TouchableOpacity 
                   style={[styles.langBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                   onPress={() => setShowLangMenu(!showLangMenu)}
                >
                  <Globe size={16} color={colors.foreground} />
                  <Text style={[styles.langBtnText, { color: colors.foreground }]}>{language}</Text>
                </TouchableOpacity>
              </View>

              {showLangMenu && (
                <View style={[styles.langMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {(['English', 'Hindi', 'Marathi'] as Language[]).map((lang) => (
                    <TouchableOpacity 
                      key={lang} 
                      style={styles.langItem} 
                      onPress={() => { setLanguage(lang); setShowLangMenu(false); }}
                    >
                      <Text style={[styles.langText, { color: colors.foreground }, language === lang && { color: colors.primary, fontWeight: '700' }]}>{lang}</Text>
                      {language === lang && <Check size={14} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>

            {/* Title with gradient effect (simulated) */}
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>DOOODHWALA</Text>
            <Text style={styles.subtitle}>{t('trustedDairy')}</Text>

            {/* Login Header */}
            <Text style={styles.header}>{t('signIn')}</Text>

            {/* Phone Step */}
            {step === 'phone' ? (
              <View style={styles.form}>
                <Text style={styles.label}>{t('phoneNumber')}</Text>
                <View style={[styles.inputContainer, phoneFocused && styles.inputFocused]}>
                  <Phone size={18} color={colors.mutedForeground} style={styles.phoneIcon} />
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
                      <Text style={styles.buttonText}>{t('continueWithPhone')}</Text>
                      <ArrowRight size={20} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Step */
              <View style={styles.form}>
                <Text style={styles.label}>{t('enterVerification')}</Text>
                <Text style={styles.subLabel}>{t('sentCodeTo')} {formatPhoneNumber(phone)}</Text>

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
                    <Text style={styles.buttonText}>{t('verifyContinue')}</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    {resendTimer > 0
                      ? `${t('resendOtpIn')} ${resendTimer}s`
                      : t('didntReceive')}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={resendTimer > 0 || isOtpLoading}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resendButton}>
                      <RotateCcw size={16} color={colors.brandPrimary} />
                      <Text
                        style={[
                          styles.resendLink,
                          resendTimer > 0 && styles.resendLinkDisabled,
                        ]}
                      >
                        {t('resendOtp')}
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
                    <Text style={styles.changePhoneText}>{t('useDifferentNumber')}</Text>
                  </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t('bySigningIn')}{' '}
                <Text style={styles.footerLink}>{t('termsPrivacy')}</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
    );

    if (Platform.OS === 'web') {
        return <View style={styles.container}>{content}</View>;
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {content}
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
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
    position: 'relative',
  },
  headerTopActions: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 10,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langMenu: {
    position: 'absolute',
    top: 30,
    right: -10,
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    ...shadows.lg,
    zIndex: 1000,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  langText: {
    fontSize: 14,
    fontFamily,
  },
  logo: {
    width: 128,
    height: 128,
  },

  // Title
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    color: colors.brandPrimary,
    marginBottom: spacing.xs,
    fontFamily: fontFamilyBold,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    color: colors.mutedForeground,
    marginBottom: spacing['3xl'],
    fontFamily,
  },

  // Header
  header: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    color: colors.foreground,
    marginBottom: spacing['2xl'],
    fontFamily: fontFamilyBold,
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
    fontFamily: fontFamilyBold,
  },
  subLabel: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    fontFamily,
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
    marginRight: spacing.md,
  },
  phoneInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.foreground,
    height: '100%',
    fontFamily,
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
    fontFamily: fontFamilyBold,
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
    fontFamily: fontFamilyBold,
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
    fontFamily,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  resendLink: {
    color: colors.brandPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
    fontFamily: fontFamilyBold,
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
    fontFamily,
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
    fontFamily,
  },
  footerLink: {
    color: colors.brandPrimary,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamilyBold,
  },
});

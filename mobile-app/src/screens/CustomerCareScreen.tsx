import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Platform, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Phone, Mail, MessageCircle, HelpCircle } from 'lucide-react-native';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';

export default function CustomerCareScreen() {
  const navigation = useNavigation();
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();

  const handleCall = useCallback(async () => {
    const phoneNumber = 'tel:+911234567890'; // Placeholder
    const supported = await Linking.canOpenURL(phoneNumber);
    if (supported) {
      await Linking.openURL(phoneNumber);
    } else {
      Alert.alert(t('errorTitle'), t('phoneSupportNotSupported'));
    }
  }, [t]);

  const handleEmail = useCallback(async () => {
    const email = 'mailto:support@dooodhwala.com'; // Placeholder
    const supported = await Linking.canOpenURL(email);
    if (supported) {
      await Linking.openURL(email);
    } else {
      Alert.alert(t('errorTitle'), t('emailSupportNotSupported'));
    }
  }, [t]);

  const handleWhatsApp = useCallback(async () => {
    const message = encodeURIComponent(t('whatsappPlaceholderMsg'));
    const whatsappUrl = `whatsapp://send?phone=+911234567890&text=${message}`;
    const webUrl = `https://wa.me/911234567890?text=${message}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert(t('errorTitle'), t('whatsappNotSupported'));
    }
  }, [t]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('customerCareTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introBox}>
          <HelpCircle size={48} color={colors.primary} style={styles.icon} />
          <Text style={[styles.title, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('howCanWeHelp')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily }]}>
            {t('supportHoursDesc') || "Our support team is available from 9:00 AM to 6:00 PM (IST) to assist you."}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={[styles.optionCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: colors.border }]}
            onPress={handleCall}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <Phone size={24} color="#2563EB" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('callSupport')}</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground, fontFamily }]}>{t('speakDirectly')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: colors.border }]}
            onPress={handleEmail}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Mail size={24} color="#EF4444" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('emailUs')}</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground, fontFamily }]}>{t('sendQueries')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: colors.border }]}
            onPress={handleWhatsApp}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <MessageCircle size={24} color="#16A34A" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('whatsappChat')}</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground, fontFamily }]}>{t('messageSupportLine')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBox, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('faqTitle')}</Text>
          
          <View style={styles.faqItem}>
            <Text style={[styles.faqQuestion, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('faqQ1')}</Text>
            <Text style={[styles.faqAnswer, { color: colors.mutedForeground, fontFamily }]}>{t('faqA1')}</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={[styles.faqQuestion, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('faqQ2')}</Text>
            <Text style={[styles.faqAnswer, { color: colors.mutedForeground, fontFamily }]}>{t('faqA2')}</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={[styles.faqQuestion, { color: colors.foreground, fontFamily: fontFamilyBold }]}>{t('faqQ3')}</Text>
            <Text style={[styles.faqAnswer, { color: colors.mutedForeground, fontFamily }]}>{t('faqA3')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : spacing.lg,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
  },
  content: {
    padding: spacing.xl,
  },
  introBox: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing['3xl'],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.base,
  },
  optionSub: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  infoBox: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  infoTitle: {
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
  },
  faqItem: {
    marginBottom: spacing.lg,
  },
  faqQuestion: {
    fontSize: fontSize.sm,
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
});

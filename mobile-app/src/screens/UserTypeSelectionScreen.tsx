import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, useColorScheme, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Truck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';

const logo = require('../../assets/logo.png');
const { width } = Dimensions.get('window');

export default function UserTypeSelectionScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [isSelecting, setIsSelecting] = useState(false);
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  
  const styles = React.useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const handleSelect = async (type: 'customer' | 'milkman') => {
    if (isSelecting) return;
    setIsSelecting(true);
    try {
      const res = await apiRequest({
        url: '/api/auth/user-type',
        method: 'PUT',
        body: { userType: type },
      });
      const response = await res.json();
      if (response.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        // The web app navigates to different setup screens
        if (type === 'customer') {
          navigation.replace('CustomerProfileSetup');
        } else {
          navigation.replace('MilkmanProfileSetup');
        }
      } else {
        Alert.alert(t('error'), response.message || t('failedUserType'));
      }
    } catch (e: any) {
      Alert.alert(t('error'), e.message || t('failedUserType'));
    } finally {
      setIsSelecting(false);
    }
  };

  const customerFeatures = [
    t('custFeature1'),
    t('custFeature2'),
    t('custFeature3'),
    t('custFeature4'),
  ];

  const milkmanFeatures = [
    t('milkFeature1'),
    t('milkFeature2'),
    t('milkFeature3'),
    t('milkFeature4'),
  ];

  const maxContentWidth = Math.min(width - spacing.xl * 2, 800);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: maxContentWidth }}>
            
            {/* Logo Badge */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <Image source={logo} style={styles.logoImage} resizeMode="contain" />
              </View>
            </View>

            {/* Title Display */}
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t('welcome')}{' '}
                <Text style={styles.titleBrandGradient}>
                  DOOODHWALA
                </Text>
                {t('welcomeSuffix')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {t('chooseType')}
              </Text>
            </View>

            {/* Cards Grid */}
            <View style={styles.cardsGrid}>
              {/* Customer Card */}
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => handleSelect('customer')}
                disabled={isSelecting}
                activeOpacity={0.9}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#3B82F6', '#A855F7', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBox}
                  >
                    <Users size={48} color="#FFFFFF" strokeWidth={1.5} />
                  </LinearGradient>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('imCustomer')}</Text>
                </View>

                <View style={styles.cardContent}>
                  <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
                    {t('orderFresh')}
                  </Text>

                  <View style={styles.featuresList}>
                    {customerFeatures.map((feature, i) => (
                      <View key={i} style={styles.featureRow}>
                        <View style={[styles.featureDot, { backgroundColor: '#3B82F6' }]} />
                        <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.foreground }]}
                    onPress={() => handleSelect('customer')}
                    disabled={isSelecting}
                    activeOpacity={0.8}
                  >
                    {isSelecting ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={[styles.buttonText, { color: colors.background }]}>{t('continueCustomer')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Milkman Card */}
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => handleSelect('milkman')}
                disabled={isSelecting}
                activeOpacity={0.9}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#F97316', '#EF4444', '#EAB308']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBox}
                  >
                    <Truck size={48} color="#FFFFFF" strokeWidth={1.5} />
                  </LinearGradient>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('imMilkman')}</Text>
                </View>

                <View style={styles.cardContent}>
                  <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
                    {t('sellFresh')}
                  </Text>

                  <View style={styles.featuresList}>
                    {milkmanFeatures.map((feature, i) => (
                      <View key={i} style={styles.featureRow}>
                        <View style={[styles.featureDot, { backgroundColor: '#16A34A' }]} />
                        <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.foreground }]}
                    onPress={() => handleSelect('milkman')}
                    disabled={isSelecting}
                    activeOpacity={0.8}
                  >
                    {isSelecting ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={[styles.buttonText, { color: colors.background }]}>{t('continueMilkman')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 64, // py-16
    paddingHorizontal: spacing.lg,
  },
  
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 64, // mb-16
  },
  logoBadge: {
    width: 160,    // w-40
    height: 160,   // h-40
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32, // mb-8
  },
  logoImage: {
    width: 112,    // w-28
    height: 112,   // h-28
  },

  // Title
  titleContainer: {
    alignItems: 'center',
    marginBottom: 64, // mb-16
  },
  title: {
    fontSize: 42, // text-5xl approximate
    fontWeight: '700', // font-bold
    textAlign: 'center',
    marginBottom: 24, // mb-6
    lineHeight: 48,
    fontFamily: fontFamilyBold,
  },
  titleBrandGradient: {
    color: '#0EA5E9', // Fallback for gradient text since MaskedView isn't available
    fontFamily: fontFamilyBold,
  },
  subtitle: {
    fontSize: 18, // text-lg
    textAlign: 'center',
    lineHeight: 28, // leading-relaxed
    maxWidth: '100%',
    paddingHorizontal: 20,
    fontFamily,
  },

  // Cards layout
  cardsGrid: {
    flexDirection: 'column',
    gap: 40, // gap-10
    width: '100%',
  },

  // Card
  card: {
    borderRadius: 16, // rounded-2xl roughly
    borderWidth: 1,
    paddingTop: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24, // pb-6
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 112,  // w-28
    height: 112, // h-28
    borderRadius: 24, // rounded-2xl
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24, // mb-6
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 30, // text-3xl
    fontWeight: '600', // font-semibold
    textAlign: 'center',
    fontFamily: fontFamilyBold,
  },
  cardContent: {
    padding: 24, // p-6
    paddingTop: 0,
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 18, // text-lg
    textAlign: 'center',
    marginBottom: 32, // mb-8
    lineHeight: 28, // leading-relaxed
    fontFamily,
  },

  // Features list
  featuresList: {
    width: '100%',
    marginBottom: 32, // mb-8
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12, // space-y-3
    paddingLeft: spacing.sm,
  },
  featureDot: {
    width: 8, // w-2
    height: 8, // h-2
    borderRadius: 4, // rounded-full
    marginRight: 12, // mr-3
  },
  featureText: {
    fontSize: 17, // Web matches index.css responsive-text-base (17px)
    flexShrink: 1,
    fontFamily,
  },

  // Button
  button: {
    width: '100%',
    paddingVertical: 14, // py-3 approximate
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600', // font-semibold
    fontFamily: fontFamilyBold,
  },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Truck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../theme';

const logo = require('../../assets/logo.png');

export default function UserTypeSelectionScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [isSelecting, setIsSelecting] = useState(false);

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
        if (type === 'customer') {
          navigation.replace('CustomerProfileSetup');
        } else {
          navigation.replace('MilkmanProfileSetup');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to update user type');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update user type.');
    } finally {
      setIsSelecting(false);
    }
  };

  const customerFeatures = [
    'Browse available milkmen in your area',
    'Place daily orders with ease',
    'Track deliveries in real-time',
    'Monthly billing and payment',
  ];

  const milkmanFeatures = [
    'Manage daily delivery routes',
    'Track orders and customer requests',
    'Update availability status',
    'Build customer relationships',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Welcome to{' '}
          <Text style={styles.titleBrandGradient}>
            DOOODHWALA
          </Text>
          , there!
        </Text>
        <Text style={styles.subtitle}>
          Choose how you'd like to use DOOODHWALA today
        </Text>

        {/* Customer Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleSelect('customer')}
          disabled={isSelecting}
          activeOpacity={0.9}
        >
          {/* Blue to Pink Gradient matches web: from-blue-500 via-purple-500 to-pink-500 */}
          <LinearGradient
            colors={['#3B82F6', '#A855F7', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Users size={48} color={colors.white} />
          </LinearGradient>

          <Text style={styles.cardTitle}>I'm a Customer</Text>
          <Text style={styles.cardDescription}>
            Order fresh milk from local milkmen
          </Text>

          {customerFeatures.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: colors.brandPrimary }]} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.button, styles.customerButton]}
            onPress={() => handleSelect('customer')}
            disabled={isSelecting}
            activeOpacity={0.8}
          >
            {isSelecting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue as Customer</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Milkman Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleSelect('milkman')}
          disabled={isSelecting}
          activeOpacity={0.9}
        >
          {/* Orange to Yellow Gradient matches web: from-orange-500 via-red-500 to-yellow-500 */}
          <LinearGradient
            colors={['#F97316', '#EF4444', '#EAB308']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Truck size={48} color={colors.white} />
          </LinearGradient>

          <Text style={styles.cardTitle}>I'm a Milkman</Text>
          <Text style={styles.cardDescription}>
            Sell fresh milk to customers
          </Text>

          {milkmanFeatures.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: colors.brandSecondary }]} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.button, styles.milkmanButton]}
            onPress={() => handleSelect('milkman')}
            disabled={isSelecting}
            activeOpacity={0.8}
          >
            {isSelecting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue as Milkman</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DBEAFE', // web uses bg-blue-100
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 84,
    height: 84,
  },

  // Title
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  titleBrandGradient: {
    color: '#0891B2', // Simulated gradient stop color for text since RN text gradient is complex
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: fontSize.lg * 1.5,
  },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },

  // Icon Boxes
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },

  // Card content
  cardTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: fontSize.lg,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: fontSize.lg * 1.5,
  },

  // Features
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    flex: 1,
  },

  // Buttons
  button: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.md,
  },
  customerButton: {
    backgroundColor: colors.foreground, // Web app uses black/dark mode modern-button
  },
  milkmanButton: {
    backgroundColor: colors.foreground, // Web app uses black/dark mode modern-button
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

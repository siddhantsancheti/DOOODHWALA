import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, Star, MapPin, Receipt, User, Bell
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function CustomerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  if (profileLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar Header */}
      <View style={styles.topNav}>
        <Text style={styles.logoText}>DOOODHWALA</Text>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <User size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome Dashboard Header Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeTitle}>
                Welcome back, <Text style={styles.gradientText}>{profile?.name || 'Valued Customer'}</Text>!
              </Text>
              <Text style={styles.welcomeSub}>Manage your daily milk orders and track deliveries</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.newOrderBtn} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Order')}
          >
            <Plus size={20} color={colors.white} />
            <Text style={styles.newOrderText}>New Order</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Cards List */}
        <View style={styles.featuresList}>
          {/* Your Dairyman Card */}
          <TouchableOpacity 
            style={styles.featureCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('YDPage')}
          >
            <LinearGradient colors={['#F3E8FF', '#E9D5FF']} style={styles.iconBox}>
              <Star size={24} color="#9333EA" fill="#9333EA" />
            </LinearGradient>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Your Dairyman</Text>
              <Text style={styles.featureSub}>Manage YD settings</Text>
            </View>
          </TouchableOpacity>

          {/* Track Delivery Card */}
          <TouchableOpacity 
            style={styles.featureCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Tracking')}
          >
            <LinearGradient colors={['#DCFCE7', '#BBF7D0']} style={styles.iconBox}>
              <MapPin size={24} color="#16A34A" />
            </LinearGradient>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Track Delivery</Text>
              <Text style={styles.featureSub}>See live location</Text>
            </View>
          </TouchableOpacity>

          {/* Orders Card */}
          <TouchableOpacity 
            style={styles.featureCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ViewOrders')}
          >
            <LinearGradient colors={['#FFEDD5', '#FED7AA']} style={styles.iconBox}>
              <Receipt size={24} color="#EA580C" />
            </LinearGradient>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Orders</Text>
              <Text style={styles.featureSub}>Order history</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Mobile Nav Bar Placeholder */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => {}}>
          <MapPin size={24} color={colors.primary} />
          <Text style={[styles.bottomNavText, { color: colors.primary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('ViewOrders')}>
          <Receipt size={24} color={colors.gray500} />
          <Text style={styles.bottomNavText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Profile')}>
          <User size={24} color={colors.gray500} />
          <Text style={styles.bottomNavText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' }, // Light gray background
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  // Top Nav
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logoText: { fontSize: fontSize.xl, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },
  navActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.gray100
  },

  container: { flex: 1, padding: spacing.xl },

  // Welcome Card
  welcomeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.md,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: spacing.xs,
    lineHeight: 32,
  },
  gradientText: {
    color: colors.primary,
  },
  welcomeSub: {
    fontSize: fontSize.base,
    color: '#64748B',
    lineHeight: 22,
  },
  newOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  newOrderText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  // Feature Cards List
  featuresList: { gap: spacing.md },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  featureTextContainer: { flex: 1 },
  featureTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: fontSize.sm,
    color: '#64748B',
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md, 
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  bottomNavText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    color: colors.gray500,
  }
});

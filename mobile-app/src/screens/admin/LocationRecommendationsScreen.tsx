import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Truck, Star, Clock, ArrowLeft, Users, CheckCircle, XCircle } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

const ADMIN_DARK = '#1E293B';

function extractCity(address: string): string {
  if (!address) return 'Unknown';
  const parts = address.split(',').map(p => p.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || 'Unknown';
}

export default function LocationRecommendationsScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const { data: milkmen, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/milkmen'], refetchOnMount: true,
  });

  const onRefresh = () => {
    setRefreshing(true);
    refetch().then(() => setRefreshing(false));
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const milkmanList = Array.isArray(milkmen) ? milkmen : [];

  // Group milkmen by city
  const groupedByCity: Record<string, any[]> = {};
  milkmanList.forEach((m: any) => {
    const city = extractCity(m.address);
    if (!groupedByCity[city]) groupedByCity[city] = [];
    groupedByCity[city].push(m);
  });

  const cityEntries = Object.entries(groupedByCity).sort((a, b) => b[1].length - a[1].length);
  const totalActive = milkmanList.filter((m: any) => m.isAvailable).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Location Coverage</Text>
          <Text style={styles.headerSub}>Milkman Service Areas</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Coverage summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{milkmanList.length}</Text>
              <Text style={styles.summaryLabel}>Total Milkmen</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{cityEntries.length}</Text>
              <Text style={styles.summaryLabel}>Cities Covered</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{totalActive}</Text>
              <Text style={styles.summaryLabel}>Currently Active</Text>
            </View>
          </View>
        </View>

        {milkmanList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No milkmen registered</Text>
            <Text style={styles.emptySubtitle}>Coverage data will appear once milkmen sign up.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Coverage by City</Text>
            {cityEntries.map(([city, cityMilkmen]) => {
              const isExpanded = expandedCity === city;
              const activeCount = cityMilkmen.filter((m: any) => m.isAvailable).length;

              return (
                <View key={city} style={styles.cityCard}>
                  <TouchableOpacity
                    style={styles.cityHeader}
                    onPress={() => setExpandedCity(isExpanded ? null : city)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.cityIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <MapPin size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{city}</Text>
                      <Text style={styles.citySub}>
                        {cityMilkmen.length} milkman{cityMilkmen.length !== 1 ? 'men' : ''} • {activeCount} active
                      </Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: activeCount > 0 ? colors.successLight : '#F3F4F6' }]}>
                      <Text style={[styles.countBadgeText, { color: activeCount > 0 ? colors.success : colors.mutedForeground }]}>
                        {cityMilkmen.length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.milkmanList}>
                      {cityMilkmen.map((m: any, idx: number) => (
                        <View
                          key={m.id || idx}
                          style={[
                            styles.milkmanRow,
                            idx < cityMilkmen.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                          ]}
                        >
                          <View style={[styles.availDot, { backgroundColor: m.isAvailable ? colors.success : colors.gray400 }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.milkmanName}>{m.businessName || m.contactName || 'Unknown'}</Text>
                            <Text style={styles.milkmanAddress} numberOfLines={1}>{m.address || 'No address'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            {m.pricePerLiter && (
                              <Text style={styles.price}>₹{m.pricePerLiter}/L</Text>
                            )}
                            {m.rating > 0 && (
                              <View style={styles.ratingRow}>
                                <Star size={10} color="#EAB308" fill="#EAB308" />
                                <Text style={styles.ratingText}>{m.rating}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ADMIN_DARK },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    backgroundColor: ADMIN_DARK, padding: spacing.xl, paddingTop: spacing['3xl'],
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  headerSub: { fontSize: fontSize.sm, color: colors.gray400, marginTop: 2 },
  content: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  summaryCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    padding: spacing.xl, marginBottom: spacing.lg, ...shadows.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground },
  summaryLabel: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.md },
  cityCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    marginBottom: spacing.md, ...shadows.sm, overflow: 'hidden',
  },
  cityHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
  },
  cityIconBox: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  cityName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.foreground },
  citySub: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  countBadgeText: { fontSize: 13, fontWeight: fontWeight.bold },
  milkmanList: { borderTopWidth: 1, borderTopColor: colors.border },
  milkmanRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  milkmanName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.foreground },
  milkmanAddress: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  price: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground, marginTop: 16 },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: 'center', marginTop: 8 },
});

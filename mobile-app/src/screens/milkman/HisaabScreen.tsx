import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight, Info, Receipt } from 'lucide-react-native';
import { apiRequest } from '../../lib/queryClient';
import { useTranslation } from '../../contexts/LanguageContext';

interface CustomerBill {
  customerId: number;
  customerName: string;
  pending: number;
  paid: number;
}

interface Hisaab {
  grossRevenue: number;
  commissionPercent: number;
  commissionAmount: number;
  netRevenue: number;
  commissionSet: boolean;
  totalPending: number;
  customerBills: CustomerBill[];
}

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/**
 * Hisaab: what the milkman actually takes home. Gross from delivered orders,
 * the platform's cut at the rate an admin set for this milkman, and the net —
 * shown as a subtraction so the deduction is never a surprise.
 */
export default function HisaabScreen({ navigation, route }: any) {
  const milkmanId = route?.params?.milkmanId;
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );

  const { data, isLoading, refetch, isRefetching } = useQuery<Hisaab>({
    queryKey: ['/api/milkmen/hisaab'],
    queryFn: async () => {
      const res = await apiRequest({ url: '/api/milkmen/hisaab', method: 'GET' });
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('hisaab')}</Text>
      </View>

      <FlatList
        data={data.customerBills}
        keyExtractor={(item) => String(item.customerId)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.earningCard}
            >
              <Text style={styles.earningLabel} numberOfLines={1}>{t('yourEarnings')}</Text>
              <Text
                style={styles.earningValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {money(data.netRevenue)}
              </Text>

              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel} numberOfLines={1}>{t('grossRevenue')}</Text>
                  <Text style={styles.breakdownValue}>{money(data.grossRevenue)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel} numberOfLines={1}>
                    {t('platformFee')} ({data.commissionPercent}%)
                  </Text>
                  <Text style={styles.breakdownValue}>− {money(data.commissionAmount)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, styles.netLabel]} numberOfLines={1}>{t('netEarnings')}</Text>
                  <Text style={[styles.breakdownValue, styles.netValue]}>{money(data.netRevenue)}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* An unset rate means the numbers above are gross, not take-home.
                Say so rather than letting a 0% deduction read as "no fee". */}
            {!data.commissionSet && (
              <View style={styles.notice}>
                <Info size={15} color="#CA8A04" />
                <Text style={styles.noticeText}>{t('commissionNotSet')}</Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>{t('customerBills')}</Text>
              {data.totalPending > 0 && (
                <Text style={styles.sectionPending} numberOfLines={1}>
                  {money(data.totalPending)} {t('pendingLabel').toLowerCase()}
                </Text>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.billRow}
            onPress={() => navigation.navigate('Chat', { customerId: item.customerId, milkmanId })}
            activeOpacity={0.7}
          >
            <View style={styles.billText}>
              <Text style={styles.billName} numberOfLines={1}>{item.customerName}</Text>
              {item.paid > 0 && (
                <Text style={styles.billPaid} numberOfLines={1}>
                  {money(item.paid)} {t('paidLabel').toLowerCase()}
                </Text>
              )}
            </View>
            <Text
              style={[styles.billAmount, item.pending > 0 ? styles.billDue : styles.billClear]}
              numberOfLines={1}
            >
              {item.pending > 0 ? money(item.pending) : t('settled')}
            </Text>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Receipt size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>{t('noBillsYet')}</Text>
            <Text style={styles.emptyBody}>{t('billsAppearHere')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { flex: 1, minWidth: 0, fontSize: 20, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },

    listContent: { paddingHorizontal: 16, paddingBottom: 32 },

    earningCard: { borderRadius: 20, padding: 20, marginBottom: 12 },
    earningLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily },
    earningValue: { fontSize: 40, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '700', marginTop: 2 },

    breakdown: {
      marginTop: 16, padding: 12, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.15)', gap: 8,
    },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    breakdownLabel: { flex: 1, minWidth: 0, fontSize: 13, color: 'rgba(255,255,255,0.9)', fontFamily },
    breakdownValue: { fontSize: 13, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '600' },
    breakdownDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
    netLabel: { fontSize: 14 },
    netValue: { fontSize: 15 },

    notice: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, borderRadius: 12, marginBottom: 12,
      backgroundColor: isDark ? 'rgba(234,179,8,0.12)' : '#FEF9C3',
      borderWidth: 1, borderColor: isDark ? 'rgba(234,179,8,0.35)' : '#FDE68A',
    },
    noticeText: { flex: 1, fontSize: 12, color: isDark ? '#FDE68A' : '#854D0E', fontFamily, lineHeight: 17 },

    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginTop: 8, marginBottom: 4,
    },
    sectionTitle: { flex: 1, minWidth: 0, fontSize: 16, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    sectionPending: { fontSize: 12, color: '#DC2626', fontFamily: fontFamilyBold, fontWeight: '600' },

    billRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    billText: { flex: 1, minWidth: 0 },
    billName: { fontSize: 15, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '600' },
    billPaid: { fontSize: 12, color: colors.mutedForeground, fontFamily, marginTop: 1 },
    billAmount: { fontSize: 15, fontFamily: fontFamilyBold, fontWeight: '700' },
    billDue: { color: '#DC2626' },
    billClear: { color: '#16A34A', fontSize: 13 },

    empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily, textAlign: 'center', lineHeight: 20 },
  });

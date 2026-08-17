import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package } from 'lucide-react-native';
import { apiRequest } from '../../lib/queryClient';
import { useTranslation } from '../../contexts/LanguageContext';

interface ProductTotal {
  product: string;
  quantity: number;
  amount: number;
  orders: number;
}

interface Summary {
  products: ProductTotal[];
  totalOrders: number;
  totalAmount: number;
}

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * What has actually been delivered, totalled per product. Built from the
 * delivered order messages, so it always agrees with the delivery run.
 */
export default function OrdersSummaryScreen({ navigation }: any) {
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );

  const { data, isLoading, refetch, isRefetching } = useQuery<Summary>({
    queryKey: ['/api/milkmen/delivered-summary'],
    queryFn: async () => {
      const res = await apiRequest({ url: '/api/milkmen/delivered-summary', method: 'GET' });
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
        <Text style={styles.headerTitle} numberOfLines={1}>{t('orders')}</Text>
      </View>

      <FlatList
        data={data.products}
        keyExtractor={(item) => item.product}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.totalCard}>
            <View style={styles.totalCol}>
              <Text style={styles.totalLabel} numberOfLines={1}>{t('totalDelivered')}</Text>
              <Text
                style={styles.totalValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {money(data.totalAmount)}
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalCol}>
              <Text style={styles.totalLabel} numberOfLines={1}>{t('ordersLabel')}</Text>
              <Text style={styles.totalValue} numberOfLines={1}>{data.totalOrders}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Package size={18} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.product} numberOfLines={1}>{item.product}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {qty(item.quantity)} · {item.orders} {t('ordersLabel').toLowerCase()}
              </Text>
            </View>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {money(item.amount)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>{t('nothingDeliveredYet')}</Text>
            <Text style={styles.emptyBody}>{t('deliveredAppearHere')}</Text>
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

    totalCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      padding: 16, marginBottom: 16,
    },
    totalCol: { flex: 1, minWidth: 0 },
    totalDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: 16 },
    totalLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily },
    totalValue: { fontSize: 26, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700', marginTop: 2 },

    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : '#E4EAF3',
      justifyContent: 'center', alignItems: 'center',
    },
    rowText: { flex: 1, minWidth: 0 },
    product: { fontSize: 15, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '600' },
    meta: { fontSize: 12, color: colors.mutedForeground, fontFamily, marginTop: 1 },
    amount: { fontSize: 15, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700', maxWidth: 110 },

    empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily, textAlign: 'center', lineHeight: 20 },
  });

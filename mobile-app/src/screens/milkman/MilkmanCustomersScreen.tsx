import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, MapPin, MessageSquare, Search, Users, X } from 'lucide-react-native';
import { apiRequest } from '../../lib/queryClient';
import { useTranslation } from '../../contexts/LanguageContext';

interface Household {
  chatId: number;
  name: string;
  memberCount: number;
  primaryCustomerId: number | null;
  address: string | null;
  phone: string | null;
}

/**
 * The milkman's chat list: every customer assigned to them, tap to open the
 * conversation. This is the milkman side of the same chat the customer orders
 * from, so it is the entry point to the whole ordering relationship.
 */
export default function MilkmanCustomersScreen({ navigation, route }: any) {
  const milkmanId = route?.params?.milkmanId;
  const [query, setQuery] = useState('');
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );

  // Households, not people: a family of four is one row, because that is one
  // door, one bill and one delivery. See docs/HOUSEHOLD_MODEL.md.
  const { data: customers = [], isLoading, refetch, isRefetching } = useQuery<Household[]>({
    queryKey: ['/api/milkmen/households'],
    queryFn: async () => {
      const res = await apiRequest({ url: '/api/milkmen/households', method: 'GET' });
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      (c.name || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q));
  }, [customers, query]);

  const initial = (name: string | null) => (name || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('myCustomers')}</Text>
        <Text style={styles.headerCount}>{customers.length}</Text>
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchCustomers')}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.chatId)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => item.primaryCustomerId && navigation.navigate('Chat', {
              customerId: item.primaryCustomerId,
              milkmanId,
              familyChatId: item.chatId,
            })}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial(item.name)}</Text>
            </View>

            {/* minWidth:0 lets the name ellipsize instead of shoving the
                chevron off the row. */}
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>{item.name || t('customer')}</Text>
              {item.memberCount > 1 && (
                <Text style={styles.memberCount} numberOfLines={1}>
                  {item.memberCount} {t('members')}
                </Text>
              )}
              {!!item.address && (
                <View style={styles.addressRow}>
                  <MapPin size={11} color={colors.mutedForeground} />
                  <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
                </View>
              )}
            </View>

            <MessageSquare size={18} color={colors.primary} />
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Users size={36} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>
                {query ? t('noMatch') : t('noCustomersYet')}
              </Text>
              {!query && <Text style={styles.emptyBody}>{t('customersAppearHere')}</Text>}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { flex: 1, minWidth: 0, fontSize: 20, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    headerCount: { fontSize: 14, color: colors.mutedForeground, fontFamily },

    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, height: 42,
      borderRadius: 10, backgroundColor: colors.surfaceSecondary || (isDark ? '#332C25' : '#F0E9DE'),
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily, padding: 0 },

    listContent: { paddingHorizontal: 16, paddingBottom: 32 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    avatar: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: isDark ? 'rgba(37,99,235,0.25)' : '#E4EAF3',
      justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 18, color: colors.primary, fontFamily: fontFamilyBold, fontWeight: '700' },
    rowText: { flex: 1, minWidth: 0 },
    name: { fontSize: 16, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '600' },
    memberCount: { fontSize: 11, color: colors.primary, fontFamily, marginTop: 1 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    address: { flex: 1, fontSize: 12, color: colors.mutedForeground, fontFamily },

    empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily, textAlign: 'center', lineHeight: 20 },
  });

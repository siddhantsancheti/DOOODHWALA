import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Check, CheckCheck, MapPin, MessageSquare, Navigation, Package,
} from 'lucide-react-native';
import { apiRequest } from '../../lib/queryClient';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTranslation } from '../../contexts/LanguageContext';
import { spacing, borderRadius } from '../../theme';

interface OrderMessage {
  id: number;
  customerId: number | null;
  customerName: string | null;
  customerAddress: string | null;
  message: string;
  orderQuantity: string | null;
  orderProduct: string | null;
  orderTotal: string | null;
  orderItems: any;
  isAccepted: boolean | null;
  isDelivered: boolean | null;
  createdAt: string;
}

/**
 * The delivery run: every order placed in chat today, with accept and
 * delivered in reach. Both actions post to the same chat-message endpoints the
 * chat screen uses, so the customer sees their ticks advance in the
 * conversation where they placed the order — one source of truth, not two.
 */
export default function DeliveryRunScreen({ navigation, route }: any) {
  const milkmanId = route?.params?.milkmanId;
  const isBroadcasting = !!route?.params?.isBroadcasting;
  const queryClient = useQueryClient();
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );

  const { data: orderMessages = [], isLoading, refetch, isRefetching } = useQuery<OrderMessage[]>({
    queryKey: ['/api/chat/orders'],
    queryFn: async () => {
      const res = await apiRequest({ url: '/api/chat/orders', method: 'GET' });
      return res.json();
    },
  });

  // The same events that drive the ticks in chat refresh this list, so an
  // order accepted from the conversation updates here too.
  const { addMessageHandler, removeMessageHandler } = useWebSocket();
  useEffect(() => {
    const handler = (data: any) => {
      if (data?.type === 'order_accepted' || data?.type === 'order_delivered'
        || data?.type === 'new_message' || data?.type === 'new_order') {
        queryClient.invalidateQueries({ queryKey: ['/api/chat/orders'] });
      }
    };
    addMessageHandler('delivery-run', handler);
    return () => removeMessageHandler('delivery-run');
  }, [addMessageHandler, removeMessageHandler, queryClient]);

  const mark = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'accepted' | 'delivered' }) => {
      const res = await apiRequest({ url: `/api/chat/messages/${id}/${action}`, method: 'POST' });
      return res.json();
    },
    // Optimistic: the button state flips immediately and rolls back on failure,
    // because a milkman at a doorstep should not wait on a round trip.
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/chat/orders'] });
      const previous = queryClient.getQueryData<OrderMessage[]>(['/api/chat/orders']);
      queryClient.setQueryData<OrderMessage[]>(['/api/chat/orders'], (old) =>
        (old || []).map((m) => m.id === id
          ? { ...m, isAccepted: true, isDelivered: action === 'delivered' ? true : m.isDelivered }
          : m),
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['/api/chat/orders'], context.previous);
      Alert.alert(t('error'), 'Could not update the order. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/milkman'] });
    },
  });

  const summarise = (m: OrderMessage) => {
    const items = Array.isArray(m.orderItems) ? m.orderItems : [];
    if (items.length) {
      return items.map((i: any) => `${i.quantity} × ${i.name || i.productName || 'item'}`).join(', ');
    }
    if (m.orderQuantity) {
      return `${m.orderQuantity} L${m.orderProduct ? ` · ${m.orderProduct}` : ''}`;
    }
    return m.message;
  };

  const pending = orderMessages.filter((m) => !m.isDelivered).length;

  const renderOrder = ({ item }: { item: OrderMessage }) => {
    const delivered = !!item.isDelivered;
    const accepted = !!item.isAccepted;
    const busy = mark.isPending && mark.variables?.id === item.id;

    return (
      <View style={[styles.card, delivered && styles.cardDone]}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => item.customerId && navigation.navigate('Chat', {
            customerId: item.customerId,
            milkmanId,
          })}
          activeOpacity={0.7}
        >
          <View style={styles.orderNoRow}>
            <Text style={styles.orderNo} numberOfLines={1}>#{item.id}</Text>
            {delivered ? (
              <View style={styles.ticks}>
                <Check size={11} color="#16A34A" />
                <Check size={11} color="#16A34A" style={{ marginLeft: -5 }} />
                <Check size={11} color="#16A34A" style={{ marginLeft: -5 }} />
              </View>
            ) : accepted ? (
              <CheckCheck size={13} color={colors.primary} />
            ) : null}
          </View>

          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName || t('customer')}
          </Text>
          <Text style={styles.orderSummary} numberOfLines={1}>{summarise(item)}</Text>

          {!!item.customerAddress && (
            <View style={styles.addressRow}>
              <MapPin size={11} color={colors.mutedForeground} />
              <Text style={styles.address} numberOfLines={1}>{item.customerAddress}</Text>
            </View>
          )}

          <View style={styles.chatHint}>
            <MessageSquare size={11} color={colors.primary} />
            <Text style={styles.chatHintText} numberOfLines={1}>{t('openChat')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.acceptBtn, (accepted || delivered) && styles.btnDone]}
            onPress={() => mark.mutate({ id: item.id, action: 'accepted' })}
            disabled={accepted || delivered || busy}
            activeOpacity={0.85}
          >
            {busy && !accepted ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[styles.acceptText, (accepted || delivered) && styles.btnDoneText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {accepted || delivered ? t('accepted') : t('accept')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deliverBtn, delivered && styles.deliverBtnDone]}
            onPress={() => mark.mutate({ id: item.id, action: 'delivered' })}
            disabled={delivered || busy}
            activeOpacity={0.85}
          >
            {busy && accepted ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={styles.deliverText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {delivered ? t('deliveredLabel') : t('markDelivered')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={orderMessages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => navigation.goBack()}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={colors.foreground} />
              <Text style={styles.backText}>{t('back')}</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={isBroadcasting ? ['#16A34A', '#15803D'] : ['#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroTitle} numberOfLines={2}>{t('deliveryStarted')}</Text>
              <Text style={styles.heroSub} numberOfLines={2}>
                {pending > 0
                  ? `${pending} ${t('ordersToDeliver')}`
                  : t('allCaughtUp')}
              </Text>

              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => navigation.navigate('MilkmanHome', { openMap: true })}
                activeOpacity={0.9}
              >
                <Navigation size={18} color="#2563EB" />
                <Text style={styles.mapBtnText} numberOfLines={1}>{t('routeMap')}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Package size={36} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>{t('noOrdersYet')}</Text>
              <Text style={styles.emptyBody}>{t('ordersAppearHere')}</Text>
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
    listContent: { padding: 16, paddingBottom: 40 },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    backText: { fontSize: 15, color: colors.foreground, fontFamily },

    hero: { borderRadius: 20, padding: 20, marginBottom: 16 },
    heroTitle: { fontSize: 22, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '700', lineHeight: 28 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily, marginTop: 4, marginBottom: 16 },
    mapBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      alignSelf: 'flex-start', backgroundColor: '#FFFFFF',
      paddingHorizontal: 16, height: 40, borderRadius: 12,
    },
    mapBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '700', fontFamily: fontFamilyBold },

    // Card: text column flexes, buttons keep a fixed width, so a long customer
    // name shortens itself instead of squeezing the actions off the row.
    card: {
      flexDirection: 'row', alignItems: 'stretch', gap: 10,
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1,
      borderColor: colors.border, padding: 12, marginBottom: 10,
    },
    cardDone: { opacity: 0.65 },
    cardMain: { flex: 1, minWidth: 0, justifyContent: 'center' },

    orderNoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    orderNo: { fontSize: 12, color: colors.mutedForeground, fontFamily: fontFamilyBold, fontWeight: '700' },
    ticks: { flexDirection: 'row' },
    customerName: { fontSize: 16, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    orderSummary: { fontSize: 13, color: colors.mutedForeground, fontFamily, marginTop: 1 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    address: { flex: 1, fontSize: 11, color: colors.mutedForeground, fontFamily },
    chatHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    chatHintText: { fontSize: 11, color: colors.primary, fontFamily: fontFamilyBold, fontWeight: '600' },

    actions: { justifyContent: 'center', gap: 8, width: 104 },
    acceptBtn: {
      height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary,
      justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
    },
    acceptText: { fontSize: 13, color: colors.primary, fontFamily: fontFamilyBold, fontWeight: '700' },
    btnDone: { borderColor: colors.border, backgroundColor: 'transparent' },
    btnDoneText: { color: colors.mutedForeground },
    deliverBtn: {
      height: 44, borderRadius: 10, backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
    },
    deliverBtnDone: { backgroundColor: '#16A34A' },
    deliverText: { fontSize: 13, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '700' },

    empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily, textAlign: 'center', lineHeight: 20 },
  });

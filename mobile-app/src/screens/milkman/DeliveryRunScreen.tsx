import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Check, CheckCheck, MapPin, MessageSquare, Package,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { apiRequest } from '../../lib/queryClient';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTranslation } from '../../contexts/LanguageContext';
import { spacing, borderRadius } from '../../theme';

interface OrderMessage {
  id: number;
  customerId: number | null;
  familyChatId: number | null;
  householdName: string | null;
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
interface Household {
  key: string;
  name: string;
  address: string | null;
  customerId: number | null;
  orders: OrderMessage[];
}

export default function DeliveryRunScreen({ navigation, route }: any) {
  const milkmanId = route?.params?.milkmanId;
  const queryClient = useQueryClient();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const locationSub = useRef<any>(null);
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

  // Starting the run *is* starting the broadcast — the customer's tracking
  // screen listens for these location updates, so it begins the moment the
  // milkman opens this screen and stops when they leave it.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('locationPermissionTitle'),
            t('locationPermissionBody'),
          );
          return;
        }
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 8000, distanceInterval: 8 },
          (loc) => {
            apiRequest({
              url: '/api/delivery/location',
              method: 'POST',
              body: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
            }).catch(() => {});
          },
        );
        if (cancelled) { sub.remove(); return; }
        locationSub.current = sub;
        setIsBroadcasting(true);

        // Nudge the first customer on the route to place their order; the rest
        // are nudged as the milkman's GPS reaches each previous stop.
        apiRequest({ url: '/api/delivery/start-route', method: 'POST' }).catch(() => {});
      } catch (e) {
        console.error('Could not start location broadcast', e);
      }
    })();

    return () => {
      cancelled = true;
      locationSub.current?.remove();
      locationSub.current = null;
    };
  }, []);

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

  // One card per door. A family orders as several messages but the milkman
  // makes one visit, so the household is the unit here — and the buttons act
  // on everything that door ordered, not one line at a time.
  const households = useMemo(() => {
    const byChat = new Map<string, Household>();
    for (const m of orderMessages) {
      // Messages predating household tagging fall back to their customer, so
      // nothing silently disappears from the run.
      const key = m.familyChatId != null ? `c${m.familyChatId}` : `u${m.customerId ?? 'unknown'}`;
      const existing = byChat.get(key);
      if (existing) {
        existing.orders.push(m);
      } else {
        byChat.set(key, {
          key,
          name: m.householdName || m.customerName || t('customer'),
          address: m.customerAddress,
          customerId: m.customerId,
          orders: [m],
        });
      }
    }
    return [...byChat.values()];
  }, [orderMessages, t]);

  const pending = households.filter((h) => h.orders.some((o) => !o.isDelivered)).length;

  const renderHousehold = ({ item }: { item: Household }) => {
    const undelivered = item.orders.filter((o) => !o.isDelivered);
    const unaccepted = item.orders.filter((o) => !o.isAccepted && !o.isDelivered);
    const allDelivered = undelivered.length === 0;
    const busy = mark.isPending && item.orders.some((o) => o.id === mark.variables?.id);

    return (
      <View style={[styles.card, allDelivered && styles.cardDone]}>
        <TouchableOpacity
          style={styles.householdHeader}
          onPress={() => item.customerId && navigation.navigate('Chat', {
            customerId: item.customerId,
            milkmanId,
          })}
          activeOpacity={0.7}
        >
          <View style={styles.cardMain}>
            <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
            {!!item.address && (
              <View style={styles.addressRow}>
                <MapPin size={11} color={colors.mutedForeground} />
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
              </View>
            )}
          </View>
          <MessageSquare size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* Every order at this door, each showing its own tick state — a
            family needs to see whose order was delivered. */}
        <View style={styles.orderLines}>
          {item.orders.map((order) => (
            <View key={order.id} style={styles.orderLine}>
              <Text style={styles.orderLineText} numberOfLines={1}>{summarise(order)}</Text>
              {order.isDelivered ? (
                <View style={styles.ticks}>
                  <Check size={11} color="#2F7D5B" />
                  <Check size={11} color="#2F7D5B" style={{ marginLeft: -5 }} />
                  <Check size={11} color="#2F7D5B" style={{ marginLeft: -5 }} />
                </View>
              ) : order.isAccepted ? (
                <CheckCheck size={13} color={colors.primary} />
              ) : (
                <Check size={12} color={colors.mutedForeground} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.householdActions}>
          <TouchableOpacity
            style={[styles.acceptBtn, styles.householdBtn, unaccepted.length === 0 && styles.btnDone]}
            onPress={() => unaccepted.forEach((o) => mark.mutate({ id: o.id, action: 'accepted' }))}
            disabled={unaccepted.length === 0 || busy}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.acceptText, unaccepted.length === 0 && styles.btnDoneText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {unaccepted.length === 0 ? t('accepted') : t('accept')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deliverBtn, styles.householdBtn, allDelivered && styles.deliverBtnDone]}
            onPress={() => undelivered.forEach((o) => mark.mutate({ id: o.id, action: 'delivered' }))}
            disabled={allDelivered || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={styles.deliverText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {allDelivered
                  ? t('deliveredLabel')
                  : undelivered.length > 1
                    ? `${t('markDelivered')} (${undelivered.length})`
                    : t('markDelivered')}
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
        data={households}
        keyExtractor={(item) => item.key}
        renderItem={renderHousehold}
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
              colors={isBroadcasting ? ['#2F7D5B', '#265F46'] : ['#22406E', '#162C4D']}
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

              <View style={styles.liveRow}>
                <View style={[styles.liveDot, !isBroadcasting && styles.liveDotOff]} />
                <Text style={styles.liveText} numberOfLines={2}>
                  {isBroadcasting ? t('customersCanTrack') : t('locationOff')}
                </Text>
              </View>
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
    liveRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
    liveDotOff: { backgroundColor: 'rgba(255,255,255,0.45)' },
    liveText: { flex: 1, fontSize: 12, color: '#FFFFFF', fontFamily },

    // Card: text column flexes, buttons keep a fixed width, so a long customer
    // name shortens itself instead of squeezing the actions off the row.
    card: {
      flexDirection: 'column',
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1,
      borderColor: colors.border, padding: 12, marginBottom: 10,
    },
    cardDone: { opacity: 0.65 },
    cardMain: { flex: 1, minWidth: 0, justifyContent: 'center' },

    // Household card: header, the door's orders, then actions for the whole door.
    householdHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    orderLines: {
      marginTop: 10, paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 6,
    },
    orderLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    orderLineText: { flex: 1, minWidth: 0, fontSize: 13, color: colors.mutedForeground, fontFamily },
    householdActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    householdBtn: { flex: 1, height: 44 },

    orderNoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    orderNo: { fontSize: 12, color: colors.mutedForeground, fontFamily: fontFamilyBold, fontWeight: '700' },
    ticks: { flexDirection: 'row' },
    customerName: { fontSize: 16, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    orderSummary: { fontSize: 13, color: colors.mutedForeground, fontFamily, marginTop: 1 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    address: { flex: 1, fontSize: 11, color: colors.mutedForeground, fontFamily },
    chatHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    chatHintText: { fontSize: 11, color: colors.primary, fontFamily: fontFamilyBold, fontWeight: '600' },

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
    deliverBtnDone: { backgroundColor: '#2F7D5B' },
    deliverText: { fontSize: 13, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '700' },

    empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily, textAlign: 'center', lineHeight: 20 },
  });

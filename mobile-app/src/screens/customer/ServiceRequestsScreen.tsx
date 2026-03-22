import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import {
  Clock, CheckCircle, XCircle, DollarSign, Headphones,
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function ServiceRequestsScreen() {
  const { user } = useAuth();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/service-requests/customer'], enabled: !!user,
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest({ url: `/api/service-requests/${requestId}/status`, method: 'PATCH', body: { status: 'accepted' } });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Quote accepted!');
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest({ url: `/api/service-requests/${requestId}/status`, method: 'PATCH', body: { status: 'rejected' } });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Quote rejected.');
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const getStatus = (status: string) => {
    switch (status) {
      case 'pending': return { bg: colors.warningLight, color: colors.warning, Icon: Clock };
      case 'quoted': return { bg: colors.infoLight, color: colors.info, Icon: DollarSign };
      case 'accepted': return { bg: colors.successLight, color: colors.success, Icon: CheckCircle };
      case 'rejected': return { bg: colors.errorLight, color: colors.destructive, Icon: XCircle };
      default: return { bg: colors.gray100, color: colors.gray500, Icon: Clock };
    }
  };

  const calculateTotal = (services: any[]) =>
    services.reduce((t, s) => t + parseFloat(s.quotedPrice || s.price || 0) * (s.requestedQuantity || 1), 0);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const requestList = Array.isArray(requests) ? requests : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Service Requests</Text>

        {requestList.length > 0 ? (
          requestList.map((req: any) => {
            const status = getStatus(req.status);
            const StatusIcon = status.Icon;
            return (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.reqId}>Request #{req.id}</Text>
                    <Text style={styles.reqDate}>
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <StatusIcon size={12} color={status.color} />
                    <Text style={[styles.badgeText, { color: status.color }]}>
                      {req.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Requested Services</Text>
                {req.services?.map((svc: any, idx: number) => (
                  <View key={idx} style={styles.serviceRow}>
                    <View>
                      <Text style={styles.svcName}>{svc.name}</Text>
                      <Text style={styles.svcQty}>Qty: {svc.quantity || svc.requestedQuantity || 1}</Text>
                    </View>
                    {svc.quotedPrice && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.svcPrice}>₹{svc.quotedPrice}/{svc.unit}</Text>
                        <Text style={styles.svcSubtotal}>
                          ₹{(parseFloat(svc.quotedPrice) * (svc.quantity || svc.requestedQuantity || 1)).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}

                {req.customerNotes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>Your Notes:</Text>
                    <Text style={styles.notesText}>{req.customerNotes}</Text>
                  </View>
                )}

                {req.milkmanNotes && (
                  <View style={[styles.notesBox, styles.milkmanNotesBox]}>
                    <Text style={[styles.notesTitle, { color: '#1E3A8A' }]}>Milkman's Response:</Text>
                    <Text style={styles.notesText}>{req.milkmanNotes}</Text>
                  </View>
                )}

                {req.status === 'quoted' && (
                  <View style={styles.quoteSection}>
                    <View style={styles.quoteRow}>
                      <Text style={styles.quoteTotalLabel}>Total Quote:</Text>
                      <Text style={styles.quoteTotalValue}>₹{calculateTotal(req.services).toFixed(2)}</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => acceptQuoteMutation.mutate(req.id)}
                        activeOpacity={0.8}
                      >
                        <CheckCircle size={16} color={colors.white} />
                        <Text style={styles.actionBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => rejectQuoteMutation.mutate(req.id)}
                        activeOpacity={0.8}
                      >
                        <XCircle size={16} color={colors.white} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Headphones size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No Service Requests</Text>
            <Text style={styles.emptyDesc}>You haven't made any service requests yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  pageTitle: {
    fontSize: fontSize['2xl'], fontWeight: fontWeight.bold,
    color: colors.foreground, marginBottom: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.lg, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingBottom: spacing.lg,
  },
  reqId: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  reqDate: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: 10, fontWeight: fontWeight.bold },

  // Services
  sectionLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold,
    color: colors.foreground, marginBottom: spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  svcName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.foreground },
  svcQty: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  svcPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.foreground },
  svcSubtotal: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },

  // Notes
  notesBox: {
    backgroundColor: colors.surfaceSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginTop: spacing.md,
    borderLeftWidth: 4, borderLeftColor: colors.gray300,
  },
  milkmanNotesBox: {
    backgroundColor: colors.infoLight, borderLeftColor: colors.primary,
  },
  notesTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.gray600, marginBottom: 4,
  },
  notesText: { fontSize: fontSize.sm, color: colors.foreground },

  // Quote
  quoteSection: {
    marginTop: spacing.lg, paddingTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  quoteRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  quoteTotalLabel: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  quoteTotalValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.success },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', height: 44,
    borderRadius: borderRadius.md, justifyContent: 'center',
    alignItems: 'center', gap: spacing.xs,
  },
  acceptBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.destructive },
  actionBtnText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground, marginTop: spacing.lg },
  emptyDesc: { fontSize: fontSize.base, color: colors.mutedForeground, marginTop: spacing.sm },
});

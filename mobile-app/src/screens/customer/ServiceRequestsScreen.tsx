import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import {
  Clock, CheckCircle, XCircle, DollarSign, ShoppingCart, ArrowLeft, Edit, Save, X, Plus, Minus,
} from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function ServiceRequestsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [editingRequest, setEditingRequest] = React.useState<number | null>(null);
  const [editData, setEditData] = React.useState<any>({});

  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/service-requests/customer'], enabled: !!user,
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest({ url: `/api/service-requests/${requestId}/status`, method: 'PATCH', body: { status: 'accepted' } });
    },
    onSuccess: () => {
      Alert.alert('Quote Accepted!', 'The milkman has been notified of your acceptance.');
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest({ url: `/api/service-requests/${requestId}/status`, method: 'PATCH', body: { status: 'rejected' } });
    },
    onSuccess: () => {
      Alert.alert('Quote Rejected', 'The milkman has been notified of your decision.');
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });
  
  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: number, data: any }) => {
      await apiRequest({ url: `/api/service-requests/${requestId}`, method: 'PATCH', body: data });
    },
    onSuccess: () => {
      Alert.alert('Request Updated!', 'Your service request has been updated successfully.');
      setEditingRequest(null);
      setEditData({});
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleEditRequest = (req: any) => {
    setEditingRequest(req.id);
    setEditData({
      services: req.services,
      customerNotes: req.customerNotes || '',
    });
  };

  const updateServiceQuantity = (idx: number, qty: number) => {
    const services = [...editData.services];
    services[idx] = { ...services[idx], quantity: Math.max(1, qty) };
    setEditData({ ...editData, services });
  };

  const removeService = (idx: number) => {
    const services = editData.services.filter((_: any, i: number) => i !== idx);
    setEditData({ ...editData, services });
  };

  const addService = () => {
    const services = [...editData.services, { name: '', unit: '', quantity: 1 }];
    setEditData({ ...editData, services });
  };

  const updateServiceDetails = (idx: number, field: string, val: string) => {
    const services = [...editData.services];
    services[idx] = { ...services[idx], [field]: val };
    setEditData({ ...editData, services });
  };

  const getStatus = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'Pending', bg: colors.gray100, color: colors.gray700, Icon: Clock };
      case 'quoted': return { text: 'Quote Received', bg: '#2563EB', color: colors.white, Icon: DollarSign };
      case 'accepted': return { text: 'Accepted', bg: '#16A34A', color: colors.white, Icon: CheckCircle };
      case 'rejected': return { text: 'Rejected', bg: '#DC2626', color: colors.white, Icon: XCircle };
      default: return { text: status, bg: colors.gray100, color: colors.gray700, Icon: Clock };
    }
  };

  const calculateTotal = (services: any[]) =>
    services.reduce((t, s) => t + parseFloat(s.quotedPrice || s.price || 0) * (s.requestedQuantity || s.quantity || 1), 0);

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowLeft size={16} color={colors.gray700} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Service Requests</Text>
            <Text style={styles.pageSubtitle}>Track your custom pricing requests</Text>
          </View>
        </View>

        {requestList.length > 0 ? (
          <View style={styles.contentArea}>
            {requestList.map((req: any) => {
              const status = getStatus(req.status);
              const StatusIcon = status.Icon;
              return (
                <View key={req.id} style={styles.card}>
                    <View style={styles.headerTitleRow}>
                      <View>
                        <Text style={styles.reqId}>Service Request #{req.id}</Text>
                        <Text style={styles.reqDate}>
                          Requested on {new Date(req.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.headerActions}>
                        <View style={[styles.badge, { backgroundColor: status.bg }]}>
                          <StatusIcon size={12} color={status.color} />
                          <Text style={[styles.badgeText, { color: status.color }]}>
                            {status.text}
                          </Text>
                        </View>
                        {req.status === 'pending' && editingRequest !== req.id && (
                          <TouchableOpacity style={styles.editBtn} onPress={() => handleEditRequest(req)}>
                            <Edit size={14} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                        {editingRequest === req.id && (
                          <View style={styles.editActions}>
                             <TouchableOpacity 
                               style={styles.saveBtn} 
                               onPress={() => updateRequestMutation.mutate({ requestId: req.id, data: editData })}
                               disabled={updateRequestMutation.isPending}
                             >
                               <Save size={14} color={colors.white} />
                             </TouchableOpacity>
                             <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingRequest(null)}>
                               <X size={14} color={colors.gray700} />
                             </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.sectionLabel}>Requested Services:</Text>
                    {(editingRequest === req.id ? editData.services : req.services).map((svc: any, idx: number) => {
                      if (editingRequest === req.id) {
                        return (
                          <View key={idx} style={styles.editSvcRow}>
                             <View style={styles.editSvcInputs}>
                               <TextInput 
                                 style={styles.editInput} 
                                 value={svc.name} 
                                 placeholder="Service name"
                                 onChangeText={(v) => updateServiceDetails(idx, 'name', v)}
                               />
                               <TextInput 
                                 style={styles.editInput} 
                                 value={svc.unit} 
                                 placeholder="Unit (e.g. Ltr)"
                                 onChangeText={(v) => updateServiceDetails(idx, 'unit', v)}
                               />
                             </View>
                             <View style={styles.editQtyRow}>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateServiceQuantity(idx, (svc.quantity || 1) - 1)}>
                                  <Minus size={12} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.qtyVal}>{svc.quantity || 1}</Text>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateServiceQuantity(idx, (svc.quantity || 1) + 1)}>
                                  <Plus size={12} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.removeSvcBtn} onPress={() => removeService(idx)}>
                                  <X size={14} color={colors.error} />
                                </TouchableOpacity>
                             </View>
                          </View>
                        );
                      }
                      return (
                        <View key={idx} style={styles.serviceRow}>
                           <View style={{ flex: 1 }}>
                             <Text style={styles.svcName}>{svc.name}</Text>
                             <View style={styles.svcQtyContainer}>
                               <Text style={styles.svcQtyLabel}>Quantity:</Text>
                               <Text style={styles.svcQtyValue}>× {svc.quantity || svc.requestedQuantity || 1}</Text>
                             </View>
                           </View>
                           {svc.quotedPrice && (
                             <View style={styles.svcPriceContainer}>
                                <Text style={styles.svcPrice}>₹{svc.quotedPrice} {svc.unit}</Text>
                                <Text style={styles.svcSubtotal}>
                                  Total: ₹{(parseFloat(svc.quotedPrice) * (svc.quantity || svc.requestedQuantity || 1)).toFixed(2)}
                                </Text>
                             </View>
                           )}
                        </View>
                      );
                    })}

                    {editingRequest === req.id && (
                      <TouchableOpacity style={styles.addSvcBtn} onPress={addService}>
                        <Plus size={16} color={colors.primary} />
                        <Text style={styles.addSvcText}>Add Service</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Your Notes:</Text>
                    {editingRequest === req.id ? (
                      <TextInput 
                        style={[styles.notesBox, { textAlignVertical: 'top', minHeight: 80 }]} 
                        multiline 
                        value={editData.customerNotes} 
                        onChangeText={(v) => setEditData({ ...editData, customerNotes: v })}
                        placeholder="Add special requirements..."
                      />
                    ) : req.customerNotes ? (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesText}>{req.customerNotes}</Text>
                      </View>
                    ) : (
                      <Text style={styles.noNotesText}>No notes provided</Text>
                    )}

                    {req.milkmanNotes && (
                      <View style={{ marginTop: spacing.md }}>
                        <Text style={styles.sectionLabel}>Milkman's Response:</Text>
                        <View style={[styles.notesBox, styles.milkmanNotesBox]}>
                          <Text style={styles.notesText}>{req.milkmanNotes}</Text>
                        </View>
                      </View>
                    )}

                    {req.status === 'quoted' && (
                      <View style={styles.quoteSection}>
                        <View style={styles.divider} />
                        <View style={styles.quoteRow}>
                          <Text style={styles.quoteTotalLabel}>Total Quote:</Text>
                          <Text style={styles.quoteTotalValue}>₹{calculateTotal(req.services).toFixed(2)}</Text>
                        </View>
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => acceptQuoteMutation.mutate(req.id)}
                            disabled={acceptQuoteMutation.isPending}
                            activeOpacity={0.8}
                          >
                            {acceptQuoteMutation.isPending ? <ActivityIndicator color={colors.white} /> : (
                              <>
                                <CheckCircle size={16} color={colors.white} />
                                <Text style={[styles.actionBtnText, { color: colors.white }]}>Accept Quote</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => rejectQuoteMutation.mutate(req.id)}
                            disabled={rejectQuoteMutation.isPending}
                            activeOpacity={0.8}
                          >
                            {rejectQuoteMutation.isPending ? <ActivityIndicator color={colors.gray700} /> : (
                              <>
                                <XCircle size={16} color={colors.gray700} />
                                <Text style={[styles.actionBtnText, { color: colors.gray700 }]}>Reject Quote</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <View style={styles.timelineSection}>
                      <Clock size={14} color={colors.gray500} />
                      <Text style={styles.timelineText}>
                        {req.status === 'pending' && 'Waiting for milkman response...'}
                        {req.status === 'quoted' && `Quote provided on ${new Date(req.quotedAt).toLocaleDateString()}`}
                        {req.status === 'accepted' && `Accepted on ${new Date(req.respondedAt).toLocaleDateString()}`}
                        {req.status === 'rejected' && `Rejected on ${new Date(req.respondedAt).toLocaleDateString()}`}
                      </Text>
                    </View>

                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <ShoppingCart size={48} color={colors.gray400} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>No Service Requests</Text>
            <Text style={styles.emptyDesc}>
              You haven't made any service requests yet. Request custom pricing from your assigned milkman.
            </Text>
            <TouchableOpacity 
              style={styles.emptyBtn} 
              onPress={() => navigation.navigate('CustomerDashboard')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Go to Your Doodhwala</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  
  // Header
  header: { 
    backgroundColor: colors.white, 
    padding: spacing.xl, 
    paddingTop: spacing.lg,
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    alignSelf: 'flex-start', marginBottom: spacing.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  backBtnText: { fontSize: 13, fontWeight: '500', color: colors.gray700 },
  titleContainer: { alignItems: 'center' },
  pageTitle: {
    fontSize: 28, fontWeight: '800', color: colors.primary, // Using primary for the gradient-like feel
    marginBottom: 4, letterSpacing: -0.5,
  },
  pageSubtitle: { fontSize: fontSize.base, color: colors.gray600, fontWeight: '500' },

  contentArea: { paddingHorizontal: spacing.xl },

  // Empty State
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginHorizontal: spacing.xl,
    padding: spacing['3xl'],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm, borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: spacing.sm },
  emptyDesc: { fontSize: fontSize.base, color: colors.gray600, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: colors.foreground,
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    borderRadius: borderRadius.md, ...shadows.sm,
  },
  emptyBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)', padding: 0,
    borderRadius: borderRadius.lg, marginBottom: spacing.xl, ...shadows.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: spacing.lg,
  },
  cardContent: { padding: spacing.lg, paddingTop: 0 },
  
  reqId: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  reqDate: { fontSize: 13, color: colors.gray500, fontWeight: '500', marginTop: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Services
  sectionLabel: {
    fontSize: 16, fontWeight: '700',
    color: colors.foreground, marginBottom: spacing.sm, marginTop: spacing.xs,
  },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.gray50, padding: spacing.md, borderRadius: borderRadius.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  svcName: { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  svcQtyContainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  svcQtyLabel: { fontSize: 13, color: colors.gray600 },
  svcQtyValue: { fontSize: 13, color: colors.gray600, fontWeight: '500' },
  
  svcPriceContainer: { alignItems: 'flex-end' },
  svcPrice: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  svcSubtotal: { fontSize: 13, color: colors.gray600, marginTop: 2 },

  // Notes
  noNotesText: { fontSize: 13, color: colors.gray500, fontStyle: 'italic' },
  notesBox: {
    backgroundColor: colors.gray50, padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
  },
  milkmanNotesBox: {
    backgroundColor: '#EFF6FF', borderColor: '#BFDBFE',
    borderLeftWidth: 4, borderLeftColor: '#3B82F6',
  },
  notesText: { fontSize: 13, color: colors.gray600, fontWeight: '500', lineHeight: 20 },

  // Quote
  quoteSection: { marginTop: spacing.lg },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.lg },
  quoteRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  quoteTotalLabel: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  quoteTotalValue: { fontSize: 24, fontWeight: '800', color: '#16A34A' },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', height: 44,
    borderRadius: borderRadius.md, justifyContent: 'center',
    alignItems: 'center', gap: spacing.xs, ...shadows.sm,
  },
  acceptBtn: { backgroundColor: '#16A34A' },
  rejectBtn: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border },
  actionBtnText: { fontWeight: '600', fontSize: fontSize.base },

  // Timeline
  timelineSection: { 
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, 
    marginTop: spacing.xl, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  timelineText: { fontSize: 13, color: colors.gray600 },

  // Edit Mode Styles
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editBtn: { width: 32, height: 32, backgroundColor: '#EFF6FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  saveBtn: { width: 32, height: 32, backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { width: 32, height: 32, backgroundColor: colors.white, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  
  editSvcRow: { backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  editSvcInputs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  editInput: { flex: 1, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, fontSize: 13, backgroundColor: colors.gray50 },
  editQtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: 14, fontWeight: '700', width: 24, textAlign: 'center' },
  removeSvcBtn: { marginLeft: 'auto', padding: 8 },
  
  addSvcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, marginTop: spacing.sm },
  addSvcText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});

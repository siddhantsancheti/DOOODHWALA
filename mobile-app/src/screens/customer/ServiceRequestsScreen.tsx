import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { Clock, CheckCircle, XCircle, DollarSign, Package, Headphones } from 'lucide-react-native';

export default function ServiceRequestsScreen() {
    const { user } = useAuth();
    const { data: requests, isLoading } = useQuery({ queryKey: ["/api/service-requests/customer"], enabled: !!user });

    const acceptQuoteMutation = useMutation({
        mutationFn: async (requestId: number) => {
            await apiRequest({ url: `/api/service-requests/${requestId}/status`, method: "PATCH", body: { status: 'accepted' } });
        },
        onSuccess: () => {
            Alert.alert("Success", "Quote accepted successfully!");
            queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
        },
        onError: (e: any) => Alert.alert("Error", e.message)
    });

    const rejectQuoteMutation = useMutation({
        mutationFn: async (requestId: number) => {
            await apiRequest({ url: `/api/service-requests/${requestId}/status`, method: "PATCH", body: { status: 'rejected' } });
        },
        onSuccess: () => {
            Alert.alert("Success", "Quote rejected successfully!");
            queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
        },
        onError: (e: any) => Alert.alert("Error", e.message)
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'quoted': return '#3b82f6';
            case 'accepted': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock size={14} color="#f59e0b" />;
            case 'quoted': return <DollarSign size={14} color="#3b82f6" />;
            case 'accepted': return <CheckCircle size={14} color="#10b981" />;
            case 'rejected': return <XCircle size={14} color="#ef4444" />;
            default: return null;
        }
    };

    const calculateTotal = (services: any[]) => {
        return services.reduce((total, service) => {
            const price = parseFloat(service.quotedPrice || service.price || 0);
            const quantity = service.requestedQuantity || 1;
            return total + (price * quantity);
        }, 0);
    };

    if (isLoading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    const requestList = Array.isArray(requests) ? requests : [];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.pageTitle}>Service Requests</Text>

            {requestList.length > 0 ? requestList.map((req: any) => (
                <View key={req.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.reqId}>Request #{req.id}</Text>
                            <Text style={styles.reqDate}>Requested on: {new Date(req.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: getStatusColor(req.status) }]}>
                            {getStatusIcon(req.status)}
                            <Text style={[styles.badgeText, { color: getStatusColor(req.status) }]}>{req.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.servicesList}>
                        <Text style={styles.sectionTitle}>Requested Services:</Text>
                        {req.services?.map((svc: any, idx: number) => (
                            <View key={idx} style={styles.serviceRow}>
                                <View>
                                    <Text style={styles.svcName}>{svc.name}</Text>
                                    <Text style={styles.svcQty}>Qty: {svc.quantity || svc.requestedQuantity || 1}</Text>
                                </View>
                                {svc.quotedPrice && (
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.svcPrice}>₹{svc.quotedPrice}/{svc.unit}</Text>
                                        <Text style={styles.svcSubtotal}>Total: ₹{(parseFloat(svc.quotedPrice) * (svc.quantity || svc.requestedQuantity || 1)).toFixed(2)}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {req.customerNotes && (
                        <View style={styles.notesBox}>
                            <Text style={styles.notesTitle}>Your Notes:</Text>
                            <Text style={styles.notesText}>{req.customerNotes}</Text>
                        </View>
                    )}

                    {req.milkmanNotes && (
                        <View style={[styles.notesBox, { backgroundColor: '#eff6ff', borderLeftColor: '#3b82f6' }]}>
                            <Text style={[styles.notesTitle, { color: '#1e3a8a' }]}>Milkman's Response:</Text>
                            <Text style={styles.notesText}>{req.milkmanNotes}</Text>
                        </View>
                    )}

                    {req.status === 'quoted' && (
                        <View style={styles.quoteSection}>
                            <View style={styles.quoteRow}>
                                <Text style={styles.quoteTotalText}>Total Quote:</Text>
                                <Text style={styles.quoteTotalVal}>₹{calculateTotal(req.services).toFixed(2)}</Text>
                            </View>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => acceptQuoteMutation.mutate(req.id)}>
                                    <CheckCircle size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>Accept Quote</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => rejectQuoteMutation.mutate(req.id)}>
                                    <XCircle size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>Reject Quote</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                </View>
            )) : (
                <View style={styles.emptyState}>
                    <Headphones size={48} color="#94a3b8" />
                    <Text style={styles.emptyTitle}>No Service Requests</Text>
                    <Text style={styles.emptyDesc}>You haven't made any service requests yet.</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 15 },
    reqId: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    reqDate: { fontSize: 12, color: '#64748b', marginTop: 4 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, gap: 4 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    servicesList: { marginBottom: 15 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
    serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    svcName: { fontSize: 14, fontWeight: '500', color: '#334155' },
    svcQty: { fontSize: 13, color: '#64748b', marginTop: 2 },
    svcPrice: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
    svcSubtotal: { fontSize: 12, color: '#64748b', marginTop: 2 },
    notesBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#cbd5e1' },
    notesTitle: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    notesText: { fontSize: 14, color: '#334155' },
    quoteSection: { marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    quoteTotalText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    quoteTotalVal: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 },
    actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 16 },
    emptyDesc: { fontSize: 14, color: '#64748b', marginTop: 8 }
});

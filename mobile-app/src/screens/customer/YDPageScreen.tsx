import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { Star, Crown, Zap, Calendar, CreditCard, History, Headphones, Phone, CheckCircle } from 'lucide-react-native';

export default function YDPageScreen() {
    const { user } = useAuth();
    const [orderQuantity, setOrderQuantity] = useState(2);

    const { data: customerProfile, isLoading } = useQuery<any>({ queryKey: ["/api/customers/profile"], enabled: !!user });

    const assignedMilkmanId = customerProfile?.assignedMilkmanId;
    const { data: assignedMilkman } = useQuery<any>({
        queryKey: [`/api/milkmen/${assignedMilkmanId}`],
        enabled: !!assignedMilkmanId
    });

    const { data: milkmen } = useQuery<any>({ queryKey: ["/api/milkmen"], enabled: !!user && !assignedMilkmanId });

    const assignYDMutation = useMutation({
        mutationFn: async (milkmanId: number) => {
            await apiRequest({ url: "/api/customers/assign-yd", method: "PATCH", body: { milkmanId } });
        },
        onSuccess: () => {
            Alert.alert("Success", "Your dedicated milkman has been assigned!");
            queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
        },
        onError: (e: any) => Alert.alert("Error", e.message)
    });

    const placeOrderMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest({ url: "/api/orders", method: "POST", body: data });
        },
        onSuccess: () => {
            Alert.alert("Success", "Your one-click order has been placed!");
            queryClient.invalidateQueries({ queryKey: ["/api/orders/customer"] });
        },
        onError: (e: any) => Alert.alert("Error", e.message)
    });

    const handleOneClickOrder = () => {
        if (!assignedMilkman) return;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        placeOrderMutation.mutate({
            milkmanId: assignedMilkman.id,
            quantity: orderQuantity.toString(),
            pricePerLiter: assignedMilkman.pricePerLiter,
            totalAmount: (orderQuantity * parseFloat(assignedMilkman.pricePerLiter)).toString(),
            deliveryDate: tomorrow.toISOString().split('T')[0],
            deliveryTime: "07:00-08:00",
            status: "pending",
            itemName: "Milk (Fresh)"
        });
    };

    if (isLoading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#a855f7" />;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Star size={40} color="#fff" />
                <Text style={styles.headerTitle}>Your Doodhwala (YD)</Text>
                <Text style={styles.headerSub}>Assign your dedicated milkman & enjoy one-click ordering</Text>
            </View>

            {assignedMilkman ? (
                <View style={styles.content}>
                    <View style={styles.ydCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.avatar}><Text style={{ fontSize: 30 }}>👨‍🌾</Text></View>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.ydName}>{assignedMilkman.businessName}</Text>
                                    <View style={styles.badge}><Crown size={12} color="#9333ea" /><Text style={styles.badgeText}>Your YD</Text></View>
                                </View>
                                <Text style={styles.ydStats}>⭐ {assignedMilkman.rating} ({assignedMilkman.totalReviews} reviews)</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.contactBtn}>
                            <Phone size={16} color="#fff" />
                            <Text style={styles.btnText}>Contact YD</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.quickOrderCard}>
                        <Text style={styles.cardTitle}>One-Click Daily Order</Text>

                        <View style={styles.orderBox}>
                            <Text style={styles.orderBoxTitle}>Your Regular Order</Text>
                            <View style={styles.orderRow}>
                                <Text style={{ fontSize: 18 }}>🥛 Milk (Fresh)</Text>
                                <View style={styles.qtyControls}>
                                    <TouchableOpacity onPress={() => setOrderQuantity(Math.max(0.5, orderQuantity - 0.5))} style={styles.qtyBtn}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
                                    <Text style={styles.qtyVal}>{orderQuantity}L</Text>
                                    <TouchableOpacity onPress={() => setOrderQuantity(orderQuantity + 0.5)} style={styles.qtyBtn}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.orderTotal}>Total: ₹{(orderQuantity * parseFloat(assignedMilkman.pricePerLiter)).toFixed(2)}</Text>
                        </View>

                        <TouchableOpacity style={styles.oneClickBtn} onPress={handleOneClickOrder}>
                            <Zap size={20} color="#fff" />
                            <Text style={styles.oneClickText}>Order for Tomorrow</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.benefitsCard}>
                        <Text style={styles.cardTitle}>YD Premium Benefits</Text>
                        <View style={styles.benefitRow}><Zap size={20} color="#a855f7" /><Text style={styles.benefitText}>One-Click Ordering</Text></View>
                        <View style={styles.benefitRow}><CheckCircle size={20} color="#10b981" /><Text style={styles.benefitText}>Priority Delivery</Text></View>
                        <View style={styles.benefitRow}><CheckCircle size={20} color="#3b82f6" /><Text style={styles.benefitText}>5% Loyalty Discount</Text></View>
                    </View>

                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.cardTitle}>Choose Your Doodhwala</Text>
                    <Text style={styles.cardSub}>Select a milkman to become your dedicated YD.</Text>

                    {milkmen?.map((m: any) => (
                        <View key={m.id} style={styles.milkmanCard}>
                            <Text style={styles.ydName}>{m.businessName}</Text>
                            <Text style={styles.ydStats}>⭐ {m.rating} • ₹{m.pricePerLiter}/L</Text>
                            <TouchableOpacity style={styles.assignBtn} onPress={() => assignYDMutation.mutate(m.id)}>
                                <Crown size={16} color="#fff" />
                                <Text style={styles.btnText}>Assign as YD</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { backgroundColor: '#a855f7', padding: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 10 },
    headerSub: { fontSize: 15, color: '#f3e8ff', textAlign: 'center', marginTop: 8 },
    content: { padding: 16 },
    ydCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2 },
    avatar: { width: 60, height: 60, backgroundColor: '#f3f4f6', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    ydName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    badge: { flexDirection: 'row', backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8, alignItems: 'center' },
    badgeText: { fontSize: 12, color: '#9333ea', fontWeight: 'bold', marginLeft: 4 },
    ydStats: { fontSize: 14, color: '#4b5563', marginTop: 4 },
    contactBtn: { flexDirection: 'row', backgroundColor: '#9333ea', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    btnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    quickOrderCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 },
    cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 15 },
    orderBox: { backgroundColor: '#f9fafb', padding: 15, borderRadius: 12, marginBottom: 15 },
    orderBoxTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 10 },
    orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    qtyControls: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 30, height: 30, backgroundColor: '#e5e7eb', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    qtyText: { fontSize: 18, fontWeight: 'bold', color: '#4b5563' },
    qtyVal: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 15 },
    orderTotal: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 10, textAlign: 'right' },
    oneClickBtn: { flexDirection: 'row', backgroundColor: '#9333ea', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    oneClickText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    benefitsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2, marginBottom: 30 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    benefitText: { fontSize: 16, color: '#374151', marginLeft: 10 },
    milkmanCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    assignBtn: { flexDirection: 'row', backgroundColor: '#9333ea', padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 }
});

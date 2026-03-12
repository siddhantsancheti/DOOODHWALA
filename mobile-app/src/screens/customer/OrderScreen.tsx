import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { ShoppingCart, MapPin, Clock, Star, Phone } from 'lucide-react-native';

export default function OrderScreen({ route, navigation }: any) {
    const { user } = useAuth();
    const milkmanId = route.params?.milkmanId || 1; // Default to 1 for demo if none passed

    const { data: milkman, isLoading: milkmanLoading } = useQuery<any>({
        queryKey: [`/api/milkmen/${milkmanId}`],
        enabled: !!milkmanId
    });

    const { data: customerProfile } = useQuery<any>({
        queryKey: ['/api/customers/profile'],
        enabled: !!user
    });

    const [formData, setFormData] = useState({
        customerName: customerProfile?.name || '',
        deliveryAddress: customerProfile?.address || '',
        deliveryDate: '',
        deliveryTime: '07:00-08:00',
        specialInstructions: ''
    });

    const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});

    const handleQtyChange = (name: string, diff: number, max: number = 99) => {
        setSelectedItems(prev => {
            const current = prev[name] || 0;
            const next = Math.max(0, Math.min(max, current + diff));
            return { ...prev, [name]: next };
        });
    };

    const calculateTotal = () => {
        if (!milkman?.dairyItems) return 0;
        return milkman.dairyItems.reduce((acc: number, item: any) => {
            return acc + ((selectedItems[item.name] || 0) * parseFloat(item.price));
        }, 0);
    };

    const placeOrder = async () => {
        if (!formData.customerName || !formData.deliveryAddress || !formData.deliveryDate) {
            Alert.alert('Missing Fields', 'Please fill out all required details.');
            return;
        }

        const total = calculateTotal();
        if (total === 0) {
            Alert.alert('Empty Cart', 'Please add at least one item to cart.');
            return;
        }

        try {
            // For simplicity, submit one total order or the first item
            const itemNames = Object.keys(selectedItems).filter(k => selectedItems[k] > 0);

            for (const itemName of itemNames) {
                const qty = selectedItems[itemName];
                const item = milkman.dairyItems.find((i: any) => i.name === itemName);

                await apiRequest({
                    url: '/api/orders',
                    method: 'POST',
                    body: {
                        milkmanId,
                        quantity: qty.toString(),
                        pricePerLiter: item.price,
                        totalAmount: (qty * parseFloat(item.price)).toString(),
                        deliveryDate: formData.deliveryDate,
                        deliveryTime: formData.deliveryTime,
                        status: "pending",
                        specialInstructions: formData.specialInstructions,
                        itemName
                    }
                });
            }

            Alert.alert('Order Placed!', 'Your order has been successfully placed.');
            queryClient.invalidateQueries({ queryKey: ['/api/orders/customer'] });
            navigation.goBack();

        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to place order.');
        }
    };

    if (milkmanLoading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.pageTitle}>Place Your Order</Text>

            {milkman ? (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{milkman.businessName}</Text>
                    <Text style={styles.cardSub}>{milkman.contactName}</Text>
                    <View style={styles.infoRow}><Phone size={14} color="#64748b" /><Text style={styles.infoText}>{milkman.phone}</Text></View>
                    <View style={styles.infoRow}><MapPin size={14} color="#64748b" /><Text style={styles.infoText}>{milkman.address}</Text></View>
                    <View style={styles.infoRow}><Clock size={14} color="#64748b" /><Text style={styles.infoText}>{milkman.deliveryTimeStart} - {milkman.deliveryTimeEnd}</Text></View>
                </View>
            ) : null}

            <View style={styles.card}>
                <Text style={styles.cardHeader}>Products</Text>
                {milkman?.dairyItems?.map((item: any) => (
                    <View key={item.name} style={styles.productRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.productName}>{item.name}</Text>
                            <Text style={styles.productPrice}>₹{item.price} {item.unit}</Text>
                        </View>
                        <View style={styles.qtyControls}>
                            <TouchableOpacity onPress={() => handleQtyChange(item.name, -1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
                            <Text style={styles.qtyText}>{selectedItems[item.name] || 0}</Text>
                            <TouchableOpacity onPress={() => handleQtyChange(item.name, 1, item.quantity)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardHeader}>Delivery Details</Text>

                <Text style={styles.label}>Delivery Date (YYYY-MM-DD)*</Text>
                <TextInput style={styles.input} placeholder="e.g. 2024-05-15" value={formData.deliveryDate} onChangeText={t => setFormData({ ...formData, deliveryDate: t })} />

                <Text style={styles.label}>Delivery Time*</Text>
                <TextInput style={styles.input} placeholder="e.g. 07:00-08:00" value={formData.deliveryTime} onChangeText={t => setFormData({ ...formData, deliveryTime: t })} />

                <Text style={styles.label}>Delivery Address*</Text>
                <TextInput style={[styles.input, { height: 60 }]} multiline value={formData.deliveryAddress} onChangeText={t => setFormData({ ...formData, deliveryAddress: t })} />

                <Text style={styles.label}>Special Instructions</Text>
                <TextInput style={[styles.input, { height: 60 }]} multiline value={formData.specialInstructions} onChangeText={t => setFormData({ ...formData, specialInstructions: t })} />
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTotal}>Total Amount: ₹{calculateTotal().toFixed(2)}</Text>
                <TouchableOpacity style={styles.placeOrderBtn} onPress={placeOrder}>
                    <Text style={styles.placeOrderBtnText}>Confirm Order</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    cardSub: { fontSize: 14, color: '#64748b', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
    infoText: { fontSize: 13, color: '#475569' },
    cardHeader: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
    productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    productName: { fontSize: 15, fontWeight: '500', color: '#0f172a' },
    productPrice: { fontSize: 13, color: '#64748b' },
    qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { backgroundColor: '#f1f5f9', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6' },
    qtyText: { fontSize: 16, fontWeight: 'bold', width: 20, textAlign: 'center' },
    label: { fontSize: 13, fontWeight: '500', color: '#334155', marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fafc', fontSize: 15 },
    summaryCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2, marginTop: 10 },
    summaryTotal: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
    placeOrderBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    placeOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
// import RazorpayCheckout from 'react-native-razorpay';
import { Banknote, CreditCard, ShieldCheck } from 'lucide-react-native';

export default function CheckoutScreen({ route, navigation }: any) {
    const { user } = useAuth();
    const amount = route.params?.amount || 100;
    const description = route.params?.description || "Milk Delivery Payment";
    const orderId = route.params?.orderId || `ORDER_${Date.now()}`;

    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({ queryKey: ["/api/customers/profile"], enabled: !!user });

    const handleRazorpayPayment = async () => {
        setIsProcessing(true);
        try {
            const resp: any = await apiRequest({
                url: "/api/payments/razorpay/create-order",
                method: "POST",
                body: { amount, orderId, description }
            });
            // @ts-ignore
            const { razorpayOrderId, key } = resp;

            if (!key || key === "rzp_test_placeholder") {
                Alert.alert("Test Mode Active", "No valid Razorpay key found. Simulating successful payment.");
                setTimeout(() => {
                    Alert.alert("Success", "Test payment processed successfully!");
                    navigation.navigate('CustomerDashboard');
                }, 1500);
                setIsProcessing(false);
                return;
            }

            const options = {
                description: description,
                image: 'https://dooodhwala.com/logo.png',
                currency: 'INR',
                key: key,
                amount: amount * 100,
                name: 'DOOODHWALA',
                order_id: razorpayOrderId,
                prefill: {
                    email: user?.username || 'customer@dooodhwala.com',
                    contact: user?.phone || '9999999999',
                    name: customerProfile?.name || 'Customer'
                },
                theme: { color: '#3b82f6' }
            };

            // Mocking RazorpayCheckout for Expo Go compatibility
            // RazorpayCheckout is a native module that causes Expo Go to crash.
            Alert.alert(
                "Expo Go Test Mode",
                "Razorpay is not supported in Expo Go. Simulating a successful payment checkout flow now.",
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => {
                            setIsProcessing(false);
                            Alert.alert("Payment Cancelled", "User cancelled test payment");
                        }
                    },
                    {
                        text: "Simulate Success",
                        onPress: async () => {
                            try {
                                const verifyResp = await apiRequest({
                                    url: "/api/payments/razorpay/verify",
                                    method: "POST",
                                    body: {
                                        razorpay_order_id: razorpayOrderId,
                                        razorpay_payment_id: `mock_pay_${Date.now()}`,
                                        razorpay_signature: "mock_signature_for_expo_go",
                                    }
                                });
                                // @ts-ignore
                                if (verifyResp.success) {
                                    Alert.alert("Success", "Test payment processed successfully!");
                                    navigation.navigate('CustomerDashboard');
                                } else {
                                    throw new Error('Verification failed');
                                }
                            } catch (e: any) {
                                Alert.alert("Verification Failed", "Please contact support if money was deducted.");
                            } finally {
                                setIsProcessing(false);
                            }
                        }
                    }
                ]
            );

            // The following native code is commented out for Expo Go compatibility:
            /*
            RazorpayCheckout.open(options).then(async (data: any) => {
                try {
                    const verifyResp = await apiRequest({
                        url: "/api/payments/razorpay/verify",
                        method: "POST",
                        body: {
                            razorpay_order_id: data.razorpay_order_id,
                            razorpay_payment_id: data.razorpay_payment_id,
                            razorpay_signature: data.razorpay_signature,
                        }
                    });
                    // @ts-ignore
                    if (verifyResp.success) {
                        Alert.alert("Success", "Your payment has been processed successfully!");
                        navigation.navigate('CustomerDashboard');
                    } else {
                        throw new Error('Verification failed');
                    }
                } catch (e: any) {
                    Alert.alert("Verification Failed", "Please contact support if money was deducted.");
                }
            }).catch((error: any) => {
                Alert.alert("Payment Cancelled", `Error: ${error.description || 'User cancelled'}`);
            });
            */
        } catch (e: any) {
            Alert.alert("Payment Initialization Failed", e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCODOrder = async () => {
        setIsProcessing(true);
        try {
            const resp: any = await apiRequest({
                url: "/api/payments/cod/create-order",
                method: "POST",
                body: {
                    amount,
                    orderId,
                    customerId: customerProfile?.id || 0,
                    milkmanId: customerProfile?.assignedMilkmanId || 1,
                    description,
                    customerPhone: user?.phone?.replace('+91', '') || user?.phone,
                    deliveryAddress: customerProfile?.address || "Delivery location",
                    userId: user?.id
                }
            });
            // @ts-ignore
            if (resp.success) {
                Alert.alert("Order Confirmed", `Pay ₹${amount} in cash upon delivery. ${resp.codOTP ? "OTP: " + resp.codOTP : ""}`);
                navigation.navigate('CustomerDashboard');
            } else {
                // @ts-ignore
                throw new Error(resp.message || "Failed to place COD order");
            }
        } catch (e: any) {
            Alert.alert("Order Failed", e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (profileLoading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.pageTitle}>Secure Checkout</Text>

            <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>Total Amount to Pay</Text>
                <Text style={styles.amountValue}>₹{amount}</Text>
                <Text style={styles.descText}>{description}</Text>
            </View>

            <Text style={styles.sectionTitle}>Select Payment Method</Text>

            <TouchableOpacity style={styles.paymentMethod} onPress={handleRazorpayPayment} disabled={isProcessing}>
                <View style={styles.methodIcon}><CreditCard size={24} color="#3b82f6" /></View>
                <View style={styles.methodDetails}>
                    <Text style={styles.methodTitle}>Pay Online (UPI / Cards)</Text>
                    <Text style={styles.methodSub}>Instant checkout via Razorpay</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentMethod} onPress={handleCODOrder} disabled={isProcessing}>
                <View style={[styles.methodIcon, { backgroundColor: '#dcfce3' }]}><Banknote size={24} color="#10b981" /></View>
                <View style={styles.methodDetails}>
                    <Text style={styles.methodTitle}>Cash on Delivery</Text>
                    <Text style={styles.methodSub}>Pay cash when order arrives</Text>
                </View>
            </TouchableOpacity>

            {isProcessing && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={{ marginTop: 10, color: '#334155' }}>Processing...</Text>
                </View>
            )}

            <View style={styles.secureBadge}>
                <ShieldCheck size={16} color="#10b981" />
                <Text style={styles.secureText}>100% Secure Payment</Text>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
    amountCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 30, elevation: 2 },
    amountLabel: { fontSize: 16, color: '#64748b', marginBottom: 8 },
    amountValue: { fontSize: 36, fontWeight: 'bold', color: '#3b82f6' },
    descText: { fontSize: 14, color: '#475569', marginTop: 8, textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
    paymentMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 15, elevation: 1 },
    methodIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
    methodDetails: { marginLeft: 16, flex: 1 },
    methodTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    methodSub: { fontSize: 14, color: '#64748b', marginTop: 2 },
    secureBadge: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40 },
    secureText: { color: '#10b981', marginLeft: 6, fontWeight: '500' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }
});

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';

export default function MilkmanProfileSetupScreen({ navigation }: any) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const [formData, setFormData] = useState({
        contactName: '',
        businessName: '',
        address: '',
        pricePerLiter: '50',
        deliveryTimeStart: '06:00',
        deliveryTimeEnd: '09:00',
        bankAccountHolderName: '',
        bankAccountType: '',
        bankAccountNumber: '',
        bankIfscCode: '',
        bankName: '',
        upiId: ''
    });

    const getCurrentLocation = async () => {
        setIsLocating(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                setIsLocating(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});

            Alert.alert('Location Captured', 'Coordinates saved. Reverse geocoding can be done later.');
            // Optionally do reverse geocoding here to update formData.address
        } catch (error) {
            Alert.alert('Error', 'Unable to retrieve location.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.contactName || !formData.businessName || !formData.address) {
            Alert.alert('Required Fields Missing', 'Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const profileData = {
                ...formData,
                dairyItems: [{ name: 'Fresh Milk', unit: 'per litre', price: formData.pricePerLiter }],
                deliverySlots: [{ name: 'Morning', startTime: formData.deliveryTimeStart, endTime: formData.deliveryTimeEnd }]
            };

            const res = await apiRequest({
                url: '/api/milkmen',
                method: 'POST',
                body: profileData
            });
            await res.json();

            Alert.alert('Profile Created!', 'Your milkman profile is complete.');
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

            navigation.replace('MilkmanHome');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Complete Your Milkman Profile!</Text>
                <Text style={styles.subtitle}>Set up your dairy business to start serving customers</Text>

                <Text style={styles.sectionHeader}>Contact Information</Text>
                <TextInput
                    style={styles.input} placeholder="Full Name *"
                    value={formData.contactName} onChangeText={t => setFormData({ ...formData, contactName: t })}
                />
                <TextInput
                    style={styles.input} placeholder="Business Name *"
                    value={formData.businessName} onChangeText={t => setFormData({ ...formData, businessName: t })}
                />

                <Text style={styles.sectionHeader}>Service Area</Text>
                <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation} disabled={isLocating}>
                    {isLocating ? <ActivityIndicator color="#f97316" /> : <MapPin color="#f97316" />}
                    <Text style={styles.locationBtnText}>Use Current Location</Text>
                </TouchableOpacity>

                <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Complete Address *" multiline
                    value={formData.address} onChangeText={t => setFormData({ ...formData, address: t })}
                />

                <Text style={styles.sectionHeader}>Products & Delivery</Text>
                <TextInput
                    style={styles.input} placeholder="Price Per Liter (₹) *" keyboardType="numeric"
                    value={formData.pricePerLiter} onChangeText={t => setFormData({ ...formData, pricePerLiter: t })}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Start Time (e.g. 06:00)" value={formData.deliveryTimeStart} onChangeText={t => setFormData({ ...formData, deliveryTimeStart: t })} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="End Time (e.g. 09:00)" value={formData.deliveryTimeEnd} onChangeText={t => setFormData({ ...formData, deliveryTimeEnd: t })} />
                </View>

                <Text style={styles.sectionHeader}>Bank Details (Optional)</Text>
                <TextInput style={styles.input} placeholder="Account Holder Name" value={formData.bankAccountHolderName} onChangeText={t => setFormData({ ...formData, bankAccountHolderName: t })} />
                <TextInput style={styles.input} placeholder="Account Number" keyboardType="numeric" value={formData.bankAccountNumber} onChangeText={t => setFormData({ ...formData, bankAccountNumber: t })} />
                <TextInput style={styles.input} placeholder="IFSC Code" autoCapitalize="characters" value={formData.bankIfscCode} onChangeText={t => setFormData({ ...formData, bankIfscCode: t })} />
                <TextInput style={styles.input} placeholder="UPI ID" autoCapitalize="none" value={formData.upiId} onChangeText={t => setFormData({ ...formData, upiId: t })} />

                <TouchableOpacity
                    style={[styles.submitBtn, (!formData.contactName || !formData.businessName || !formData.address) && { backgroundColor: '#9ca3af' }]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !formData.contactName || !formData.businessName || !formData.address}
                >
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Complete Setup</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, paddingBottom: 40, backgroundColor: '#fff' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 10, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 5 },
    input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#f8fafc', marginBottom: 15 },
    locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f97316', borderStyle: 'dashed', borderRadius: 8, paddingVertical: 12, backgroundColor: '#fff7ed', marginBottom: 15, gap: 10 },
    locationBtnText: { color: '#f97316', fontSize: 16, fontWeight: '500' },
    submitBtn: { backgroundColor: '#f97316', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

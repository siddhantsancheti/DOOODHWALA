import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';

export default function CustomerProfileSetupScreen({ navigation }: any) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({ name: '', email: '', address: '', latitude: '', longitude: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

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
            setFormData(prev => ({
                ...prev,
                latitude: location.coords.latitude.toString(),
                longitude: location.coords.longitude.toString()
            }));
            Alert.alert('Location Captured', 'Your current location has been saved.');
        } catch (error) {
            Alert.alert('Error', 'Unable to retrieve your location. Please enter address manually.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.address || !formData.email) {
            Alert.alert('Required Fields Missing', 'Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiRequest({
                url: '/api/customers/profile',
                method: 'PATCH',
                body: {
                    name: formData.name,
                    email: formData.email,
                    address: formData.address,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                }
            });
            await res.json();

            Alert.alert('Profile Updated Successfully!', 'Your customer profile has been updated. Welcome to DOOODHWALA!');

            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });

            navigation.replace('CustomerHome');
        } catch (error: any) {
            Alert.alert('Profile Setup Failed', error.message || 'Failed to create profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Complete Your Customer Profile!</Text>
                <Text style={styles.subtitle}>Set up your delivery preferences to start ordering fresh milk</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChangeText={(val) => setFormData({ ...formData, name: val })}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email Address *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(val) => setFormData({ ...formData, email: val })}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Delivery Address *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter your complete delivery address"
                        multiline
                        numberOfLines={4}
                        value={formData.address}
                        onChangeText={(val) => setFormData({ ...formData, address: val })}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Location Coordinates</Text>
                    <TouchableOpacity
                        style={styles.locationBtn}
                        onPress={getCurrentLocation}
                        disabled={isLocating}
                    >
                        {isLocating ? (
                            <ActivityIndicator color="#3b82f6" style={{ marginRight: 8 }} />
                        ) : (
                            <MapPin color={formData.latitude ? "#10b981" : "#3b82f6"} size={20} style={{ marginRight: 8 }} />
                        )}
                        <Text style={[styles.locationBtnText, formData.latitude ? { color: '#10b981' } : {}]}>
                            {formData.latitude ? `Location Captured (${formData.latitude.slice(0, 6)}, ${formData.longitude.slice(0, 6)})` : 'Get Current Location'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, (!formData.name || !formData.address || !formData.email) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !formData.name || !formData.address || !formData.email}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Complete Setup & Get Started</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 30,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#f8fafc',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 14,
        backgroundColor: '#eff6ff',
    },
    locationBtnText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '500',
    },
    submitBtn: {
        backgroundColor: '#3b82f6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnDisabled: {
        backgroundColor: '#94a3b8',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});

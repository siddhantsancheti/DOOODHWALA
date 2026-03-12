import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { apiRequest } from '../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Truck } from 'lucide-react-native';

export default function UserTypeSelectionScreen({ navigation }: any) {
    const queryClient = useQueryClient();
    const [isSelecting, setIsSelecting] = useState(false);

    const handleSelect = async (type: 'customer' | 'milkman') => {
        if (isSelecting) return;
        setIsSelecting(true);

        try {
            const res = await apiRequest({
                url: '/api/auth/user-type',
                method: 'PUT',
                body: { userType: type }
            });
            const response = await res.json();

            if (response.success) {
                // Refresh useAuth user data
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                // Navigate
                if (type === 'customer') {
                    navigation.replace('CustomerProfileSetup');
                } else {
                    navigation.replace('MilkmanProfileSetup');
                }
            } else {
                Alert.alert('Error', response.message || 'Failed to update user type');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update user type. Please try again.');
        } finally {
            setIsSelecting(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/150' }} // Need local asset later
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Welcome to DOOODHWALA!</Text>
                <Text style={styles.subtitle}>Choose how you'd like to use the app today</Text>
            </View>

            <TouchableOpacity
                style={styles.card}
                onPress={() => handleSelect('customer')}
                disabled={isSelecting}
            >
                <View style={[styles.iconContainer, { backgroundColor: '#3b82f6' }]}>
                    <Users size={40} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>I'm a Customer</Text>
                <Text style={styles.cardDescription}>Order fresh milk from local milkmen</Text>

                {isSelecting ? <ActivityIndicator style={{ marginTop: 15 }} /> : (
                    <View style={styles.button}>
                        <Text style={styles.buttonText}>Continue as Customer</Text>
                    </View>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.card}
                onPress={() => handleSelect('milkman')}
                disabled={isSelecting}
            >
                <View style={[styles.iconContainer, { backgroundColor: '#f97316' }]}>
                    <Truck size={40} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>I'm a Milkman</Text>
                <Text style={styles.cardDescription}>Sell fresh milk to customers</Text>

                {isSelecting ? <ActivityIndicator style={{ marginTop: 15 }} /> : (
                    <View style={styles.button}>
                        <Text style={styles.buttonText}>Continue as Milkman</Text>
                    </View>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 20,
        borderRadius: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#0f172a',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#f1f5f9',
        width: '100%',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#0f172a',
        fontWeight: '600',
        fontSize: 16,
    }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Image } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { User, Phone, Mail, MapPin, Edit3, Save, X, LogOut } from 'lucide-react-native';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', address: '', email: '' });

    const { data: customerProfile, isLoading } = useQuery<any>({
        queryKey: ["/api/customers/profile"],
        enabled: !!user && user.userType === 'customer'
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest({ url: "/api/customers/profile", method: "PATCH", body: data });
        },
        onSuccess: () => {
            Alert.alert("Success", "Profile updated successfully!");
            queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
            setIsEditing(false);
        },
        onError: (e: any) => Alert.alert("Error", e.message)
    });

    const handleEdit = () => {
        setEditData({
            name: customerProfile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            address: customerProfile?.address || '',
            email: user?.email || '',
        });
        setIsEditing(true);
    };

    const handleSave = () => {
        updateMutation.mutate(editData);
    };

    if (isLoading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    {user?.profileImageUrl ? (
                        <Image source={{ uri: user.profileImageUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                    ) : (
                        <User size={40} color="#cbd5e1" />
                    )}
                </View>
                <Text style={styles.userName}>{customerProfile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}</Text>
                <Text style={styles.userRole}>{user?.userType?.toUpperCase()}</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Personal Information</Text>
                    {!isEditing ? (
                        <TouchableOpacity onPress={handleEdit}><Edit3 size={20} color="#3b82f6" /></TouchableOpacity>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setIsEditing(false)}><X size={20} color="#ef4444" /></TouchableOpacity>
                            <TouchableOpacity onPress={handleSave}><Save size={20} color="#10b981" /></TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <User size={18} color="#64748b" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Full Name</Text>
                        {isEditing ? (
                            <TextInput style={styles.input} value={editData.name} onChangeText={t => setEditData({ ...editData, name: t })} />
                        ) : (
                            <Text style={styles.infoValue}>{customerProfile?.name || 'Not provided'}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Phone size={18} color="#64748b" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Phone Number</Text>
                        <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Mail size={18} color="#64748b" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        {isEditing ? (
                            <TextInput style={styles.input} value={editData.email} onChangeText={t => setEditData({ ...editData, email: t })} keyboardType="email-address" />
                        ) : (
                            <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <MapPin size={18} color="#64748b" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Address</Text>
                        {isEditing ? (
                            <TextInput style={[styles.input, { height: 60 }]} multiline value={editData.address} onChangeText={t => setEditData({ ...editData, address: t })} />
                        ) : (
                            <Text style={styles.infoValue}>{customerProfile?.address || 'Not provided'}</Text>
                        )}
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <LogOut size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: '#3b82f6', alignItems: 'center', paddingVertical: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: '#fff' },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    userRole: { fontSize: 14, color: '#dbeafe', marginTop: 4, letterSpacing: 1 },
    card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 2, marginTop: -20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    infoContent: { marginLeft: 15, flex: 1 },
    infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
    infoValue: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc', color: '#0f172a' },
    logoutBtn: { flexDirection: 'row', backgroundColor: '#fee2e2', marginHorizontal: 16, padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});

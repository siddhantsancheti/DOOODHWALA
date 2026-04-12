import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { User, Phone, Mail, MapPin, Edit3, Save, X, Camera, Map } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', address: '', email: '', businessName: '', pricePerLiter: '' });

  const { data: customerProfile, isLoading: customerLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'],
    enabled: !!user && user.userType === 'customer',
  });

  const { data: milkmanProfile, isLoading: milkmanLoading } = useQuery<any>({
    queryKey: ['/api/milkmen/profile'],
    enabled: !!user && user.userType === 'milkman',
  });

  const isLoading = customerLoading || milkmanLoading;
  const profile = customerProfile || milkmanProfile || {};
  const profileType = customerProfile ? 'Customer' : milkmanProfile ? 'Milkman' : 'User';

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = customerProfile ? '/api/customers/profile' : '/api/milkmen/profile';
      await apiRequest({ 
        url: endpoint, 
        method: 'PATCH', 
        body: {
          name: data.name,
          address: data.address,
          email: data.email, // This will be handled by the backend to update the user record
          businessName: data.businessName,
          pricePerLiter: data.pricePerLiter,
        }
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/milkmen/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }); // Corrected key
      setIsEditing(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to update profile'),
  });

  const handleEdit = () => {
    setEditData({
      name: profile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      address: profile?.address || '',
      email: user?.email || '',
      businessName: profile?.businessName || '',
      pricePerLiter: profile?.pricePerLiter || '',
    });
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Navbar Header */}
      <View style={styles.topNav}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
        >
          <Map size={20} color={colors.primary} />
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.logoText}>DOOODHWALA</Text>
        <View style={{ width: 80 }} /> 
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile Information</Text>
          
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <User size={40} color={colors.gray400} />
              )}
            </View>
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
              <Camera size={16} color={colors.white} />
            </TouchableOpacity>
          </View>

          {!isEditing ? (
            <TouchableOpacity style={styles.editMainBtn} onPress={handleEdit} activeOpacity={0.8}>
              <Edit3 size={16} color={colors.white} />
              <Text style={styles.editMainText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActionsTop}>
              <TouchableOpacity style={styles.saveTopBtn} onPress={() => updateMutation.mutate(editData)} activeOpacity={0.8}>
                <Save size={16} color={colors.white} />
                <Text style={styles.saveTopText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelTopBtn} onPress={() => setIsEditing(false)} activeOpacity={0.8}>
                <X size={16} color={colors.foreground} />
                <Text style={styles.cancelTopText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          <View style={styles.cardContent}>
            <InfoRow label="Account Type" value={profileType} isBadge />
            <InfoRow 
              label="Name" 
              value={profile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Not provided'} 
              isEditing={isEditing}
              editValue={editData.name}
              onEdit={(v: string) => setEditData({...editData, name: v})}
            />
            <InfoRow label="First Name" value={user?.firstName || 'Not provided'} />
            <InfoRow label="Last Name" value={user?.lastName || 'Not provided'} />
            <InfoRow label="User ID" value={user?.id ? String(user.id) : ''} isMono />
            <InfoRow label="Account Created" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'} />
          </View>
        </View>

        {/* Contact Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Phone size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          <View style={styles.cardContent}>
            <InfoRow 
              label="Phone Number" 
              value={user?.phone || 'Not provided'} 
              icon={<Phone size={16} color={colors.gray400} />}
              isVerified={user?.isVerified}
            />
            <InfoRow 
              label="Email Address" 
              value={user?.email || 'Not provided'} 
              icon={<Mail size={16} color={colors.gray400} />}
              isEditing={isEditing}
              editValue={editData.email}
              onEdit={(v: string) => setEditData({...editData, email: v})}
            />
            <InfoRow 
              label="Address" 
              value={profile?.address || 'Not provided'} 
              icon={<MapPin size={16} color={colors.gray400} />}
              isEditing={isEditing}
              editValue={editData.address}
              onEdit={(v: string) => setEditData({...editData, address: v})}
              multiline
            />
          </View>
        </View>

        {/* Details Card */}
        {customerProfile && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Customer Details</Text>
            </View>
            <View style={styles.cardContent}>
              <InfoRow label="Assigned Milkman" value={profile?.assignedMilkmanId ? `ID: ${profile.assignedMilkmanId}` : 'Not assigned'} />
              <InfoRow label="Regular Order Quantity" value={profile?.regularOrderQuantity?.toString() || 'Not set'} />
              <InfoRow 
                label="Auto Payment" 
                value={profile?.autoPayEnabled ? 'Enabled' : 'Disabled'} 
                isBadge
                badgeColor={profile?.autoPayEnabled ? colors.success : colors.foreground}
              />
            </View>
          </View>
        )}

        {milkmanProfile && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Milkman Details</Text>
            </View>
            <View style={styles.cardContent}>
              <InfoRow 
                label="Business Name" 
                value={profile?.businessName || 'Not provided'} 
                isEditing={isEditing}
                editValue={editData.businessName}
                onEdit={(v: string) => setEditData({...editData, businessName: v})}
              />
              <InfoRow 
                label="Price per Liter" 
                value={profile?.pricePerLiter ? `₹${profile.pricePerLiter}` : 'Not provided'} 
                isEditing={isEditing}
                editValue={editData.pricePerLiter?.toString()}
                onEdit={(v: string) => setEditData({...editData, pricePerLiter: v})}
              />
              <InfoRow label="Delivery Time" value={`${profile?.deliveryTimeStart || '--'} - ${profile?.deliveryTimeEnd || '--'}`} />
              <InfoRow label="Rating" value={profile?.rating ? `${profile.rating}★` : 'No ratings yet'} />
              <InfoRow 
                label="Status" 
                value={profile?.isAvailable ? 'Available' : 'Unavailable'} 
                isBadge
                badgeColor={profile?.isAvailable ? colors.success : colors.destructive}
              />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, icon, isBadge, badgeColor, isMono, isVerified, isEditing, editValue, onEdit, multiline }: any) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <View style={infoStyles.valueContainer}>
        {icon && <View style={infoStyles.iconBox}>{icon}</View>}
        
        {isEditing && onEdit ? (
          <TextInput
            style={[infoStyles.input, multiline && { height: 60, textAlignVertical: 'top' }]}
            value={editValue}
            onChangeText={onEdit}
            multiline={multiline}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : isBadge ? (
          <View style={[infoStyles.badge, { backgroundColor: badgeColor ? `${badgeColor}20` : '#DBEAFE' }]}>
            <Text style={[infoStyles.badgeText, { color: badgeColor || '#1E40AF' }]}>{value}</Text>
          </View>
        ) : (
          <Text style={[infoStyles.value, isMono && infoStyles.mono]}>{value}</Text>
        )}

        {isVerified && !isEditing && (
          <View style={infoStyles.verifiedBadge}>
            <Text style={infoStyles.verifiedText}>Verified ✓</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray500, marginBottom: 4 },
  valueContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  iconBox: { marginRight: spacing.sm, marginTop: 2 },
  value: { fontSize: fontSize.base, color: colors.foreground, fontWeight: '500' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: fontSize.sm },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, backgroundColor: colors.surfaceSecondary, color: colors.foreground,
  },
  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  verifiedBadge: {
    marginLeft: spacing.sm, backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  verifiedText: { color: '#16A34A', fontSize: fontSize.xs, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  // Top Nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  logoText: { fontSize: fontSize.lg, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },

  // Page Header
  pageHeader: { padding: spacing.xl, paddingBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.foreground, marginBottom: spacing.xl },
  
  avatarContainer: { alignSelf: 'center', marginBottom: spacing.lg, position: 'relative' },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: colors.white, ...shadows.md, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', ...shadows.sm,
    borderWidth: 2, borderColor: colors.white,
  },

  editMainBtn: {
    flexDirection: 'row', backgroundColor: colors.primary, alignSelf: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', gap: spacing.sm, ...shadows.sm,
  },
  editMainText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  
  editActionsTop: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  saveTopBtn: {
    flexDirection: 'row', backgroundColor: colors.success,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', gap: spacing.sm,
  },
  saveTopText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  cancelTopBtn: {
    flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', gap: spacing.sm,
  },
  cancelTopText: { color: colors.foreground, fontWeight: '600', fontSize: fontSize.sm },

  // Cards
  card: {
    backgroundColor: colors.white, marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  cardContent: { padding: spacing.lg, paddingBottom: 0 },

  // Logout
  logoutBtn: {
    marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: colors.white,
    borderRadius: borderRadius.lg, height: 48, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.destructive,
  },
  logoutText: { color: colors.destructive, fontSize: fontSize.base, fontWeight: '600' },
});

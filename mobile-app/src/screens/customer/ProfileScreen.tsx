import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { User, Phone, Mail, MapPin, Edit3, Save, X, Camera, Map } from 'lucide-react-native';
import { fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';
import { useTranslation } from '../../contexts/LanguageContext';

export default function ProfileScreen({ navigation }: any) {
  const { colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', address: '', email: '', businessName: '', pricePerLiter: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Permanently delete the account + all data (Google Play data-deletion policy).
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data (orders, bills, chats, subscriptions). This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const res = await apiRequest({ url: '/api/auth/account', method: 'DELETE' });
              const data: any = await res.json();
              if (data?.success) {
                Alert.alert('Account Deleted', 'Your account and data have been removed.', [
                  { text: 'OK', onPress: () => logout() },
                ]);
              } else {
                throw new Error(data?.message || 'Failed to delete account');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete your account. Please try again or email supportdooodhwala@gmail.com.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

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
            <InfoRow label="First Name" value={user?.firstName || (profile?.name || '').trim().split(/\s+/).filter(Boolean)[0] || 'Not provided'} />
            <InfoRow label="Last Name" value={user?.lastName || (profile?.name || '').trim().split(/\s+/).filter(Boolean).slice(1).join(' ') || 'Not provided'} />
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

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.8} disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, icon, isBadge, badgeColor, isMono, isVerified, isEditing, editValue, onEdit, multiline }: any) {
  const { colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const infoStyles = useMemo(
    () => createInfoStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );
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
          <View style={[infoStyles.badge, { backgroundColor: badgeColor ? `${badgeColor}20` : (isDark ? 'rgba(37,99,235,0.25)' : '#E4EAF3') }]}>
            <Text style={[infoStyles.badgeText, { color: badgeColor || colors.primary }]}>{value}</Text>
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

const createInfoStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  row: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.mutedForeground, marginBottom: 4, fontFamily },
  valueContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  iconBox: { marginRight: spacing.sm, marginTop: 2 },
  value: { fontSize: fontSize.base, color: colors.foreground, fontWeight: '500', fontFamily },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: fontSize.sm },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, backgroundColor: colors.surfaceSecondary, color: colors.foreground, fontFamily,
  },
  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600', fontFamily: fontFamilyBold },
  verifiedBadge: {
    marginLeft: spacing.sm, backgroundColor: isDark ? 'rgba(22,163,74,0.2)' : '#DFF0E6',
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  verifiedText: { color: '#2F7D5B', fontSize: fontSize.xs, fontWeight: '600', fontFamily: fontFamilyBold },
});

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Top Nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
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
    fontFamily: fontFamilyBold,
  },
  logoText: { fontSize: fontSize.lg, fontWeight: '900', color: colors.primary, letterSpacing: -0.5, fontFamily: fontFamilyBold },

  // Page Header
  pageHeader: { padding: spacing.xl, paddingBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.foreground, marginBottom: spacing.xl, fontFamily: fontFamilyBold },
  
  avatarContainer: { alignSelf: 'center', marginBottom: spacing.lg, position: 'relative' },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: colors.card, ...shadows.md, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', ...shadows.sm,
    borderWidth: 2, borderColor: colors.card,
  },

  editMainBtn: {
    flexDirection: 'row', backgroundColor: colors.primary, alignSelf: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', gap: spacing.sm, ...shadows.sm,
  },
  editMainText: { color: '#FFFFFF', fontWeight: '600', fontSize: fontSize.sm, fontFamily: fontFamilyBold },
  
  editActionsTop: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  saveTopBtn: {
    flexDirection: 'row', backgroundColor: colors.success,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', gap: spacing.sm,
  },
  saveTopText: { color: '#FFFFFF', fontWeight: '600', fontSize: fontSize.sm, fontFamily: fontFamilyBold },
  cancelTopBtn: {
    flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', gap: spacing.sm,
  },
  cancelTopText: { color: colors.foreground, fontWeight: '600', fontSize: fontSize.sm, fontFamily: fontFamilyBold },

  // Cards
  card: {
    backgroundColor: colors.card, marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground, fontFamily: fontFamilyBold },
  cardContent: { padding: spacing.lg, paddingBottom: 0 },

  // Logout
  logoutBtn: {
    marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: colors.card,
    borderRadius: borderRadius.lg, height: 48, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.destructive,
  },
  logoutText: { color: colors.destructive, fontSize: fontSize.base, fontWeight: '600', fontFamily: fontFamilyBold },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  deleteText: { color: colors.destructive, fontSize: fontSize.sm, fontWeight: '700', textDecorationLine: 'underline', fontFamily: fontFamilyBold },
});

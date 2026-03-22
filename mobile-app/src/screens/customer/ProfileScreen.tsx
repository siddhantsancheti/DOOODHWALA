import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { User, Phone, Mail, MapPin, Edit3, Save, X, LogOut } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', address: '', email: '' });

  const { data: customerProfile, isLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'],
    enabled: !!user && user.userType === 'customer',
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest({ url: '/api/customers/profile', method: 'PATCH', body: data });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      setIsEditing(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleEdit = () => {
    setEditData({
      name: customerProfile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      address: customerProfile?.address || '',
      email: user?.email || '',
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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <User size={40} color={colors.gray300} />
            )}
          </View>
          <Text style={styles.userName}>
            {customerProfile?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.userType?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={handleEdit} style={styles.editBtn} activeOpacity={0.7}>
                <Edit3 size={18} color={colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn} activeOpacity={0.7}>
                  <X size={18} color={colors.destructive} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateMutation.mutate(editData)} style={styles.saveBtn} activeOpacity={0.7}>
                  <Save size={18} color={colors.white} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <InfoRow
            icon={<User size={18} color={colors.mutedForeground} />}
            label="Full Name"
            value={customerProfile?.name || 'Not provided'}
            isEditing={isEditing}
            editValue={editData.name}
            onEdit={(val: string) => setEditData({ ...editData, name: val })}
          />
          <InfoRow
            icon={<Phone size={18} color={colors.mutedForeground} />}
            label="Phone Number"
            value={user?.phone || 'Not provided'}
          />
          <InfoRow
            icon={<Mail size={18} color={colors.mutedForeground} />}
            label="Email"
            value={user?.email || 'Not provided'}
            isEditing={isEditing}
            editValue={editData.email}
            onEdit={(val: string) => setEditData({ ...editData, email: val })}
            keyboardType="email-address"
          />
          <InfoRow
            icon={<MapPin size={18} color={colors.mutedForeground} />}
            label="Address"
            value={customerProfile?.address || 'Not provided'}
            isEditing={isEditing}
            editValue={editData.address}
            onEdit={(val: string) => setEditData({ ...editData, address: val })}
            multiline
            last
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.destructive} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, isEditing, editValue, onEdit, keyboardType, multiline, last }: any) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
      {icon}
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        {isEditing && onEdit ? (
          <TextInput
            style={[infoStyles.input, multiline && { height: 60, textAlignVertical: 'top' }]}
            value={editValue}
            onChangeText={onEdit}
            keyboardType={keyboardType}
            multiline={multiline}
          />
        ) : (
          <Text style={infoStyles.value}>{value}</Text>
        )}
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { marginLeft: spacing.lg, flex: 1 },
  label: { fontSize: fontSize.xs, color: colors.mutedForeground, fontWeight: fontWeight.medium, marginBottom: 4 },
  value: { fontSize: fontSize.base, color: colors.foreground, fontWeight: fontWeight.medium },
  input: {
    borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, backgroundColor: colors.surfaceSecondary, color: colors.foreground,
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.primary, alignItems: 'center',
    paddingVertical: spacing['4xl'], paddingBottom: spacing['4xl'] + 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surfaceSecondary, justifyContent: 'center',
    alignItems: 'center', marginBottom: spacing.lg,
    borderWidth: 3, borderColor: colors.white,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  userName: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginTop: spacing.sm,
  },
  roleText: { fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.semibold, letterSpacing: 1 },

  // Card
  card: {
    backgroundColor: colors.card, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl,
    padding: spacing.xl, marginTop: -20, ...shadows.lg,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.success, paddingHorizontal: spacing.md,
    height: 36, borderRadius: 18,
  },
  saveBtnText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  // Logout
  logoutBtn: {
    flexDirection: 'row', backgroundColor: colors.errorLight,
    marginHorizontal: spacing.lg, padding: spacing.lg,
    borderRadius: borderRadius.lg, justifyContent: 'center',
    alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm,
  },
  logoutText: { color: colors.destructive, fontWeight: fontWeight.bold, fontSize: fontSize.base },
});

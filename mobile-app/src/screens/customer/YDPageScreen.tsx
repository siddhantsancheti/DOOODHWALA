import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, useColorScheme, Modal, TextInput
} from 'react-native';
import { X, Heart, ArrowLeft, Clock, Settings, BarChart3, MessageCircle, Phone, Users, Plus, Star, Truck, ShoppingCart, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { lightColors, darkColors, borderRadius, spacing } from '../../theme';
import { useTranslation } from '../../contexts/LanguageContext';
import ChatComponent from '../../components/ChatComponent';
import AnalyticsComponent from '../../components/AnalyticsComponent';

function extractLocationParts(address: string) {
  if (!address) return { city: "", area: "" };
  const parts = address.split(',').map(part => part.trim().toLowerCase());
  if (parts.length >= 3) {
    return { city: parts[parts.length - 3], area: parts[0] };
  } else if (parts.length === 2) {
    return { city: parts[0], area: parts[0] };
  } else {
    return { city: parts[0] || "", area: parts[0] || "" };
  }
}

export default function YDPageScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  
  const styles = React.useMemo(() => createStyles(colors, isDark, fontFamily, fontFamilyBold), [colors, isDark, fontFamily, fontFamilyBold]);

  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'analytics'>('overview');
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMilkman, setSelectedMilkman] = useState<any>(null);
  const [groupCode, setGroupCode] = useState("");
  const [groupPassword, setGroupPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const milkmanListYRef = useRef<number>(0);

  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const { data: milkmen } = useQuery<any>({
    queryKey: ['/api/milkmen'], enabled: !!user,
  });

  const removeMilkmanMutation = useMutation({
    mutationFn: async () => {
      await apiRequest({ url: '/api/customers/unassign-yd', method: 'POST' });
    },
    onSuccess: () => {
      Alert.alert(t('dairymanRemoved'), t('dairymanRemoved'));
      queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      setActiveTab('overview');
    },
    onError: (e: any) => Alert.alert(t('error'), e.message),
  });

  const handleJoinGroup = async () => {
    if (!groupCode || !groupPassword) {
      Alert.alert(t('error'), t('fillRequired'));
      return;
    }

    setIsJoining(true);
    try {
      const milkmanIdMatch = groupCode.match(/^MILK(\d+)GRP$/);
      if (!milkmanIdMatch) throw new Error("Invalid format: MILK{number}GRP");

      const milkmanId = parseInt(milkmanIdMatch[1]);
      const milkman = milkmen?.find((m: any) => m.id === milkmanId);
      if (!milkman) throw new Error("Milkman not found");

      await apiRequest({ url: "/api/customers/assign-yd", method: "PATCH", body: { milkmanId, groupPassword } });
      Alert.alert("Success", "Successfully joined group!");
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      
      setGroupCode("");
      setGroupPassword("");
      setShowJoinGroupModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsJoining(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const assignedMilkmanId = customerProfile?.assignedMilkmanId;
  const yourDairyman = (milkmen && Array.isArray(milkmen))
    ? milkmen.find((m: any) => m.id === assignedMilkmanId) || null
    : null;

  // Check for pending service requests
  const { data: serviceRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/service-requests/customer'], enabled: !!user,
  });

  const pendingRequest = !assignedMilkmanId && serviceRequests.length > 0 && serviceRequests[0].status === 'pending'
    ? serviceRequests[0]
    : null;

  const unassignedMilkmen = (milkmen && Array.isArray(milkmen))
    ? milkmen.filter((m: any) => {
        if (m.id === assignedMilkmanId) return false;
        if (!customerProfile?.address || !m.address) return true;
        const custLoc = extractLocationParts(customerProfile.address);
        const milkLoc = extractLocationParts(m.address);
        return custLoc.city === milkLoc.city;
      })
    : [];

  const surfaceColor = colors.card;
  const textColor = colors.foreground;
  const textMuted = colors.mutedForeground;
  const borderColor = colors.border;

  const renderOverview = () => (
    <ScrollView ref={scrollRef} style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Pending Request Alert matching web app */}
      {pendingRequest && (
        <View style={[styles.pendingCard, { backgroundColor: isDark ? '#422006' : '#FEFCE8', borderColor: isDark ? '#713F12' : '#FEF08A' }]}>
          <View style={styles.pendingHeader}>
            <View style={[styles.pendingIconBg, { backgroundColor: isDark ? '#713F12' : '#FEF9C3' }]}>
              <Clock size={20} color="#CA8A04" />
            </View>
            <View style={styles.pendingTextGroup}>
              <Text style={[styles.pendingTitle, { color: isDark ? '#FEF08A' : '#713F12' }]}>Request Pending</Text>
              <Text style={[styles.pendingSubtitle, { color: isDark ? '#FDE047' : '#854D0E' }]}>Waiting for acceptance from dairyman.</Text>
            </View>
            <TouchableOpacity 
              style={[styles.pendingActionBtn, { backgroundColor: isDark ? '#713F12' : '#FEF9C3' }]}
              onPress={() => Alert.alert("Pending Request", `Services: ${pendingRequest.services?.map((s: any) => s.name).join(', ')}`)}
            >
              <Text style={[styles.pendingActionText, { color: isDark ? '#FEF08A' : '#713F12' }]}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {yourDairyman ? (
        <View style={styles.mainContainer}>
          {/* Main Dairyman Card - Clickable to open chat */}
          <TouchableOpacity
            style={[styles.premiumCard]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('messages')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#1E40AF40' : '#DBEAFE' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {yourDairyman.contactName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.dairymanName, { color: isDark ? '#F9FAFB' : '#1E3A8A' }]}>
                  {yourDairyman.contactName}
                </Text>
                <Text style={[styles.businessName, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                  {yourDairyman.businessName}
                </Text>
                <Text style={styles.tapToChatHint}>
                  {t('clickToChatAndOrders') || "Click to chat and place daily orders"}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowDetailsModal(true);
                  }}
                >
                  <Settings size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    setActiveTab('analytics');
                  }}
                >
                  <BarChart3 size={20} color={colors.primary} />
                </TouchableOpacity>
                <MessageCircle size={24} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Additional Actions Section */}
          <View style={[styles.sectionContainer, { marginTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {t('additionalActions') || "Additional Actions"}
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.bigActionBtn, { borderColor }]}
                onPress={() => Linking.openURL(`tel:${yourDairyman.phone}`)}
              >
                <Phone size={22} color={textColor} />
                <Text style={[styles.bigActionText, { color: textColor }]}>
                  {t('callDairyman') || "Call Dairyman"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bigActionBtn, { borderColor }]}
                onPress={() => setShowJoinGroupModal(true)}
              >
                <Users size={22} color={textColor} />
                <Text style={[styles.bigActionText, { color: textColor }]}>
                  {t('joinGroup') || "Join Group"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Discover More Section */}
          <View style={[styles.sectionContainer, { marginTop: 24 }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {t('discoverMore')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (unassignedMilkmen.length > 0) {
                    scrollRef.current?.scrollTo({ y: milkmanListYRef.current, animated: true });
                  } else {
                    Alert.alert(t('search') || 'Search', t('noMilkmenInCity') || 'No other milkmen found in your city.');
                  }
                }}
              >
                <Plus size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Heart size={48} color={colors.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>{t('noDoodhwalaAssigned')}</Text>
          <Text style={[styles.emptySubtitle, { color: textMuted }]}>{t('joinGroupDesc')}</Text>
          <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: colors.primary }]} onPress={() => setShowJoinGroupModal(true)}>
            <Text style={styles.mainActionBtnText}>{t('joinNow')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {unassignedMilkmen.length > 0 && (
        <View style={{ marginTop: 8 }} onLayout={(e) => { milkmanListYRef.current = e.nativeEvent.layout.y; }}>
          {unassignedMilkmen.map((m: any) => (
            <View key={m.id} style={[styles.milkmanCard, { backgroundColor: surfaceColor, borderColor }]}>
              <View style={styles.milkmanTop}>
                <View style={[styles.milkmanAvatarSmall, { backgroundColor: isDark ? '#4B5563' : '#F3E8FF' }]}>
                  <Truck size={18} color="#9333EA" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.milkmanTitle, { color: textColor }]}>{m.businessName}</Text>
                  <Text style={{ color: textMuted, fontSize: 13 }}>
                    <Star size={12} color="#EAB308" fill="#EAB308" /> {m.rating || "4.5"} • ₹{m.pricePerLiter}/L
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.smallRequestBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setSelectedMilkman(m);
                    setShowDetailsModal(true);
                  }}
                >
                  <Text style={styles.smallRequestBtnText}>{t('view')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {yourDairyman && (
        <TouchableOpacity
          style={{ marginTop: 32, alignSelf: 'center' }}
          onPress={() => {
            Alert.alert(t('removeDairyman'), t('removeDairymanDesc'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('decline'), style: 'destructive', onPress: () => removeMilkmanMutation.mutate() }
            ]);
          }}
        >
          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', fontFamily }}>{t('unassignDairyman')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Nav matching web-clean style */}
      <View style={[styles.topNav, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <View style={styles.navLeft}>
          <Heart size={20} color="#DC2626" />
          <Text style={[styles.navTitle, { color: textColor }]}>{t('yourDoodhwala')}</Text>
        </View>
        <TouchableOpacity style={styles.dashboardBtn} onPress={() => navigation.navigate('CustomerHome')}>
          <ArrowLeft size={14} color={textMuted} />
          <Text style={[styles.dashboardBtnText, { color: textMuted }]}>{t('dashboard')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs directly integrated as in web app */}
      <View style={[styles.tabBar, { borderBottomColor: borderColor, backgroundColor: surfaceColor }]}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'overview' && styles.activeTabItem]} onPress={() => setActiveTab('overview')}>
          <Info size={18} color={activeTab === 'overview' ? colors.primary : textMuted} />
          <Text style={[styles.tabItemText, { color: activeTab === 'overview' ? colors.primary : textMuted }]}>{t('summary')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'messages' && styles.activeTabItem]} onPress={() => setActiveTab('messages')}>
          <MessageCircle size={18} color={activeTab === 'messages' ? colors.primary : textMuted} />
          <Text style={[styles.tabItemText, { color: activeTab === 'messages' ? colors.primary : textMuted }]}>{t('messages')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'analytics' && styles.activeTabItem]} onPress={() => setActiveTab('analytics')}>
          <BarChart3 size={18} color={activeTab === 'analytics' ? colors.primary : textMuted} />
          <Text style={[styles.tabItemText, { color: activeTab === 'analytics' ? colors.primary : textMuted }]}>{t('analytics')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'messages' && (
          yourDairyman ? (
            <ChatComponent customerId={customerProfile?.id} milkmanId={assignedMilkmanId} embedded={true} navigation={navigation} />
          ) : (
            <View style={styles.centered}><Text style={{ color: textMuted, fontFamily }}>{t('assignToChat')}</Text></View>
          )
        )}
        {activeTab === 'analytics' && (
          yourDairyman ? (
            <AnalyticsComponent milkman={yourDairyman} />
          ) : (
            <View style={styles.centered}><Text style={{ color: textMuted, fontFamily }}>{t('assignForAnalytics')}</Text></View>
          )
        )}
      </View>

      {/* Join Group Modal */}
      <Modal visible={showJoinGroupModal} animationType="slide" transparent={true} onRequestClose={() => setShowJoinGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentSmall, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitleSmall, { color: textColor }]}>{t('joinGroup')}</Text>
              <TouchableOpacity onPress={() => setShowJoinGroupModal(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: textColor }]}>{t('groupCode')}</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, fontFamily }]} placeholder="e.g. MILK1GRP" placeholderTextColor={textMuted} value={groupCode} onChangeText={setGroupCode} autoCapitalize="characters" />
              <Text style={[styles.inputLabel, { color: textColor, marginTop: 16 }]}>{t('password')}</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, fontFamily }]} placeholder="e.g. businessname123" placeholderTextColor={textMuted} value={groupPassword} onChangeText={setGroupPassword} secureTextEntry />
            </View>
            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleJoinGroup} disabled={isJoining}>
              {isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>{t('joinNow')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="fade" transparent={true} onRequestClose={() => setShowDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentSmall, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitleSmall, { color: textColor }]}>{t('dairymanDetails')}</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('business')}</Text><Text style={[styles.infoValue, { color: textColor }]}>{selectedMilkman?.businessName || yourDairyman?.businessName}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('contact')}</Text><Text style={[styles.infoValue, { color: textColor }]}>{selectedMilkman?.contactName || yourDairyman?.contactName}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('pricePerLiterShort')}</Text><Text style={[styles.infoValue, { color: textColor }]}>₹{selectedMilkman?.pricePerLiter || yourDairyman?.pricePerLiter}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('time')}</Text><Text style={[styles.infoValue, { color: textColor }]}>{selectedMilkman?.deliveryTimeStart || yourDairyman?.deliveryTimeStart} - {selectedMilkman?.deliveryTimeEnd || yourDairyman?.deliveryTimeEnd}</Text></View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>{t('address')}</Text><Text style={[styles.infoValue, { color: textColor, textAlign: 'right', flex: 1, marginLeft: 20 }]}>{selectedMilkman?.address || yourDairyman?.address}</Text></View>
            </View>
            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: textColor }]} onPress={() => setShowDetailsModal(false)}>
              <Text style={[styles.modalSubmitBtnText, { color: surfaceColor }]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) => StyleSheet.create({
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navTitle: { fontSize: 18, fontWeight: '700', fontFamily: fontFamilyBold },
  dashboardBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6, borderColor: '#E5E7EB' },
  dashboardBtnText: { fontSize: 13, fontWeight: '600', fontFamily },
  
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 4 },
  activeTabItem: { borderBottomColor: '#2563EB' },
  tabItemText: { fontSize: 13, fontWeight: '600', fontFamily: fontFamilyBold },

  tabContent: { flex: 1, padding: 16 },
  mainContainer: { flex: 1 },
  premiumCard: {
    backgroundColor: isDark ? '#1E3A8A20' : '#EFF6FF',
    borderColor: isDark ? '#1E40AF' : '#BFDBFE',
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fontFamilyBold,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  dairymanName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fontFamilyBold,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBold,
    marginTop: 2,
  },
  tapToChatHint: {
    fontSize: 12,
    color: isDark ? '#93C5FD' : '#2563EB',
    marginTop: 4,
    fontFamily,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF50',
  },
  sectionContainer: {
    width: '100%',
  },
  actionsGrid: {
    gap: 12,
    marginTop: 12,
  },
  bigActionBtn: {
    width: '100%',
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
  },
  bigActionText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBold,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: fontFamilyBold },
  
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, fontFamily: fontFamilyBold },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, fontFamily },
  mainActionBtn: { paddingHorizontal: 32, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  mainActionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, fontFamily: fontFamilyBold },

  milkmanCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  milkmanTop: { flexDirection: 'row', alignItems: 'center' },
  milkmanAvatarSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  milkmanTitle: { fontSize: 15, fontWeight: '600', fontFamily: fontFamilyBold },
  smallRequestBtn: { paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  smallRequestBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', fontFamily: fontFamilyBold },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentSmall: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, elevation: 10 },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitleSmall: { fontSize: 20, fontWeight: '700', fontFamily: fontFamilyBold },
  inputContainer: { width: '100%' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, fontFamily: fontFamilyBold },
  modalInput: { width: '100%', height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, fontSize: 16 },
  modalSubmitBtn: { width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: fontFamilyBold },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#EEE' },
  infoLabel: { fontSize: 14, color: isDark ? '#9CA3AF' : '#666', fontFamily },
  infoValue: { fontSize: 14, fontWeight: '600', fontFamily: fontFamilyBold },
  pendingCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  pendingTextGroup: { flex: 1 },
  pendingTitle: { fontSize: 16, fontWeight: '700' },
  pendingSubtitle: { fontSize: 12, marginTop: 2 },
  pendingActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pendingActionText: { fontSize: 13, fontWeight: '700' },
});

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, useColorScheme, Modal, TextInput
} from 'react-native';
import { X, Heart, ArrowLeft, Clock, Settings, BarChart3, MessageCircle, Phone, Users, Plus, Star, Truck, ShoppingCart, Info, CreditCard, LogOut, Copy, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { lightColors, darkColors, borderRadius, spacing } from '../../theme';
import { useTranslation } from '../../contexts/LanguageContext';
import { useWebSocket } from '../../hooks/useWebSocket';
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

  const [showChat, setShowChat] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupMode, setGroupMode] = useState<'join' | 'create'>('create');
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [discontinuing, setDiscontinuing] = useState(false);

  // Service request modal state — products + time only (milkman sets price later)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMilkman, setRequestMilkman] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  const { data: customerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const { data: milkmen } = useQuery<any>({
    queryKey: ['/api/milkmen'], enabled: !!user,
  });

  // The household group the customer belongs to (or null).
  const { data: myGroup } = useQuery<any>({
    queryKey: ['/api/groups/mine'], enabled: !!user,
  });

  // Send a new service request to a milkman (products + time only).
  const createRequestMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest({ url: '/api/service-requests', method: 'POST', body });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
      setShowRequestModal(false);
      setSelectedProducts([]);
      setSelectedSlot("");
      setRequestNotes("");
      Alert.alert('Request Sent', 'Your service request was sent. The dairyman will set a price and respond shortly.');
    },
    onError: (e: any) => Alert.alert(t('error'), e.message || 'Failed to send request'),
  });

  // Create a new household group for a milkman.
  const createGroupMutation = useMutation({
    mutationFn: async (body: any) => apiRequest({ url: '/api/groups', method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups/mine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      setShowGroupModal(false);
      setGroupName("");
      Alert.alert('Group Created', 'Your household group is ready. Share the code with family members to let them join.');
    },
    onError: (e: any) => Alert.alert(t('error'), e.message || 'Failed to create group'),
  });

  // Real-time: refresh when the dairyman responds to a request.
  const { addMessageHandler, removeMessageHandler } = useWebSocket();
  React.useEffect(() => {
    const handler = (data: any) => {
      if (data.type === 'service_request_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/service-requests/customer'] });
        queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      }
      if (data.type === 'group_discontinued') {
        queryClient.invalidateQueries({ queryKey: ['/api/groups/mine'] });
        queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      }
    };
    addMessageHandler('yd-page', handler);
    return () => removeMessageHandler('yd-page');
  }, [addMessageHandler, removeMessageHandler]);

  const getDeliverySlots = (m: any): string[] => {
    if (m?.deliverySlots && Array.isArray(m.deliverySlots) && m.deliverySlots.length > 0) {
      return m.deliverySlots
        .filter((s: any) => s.isActive !== false)
        .map((s: any) => `${s.name} (${s.startTime}-${s.endTime})`);
    }
    if (m?.deliveryTimeStart && m?.deliveryTimeEnd) {
      return [`${m.deliveryTimeStart} - ${m.deliveryTimeEnd}`];
    }
    return ['Morning', 'Evening'];
  };

  const openRequestModal = (m: any) => {
    setRequestMilkman(m);
    setSelectedProducts([]);
    setRequestNotes("");
    const slots = getDeliverySlots(m);
    setSelectedSlot(slots[0] || "");
    setShowRequestModal(true);
  };

  const toggleProduct = (name: string) => {
    setSelectedProducts((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSendRequest = () => {
    if (!requestMilkman) return;
    const items: any[] = Array.isArray(requestMilkman.dairyItems) ? requestMilkman.dairyItems : [];
    // Products + time only — no quantity, no price. Milkman decides price later.
    const services = selectedProducts.map((name) => {
      const item = items.find((i: any) => i.name === name);
      return { name, unit: item?.unit || 'liter' };
    });
    if (services.length === 0) {
      Alert.alert('Select Products', 'Please select at least one product.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Delivery Time', 'Please choose a delivery time.');
      return;
    }
    const notes = `Preferred delivery: ${selectedSlot}${requestNotes ? `\n${requestNotes}` : ''}`;
    createRequestMutation.mutate({ milkmanId: requestMilkman.id, services, customerNotes: notes });
  };

  // Create a household group for the currently-assigned (or chosen) milkman.
  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Group Name', 'Please enter a name for your group.');
      return;
    }
    const milkmanId = customerProfile?.assignedMilkmanId || requestMilkman?.id;
    if (!milkmanId) {
      Alert.alert('Select a Dairyman', 'Get assigned to a dairyman first, then create a group.');
      return;
    }
    createGroupMutation.mutate({ name: groupName.trim(), milkmanId });
  };

  // Join an existing household group by its share code.
  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert(t('error'), 'Please enter a group code.');
      return;
    }
    setIsJoining(true);
    try {
      await apiRequest({ url: "/api/groups/join", method: "POST", body: { chatCode: groupCode.trim().toUpperCase() } });
      Alert.alert("Success", "You've joined the household group!");
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/mine"] });
      setGroupCode("");
      setShowGroupModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || 'Could not join group');
    } finally {
      setIsJoining(false);
    }
  };

  // Settle outstanding bill, then discontinue (unassign / delete group).
  const handleDiscontinue = async () => {
    setDiscontinuing(true);
    try {
      if (myGroup?.id) {
        // Group: any member settles the combined bill, then group is deleted.
        const billRes = await apiRequest({ url: `/api/groups/${myGroup.id}/bill`, method: 'GET' });
        const bill: any = await billRes.json();
        const amount = parseFloat(bill?.totalAmount || '0');
        if (bill?.id && amount > 0) {
          setShowSettingsModal(false);
          navigation.navigate('Checkout', {
            amount, orderId: `BILL_${bill.id}`, description: 'Final group settlement',
            paymentType: 'consolidated', groupId: myGroup.id, unassignAfter: true,
          });
        } else {
          await apiRequest({ url: `/api/groups/${myGroup.id}/discontinue`, method: 'POST' });
          finishDiscontinue();
        }
      } else {
        // Individual: settle final bill, then unassign.
        const finRes = await apiRequest({ url: '/api/customers/finalize-bill', method: 'POST' });
        const res: any = await finRes.json();
        const amount = parseFloat(res?.amount || '0');
        if (res?.bill?.id && amount > 0) {
          setShowSettingsModal(false);
          navigation.navigate('Checkout', {
            amount, orderId: `BILL_${res.bill.id}`, description: 'Final settlement',
            paymentType: 'single', unassignAfter: true,
          });
        } else {
          await apiRequest({ url: '/api/customers/unassign-yd', method: 'POST' });
          finishDiscontinue();
        }
      }
    } catch (e: any) {
      Alert.alert(t('error'), e.message || 'Could not discontinue');
    } finally {
      setDiscontinuing(false);
    }
  };

  const finishDiscontinue = () => {
    setShowSettingsModal(false);
    queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
    queryClient.invalidateQueries({ queryKey: ['/api/groups/mine'] });
    Alert.alert('Service Discontinued', 'You have been unassigned from this dairyman.');
  };

  const confirmDiscontinue = () => {
    Alert.alert(
      myGroup?.id ? 'Discontinue Group' : 'Unassign Dairyman',
      myGroup?.id
        ? 'This will settle the outstanding group bill, delete the group, and unassign the dairyman for ALL members. Continue?'
        : 'This will settle any outstanding bill and then unassign your dairyman. Continue?',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: handleDiscontinue },
      ]
    );
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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
          {/* Assigned dairyman — single button that opens the chat to place orders */}
          <TouchableOpacity
            style={[styles.premiumCard]}
            activeOpacity={0.9}
            onPress={() => setShowChat(true)}
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
                  {t('clickToChatAndOrders') || "Tap to chat & place daily orders"}
                </Text>
              </View>
              <MessageCircle size={28} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Settings + Pay Bills */}
          <View style={styles.assignedActionsRow}>
            <TouchableOpacity
              style={[styles.assignedActionBtn, { borderColor, backgroundColor: surfaceColor }]}
              onPress={() => setShowSettingsModal(true)}
            >
              <Settings size={20} color={textColor} />
              <Text style={[styles.assignedActionText, { color: textColor }]}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.assignedActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('Bills')}
            >
              <CreditCard size={20} color="#FFFFFF" />
              <Text style={[styles.assignedActionText, { color: '#FFFFFF' }]}>Pay Bills</Text>
            </TouchableOpacity>
          </View>

          {/* Household group banner / create-join entry */}
          {myGroup?.id ? (
            <View style={[styles.groupBanner, { backgroundColor: isDark ? '#064E3B30' : '#ECFDF5', borderColor: isDark ? '#065F46' : '#A7F3D0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Users size={18} color="#10B981" />
                <Text style={[styles.groupBannerTitle, { color: textColor }]}>{myGroup.chatName}</Text>
                <View style={[styles.groupCountPill, { backgroundColor: isDark ? '#065F46' : '#D1FAE5' }]}>
                  <Text style={styles.groupCountText}>{myGroup.memberCount || myGroup.members?.length || 1} members</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.groupCodeRow}
                onPress={() => Alert.alert('Group Code', `Share this code with family members so they can join:\n\n${myGroup.chatCode}`)}
              >
                <Text style={[styles.groupCodeLabel, { color: textMuted }]}>Share code:</Text>
                <Text style={[styles.groupCodeValue, { color: colors.primary }]}>{myGroup.chatCode}</Text>
                <Copy size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.bigActionBtn, { borderColor, marginTop: 16 }]}
              onPress={() => { setGroupMode('create'); setShowGroupModal(true); }}
            >
              <Users size={22} color={textColor} />
              <Text style={[styles.bigActionText, { color: textColor }]}>Create / Join household group</Text>
            </TouchableOpacity>
          )}

          {/* Call dairyman */}
          <TouchableOpacity
            style={[styles.bigActionBtn, { borderColor, marginTop: 12 }]}
            onPress={() => Linking.openURL(`tel:${yourDairyman.phone}`)}
          >
            <Phone size={22} color={textColor} />
            <Text style={[styles.bigActionText, { color: textColor }]}>{t('callDairyman') || "Call Dairyman"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.emptyState}>
            <Heart size={48} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>{t('noDoodhwalaAssigned')}</Text>
            <Text style={[styles.emptySubtitle, { color: textMuted }]}>Join a household group with a code, or pick a dairyman below to get started.</Text>
            <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: colors.primary }]} onPress={() => { setGroupMode('join'); setShowGroupModal(true); }}>
              <Text style={styles.mainActionBtnText}>Join with Code</Text>
            </TouchableOpacity>
          </View>

          {unassignedMilkmen.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {unassignedMilkmen.map((m: any) => (
                <View key={m.id} style={[styles.milkmanCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.milkmanTop}>
                    <View style={[styles.milkmanAvatarSmall, { backgroundColor: isDark ? '#4B5563' : '#F3E8FF' }]}>
                      <Truck size={18} color="#9333EA" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.milkmanTitle, { color: textColor }]}>{m.businessName}</Text>
                      <Text style={{ color: textMuted, fontSize: 13 }}>
                        <Star size={12} color="#EAB308" fill="#EAB308" /> {m.rating || "4.5"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.smallRequestBtn, { backgroundColor: colors.primary }]}
                      onPress={() => openRequestModal(m)}
                    >
                      <Text style={styles.smallRequestBtnText}>Select</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
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

      <View style={{ flex: 1 }}>
        {showChat && yourDairyman ? (
          <View style={{ flex: 1 }}>
            <View style={[styles.chatHeader, { borderBottomColor: borderColor, backgroundColor: surfaceColor }]}>
              <TouchableOpacity onPress={() => setShowChat(false)} style={styles.chatBackBtn}>
                <ArrowLeft size={22} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.chatHeaderTitle, { color: textColor }]} numberOfLines={1}>
                {yourDairyman.businessName}
              </Text>
              <View style={{ width: 22 }} />
            </View>
            <ChatComponent customerId={customerProfile?.id} milkmanId={assignedMilkmanId} embedded={true} navigation={navigation} />
          </View>
        ) : (
          renderOverview()
        )}
      </View>

      {/* Group Modal (Create / Join) */}
      <Modal visible={showGroupModal} animationType="slide" transparent={true} onRequestClose={() => setShowGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentSmall, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitleSmall, { color: textColor }]}>Household Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>

            {/* Create / Join toggle */}
            <View style={[styles.segmentRow, { borderColor }]}>
              <TouchableOpacity
                style={[styles.segmentBtn, groupMode === 'create' && { backgroundColor: colors.primary }]}
                onPress={() => setGroupMode('create')}
              >
                <Text style={[styles.segmentText, { color: groupMode === 'create' ? '#FFF' : textColor }]}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, groupMode === 'join' && { backgroundColor: colors.primary }]}
                onPress={() => setGroupMode('join')}
              >
                <Text style={[styles.segmentText, { color: groupMode === 'join' ? '#FFF' : textColor }]}>Join</Text>
              </TouchableOpacity>
            </View>

            {groupMode === 'create' ? (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Group Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, fontFamily }]}
                  placeholder="e.g. Sharma Family" placeholderTextColor={textMuted}
                  value={groupName} onChangeText={setGroupName}
                />
                <Text style={{ color: textMuted, fontSize: 12, marginTop: 8, fontFamily }}>
                  Creates a shared group for {customerProfile?.assignedMilkmanId ? 'your dairyman' : 'the dairyman you select'}. All members order into one chat and share one monthly bill.
                </Text>
                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleCreateGroup} disabled={createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Create Group</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Group Code</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, fontFamily }]}
                  placeholder="e.g. GRP7QX" placeholderTextColor={textMuted}
                  value={groupCode} onChangeText={setGroupCode} autoCapitalize="characters"
                />
                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleJoinGroup} disabled={isJoining}>
                  {isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Join Group</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Settings Modal (details + analytics + discontinue) */}
      <Modal visible={showSettingsModal} animationType="slide" transparent={true} onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentSmall, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitleSmall, { color: textColor }]}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('business')}</Text><Text style={[styles.infoValue, { color: textColor }]}>{yourDairyman?.businessName}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('contact')}</Text><Text style={[styles.infoValue, { color: textColor }]}>{yourDairyman?.contactName}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('time')}</Text><Text style={[styles.infoValue, { color: textColor }]}>{yourDairyman?.deliveryTimeStart} - {yourDairyman?.deliveryTimeEnd}</Text></View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>{t('address')}</Text><Text style={[styles.infoValue, { color: textColor, textAlign: 'right', flex: 1, marginLeft: 20 }]}>{yourDairyman?.address}</Text></View>
            </View>

            <TouchableOpacity
              style={[styles.bigActionBtn, { borderColor, marginTop: 4 }]}
              onPress={() => { setShowSettingsModal(false); setShowAnalyticsModal(true); }}
            >
              <BarChart3 size={20} color={textColor} />
              <Text style={[styles.bigActionText, { color: textColor }]}>{t('analytics') || 'Analytics'}</Text>
            </TouchableOpacity>

            {/* Mandatory: discontinue / unassign */}
            <TouchableOpacity
              style={[styles.discontinueBtn]}
              onPress={confirmDiscontinue}
              disabled={discontinuing}
            >
              {discontinuing ? <ActivityIndicator color="#EF4444" /> : (
                <>
                  <LogOut size={18} color="#EF4444" />
                  <Text style={styles.discontinueText}>{myGroup?.id ? 'Discontinue Group' : 'Unassign Dairyman'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal visible={showAnalyticsModal} animationType="slide" transparent={false} onRequestClose={() => setShowAnalyticsModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={[styles.chatHeader, { borderBottomColor: borderColor, backgroundColor: surfaceColor }]}>
            <TouchableOpacity onPress={() => setShowAnalyticsModal(false)} style={styles.chatBackBtn}>
              <ArrowLeft size={22} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.chatHeaderTitle, { color: textColor }]}>{t('analytics') || 'Analytics'}</Text>
            <View style={{ width: 22 }} />
          </View>
          {yourDairyman && <AnalyticsComponent milkman={yourDairyman} />}
        </SafeAreaView>
      </Modal>

      {/* Service Request Modal */}
      <Modal visible={showRequestModal} animationType="slide" transparent={true} onRequestClose={() => setShowRequestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentSmall, { backgroundColor: surfaceColor, maxHeight: '88%' }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitleSmall, { color: textColor }]} numberOfLines={1}>
                Request {requestMilkman?.businessName || 'Dairyman'}
              </Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}><X size={24} color={textColor} /></TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: textColor }]}>Select Products</Text>
              <Text style={{ color: textMuted, fontSize: 12, fontFamily, marginBottom: 8 }}>
                Pick the products you want. Your dairyman will set the price after accepting.
              </Text>
              {(Array.isArray(requestMilkman?.dairyItems) ? requestMilkman.dairyItems : [])
                .filter((i: any) => i.isAvailable !== false)
                .map((item: any, idx: number) => {
                  const selected = selectedProducts.includes(item.name);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.reqProductRow, { borderColor }]}
                      onPress={() => toggleProduct(item.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reqProductName, { color: textColor, flex: 1 }]}>{item.name}</Text>
                      <View style={[
                        styles.checkBox,
                        { borderColor: selected ? colors.primary : borderColor, backgroundColor: selected ? colors.primary : 'transparent' },
                      ]}>
                        {selected && <Check size={16} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {(!requestMilkman?.dairyItems || requestMilkman.dairyItems.length === 0) && (
                <Text style={{ color: textMuted, fontSize: 13, fontFamily, paddingVertical: 12 }}>
                  This dairyman has not listed any products yet.
                </Text>
              )}

              <Text style={[styles.inputLabel, { color: textColor, marginTop: 16 }]}>Delivery Time</Text>
              <View style={styles.reqSlotRow}>
                {getDeliverySlots(requestMilkman).map((slot, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.reqSlotChip,
                      { borderColor },
                      selectedSlot === slot && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[styles.reqSlotText, { color: selectedSlot === slot ? '#FFFFFF' : textColor }]}>{slot}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: textColor, marginTop: 16 }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, fontFamily, height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Any special instructions"
                placeholderTextColor={textMuted}
                value={requestNotes}
                onChangeText={setRequestNotes}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSendRequest}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.modalSubmitBtnText}>Send Request</Text>}
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

  // Service request modal
  reqProductRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  reqProductName: { fontSize: 15, fontWeight: '600', fontFamily: fontFamilyBold },
  reqQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqQtyBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  reqQtyBtnText: { fontSize: 18, fontWeight: '700' },
  reqQtyVal: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center', fontFamily: fontFamilyBold },
  reqSlotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  reqSlotChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  reqSlotText: { fontSize: 13, fontWeight: '600', fontFamily },
  checkBox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  // Assigned layout
  assignedActionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  assignedActionBtn: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  assignedActionText: { fontSize: 15, fontWeight: '700', fontFamily: fontFamilyBold },

  // Group banner
  groupBanner: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  groupBannerTitle: { fontSize: 15, fontWeight: '700', marginLeft: 8, fontFamily: fontFamilyBold },
  groupCountPill: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  groupCountText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  groupCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  groupCodeLabel: { fontSize: 13, fontFamily },
  groupCodeValue: { fontSize: 15, fontWeight: '800', letterSpacing: 1, fontFamily: fontFamilyBold },

  // Chat / analytics full-screen header
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  chatBackBtn: { padding: 4 },
  chatHeaderTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: fontFamilyBold },

  // Group modal segment
  segmentRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '700', fontFamily: fontFamilyBold },

  // Discontinue
  discontinueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: 'transparent', marginTop: 16 },
  discontinueText: { color: '#EF4444', fontSize: 15, fontWeight: '700', fontFamily: fontFamilyBold },
});

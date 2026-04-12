import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, useColorScheme, Platform, Modal, TextInput, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, MapPin, Receipt, User, Settings, Users, ShoppingCart, Home as HomeIcon, X, Bell, Calendar, Clock, ChevronRight, MessageCircle
} from 'lucide-react-native';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';
import {
  Moon, Sun, Languages, LogOut, Headset, Package, Check, Star
} from 'lucide-react-native';
import { useTranslation } from '../../contexts/LanguageContext';
import { Language } from '../../lib/translations';

interface DashboardProps {
  navigation: any;
}

export default function CustomerDashboardScreen({ navigation }: DashboardProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme() || 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const isDark = colorScheme === 'dark';

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/customers/profile'], enabled: !!user,
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const { logout } = useAuth();
  const { t, language, setLanguage, fontFamily, fontFamilyBold, colors: themeColors, isDark: themeIsDark } = useTranslation();

  const [settingsForm, setSettingsForm] = useState({
    milkType: 'Fresh Milk',
    subscriptionType: 'Daily',
    weekendDelivery: true,
    holidayDelivery: false,
    smsNotifications: true,
    emailNotifications: false,
    specialInstructions: '',
    paymentMethod: 'Monthly Postpaid',
    billingCycle: 'Monthly (1st to 30th)',
    deliveryTime: '7:00 - 7:30 AM'
  });

  useEffect(() => {
    if (profile?.settings) {
      try {
        const savedSettings = typeof profile.settings === 'string' ? JSON.parse(profile.settings) : profile.settings;
        setSettingsForm(prev => ({ ...prev, ...savedSettings }));
      } catch (e) {
        console.error("Error parsing settings:", e);
      }
    }
  }, [profile]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof settingsForm) => {
      return await apiRequest({
        url: "/api/customers/profile",
        method: "PATCH",
        body: { 
          settings: settings // The backend now handles this field
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      setShowSettingsModal(false);
      Alert.alert(t('success'), t('profileUpdated'));
    },
    onError: (error: Error) => {
      Alert.alert(t('error'), error.message || t('waitTryAgain'));
    }
  });

  if (profileLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const surfaceColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#F3F4F6';

  const handleNewOrderClick = () => {
    // Redirect order flow to chat based on assigned YD
    if (profile?.assignedMilkmanId) {
      navigation.navigate('Chat', { 
        customerId: profile?.id, 
        milkmanId: profile?.assignedMilkmanId,
        initialMode: 'order'
      });
    } else {
      navigation.navigate('YDPage');
    }
  };

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'English', name: 'English', nativeName: 'English' },
    { code: 'Hindi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'Marathi', name: 'Marathi', nativeName: 'मराठी' }
  ];

  const handleLogout = async () => {
    setShowSettingsDropdown(false);
    await logout();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      
      {/* Top Navbar */}
      <View style={[styles.topNav, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <View style={styles.navLeft}>
          <View style={styles.avatarBox}>
            <User size={24} color="#2563EB" />
          </View>
          <View>
            <Text style={[styles.navWelcome, { color: textMuted, fontFamily }]}>{t('welcomeBack')}</Text>
            <Text style={[styles.navName, { color: textColor, fontFamily: fontFamilyBold }]}>
              {profile?.name || user?.username || t('imCustomer')}
            </Text>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity 
            style={[styles.langBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} 
            onPress={() => {
              const newLang = language === 'English' ? 'Hindi' : language === 'Hindi' ? 'Marathi' : 'English';
              setLanguage(newLang);
            }}
          >
            <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 12, fontFamily: fontFamilyBold }}>
              {language === 'English' ? 'EN' : language === 'Hindi' ? 'HI' : 'MR'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsBtn} 
            onPress={() => setShowSettingsDropdown(true)}
          >
            <Settings size={22} color={showSettingsDropdown ? colors.primary : textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Dropdown Modal */}
      <Modal
        visible={showSettingsDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setShowSettingsDropdown(false);
            setShowLanguageSubmenu(false);
          }}
        >
          <View style={[styles.dropdownContainer, { backgroundColor: surfaceColor, borderColor }]}>
            {!showLanguageSubmenu ? (
              <>
                <Text style={[styles.dropdownLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('settings')}</Text>
                <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />
                
                {/* Theme Toggle */}
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    // Logic for manual theme toggle would go here if implemented globally
                    // For now, we follow system theme, but we show the UI parity
                    Alert.alert("Info", "Theme follows your system settings.");
                    setShowSettingsDropdown(false);
                  }}
                >
                  {isDark ? (
                    <Sun size={18} color={textMuted} style={styles.dropdownIcon} />
                  ) : (
                    <Moon size={18} color={textMuted} style={styles.dropdownIcon} />
                  )}
                  <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>
                    {isDark ? t('lightMode') : t('darkMode')}
                  </Text>
                </TouchableOpacity>

                {/* Language Selection */}
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => setShowLanguageSubmenu(true)}
                >
                  <Languages size={18} color={textMuted} style={styles.dropdownIcon} />
                  <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{t('language')}</Text>
                  <Text style={[styles.dropdownItemValue, { color: colors.primary, fontFamily }]}>
                    {language}
                  </Text>
                  <ChevronRight size={14} color={textMuted} />
                </TouchableOpacity>

                <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />

                {/* Profile */}
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    setShowSettingsDropdown(false);
                    navigation.navigate('Profile');
                  }}
                >
                  <User size={18} color={textMuted} style={styles.dropdownIcon} />
                  <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{t('profile')}</Text>
                </TouchableOpacity>

                {/* Orders */}
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    setShowSettingsDropdown(false);
                    navigation.navigate('ViewOrders');
                  }}
                >
                  <Package size={18} color={textMuted} style={styles.dropdownIcon} />
                  <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{t('orders')}</Text>
                </TouchableOpacity>

                {/* Customer Care */}
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    setShowSettingsDropdown(false);
                    navigation.navigate('CustomerCare');
                  }}
                >
                  <Headset size={18} color={textMuted} style={styles.dropdownIcon} />
                  <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{t('customerCare')}</Text>
                </TouchableOpacity>

                <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />

                {/* Logout */}
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={handleLogout}
                >
                  <LogOut size={18} color="#EF4444" style={styles.dropdownIcon} />
                  <Text style={[styles.dropdownItemText, { color: "#EF4444", fontFamily }]}>{t('logout')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.submenuHeader}>
                  <TouchableOpacity onPress={() => setShowLanguageSubmenu(false)} style={styles.submenuBack}>
                    <ChevronRight size={18} color={textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <Text style={[styles.dropdownLabel, { color: textColor, marginBottom: 0 }]}>Select Language</Text>
                </View>
                <View style={[styles.dropdownSeparator, { backgroundColor: borderColor }]} />
                
                {languages.map((lang) => (
                  <TouchableOpacity 
                    key={lang.code}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setLanguage(lang.code);
                      setShowLanguageSubmenu(false);
                      setShowSettingsDropdown(false);
                    }}
                  >
                    <View style={styles.langItemContent}>
                      <Text style={[styles.dropdownItemText, { color: textColor, fontFamily }]}>{lang.name}</Text>
                      <Text style={[styles.dropdownItemValue, { color: textMuted, marginLeft: 8, fontFamily }]}>{lang.nativeName}</Text>
                    </View>
                    {language === lang.code && (
                      <Check size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Quick Actions / New Order */}
        <LinearGradient
          colors={['#2563EB', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={[styles.heroTitle, { fontFamily: fontFamilyBold }]}>{t('needMilk')}</Text>
          <Text style={[styles.heroSubtitle, { fontFamily }]}>{t('orderFreshDesc')}</Text>
          <TouchableOpacity 
            style={styles.heroButton} 
            activeOpacity={0.9}
            onPress={handleNewOrderClick}
          >
            <Plus size={20} color="#2563EB" />
            <Text style={[styles.heroButtonText, { fontFamily: fontFamilyBold }]}>{t('newOrder')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Feature Grid */}
        <View style={styles.gridContainer}>
          
          {/* Your Doodhwala */}
          <TouchableOpacity 
            style={[styles.featureCard, { backgroundColor: surfaceColor, borderColor }]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('YDPage')}
          >
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : '#F3E8FF' }]}>
              <Star size={24} color="#9333EA" />
            </View>
            <View style={styles.gridTextContent}>
              <Text style={[styles.featureTitle, { color: textColor, fontFamily: fontFamilyBold }]} numberOfLines={1}>{t('yourDoodhwala')}</Text>
              <Text style={[styles.gridSubtitle, { color: textMuted, fontFamily }]} numberOfLines={1}>{t('manageDairymen')}</Text>
            </View>
          </TouchableOpacity>



          {/* Track Delivery */}
          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: surfaceColor, borderColor }]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Tracking')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }]}>
              <MapPin size={24} color="#16A34A" />
            </View>
            <View style={styles.gridTextContent}>
              <Text style={[styles.gridTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('trackDelivery')}</Text>
              <Text style={[styles.gridSubtitle, { color: textMuted, fontFamily }]}>{t('liveTracking')}</Text>
            </View>
          </TouchableOpacity>

          {/* Track Delivery */}

          {/* Order History */}
          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: surfaceColor, borderColor }]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ViewOrders')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE' }]}>
              <ShoppingCart size={24} color="#2563EB" />
            </View>
            <View style={styles.gridTextContent}>
              <Text style={[styles.gridTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('orderHistory')}</Text>
              <Text style={[styles.gridSubtitle, { color: textMuted, fontFamily }]}>{t('pastOrders')}</Text>
            </View>
          </TouchableOpacity>

          {/* Subscription Settings */}
          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: surfaceColor, borderColor }]} 
            activeOpacity={0.8}
            onPress={() => setShowSettingsModal(true)}
          >
            <View style={[styles.gridIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
              <Calendar size={24} color="#10B981" />
            </View>
            <View style={styles.gridTextContent}>
              <Text style={[styles.gridTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('subSettings')}</Text>
              <Text style={[styles.gridSubtitle, { color: textMuted, fontFamily }]}>{t('planDetails')}</Text>
            </View>
          </TouchableOpacity>

          {/* Monthly Bills */}
          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: surfaceColor, borderColor }]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Bills')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#FEF9C3' }]}>
              <Receipt size={24} color="#CA8A04" />
            </View>
            <View style={styles.gridTextContent}>
              <Text style={[styles.gridTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('monthlyBills')}</Text>
              <Text style={[styles.gridSubtitle, { color: textMuted, fontFamily }]}>{t('financials')}</Text>
            </View>
          </TouchableOpacity>

          {/* Ad Banner Placeholder */}
          <View style={[styles.adContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor }]}>
             <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', fontFamily: fontFamilyBold }}>{t('sponsoredAd')}</Text>
             <Text style={{ color: textColor, fontSize: 14, marginTop: 4, fontFamily }}>{t('organicGheeOffer')}</Text>
          </View>
        </View>

        {/* Subscription Modal */}
        <Modal visible={showSettingsModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalWrapper, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('subSettings')}</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.closeBtn}>
                <X size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 60 }}>
              <View style={[styles.settingsSection, { backgroundColor: surfaceColor, borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('deliveryPrefs')}</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('milkType')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{t(settingsForm.milkType.toLowerCase().replace(' ', '')) || settingsForm.milkType}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                    {['Fresh Milk', 'Buffalo Milk', 'Toned Milk'].map(type => (
                      <TouchableOpacity 
                        key={type}
                        onPress={() => setSettingsForm({...settingsForm, milkType: type})}
                        style={[styles.optionChip, settingsForm.milkType === type && styles.optionChipActive, { borderColor }]}
                      >
                        <Text style={[styles.optionText, settingsForm.milkType === type && styles.optionTextActive, { color: textColor }]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('frequency')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{settingsForm.subscriptionType}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                    {['Daily', 'Alternate Days', 'Weekly'].map(freq => (
                      <TouchableOpacity 
                        key={freq}
                        onPress={() => setSettingsForm({...settingsForm, subscriptionType: freq})}
                        style={[styles.optionChip, settingsForm.subscriptionType === freq && styles.optionChipActive, { borderColor }]}
                      >
                        <Text style={[styles.optionText, settingsForm.subscriptionType === freq && styles.optionTextActive, { color: textColor }]}>{freq}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('deliveryTime')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{settingsForm.deliveryTime}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                    {['6:00 - 6:30 AM', '6:30 - 7:00 AM', '7:00 - 7:30 AM', '7:30 - 8:00 AM'].map(time => (
                      <TouchableOpacity 
                        key={time}
                        onPress={() => setSettingsForm({...settingsForm, deliveryTime: time})}
                        style={[styles.optionChip, settingsForm.deliveryTime === time && styles.optionChipActive, { borderColor }]}
                      >
                        <Text style={[styles.optionText, settingsForm.deliveryTime === time && styles.optionTextActive, { color: textColor }]}>{time}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.settingToggleRow, { marginTop: 10 }]}>
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('smsNotif')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{t('smsNotifDesc')}</Text>
                  </View>
                  <Switch 
                    value={settingsForm.smsNotifications} 
                    onValueChange={v => setSettingsForm({...settingsForm, smsNotifications: v})}
                    trackColor={{ false: '#767577', true: '#BFDBFE' }}
                    thumbColor={settingsForm.smsNotifications ? '#2563EB' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.settingToggleRow}>
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('emailNotif')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{t('emailNotifDesc')}</Text>
                  </View>
                  <Switch 
                    value={settingsForm.emailNotifications} 
                    onValueChange={v => setSettingsForm({...settingsForm, emailNotifications: v})}
                    trackColor={{ false: '#767577', true: '#BFDBFE' }}
                    thumbColor={settingsForm.emailNotifications ? '#2563EB' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.settingToggleRow}>
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('weekendDelivery')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{t('weekendDeliveryDesc')}</Text>
                  </View>
                  <Switch 
                    value={settingsForm.weekendDelivery} 
                    onValueChange={v => setSettingsForm({...settingsForm, weekendDelivery: v})}
                    trackColor={{ false: '#767577', true: '#BFDBFE' }}
                    thumbColor={settingsForm.weekendDelivery ? '#2563EB' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.settingToggleRow}>
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor, fontFamily: fontFamilyBold }]}>{t('holidayDelivery')}</Text>
                    <Text style={[styles.settingSub, { color: textMuted, fontFamily }]}>{t('holidayDeliveryDesc')}</Text>
                  </View>
                  <Switch 
                    value={settingsForm.holidayDelivery} 
                    onValueChange={v => setSettingsForm({...settingsForm, holidayDelivery: v})}
                    trackColor={{ false: '#767577', true: '#BFDBFE' }}
                    thumbColor={settingsForm.holidayDelivery ? '#2563EB' : '#f4f3f4'}
                  />
                </View>
              </View>

              <View style={[styles.settingsSection, { backgroundColor: surfaceColor, borderColor, marginTop: 20 }]}>
                <Text style={[styles.sectionTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('billingPayment')}</Text>
                
                <View style={styles.settingRow}>
                   <Text style={[styles.settingLabel, { color: textColor, marginBottom: 8, fontFamily: fontFamilyBold }]}>{t('billingCycle')}</Text>
                   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                     {['Monthly (1st to 30th)', 'Fortnightly', 'Weekly'].map(cycle => (
                       <TouchableOpacity 
                         key={cycle}
                         onPress={() => setSettingsForm({...settingsForm, billingCycle: cycle})}
                         style={[styles.optionChip, settingsForm.billingCycle === cycle && styles.optionChipActive, { borderColor }]}
                       >
                         <Text style={[styles.optionText, settingsForm.billingCycle === cycle && styles.optionTextActive, { color: textColor, fontFamily }]}>{cycle}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                </View>

                <View style={[styles.settingRow, { marginTop: 10 }]}>
                   <Text style={[styles.settingLabel, { color: textColor, marginBottom: 8, fontFamily: fontFamilyBold }]}>{t('paymentMethod')}</Text>
                   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                     {['Monthly Postpaid', 'Prepaid Wallet', 'Cash on Delivery'].map(method => (
                       <TouchableOpacity 
                         key={method}
                         onPress={() => setSettingsForm({...settingsForm, paymentMethod: method})}
                         style={[styles.optionChip, settingsForm.paymentMethod === method && styles.optionChipActive, { borderColor }]}
                       >
                         <Text style={[styles.optionText, settingsForm.paymentMethod === method && styles.optionTextActive, { color: textColor, fontFamily }]}>{method}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                </View>
              </View>

              <View style={[styles.settingsSection, { backgroundColor: surfaceColor, borderColor, marginTop: 20 }]}>
                <Text style={[styles.sectionTitle, { color: textColor, fontFamily: fontFamilyBold }]}>{t('deliveryInstructions')}</Text>
                <TextInput
                  style={[styles.instructionsInput, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor, color: textColor, fontFamily }]}
                  placeholder={t('instrPlaceholder')}
                  placeholderTextColor={textMuted}
                  multiline
                  numberOfLines={4}
                  value={settingsForm.specialInstructions}
                  onChangeText={v => setSettingsForm({...settingsForm, specialInstructions: v})}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#2563EB' }]}
                onPress={() => saveSettingsMutation.mutate(settingsForm)}
                disabled={saveSettingsMutation.isPending}
              >
                <Text style={[styles.saveButtonText, { fontFamily: fontFamilyBold }]}>
                  {saveSettingsMutation.isPending ? t('saving') : t('saveSettings')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>

      </ScrollView>

      {/* Bottom Nav Placeholder aligned to standard */}
      <View style={[styles.bottomNav, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
        <TouchableOpacity style={styles.bottomNavItem}>
          <HomeIcon size={24} color="#2563EB" />
          <Text style={[styles.bottomNavText, { color: "#2563EB", fontFamily: fontFamilyBold }]}>{t('home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('ViewOrders')}>
          <ShoppingCart size={24} color={textMuted} />
          <Text style={[styles.bottomNavText, { color: textMuted, fontFamily }]}>{t('orders')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => navigation.navigate('Profile')}>
          <User size={24} color={textMuted} />
          <Text style={[styles.bottomNavText, { color: textMuted, fontFamily }]}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.floatingChatBtn}
        onPress={() => navigation.navigate('Chat', { 
          customerId: profile?.id, 
          milkmanId: profile?.assignedMilkmanId,
          initialMode: 'order'
        })}
      >
        <MessageCircle size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Top Nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16, // p-4
    borderBottomWidth: 1,
    zIndex: 10,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
  },
  avatarBox: {
    height: 40,
    width: 40,
    backgroundColor: '#DBEAFE', // bg-blue-100
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navWelcome: {
    fontSize: 14, // text-sm
  },
  navName: {
    fontSize: 16,
    fontWeight: '600', // font-semibold
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 20,
  },

  container: {
    flex: 1,
    padding: 16, // p-4
  },

  // Hero Card
  heroCard: {
    borderRadius: 16, // rounded-2xl
    padding: 24, // p-6
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 24, // space-y-6
  },
  heroTitle: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#FFFFFF',
    marginBottom: 8, // mb-2
  },
  heroSubtitle: {
    fontSize: 14, // text-sm
    color: '#E0E7FF', // text-blue-100
    marginBottom: 16, // mb-4
    maxWidth: 200,
    lineHeight: 20,
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  heroButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },

  // Feature Grid
  // Feature Grid
  gridContainer: {
    flexDirection: 'column',
    marginBottom: 24, // gap-3 approximate
  },
  gridCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16, // p-4
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 80,
  },
  gridIconBox: {
    height: 48, // h-12
    width: 48, // w-12
    borderRadius: 12, // rounded-xl
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gridTextContent: {
    flex: 1,
  },
  gridTitle: {
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20, // leading-tight
  },
  gridSubtitle: {
    fontSize: 13, // text-xs
    marginTop: 2, // mt-1
  },
  featureCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16, // p-4
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 96, // h-24
  },
  featureIconBox: {
    height: 64, // w-16 h-16
    width: 64,
    borderRadius: 32, // rounded-full
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTitle: {
    fontWeight: '700',
    fontSize: 18, // text-lg
    lineHeight: 22,
    marginBottom: 4, // mb-1
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bottomNavText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },

  floatingChatBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    zIndex: 100,
  },

  // Language Button
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563EB',
  },

  // Ad Container
  adContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Styles
  modalWrapper: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  closeBtn: {
    padding: 4,
  },

  // Settings Styles
  settingsSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 20,
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 13,
    marginTop: 2,
  },
  optionScroll: {
    flexDirection: 'row',
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  optionChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  instructionsInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  saveButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dropdownContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    right: 16,
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    ...shadows.xl,
    zIndex: 1000,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.8,
  },
  dropdownSeparator: {
    height: 1,
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemValue: {
    fontSize: 13,
    marginRight: 8,
  },
  submenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  submenuBack: {
    padding: 8,
    paddingLeft: 12,
  },
  langItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

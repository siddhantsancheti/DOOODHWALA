import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { Receipt, CreditCard, Clock, CheckCircle, ArrowLeft, Calendar, Download, Calculator } from 'lucide-react-native';
import { lightColors, darkColors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';
import { useTranslation } from '../../contexts/LanguageContext';
import { downloadBill } from '../../lib/documents';

export default function BillsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t, colors, isDark } = useTranslation();

  const { data: bills, isLoading: billsLoading } = useQuery<any[]>({
    queryKey: ['/api/bills/list'],
    enabled: !!user,
  });

  const surfaceColor = isDark ? '#1F1B17' : '#FFFFFF';
  const textColor = isDark ? '#F5EFE5' : '#1A1714';
  const textMuted = isDark ? '#A99B89' : '#7A6E60';
  const borderColor = isDark ? '#332C25' : '#F0E9DE';

  if (billsLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#22406E" />
      </View>
    );
  }

  const billList = Array.isArray(bills) ? bills : [];

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return { bg: '#DFF0E6', color: colors.success, icon: CheckCircle };
      case 'pending': return { bg: '#FBEFD5', color: '#A8730F', icon: Clock };
      case 'overdue': return { bg: '#F8E4E1', color: colors.destructive, icon: Calculator };
      default: return { bg: '#F0E9DE', color: colors.mutedForeground, icon: Receipt };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{t('monthlyBills')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {billList.length > 0 ? (
          billList.map((bill: any) => {
            const statusStyle = getStatusStyle(bill.status);
            const StatusIcon = statusStyle.icon;
            
            return (
              <View key={bill.id} style={[styles.billCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.billCardHeader}>
                  <View>
                    <Text style={[styles.billMonth, { color: textColor }]}>{bill.month} {bill.year}</Text>
                    <Text style={[styles.billId, { color: textMuted }]}>Bill #{bill.id}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <StatusIcon size={12} color={statusStyle.color} />
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{bill.status?.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.billDetails}>
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: textMuted }]}>{t('totalQuantity')}</Text>
                    <Text style={[styles.billValue, { color: textColor }]}>{bill.totalQuantity} L</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: textMuted }]}>{t('totalAmountLabel')}</Text>
                    <Text style={[styles.billAmount, { color: colors.primary }]}>₹{bill.totalAmount}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: textMuted }]}>{t('dueDate')}</Text>
                    <Text style={[styles.billValue, { color: textColor }]}>{new Date(bill.dueDate).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View style={styles.billActions}>
                    {(bill.status === 'pending' || bill.status === 'overdue') && (
                    <TouchableOpacity
                      style={[styles.payBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('Checkout', {
                        amount: parseFloat(bill.totalAmount),
                        description: `Monthly Bill #${bill.id}`,
                        orderId: `BILL_${bill.id}`,
                        paymentType: 'single',
                      })}
                    >
                      <CreditCard size={18} color="#FFFFFF" />
                      <Text style={styles.payBtnText}>{t('payNow')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.downloadBtn, { borderColor }]} activeOpacity={0.8} onPress={() => downloadBill(bill)}>
                    <Download size={18} color={textColor} />
                    <Text style={[styles.downloadText, { color: textColor }]}>{t('downloadBill')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Receipt size={64} color={textMuted} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>{t('noBillsFound')}</Text>
            <Text style={[styles.emptySubtitle, { color: textMuted }]}>Your monthly generated bills will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  backBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  billCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  billMonth: {
    fontSize: 18,
    fontWeight: '700',
  },
  billId: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  billDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 15,
    marginBottom: 20,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 14,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  billAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  billActions: {
    flexDirection: 'row',
    gap: 12,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  downloadText: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
});

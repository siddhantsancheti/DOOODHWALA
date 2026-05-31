import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Clock, Star, Package, ChevronLeft, ChevronRight, PieChart, Table } from 'lucide-react-native';
import { useTranslation } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');
const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#A855F7', '#EF4444', '#06B6D4'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsComponent({ milkman }: { milkman: any }) {
  const { isDark } = useTranslation();
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const surfaceColor = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const [activeView, setActiveView] = useState<'charts' | 'table'>('charts');

  // ── Real data: this customer's orders for the current month ──────────────
  const { data: customerProfile } = useQuery<any>({ queryKey: ['/api/customers/profile'] });
  const { data: history = [] } = useQuery<any[]>({
    queryKey: [`/api/chat/group/${milkman?.id}`],
    enabled: !!milkman?.id,
  });

  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const { monthlyData, productBreakdown, monthlyTotal, totalQty } = useMemo(() => {
    const now = new Date();
    const myId = customerProfile?.id;
    const orders = (Array.isArray(history) ? history : []).filter((m: any) =>
      m.messageType === 'order' &&
      m.senderType === 'customer' &&
      (myId == null || m.customerId === myId) &&
      (() => { const d = new Date(m.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })()
    );

    // Per-weekday quantity
    const byDay: Record<string, { qty: number; amount: number }> = {};
    DAYS.forEach((d) => (byDay[d] = { qty: 0, amount: 0 }));
    const rows: { date: string; day: string; qty: number; amount: number; product: string }[] = [];
    const productQty: Record<string, number> = {};
    let total = 0;
    let qtyTotal = 0;

    orders.forEach((o: any) => {
      const d = new Date(o.createdAt);
      const dayKey = DAYS[d.getDay()];
      const amt = parseFloat(o.orderTotal || '0') || 0;
      const qty = parseFloat(o.orderQuantity || '0') || (Array.isArray(o.orderItems) ? o.orderItems.reduce((s: number, it: any) => s + (parseFloat(it.quantity) || 0), 0) : 0);
      byDay[dayKey].qty += qty;
      byDay[dayKey].amount += amt;
      total += amt;
      qtyTotal += qty;
      (Array.isArray(o.orderItems) ? o.orderItems : []).forEach((it: any) => {
        productQty[it.product] = (productQty[it.product] || 0) + (parseFloat(it.quantity) || 0);
      });
      rows.push({
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        day: dayKey,
        qty,
        amount: amt,
        product: o.orderProduct || (Array.isArray(o.orderItems) ? o.orderItems.map((i: any) => i.product).join(', ') : 'Order'),
      });
    });

    const md = DAYS.slice(1).concat(DAYS[0]).map((day) => ({ date: day, day, qty: byDay[day].qty, amount: byDay[day].amount, product: '' }));
    const totalProductQty = Object.values(productQty).reduce((s, v) => s + v, 0) || 1;
    const pb = Object.entries(productQty)
      .sort((a, b) => b[1] - a[1])
      .map(([name, q], i) => ({ name, percent: Math.round((q / totalProductQty) * 100), color: PALETTE[i % PALETTE.length] }));

    return { monthlyData: rows.length ? md : md, productBreakdown: pb, monthlyTotal: total, totalQty: qtyTotal };
  }, [history, customerProfile]);

  const hasData = totalQty > 0 || monthlyTotal > 0;
  const maxQty = Math.max(0.001, ...monthlyData.map((d) => d.qty));
  const tableRows = useMemo(() => {
    const now = new Date();
    const myId = customerProfile?.id;
    return (Array.isArray(history) ? history : [])
      .filter((m: any) => m.messageType === 'order' && m.senderType === 'customer' && (myId == null || m.customerId === myId))
      .filter((m: any) => { const d = new Date(m.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((o: any) => ({
        date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        product: o.orderProduct || (Array.isArray(o.orderItems) ? o.orderItems.map((i: any) => i.product).join(', ') : 'Order'),
        qty: parseFloat(o.orderQuantity || '0') || 0,
        amount: parseFloat(o.orderTotal || '0') || 0,
      }));
  }, [history, customerProfile]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* View Switcher Tabs */}
      <View style={[styles.viewSwitcher, { backgroundColor: isDark ? '#111827' : '#F3F4F6' }]}>
        <TouchableOpacity 
          style={[styles.viewTab, activeView === 'charts' && styles.activeViewTab]} 
          onPress={() => setActiveView('charts')}
        >
          <BarChart3 size={16} color={activeView === 'charts' ? '#FFF' : textMuted} />
          <Text style={[styles.viewTabText, { color: activeView === 'charts' ? '#FFF' : textMuted }]}>Charts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewTab, activeView === 'table' && styles.activeViewTab]} 
          onPress={() => setActiveView('table')}
        >
          <Table size={16} color={activeView === 'table' ? '#FFF' : textMuted} />
          <Text style={[styles.viewTabText, { color: activeView === 'table' ? '#FFF' : textMuted }]}>Details</Text>
        </TouchableOpacity>
      </View>

      {activeView === 'charts' ? (
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <TrendingUp size={24} color="#16A34A" />
            <Text style={[styles.title, { color: textColor }]}>Performance Summary</Text>
          </View>
          
          <View style={styles.monthSelector}>
            <Text style={[styles.monthText, { color: textColor }]}>{monthLabel}</Text>
          </View>

          {!hasData && (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Package size={40} color={textMuted} />
              <Text style={{ color: textMuted, marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                No orders this month yet.{'\n'}Place orders in the chat and your stats will appear here.
              </Text>
            </View>
          )}

          <View style={styles.chartContainer}>
            {monthlyData.map((item, index) => (
              <View key={index} style={styles.barWrapper}>
                <View style={[styles.barBase, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                  <View 
                    style={[
                      styles.barFill, 
                      { height: `${(item.qty / maxQty) * 100}%`, backgroundColor: '#3B82F6' }
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, { color: textMuted }]}>{item.day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
               <Text style={[styles.statValue, { color: textColor }]}>₹{monthlyTotal.toFixed(2)}</Text>
               <Text style={[styles.statLabel, { color: textMuted }]}>Monthly Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
               <Text style={[styles.statValue, { color: textColor }]}>{totalQty.toFixed(1)} L</Text>
               <Text style={[styles.statLabel, { color: textMuted }]}>Total Quantity</Text>
            </View>
          </View>

          {/* Product Breakdown */}
          {productBreakdown.length > 0 && (
          <View style={[styles.breakdownCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.breakdownHeader}>
              <PieChart size={20} color="#6366F1" />
              <Text style={[styles.breakdownTitle, { color: textColor }]}>Product Breakdown</Text>
            </View>
            <View style={styles.breakdownContent}>
              {productBreakdown.map((p, idx) => (
                <View key={idx} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelGroup}>
                    <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.breakdownLabel, { color: textColor }]}>{p.name}</Text>
                  </View>
                  <View style={styles.breakdownBarContainer}>
                    <View style={[styles.breakdownBarBg, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}>
                      <View style={[styles.breakdownBarFill, { width: `${p.percent}%`, backgroundColor: p.color }]} />
                    </View>
                    <Text style={[styles.breakdownPercent, { color: textMuted }]}>{p.percent}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor, marginBottom: 16 }]}>Daily Order Log</Text>
          <View style={[styles.tableCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.tableHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.headerCell, { flex: 1.5, color: textMuted }]}>Date</Text>
              <Text style={[styles.headerCell, { flex: 2, color: textMuted }]}>Product</Text>
              <Text style={[styles.headerCell, { flex: 1, color: textMuted, textAlign: 'right' }]}>Qty</Text>
              <Text style={[styles.headerCell, { flex: 1.2, color: textMuted, textAlign: 'right' }]}>Amount</Text>
            </View>
            {tableRows.map((row, idx) => (
              <View key={idx} style={[styles.tableRow, idx < tableRows.length - 1 && { borderBottomColor: borderColor }]}>
                <Text style={[styles.cellText, { flex: 1.5, color: textColor }]}>{row.date}</Text>
                <Text style={[styles.cellText, { flex: 2, color: textColor }]} numberOfLines={1}>{row.product}</Text>
                <Text style={[styles.cellText, { flex: 1, color: textColor, textAlign: 'right' }]}>{row.qty}</Text>
                <Text style={[styles.cellText, { flex: 1.2, color: '#2563EB', textAlign: 'right', fontWeight: 'bold' }]}>₹{row.amount}</Text>
              </View>
            ))}
            {tableRows.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: textMuted, fontSize: 13 }}>No orders this month yet.</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  viewSwitcher: { flexDirection: 'row', margin: 20, padding: 4, borderRadius: 12 },
  viewTab: { flex: 1, flexDirection: 'row', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, gap: 8 },
  activeViewTab: { backgroundColor: '#2563EB' },
  viewTabText: { fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  monthText: { fontSize: 16, fontWeight: '700' },
  chartContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    height: 160, 
    marginBottom: 32,
    paddingHorizontal: 10
  },
  barWrapper: { alignItems: 'center', width: (width - 80) / 7 },
  barBase: { width: 14, height: 120, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 7 },
  barLabel: { fontSize: 10, marginTop: 8, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  breakdownCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  breakdownTitle: { fontSize: 16, fontWeight: '700' },
  breakdownContent: { gap: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { fontSize: 13, fontWeight: '600' },
  breakdownBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 2 },
  breakdownBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 4 },
  breakdownPercent: { fontSize: 12, fontWeight: '700', width: 35, textAlign: 'right' },
  tableCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  headerCell: { fontSize: 12, fontWeight: '700' },
  tableRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1 },
  cellText: { fontSize: 13, fontWeight: '500' },
});

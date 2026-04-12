import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme, ScrollView, TouchableOpacity } from 'react-native';
import { BarChart3, TrendingUp, Clock, Star, Package, ChevronLeft, ChevronRight, PieChart, Table } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AnalyticsComponent({ milkman }: { milkman: any }) {
  const colorScheme = useColorScheme() || 'light';
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const surfaceColor = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const [activeView, setActiveView] = useState<'charts' | 'table'>('charts');

  // Multi-product mock data for parity
  const monthlyData = [
    { date: '01 Apr', day: 'Mon', qty: 2.0, amount: 110, product: 'Fresh Milk' },
    { date: '02 Apr', day: 'Tue', qty: 1.5, amount: 90, product: 'Buffalo Milk' },
    { date: '03 Apr', day: 'Wed', qty: 2.5, amount: 140, product: 'Fresh Milk' },
    { date: '04 Apr', day: 'Thu', qty: 2.0, amount: 110, product: 'Fresh Milk' },
    { date: '05 Apr', day: 'Fri', qty: 3.0, amount: 180, product: 'Buffalo Milk' },
    { date: '06 Apr', day: 'Sat', qty: 1.0, amount: 55, product: 'Curd' },
    { date: '07 Apr', day: 'Sun', qty: 2.0, amount: 110, product: 'Fresh Milk' },
  ];

  const productBreakdown = [
    { name: 'Fresh Milk', percent: 65, color: '#3B82F6' },
    { name: 'Buffalo Milk', percent: 25, color: '#10B981' },
    { name: 'Curd', percent: 10, color: '#F59E0B' },
  ];

  const maxQty = Math.max(...monthlyData.map(d => d.qty));

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
            <TouchableOpacity><ChevronLeft size={20} color={textMuted} /></TouchableOpacity>
            <Text style={[styles.monthText, { color: textColor }]}>April 2026</Text>
            <TouchableOpacity><ChevronRight size={20} color={textMuted} /></TouchableOpacity>
          </View>

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
               <Text style={[styles.statValue, { color: textColor }]}>₹845.00</Text>
               <Text style={[styles.statLabel, { color: textMuted }]}>Monthly Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
               <Text style={[styles.statValue, { color: textColor }]}>14.5 L</Text>
               <Text style={[styles.statLabel, { color: textMuted }]}>Total Quantity</Text>
            </View>
          </View>

          {/* Product Breakdown */}
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
            {monthlyData.map((row, idx) => (
              <View key={idx} style={[styles.tableRow, idx < monthlyData.length - 1 && { borderBottomColor: borderColor }]}>
                <Text style={[styles.cellText, { flex: 1.5, color: textColor }]}>{row.date}</Text>
                <Text style={[styles.cellText, { flex: 2, color: textColor }]} numberOfLines={1}>{row.product}</Text>
                <Text style={[styles.cellText, { flex: 1, color: textColor, textAlign: 'right' }]}>{row.qty}</Text>
                <Text style={[styles.cellText, { flex: 1.2, color: '#2563EB', textAlign: 'right', fontWeight: 'bold' }]}>₹{row.amount}</Text>
              </View>
            ))}
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

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Send, XCircle, RefreshCw } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing, shadows } from '../../theme';

export default function GatewayScreen() {
  const [isActive, setIsActive] = useState(false);
  const [secret, setSecret] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, pending: 0 });

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const toggleGateway = () => {
    if (isActive) {
      setIsActive(false);
      addLog('Gateway Stopped');
    } else {
      if (!secret) { addLog('Error: Enter Gateway Secret'); return; }
      setIsActive(true);
      addLog('Gateway Started (Mobile Sync Mode)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Smartphone size={20} color={colors.foreground} />
              <Text style={styles.cardTitle}>Mobile SMS Gateway</Text>
            </View>
            <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{isActive ? 'ACTIVE' : 'STOPPED'}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gateway Secret</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Enter secret key"
              placeholderTextColor={colors.mutedForeground}
              value={secret}
              onChangeText={setSecret}
              editable={!isActive}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, isActive ? styles.btnStop : styles.btnStart]}
            onPress={toggleGateway}
            activeOpacity={0.8}
          >
            {isActive ? <XCircle size={18} color={colors.white} /> : <Send size={18} color={colors.white} />}
            <Text style={styles.btnText}>{isActive ? 'Stop Gateway' : 'Start Gateway'}</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.statNum, { color: colors.success }]}>{stats.sent}</Text>
              <Text style={styles.statLabel}>Sent</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.statNum, { color: colors.destructive }]}>{stats.failed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <View style={styles.logsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <RefreshCw size={16} color={colors.foreground} />
            <Text style={styles.logsTitle}>Activity Log</Text>
          </View>
          {logs.length === 0 ? (
            <Text style={styles.emptyLogs}>No activity yet. Start the gateway.</Text>
          ) : (
            logs.map((l, i) => (
              <Text key={i} style={styles.logText}>{l}</Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },

  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    padding: spacing.xl, marginBottom: spacing.lg, ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.foreground },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  badgeActive: { backgroundColor: colors.success },
  badgeInactive: { backgroundColor: colors.destructive },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  fieldGroup: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: spacing.xs, color: colors.foreground },
  input: {
    borderWidth: 1, borderColor: colors.input, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.base, backgroundColor: colors.surfaceSecondary, color: colors.foreground,
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: borderRadius.md, marginBottom: spacing.lg, gap: spacing.sm,
  },
  btnStart: { backgroundColor: colors.primary },
  btnStop: { backgroundColor: colors.destructive },
  btnText: { color: colors.white, fontSize: fontSize.base, fontWeight: fontWeight.bold },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  statNum: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, color: colors.gray600, marginTop: 4 },

  logsCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.xl,
    padding: spacing.xl, ...shadows.md,
  },
  logsTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.foreground },
  emptyLogs: { textAlign: 'center', color: colors.mutedForeground, marginTop: spacing.xl },
  logText: {
    fontSize: fontSize.xs, fontFamily: 'monospace', color: colors.foreground,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm,
  },
});

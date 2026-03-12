import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Smartphone, Send, XCircle, RefreshCw } from 'lucide-react-native';

export default function GatewayScreen() {
    const [isActive, setIsActive] = useState(false);
    const [secret, setSecret] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState({ sent: 0, failed: 0, pending: 0 });

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
    };

    const toggleGateway = () => {
        if (isActive) {
            setIsActive(false);
            addLog("Gateway Stopped");
        } else {
            if (!secret) {
                addLog("Error: Please enter Gateway Secret");
                return;
            }
            setIsActive(true);
            addLog("Gateway Started (Mobile Sync Mode)");
            // Note: In React Native, sending SMS directly requires extensive permissions and native modules.
            // Usually, expo-sms is used, but it opens the composer and doesn't send automatically in background.
            // For a real background SMS gateway on Android, custom native modules are required.
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Smartphone size={20} color="#0f172a" />
                        <Text style={styles.cardTitle}>Mobile SMS Gateway</Text>
                    </View>
                    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={styles.badgeText}>{isActive ? 'ACTIVE' : 'STOPPED'}</Text>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Gateway Secret</Text>
                    <TextInput
                        style={styles.input}
                        secureTextEntry
                        placeholder="Enter secret key"
                        value={secret}
                        onChangeText={setSecret}
                        editable={!isActive}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.btn, isActive ? styles.btnStop : styles.btnStart]}
                    onPress={toggleGateway}
                >
                    {isActive ? <XCircle size={18} color="#fff" /> : <Send size={18} color="#fff" />}
                    <Text style={styles.btnText}>{isActive ? 'Stop Gateway' : 'Start Gateway'}</Text>
                </TouchableOpacity>

                <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { backgroundColor: '#dcfce3' }]}>
                        <Text style={[styles.statNum, { color: '#166534' }]}>{stats.sent}</Text>
                        <Text style={styles.statLabel}>Sent</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.statNum, { color: '#991b1b' }]}>{stats.failed}</Text>
                        <Text style={styles.statLabel}>Failed</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#dbeafe' }]}>
                        <Text style={[styles.statNum, { color: '#1e40af' }]}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>
            </View>

            <View style={styles.logsCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <RefreshCw size={16} color="#0f172a" style={{ marginRight: 6 }} />
                        <Text style={styles.logTitle}>Activity Log</Text>
                    </View>
                </View>
                <ScrollView style={styles.logsContainer}>
                    {logs.length === 0 ? (
                        <Text style={styles.emptyLogs}>No activity yet. Start the gateway.</Text>
                    ) : (
                        logs.map((l, i) => (
                            <Text key={i} style={styles.logText}>{l}</Text>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8, color: '#0f172a' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeActive: { backgroundColor: '#22c55e' },
    badgeInactive: { backgroundColor: '#ef4444' },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 6, color: '#334155' },
    input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#f8fafc' },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginBottom: 16, gap: 8 },
    btnStart: { backgroundColor: '#3b82f6' },
    btnStop: { backgroundColor: '#ef4444' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    statsGrid: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: '#475569', marginTop: 4 },
    logsCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
    logTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
    logsContainer: { flex: 1, marginTop: 10 },
    emptyLogs: { textAlign: 'center', color: '#64748b', marginTop: 20 },
    logText: { fontSize: 12, fontFamily: 'monospace', color: '#334155', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 6 }
});

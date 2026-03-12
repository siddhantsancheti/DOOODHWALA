import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3 } from 'lucide-react-native';

export default function CustomerAnalyticsScreen() {
    return (
        <View style={styles.container}>
            <BarChart3 size={64} color="#3b82f6" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>Customer Analytics</Text>
            <Text style={styles.subtitle}>Detailed analytics and charts are available on the Dooodhwala Web Dashboard.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24 }
});

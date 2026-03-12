import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

export default function LocationRecommendationsScreen() {
    return (
        <View style={styles.container}>
            <MapPin size={64} color="#10b981" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>Location Recommendations</Text>
            <Text style={styles.subtitle}>View heatmaps and demand areas on the Dooodhwala Web Dashboard.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24 }
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export default function LocationRecommendationsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MapPin size={40} color={colors.success} />
      </View>
      <Text style={styles.title}>Location Recommendations</Text>
      <Text style={styles.subtitle}>
        View heatmaps and demand areas on the Dooodhwala Web Dashboard.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.successLight, justifyContent: 'center',
    alignItems: 'center', marginBottom: spacing.xl,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.base, color: colors.mutedForeground, textAlign: 'center', lineHeight: fontSize.base * 1.6 },
});

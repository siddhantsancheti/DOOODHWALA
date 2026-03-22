import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export default function CustomerAnalyticsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <BarChart3 size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>Customer Analytics</Text>
      <Text style={styles.subtitle}>
        Detailed analytics and charts are available on the Dooodhwala Web Dashboard.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight, justifyContent: 'center',
    alignItems: 'center', marginBottom: spacing.xl,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.base, color: colors.mutedForeground, textAlign: 'center', lineHeight: fontSize.base * 1.6 },
});

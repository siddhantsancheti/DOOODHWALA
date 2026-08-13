import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ArrowDown, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiRequest } from '../lib/queryClient';
import { fontSize, spacing, borderRadius } from '../theme';
import { useTranslation } from '../contexts/LanguageContext';

type Role = 'customer' | 'milkman';

interface TermsDoc {
  role: Role;
  version: string;
  lastUpdated: string;
  title: string;
  markdown: string;
}

// Role identity — customer reads cool/blue, milkman reads warm/amber, matching
// the choice cards on the previous screen so the transition feels continuous.
const ROLE_GRADIENT: Record<Role, [string, string]> = {
  customer: ['#3B82F6', '#6366F1'],
  milkman: ['#F97316', '#EAB308'],
};

export default function TermsScreen({ route, navigation }: any) {
  const role: Role = route.params?.role ?? 'customer';
  const queryClient = useQueryClient();
  const { colors, isDark, fontFamily, fontFamilyBold } = useTranslation();

  const [agreed, setAgreed] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );

  const { data: doc, isLoading, isError, refetch } = useQuery<TermsDoc>({
    queryKey: ['/api/legal/terms', role],
    queryFn: async () => {
      const res = await apiRequest({ url: `/api/legal/terms/${role}`, method: 'GET' });
      return res.json();
    },
  });

  // "Read to the end" is the honest bar for informed consent, and it is what
  // makes the acceptance defensible later. 24px of slop so it fires reliably.
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) {
      setReachedEnd(true);
    }
  }, []);

  const handleAccept = async () => {
    if (!doc || !agreed || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiRequest({
        url: '/api/auth/user-type',
        method: 'PUT',
        body: { userType: role, termsVersion: doc.version },
      });
      const response = await res.json();

      if (response.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        navigation.replace(role === 'customer' ? 'CustomerProfileSetup' : 'MilkmanProfileSetup');
        return;
      }

      // Terms were amended while this screen was open — pull the new text in
      // rather than accepting a version the server no longer publishes.
      if (response.expectedVersion) {
        await refetch();
        setAgreed(false);
        setReachedEnd(false);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        Alert.alert('Terms updated', 'The terms have changed. Please review the latest version.');
        return;
      }

      Alert.alert('Error', response.message || 'Could not save your choice. Please try again.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save your choice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !doc) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Couldn't load the terms</Text>
        <Text style={styles.errorBody}>
          You need a connection to review and accept the terms before continuing.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.85}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const canAccept = agreed && !submitting;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={ROLE_GRADIENT[role]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <ShieldCheck size={22} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>{doc.title}</Text>
        <Text style={styles.headerMeta}>Last updated {doc.lastUpdated} · India</Text>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator
      >
        <Markdown markdown={doc.markdown} styles={styles} />
        <View style={styles.endMark} />
      </ScrollView>

      {!reachedEnd && (
        <View style={styles.scrollHint} pointerEvents="none">
          <ArrowDown size={14} color={colors.mutedForeground} strokeWidth={2.5} />
          <Text style={styles.scrollHintText}>Scroll to read the full terms</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.agreeRow}
          onPress={() => setAgreed((v) => !v)}
          disabled={!reachedEnd}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed, disabled: !reachedEnd }}
        >
          <View
            style={[
              styles.checkbox,
              agreed && { backgroundColor: colors.primary, borderColor: colors.primary },
              !reachedEnd && styles.checkboxDisabled,
            ]}
          >
            {agreed && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
          </View>
          <Text style={[styles.agreeText, !reachedEnd && styles.agreeTextDisabled]}>
            I have read and agree to the {doc.title} and the Privacy Policy.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, !canAccept && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!canAccept}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.acceptText}>Agree and continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} disabled={submitting}>
          <Text style={styles.declineText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Markdown ────────────────────────────────────────────────────────────────
// ponytail: the terms only ever use h1/h2, bullets and **bold**, so this beats
// pulling in a markdown renderer. Add a real parser if the documents grow
// tables or links.
function Markdown({ markdown, styles }: { markdown: string; styles: any }) {
  const blocks = useMemo(() => {
    return markdown.split('\n').map((raw) => raw.trim()).filter(Boolean).map((line, i) => {
      if (line.startsWith('## ')) return { key: i, type: 'h2' as const, text: line.slice(3) };
      if (line.startsWith('# ')) return { key: i, type: 'h1' as const, text: line.slice(2) };
      if (line.startsWith('- ')) return { key: i, type: 'li' as const, text: line.slice(2) };
      return { key: i, type: 'p' as const, text: line };
    });
  }, [markdown]);

  return (
    <>
      {blocks.map((b) => {
        if (b.type === 'h1') return <Text key={b.key} style={styles.h1}>{bold(b.text, styles)}</Text>;
        if (b.type === 'h2') return <Text key={b.key} style={styles.h2}>{bold(b.text, styles)}</Text>;
        if (b.type === 'li') {
          return (
            <View key={b.key} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{bold(b.text, styles)}</Text>
            </View>
          );
        }
        return <Text key={b.key} style={styles.paragraph}>{bold(b.text, styles)}</Text>;
      })}
    </>
  );
}

/** Renders **bold** spans inline. */
function bold(text: string, styles: any): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={styles.strong}>{part}</Text>
      : <Text key={i}>{part}</Text>,
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },

    // Header
    header: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.22)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    headerTitle: {
      fontSize: 26,
      color: '#FFFFFF',
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      marginBottom: 4,
    },
    headerMeta: {
      fontSize: fontSize.sm,
      color: 'rgba(255,255,255,0.85)',
      fontFamily,
    },

    // Document
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing['2xl'],
    },
    h1: {
      fontSize: 21,
      color: colors.foreground,
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      marginBottom: spacing.lg,
      lineHeight: 28,
    },
    h2: {
      fontSize: 17,
      color: colors.foreground,
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      marginTop: spacing['2xl'],
      marginBottom: spacing.sm,
      lineHeight: 24,
    },
    paragraph: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily,
      lineHeight: 23,
      marginBottom: spacing.md,
    },
    strong: { color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    bulletRow: { flexDirection: 'row', marginBottom: spacing.sm, paddingRight: spacing.sm },
    bulletDot: {
      fontSize: 15,
      color: colors.primary,
      marginRight: spacing.sm,
      lineHeight: 23,
    },
    bulletText: {
      flex: 1,
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily,
      lineHeight: 23,
    },
    endMark: { height: spacing.lg },

    // Scroll hint
    scrollHint: {
      position: 'absolute',
      bottom: 186,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrollHintText: { fontSize: 12, color: colors.mutedForeground, fontFamily },

    // Footer
    footer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      gap: spacing.md,
    },
    agreeRow: { flexDirection: 'row', alignItems: 'flex-start' },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    checkboxDisabled: { opacity: 0.4 },
    agreeText: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontFamily,
      lineHeight: 20,
    },
    agreeTextDisabled: { color: colors.mutedForeground },
    acceptButton: {
      height: 52,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    acceptButtonDisabled: { opacity: 0.45 },
    acceptText: {
      fontSize: 16,
      color: '#FFFFFF',
      fontFamily: fontFamilyBold,
      fontWeight: '600',
    },
    declineText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily,
      textAlign: 'center',
      paddingVertical: spacing.sm,
    },

    // Error state
    errorTitle: {
      fontSize: 18,
      color: colors.foreground,
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    errorBody: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.xl,
    },
    retryButton: {
      paddingHorizontal: spacing['2xl'],
      height: 46,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    retryText: { fontSize: 15, color: '#FFFFFF', fontFamily: fontFamilyBold, fontWeight: '600' },
  });

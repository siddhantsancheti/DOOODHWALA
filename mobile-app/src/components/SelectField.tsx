import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Modal,
  FlatList, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Sheet heading; defaults to the placeholder. */
  title?: string;
  /** Show a filter box — worth it past ~10 options. */
  searchable?: boolean;
  disabled?: boolean;
  hasError?: boolean;
}

/**
 * Dropdown built on RN's own Modal — a bottom sheet with an optional filter.
 * Preferred over a wheel picker for long lists: the whole list is visible and
 * scannable, and it looks the same on Android and iOS.
 */
export default function SelectField({
  value, options, onChange, placeholder = 'Select', title, searchable, disabled, hasError,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const styles = useMemo(
    () => createStyles(colors, isDark, fontFamily, fontFamilyBold),
    [colors, isDark, fontFamily, fontFamilyBold],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, hasError && styles.fieldError, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, expanded: open }}
      >
        {/* numberOfLines keeps a long state name from pushing the chevron off
            the field — the overflow this component exists to prevent. */}
        <Text
          style={[styles.fieldText, !value && styles.fieldPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grabber} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{title || placeholder}</Text>
            <TouchableOpacity onPress={close} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.searchRow}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <X size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={14}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No match for "{query}"</Text>
            }
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => { onChange(item); close(); }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[styles.optionText, selected && styles.optionTextSelected]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  {selected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = (colors: any, isDark: boolean, fontFamily: string, fontFamilyBold: string) =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      height: 48,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surfaceSecondary || (isDark ? '#374151' : '#F9FAFB'),
    },
    fieldError: { borderColor: colors.destructive, borderWidth: 2 },
    fieldDisabled: { opacity: 0.5 },
    fieldText: { flex: 1, fontSize: 16, color: colors.foreground, fontFamily },
    fieldPlaceholder: { color: colors.mutedForeground },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      maxHeight: '75%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    sheetTitle: { flex: 1, fontSize: 17, color: colors.foreground, fontFamily: fontFamilyBold, fontWeight: '700' },
    closeBtn: { padding: 2 },

    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingHorizontal: 12,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary || (isDark ? '#374151' : '#F3F4F6'),
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily,
      padding: 0,
      ...(Platform.OS === 'android' ? { paddingVertical: 0 } : null),
    },

    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    optionText: { flex: 1, fontSize: 16, color: colors.foreground, fontFamily },
    optionTextSelected: { color: colors.primary, fontFamily: fontFamilyBold, fontWeight: '600' },
    emptyText: {
      textAlign: 'center',
      paddingVertical: 32,
      color: colors.mutedForeground,
      fontSize: 15,
      fontFamily,
    },
  });

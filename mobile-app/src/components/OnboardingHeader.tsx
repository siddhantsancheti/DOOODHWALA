import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { ArrowLeft, Globe, Check } from 'lucide-react-native';
import { useTranslation } from '../contexts/LanguageContext';
import { Language } from '../lib/translations';

const LANGUAGES: Language[] = ['English', 'Hindi', 'Marathi'];

/**
 * The bar across the top of every onboarding screen: a way back, and a way to
 * change language.
 *
 * Both existed on exactly one screen each — back only on Terms, language only
 * on Login — so someone who picked the wrong role, or opened the app in a
 * language they could not read, had no way out short of force-quitting. For a
 * milkman being signed up at his doorstep by someone else's phone, that is
 * where onboarding ends.
 *
 * Language belongs on every step because the person who most needs to change it
 * cannot read the screen telling them how.
 */
export default function OnboardingHeader({
  onBack,
  showBack = true,
  title,
}: {
  onBack?: () => void;
  showBack?: boolean;
  title?: string;
}) {
  const { language, setLanguage, colors, isDark, fontFamily, fontFamilyBold } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.bar}>
      {showBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          hitSlop={12}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
      ) : (
        // Keeps the language control pinned right whether or not there is a
        // back button, so it does not jump between screens.
        <View style={styles.iconBtn} />
      )}

      {!!title && (
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: fontFamilyBold }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.langBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Language: ${language}`}
      >
        <Globe size={15} color={colors.foreground} />
        <Text style={[styles.langText, { color: colors.foreground, fontFamily }]}>{language}</Text>
      </TouchableOpacity>

      {/* A sheet rather than an inline dropdown: onboarding screens scroll and
          sit inside cards, where an absolutely positioned menu gets clipped. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {LANGUAGES.map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={styles.row}
                  onPress={() => { setLanguage(lang); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.rowText,
                      { color: active ? colors.primary : colors.foreground, fontFamily: active ? fontFamilyBold : fontFamily },
                    ]}
                  >
                    {lang}
                  </Text>
                  {active && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 16, textAlign: 'center' },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 8, borderRadius: 19,
  },
  langText: { fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: { width: '100%', maxWidth: 300, borderRadius: 16, borderWidth: 1, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  rowText: { fontSize: 16 },
});

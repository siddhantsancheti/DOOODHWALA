/**
 * DOOODHWALA Design System
 * Extracted from web app's index.css and tailwind.config.ts
 * All HSL values converted to hex/rgba for React Native
 */

// ─── Colors ────────────────────────────────────────────────────
/**
 * DOOODHWALA palette.
 *
 * Deliberately not the framework defaults. The ground is a warm cream rather
 * than white, the brand is a deep indigo rather than stock blue, and marigold
 * carries the calls to action — a combination that reads warm and Indian for a
 * daily household habit, and reads as chosen rather than left at defaults.
 *
 * Green is semantic only. It means delivered, paid, fresh — never decoration.
 * That is what makes the third tick land.
 */
export const lightColors = {
  // Core — warm cream, so nothing sits on pure white
  background: '#FAF6EF',
  foreground: '#1A1714',       // warm near-black, not blue-black

  // Card
  card: '#FFFFFF',
  cardForeground: '#1A1714',

  // Muted
  muted: '#F0E9DE',
  mutedForeground: '#7A6E60',  // warm grey, tuned to the cream ground

  // Primary — deep indigo
  primary: '#22406E',
  primaryForeground: '#FFFFFF',
  primaryLight: '#E4EAF3',
  primaryDark: '#162C4D',

  // Secondary
  secondary: '#F0E9DE',
  secondaryForeground: '#7A6E60',

  // Accent — marigold. Warm, festive, the thing the eye goes to.
  accent: '#E08A2E',
  accentForeground: '#1A1714',
  accentLight: '#FBEBD4',

  // Destructive
  destructive: '#C0453B',
  destructiveForeground: '#FFFFFF',

  // Brand
  brandPrimary: '#22406E',
  brandSecondary: '#2F7D5B',
  brandAccent: '#E08A2E',

  // Semantic
  success: '#2F7D5B',          // deeper, calmer than a default green
  successLight: '#DFF0E6',
  warning: '#C98A16',
  warningLight: '#FBEFD5',
  error: '#C0453B',
  errorLight: '#F8E4E1',
  info: '#22406E',
  infoLight: '#E4EAF3',

  // Surface
  surface: '#FFFFFF',
  surfaceSecondary: '#F5EFE5',

  // Border / Input
  border: '#E6DCCD',
  input: '#E6DCCD',
  ring: '#22406E',

  // Grays (utility) — warmed so they sit on cream rather than fight it
  gray50: '#FAF6EF',
  gray100: '#F2ECE2',
  gray200: '#E6DCCD',
  gray300: '#D5C8B5',
  gray400: '#A99B89',
  gray500: '#7A6E60',
  gray600: '#5C5248',
  gray700: '#443C34',
  gray800: '#2C2621',
  gray900: '#1A1714',

  // Transparent
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors = {
  ...lightColors, // fallback for utilities

  // Core — warm charcoal, never blue-black
  background: '#14110E',
  foreground: '#F7F1E8',

  // Card
  card: '#1F1B17',
  cardForeground: '#F7F1E8',

  // Muted
  muted: '#2A251F',
  mutedForeground: '#A39685',

  // Primary — lifted so it holds up on a dark ground
  primary: '#7FA5DA',
  primaryForeground: '#14110E',
  primaryLight: '#22304A',
  primaryDark: '#A6C2E8',

  // Secondary
  secondary: '#2A251F',
  secondaryForeground: '#D8CCBC',

  // Accent
  accent: '#F0A44A',
  accentForeground: '#14110E',
  accentLight: '#3A2A16',

  // Destructive
  destructive: '#E0685C',
  destructiveForeground: '#14110E',

  // Brand
  brandPrimary: '#7FA5DA',
  brandSecondary: '#5FBF92',
  brandAccent: '#F0A44A',

  // Semantic
  success: '#5FBF92',
  successLight: '#17301F',
  warning: '#E8B54A',
  warningLight: '#2E2411',
  error: '#E0685C',
  errorLight: '#331B18',
  info: '#7FA5DA',
  infoLight: '#1B2839',

  // Surface
  surface: '#1F1B17',
  surfaceSecondary: '#2A251F',

  // Border / Input
  border: '#332C25',
  input: '#332C25',
  ring: '#7FA5DA',
};

// Default export for backward compatibility
export const colors = lightColors;

// ─── useTheme hook — returns correct colors + fonts for the active theme ───
// Reads the app-wide theme (light/dark/system) from LanguageContext so manual
// theme changes propagate everywhere. Uses a lazy require to avoid a circular
// import (LanguageContext imports the color palettes from this module).
export function useTheme() {
  const { useTranslation } = require('../contexts/LanguageContext') as typeof import('../contexts/LanguageContext');
  const { colors, isDark } = useTranslation();
  return { colors, isDark };
}

// ─── Typography ────────────────────────────────────────────────
export const fontSize = {
  xs: 13,        // 0.8125rem (web mobile override)
  sm: 15,        // 0.9375rem
  base: 17,      // 1.0625rem (web base)
  lg: 19,        // 1.1875rem
  xl: 21,        // 1.3125rem
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
};

// ─── Spacing ────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ─── Border Radius ──────────────────────────────────────────
export const borderRadius = {
  sm: 8,         // calc(0.75rem - 4px)
  md: 10,        // calc(0.75rem - 2px)
  lg: 12,        // 0.75rem (--radius)
  xl: 16,
  '2xl': 20,
  full: 9999,
};

// ─── Shadows ────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ─── Common Component Styles ────────────────────────────────
export const componentStyles = {
  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  cardElevated: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    ...shadows['2xl'],
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  buttonDestructive: {
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  // Inputs
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.base,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  // Text styles
  textHeading: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  },
  textSubheading: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  textBody: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    color: colors.foreground,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  textMuted: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  textSmall: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  textLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },

  // Status badges
  badgePending: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeSuccess: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeError: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeInfo: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  // Navigation
  bottomNav: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    ...shadows.lg,
  },
  navItem: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.sm,
    minHeight: 60,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
    color: colors.gray500,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.primary,
  },
};

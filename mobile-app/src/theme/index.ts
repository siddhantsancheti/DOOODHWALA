/**
 * DOOODHWALA Design System
 * Extracted from web app's index.css and tailwind.config.ts
 * All HSL values converted to hex/rgba for React Native
 */

// ─── Colors ────────────────────────────────────────────────────
export const colors = {
  // Core
  background: '#FAFAFA',       // hsl(0, 0%, 98%)
  foreground: '#1E2330',       // hsl(222, 16%, 13%)

  // Card
  card: '#FFFFFF',
  cardForeground: '#1E2330',

  // Muted
  muted: '#F0F1F3',           // hsl(220, 13%, 95%)
  mutedForeground: '#6B7280', // hsl(220, 9%, 46%)

  // Primary (Blue)
  primary: '#2563EB',          // hsl(221, 83%, 53%)
  primaryForeground: '#FFFFFF',
  primaryLight: '#DBEAFE',     // lighter shade for backgrounds
  primaryDark: '#1D4ED8',      // darker shade for pressed states

  // Secondary
  secondary: '#F3F4F6',        // hsl(220, 14%, 96%)
  secondaryForeground: '#6B7280',

  // Accent (same as primary)
  accent: '#2563EB',
  accentForeground: '#FFFFFF',

  // Destructive
  destructive: '#EF4444',      // hsl(0, 84%, 60%)
  destructiveForeground: '#FFFFFF',

  // Brand
  brandPrimary: '#2563EB',     // hsl(221, 83%, 53%)
  brandSecondary: '#16A34A',   // hsl(142, 76%, 36%)
  brandAccent: '#F97316',      // hsl(25, 95%, 53%)

  // Semantic
  success: '#16A34A',          // hsl(142, 76%, 36%)
  successLight: '#DCFCE7',
  warning: '#EAB308',          // hsl(38, 92%, 50%)
  warningLight: '#FEF9C3',
  error: '#EF4444',            // hsl(0, 84%, 60%)
  errorLight: '#FEE2E2',
  info: '#0EA5E9',             // hsl(199, 89%, 48%)
  infoLight: '#E0F2FE',

  // Surface
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F9FA', // hsl(220, 13%, 98%)

  // Border / Input
  border: '#E5E7EB',           // hsl(220, 13%, 91%)
  input: '#E5E7EB',
  ring: '#2563EB',

  // Grays (utility)
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Transparent
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

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

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#FAF8F3',
  surface: '#FFFFFF',
  sage: '#EAF0E6',
  sageStrong: '#D3E0CC',
  primary: '#1F4D3A',
  primaryPressed: '#163A2B',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#CFE0D5',
  text: '#1B2420',
  textMuted: '#55615A',
  placeholder: '#7C877F',
  border: '#DDE3D8',
  danger: '#B3261E',
  dangerSurface: '#FBEAE8',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum touch target recommended by iOS/Android accessibility guidelines. */
export const touchTarget = 48;

/** Max content width so layouts stay readable on tablets and the web. */
export const contentMaxWidth = 640;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

export const shadows = {
  card: Platform.select<ViewStyle>({
    default: {
      shadowColor: '#1B2420',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },
  }) as ViewStyle,
} as const;

export type TextVariant = keyof typeof typography;
export type TextTone = 'default' | 'muted' | 'primary' | 'onPrimary' | 'onPrimaryMuted' | 'danger';

export const toneColors: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  onPrimaryMuted: colors.onPrimaryMuted,
  danger: colors.danger,
};

import { Platform } from 'react-native';

export const colors = {
  background: '#F7F8F4',
  surface: '#FFFFFF',
  surfaceWarm: '#F6EFE5',
  surfaceMuted: '#EEF0EA',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primarySoft: '#DCFCE7',
  text: '#1F2933',
  textSecondary: '#667085',
  textMuted: '#98A2B3',
  border: '#E5E7EB',
  yellow: '#FACC15',
  yellowSoft: '#FEF3C7',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  blue: '#38BDF8',
  blueSoft: '#E0F2FE',
  graySoft: '#F1F5F9',
  whiteGlass: 'rgba(255, 255, 255, 0.92)',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#1F2933',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
    },
    android: {
      elevation: 3,
    },
    default: {
      boxShadow: '0 8px 18px rgba(31, 41, 51, 0.06)',
    },
  }),
};

export const typography = {
  h1: {
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800' as const,
    color: colors.text,
  },
  h2: {
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800' as const,
    color: colors.text,
  },
  h3: {
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700' as const,
    color: colors.text,
  },
  body: {
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  small: {
    fontFamily: Platform.select({ web: 'Noto Sans SC, system-ui, sans-serif', default: undefined }),
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
};

export const appTheme = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
};

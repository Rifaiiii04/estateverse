// Design tokens mirroring the EstateVerse website (60-30-10 sage palette).

export const colors = {
  sage: {
    50: '#f3f7f5',
    100: '#e3ede9',
    200: '#c8dcd4',
    300: '#a2c3b7',
    400: '#76a495',
    500: '#4f8575',
    600: '#356859',
    700: '#295246',
    800: '#214138',
    900: '#1b352e',
  },
  sage50: '#f3f7f5',
  sage100: '#e3ede9',
  sage200: '#c8dcd4',
  sage300: '#a2c3b7',
  sage400: '#76a495',
  sage500: '#4f8575',
  sage600: '#356859',
  sage700: '#295246',
  sage800: '#214138',
  sage900: '#1b352e',
  background: '#f6f8f6',
  surface: '#ffffff',
  ink: '#141715',
  inkLight: '#4a524e',
  sand: '#edf2ef',
  muted: '#737976',
  textSecondary: '#60686a',
  textMuted: '#9aa19e',
  border: '#e2e8e5',
  borderStrong: '#cfd8d3',
  error: '#dc2626',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  full: 999,
} as const;

export const fontSize = {
  caption: 11,
  small: 12,
  body: 14,
  subheading: 16,
  heading: 20,
  title: 28,
  display: 34,
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// Maximum number of listings loaded per page in the public catalog.
export const CATALOG_PAGE_SIZE = 10;

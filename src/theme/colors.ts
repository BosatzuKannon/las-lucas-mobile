/**
 * Las Lucas - Neon Palette
 * Strict palette from DESIGN.md & ui.md spec.
 * NEVER hardcode hex values outside this file.
 */

const palette = {
  /** Background / Surface */
  background: '#131313',
  appBackground: '#121212',
  surface: '#131313',
  surfaceDim: '#131313',
  surfaceBright: '#393939',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceVariant: '#353534',

  /** Primary – Neon Fuchsia */
  primary: '#FF007F',
  primaryContainer: '#ff4a8d',
  onPrimary: '#65002e',
  onPrimaryContainer: '#590028',
  inversePrimary: '#ba005b',

  /** Secondary – Neon Green */
  secondary: '#00FF7F',
  secondaryContainer: '#3bff86',
  onSecondary: '#003917',
  onSecondaryContainer: '#007235',

  /** Tertiary – Intense Gold */
  tertiary: '#FFD700',
  tertiaryContainer: '#c9a900',
  onTertiary: '#3a3000',
  onTertiaryContainer: '#4c3f00',

  /** Text / On-surface */
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#e5bcc5',
  inverseSurface: '#e5e2e1',
  inverseOnSurface: '#313030',

  /** Outline */
  outline: '#ac878f',
  outlineVariant: '#5c3f46',

  /** Error */
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  danger: '#FF4D4D',

  /** Utility */
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  /** Profile spec (views/profile.md) */
  neonGreen: '#00FF00',
  profileEmail: '#A0A0A0',
  profileCardBg: '#1A1A1F',
  profileLabel: '#808080',
  profileFeaturedBg: '#121217',
  profileItemBg: '#16161C',
  profileIconCircle: '#22222A',
  profileSubtitle: '#888888',
  logoutBorder: '#8B0000',
  logoutAccent: '#FF0055',
  footerMuted: '#8A8A93',
  disclaimerGray: '#5A5A62',
} as const;

export default palette;

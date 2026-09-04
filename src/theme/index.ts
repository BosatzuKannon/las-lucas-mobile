import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import palette from './colors';
import { fonts } from './fonts';

/**
 * Las Lucas - Global Theme (Dark Mode)
 * Extends MD3DarkTheme with our neon palette and Inter typography.
 */

const lasLucasTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    primaryContainer: palette.primaryContainer,
    onPrimaryContainer: palette.onPrimaryContainer,
    inversePrimary: palette.inversePrimary,

    secondary: palette.secondary,
    onSecondary: palette.onSecondary,
    secondaryContainer: palette.secondaryContainer,
    onSecondaryContainer: palette.onSecondaryContainer,

    tertiary: palette.tertiary,
    onTertiary: palette.onTertiary,
    tertiaryContainer: palette.tertiaryContainer,
    onTertiaryContainer: palette.onTertiaryContainer,

    background: palette.background,
    onBackground: palette.onSurface,

    surface: palette.surface,
    surfaceVariant: palette.surfaceVariant,
    surfaceDisabled: palette.surfaceVariant,

    onSurface: palette.onSurface,
    onSurfaceVariant: palette.onSurfaceVariant,
    onSurfaceDisabled: palette.onSurfaceVariant,
    inverseSurface: palette.inverseSurface,
    inverseOnSurface: palette.inverseOnSurface,

    outline: palette.outline,
    outlineVariant: palette.outlineVariant,

    error: palette.error,
    onError: palette.onError,
    errorContainer: palette.errorContainer,
    onErrorContainer: palette.onErrorContainer,

    elevation: {
      level0: palette.transparent,
      level1: palette.surfaceContainerLow,
      level2: palette.surfaceContainer,
      level3: palette.surfaceContainerHigh,
      level4: palette.surfaceContainerHighest,
      level5: palette.surfaceBright,
    },
  },
  fonts,
  roundness: 16,
};

export { palette };
export default lasLucasTheme;

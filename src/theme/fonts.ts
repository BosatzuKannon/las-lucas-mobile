import { configureFonts } from 'react-native-paper';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

/**
 * Las Lucas - Typography Scale
 * Based on DESIGN.md tokens. Only Inter weights used in the app.
 */

export const loadFonts = () =>
  Promise.all([
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  ]);

export const fonts = configureFonts({
  config: {
    displayLarge: { fontFamily: 'Inter_900Black', fontSize: 48, lineHeight: 56, letterSpacing: -0.02 },
    displayMedium: { fontFamily: 'Inter_900Black', fontSize: 36, lineHeight: 42, letterSpacing: -0.02 },
    headlineMedium: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 32 },
    titleLarge: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24 },
    bodyLarge: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
    labelLarge: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, lineHeight: 16, letterSpacing: 0.08 },
  },
});

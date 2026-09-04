import { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import palette from '../theme/colors';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * BaseLayout
 * Global wrapper for every screen. Solid dark canvas (#121212) with two
 * linear neon glows bleeding in from the top corners (never flat).
 */
export function BaseLayout({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.appBackground }]}>
      <View style={[styles.root, style]}>
        {/* Corner glow — fuchsia from top-left fading toward center */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255, 0, 127, 0.15)', 'rgba(255, 0, 127, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.55, y: 0.55 }}
          style={styles.cornerGlowLeft}
        />

        {/* Corner glow — emerald from top-right fading toward center */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0, 255, 127, 0.15)', 'rgba(0, 255, 127, 0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.45, y: 0.55 }}
          style={styles.cornerGlowRight}
        />

        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  cornerGlowLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
    zIndex: 0,
  },
  cornerGlowRight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
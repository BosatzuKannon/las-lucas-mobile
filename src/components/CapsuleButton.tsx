import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { palette } from '../theme';

export type CapsuleButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'dark'
  | 'google';

type Props = {
  label: string;
  onPress: () => void;
  variant?: CapsuleButtonVariant;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

/**
 * CapsuleButton
 * Pill-shaped (borderRadius 9999), volumetric button with a neon aura shadow
 * and a subtle inner highlight to create relief (never flat).
 */
export function CapsuleButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  labelStyle,
}: Props) {
  const theme = useTheme<MD3Theme>();

  const { container, textColor, innerHighlightColor } = useMemo(
    () => getVariantStyles(variant, theme),
    [variant, theme],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        container,
        pressed && { transform: [{ translateY: 2 }], opacity: 0.85 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.innerHighlight, { backgroundColor: innerHighlightColor }]}
      />
      <View style={styles.content}>
        {icon}
        <Text
          style={[
            styles.label,
            { color: textColor },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function getVariantStyles(variant: CapsuleButtonVariant, theme: MD3Theme) {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: palette.primary,
          ...shadow(theme, palette.primary),
        },
        textColor: palette.white,
        innerHighlightColor: 'rgba(255, 255, 255, 0.25)',
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: palette.secondary,
          ...shadow(theme, palette.secondary),
        },
        textColor: theme.colors.onSecondary,
        innerHighlightColor: 'rgba(255, 255, 255, 0.30)',
      };
    case 'outline':
      return {
        container: {
          backgroundColor: palette.transparent,
          borderWidth: 2,
          borderColor: palette.primary,
          ...shadow(theme, palette.primary, 0.25),
        },
        textColor: palette.primary,
        innerHighlightColor: palette.transparent,
      };
    case 'dark':
      return {
        container: {
          backgroundColor: palette.surfaceContainerHigh,
          ...shadow(theme, palette.black, 0.4),
        },
        textColor: theme.colors.onSurface,
        innerHighlightColor: 'rgba(255, 255, 255, 0.08)',
      };
    case 'google':
    default:
      return {
        container: {
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.12)',
          ...shadow(theme, palette.black, 0.3),
        },
        textColor: '#000000',
        innerHighlightColor: 'rgba(0, 0, 0, 0.03)',
      };
  }
}

function shadow(
  theme: MD3Theme,
  color: string,
  opacity = 0.35,
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 20,
      shadowOpacity: opacity,
    },
    android: {
      elevation: 12,
      shadowColor: color,
      shadowOpacity: opacity,
    },
    default: {
      elevation: 12,
      shadowColor: color,
      shadowOpacity: opacity,
    },
  }) as ViewStyle;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 9999,
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
});

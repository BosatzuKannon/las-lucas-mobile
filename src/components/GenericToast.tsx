import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Easing,
  ColorValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import palette from '../theme/colors';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

type Props = {
  type?: ToastType;
  message?: string | null;
  duration?: number;
  onHide?: () => void;
};

const TOAST_ANIMATION_MS = 240;

/**
 * GenericToast
 * Pill-shaped global feedback component. Colors follow the neon design
 * system (green = success, red = error, gold = warning, fuchsia = info).
 * Positioned absolutely at the top so it never alters the screen layout.
 */
export function GenericToast({
  type = 'info',
  message,
  duration = 3000,
  onHide,
}: Props) {
  const insets = useSafeAreaInsets();
  const visible = Boolean(message && message.length > 0);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;

  const { color, backgroundColor, borderColor } = useMemo(
    () => getToastColors(type),
    [type],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: TOAST_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: TOAST_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: TOAST_ANIMATION_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -24,
          duration: TOAST_ANIMATION_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onHide?.();
        }
      });
    }, duration);

    return () => {
      clearTimeout(timer);
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.positioner,
        { top: insets.top + 16 },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View
        style={[
          styles.toast,
          { backgroundColor, borderColor },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.message, { color }]} numberOfLines={3}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

function getToastColors(type: ToastType): {
  color: ColorValue;
  backgroundColor: ColorValue;
  borderColor: ColorValue;
} {
  switch (type) {
    case 'success':
      return {
        color: palette.secondary,
        backgroundColor: 'rgba(0, 255, 127, 0.14)',
        borderColor: 'rgba(0, 255, 127, 0.45)',
      };
    case 'error':
      return {
        color: palette.danger,
        backgroundColor: 'rgba(255, 77, 77, 0.14)',
        borderColor: 'rgba(255, 77, 77, 0.45)',
      };
    case 'warning':
      return {
        color: palette.tertiary,
        backgroundColor: 'rgba(255, 215, 0, 0.14)',
        borderColor: 'rgba(255, 215, 0, 0.45)',
      };
    case 'info':
    default:
      return {
        color: palette.primary,
        backgroundColor: 'rgba(255, 0, 127, 0.14)',
        borderColor: 'rgba(255, 0, 127, 0.45)',
      };
  }
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
    maxWidth: '100%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 18,
  },
});
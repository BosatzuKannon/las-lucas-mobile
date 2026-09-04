import { View, StyleSheet, Text } from 'react-native';
import type { ColorValue, StyleProp, TextStyle, ViewStyle } from 'react-native';

type Props = {
  label: string;
  dotColor?: ColorValue;
  textColor?: ColorValue;
  backgroundColor?: ColorValue;
  borderColor?: ColorValue;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * CapsulePill
 * Reusable fully-rounded (pill-shape) tag / status indicator.
 * Defaults to a translucent dark surface with a 1px outline.
 */
export function CapsulePill({
  label,
  dotColor,
  textColor,
  backgroundColor = 'rgba(255, 255, 255, 0.06)',
  borderColor = 'rgba(255, 255, 255, 0.18)',
  textStyle,
  containerStyle,
}: Props) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor, borderColor },
        containerStyle,
      ]}
    >
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.label, { color: textColor }, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Inter_800ExtraBold',
  },
});
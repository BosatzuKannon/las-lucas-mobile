import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { BaseLayout } from '../../../components/BaseLayout';
import palette from '../../../theme/colors';

export function TournamentsScreen() {
  return (
    <BaseLayout>
      <View style={styles.center}>
        <Text style={styles.label}>Usuario logueado</Text>
      </View>
    </BaseLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: palette.white,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
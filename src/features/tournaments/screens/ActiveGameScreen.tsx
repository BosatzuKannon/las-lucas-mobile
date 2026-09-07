import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BaseLayout } from '../../../components/BaseLayout';

export function ActiveGameScreen() {
  return (
    <BaseLayout>
      <View style={styles.center}>
        <Text style={styles.text}>Juego activo</Text>
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
  text: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_900Black',
  },
});
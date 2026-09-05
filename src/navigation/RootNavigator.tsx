import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { TournamentsScreen } from '../features/tournaments/screens/TournamentsScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ProfileTabIcon({ color }: { color: string }) {
  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.avatarUrl ?? null;
  const initial = (user?.name ?? '?').charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={styles.tabAvatar}
        accessibilityLabel="Avatar de perfil"
      />
    );
  }

  return (
    <View style={[styles.tabAvatarFallback, { borderColor: color }]}>
      <Text style={styles.tabAvatarInitial}>{initial}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Torneos"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF007F',
        tabBarInactiveTintColor: '#ac878f',
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: 20,
          marginBottom: 16,
          borderRadius: 30,
          borderTopWidth: 0,
          height: 64,
          backgroundColor: '#201f1f',
        },
      }}
    >
      <Tab.Screen
        name="Torneos"
        component={TournamentsScreen}
        options={{
          tabBarLabel: 'Torneos',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="gamepad-variant" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <ProfileTabIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * RootNavigator
 * Auth-aware router: no token → LoginScreen; token → protected Tab navigator.
 */
export function RootNavigator() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {accessToken ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#00FF7F',
  },
  tabAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#353534',
  },
  tabAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
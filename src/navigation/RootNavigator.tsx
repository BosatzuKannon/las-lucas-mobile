import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { TournamentsScreen } from '../features/tournaments/screens/TournamentsScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        options={{ tabBarLabel: 'Torneos' }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil' }}
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
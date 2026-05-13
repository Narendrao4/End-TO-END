import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { GlobalSocketListener } from '../components/GlobalSocketListener';
import { HeroScreen } from '../screens/HeroScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { FriendRequestsScreen } from '../screens/FriendRequestsScreen';
import { InviteLinksScreen } from '../screens/InviteLinksScreen';

export type RootStackParamList = {
  Hero: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Conversation: { friendId: string; friendName: string };
  FriendRequests: undefined;
  InviteLinks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Call once on mount via store state to avoid dependency-churn loops.
    useAuthStore.getState().checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      {isAuthenticated && <GlobalSocketListener />}
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0b0b0b' },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'EndToEnd' }} />
            <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ title: 'Friends' }} />
            <Stack.Screen name="InviteLinks" component={InviteLinksScreen} options={{ title: 'Invite Links' }} />
            <Stack.Screen
              name="Conversation"
              component={ConversationScreen}
              options={({ route }) => ({ title: route.params.friendName })}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Hero" component={HeroScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}

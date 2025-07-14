// src/navigation/AppNavigator.tsx
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import VideoCallScreen from '../screens/VideoCallScreen';

export type RootStackParamList = {
  Login: undefined;
  ChatList: undefined;
  Chat: { userId: string; userName: string };
  VideoCall: { userId: string; userName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ChatList" 
          component={ChatListScreen}
          options={{ 
            title: 'Chats',
            headerLeft: () => null, // Prevents going back to login
            gestureEnabled: false,
          }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={({ route }) => ({ 
            title: route.params?.userName || 'Chat' 
          })}
        />
        <Stack.Screen 
          name="VideoCall" 
          component={VideoCallScreen}
          options={{ 
            title: 'Video Call',
            headerShown: Platform.OS === 'web' 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
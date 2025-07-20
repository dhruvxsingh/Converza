import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { Platform } from 'react-native';


if (Platform.OS !== 'web') {
  try {
    const { registerGlobals } = require('react-native-webrtc');
    registerGlobals();
    console.log('WebRTC initialized successfully');
  } catch (error) {
    console.log('WebRTC initialization error:', error);
  }
}


export default function App() {
  return <AppNavigator />;
}
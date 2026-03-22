import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import AppNavigator from './src/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import Constants from 'expo-constants';
import { StatusBar } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

// Only import and initialize Mapbox outside Expo Go
let Mapbox: any = null;
if (!isExpoGo) {
    Mapbox = require('@rnmapbox/maps').default;
    Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
}

// Component to handle top-level auth-dependent hooks securely
function AppWrapper() {
  // Initialize push notification listener for the session
  usePushNotifications();

  return <AppNavigator />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <AppWrapper />
    </QueryClientProvider>
  );
}

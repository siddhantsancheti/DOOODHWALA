import React from 'react';
import { StatusBar, Platform, View, ActivityIndicator } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import AppNavigator from './src/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import Constants from 'expo-constants';
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_700Bold 
} from '@expo-google-fonts/inter';
import { 
  Mukta_400Regular, 
  Mukta_700Bold 
} from '@expo-google-fonts/mukta';
import { LanguageProvider } from './src/contexts/LanguageContext';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

// Only import and initialize Mapbox on native platforms outside Expo Go
let Mapbox: any = null;
if (!isExpoGo && !isWeb) {
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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Mukta_400Regular,
    Mukta_700Bold
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
          <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <AppWrapper />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

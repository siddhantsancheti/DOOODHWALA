import React from 'react';
import { StatusBar, Platform, View, ActivityIndicator, Text, ScrollView } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, refreshApiBaseUrl } from './src/lib/queryClient';
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

// Global error boundary to catch and display crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error: error?.message || String(error) };
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ color: 'red', fontSize: 16, fontWeight: 'bold', marginTop: 60 }}>App Error:</Text>
          <Text style={{ color: '#333', fontSize: 12, marginTop: 10 }}>{this.state.error}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

// Fetch the current server URL from Supabase on startup
// This means we NEVER need to rebuild when the tunnel URL changes
refreshApiBaseUrl();

const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

// Only import and initialize Mapbox on native platforms outside Expo Go
let Mapbox: any = null;
if (!isExpoGo && !isWeb) {
    try {
        Mapbox = require('@rnmapbox/maps').default;
        const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
        if (mapboxToken) {
            Mapbox.setAccessToken(mapboxToken);
        } else {
            console.warn('[Mapbox] No access token found — map features disabled');
        }
    } catch (e) {
        console.warn('[Mapbox] Failed to initialize:', e);
        Mapbox = null;
    }
}

// Component to handle top-level auth-dependent hooks securely
function AppWrapper() {
  // Initialize push notification listener for the session
  usePushNotifications();

  return <AppNavigator />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Mukta_400Regular,
    Mukta_700Bold
  });

  // Fallback: if fonts fail or take too long, proceed anyway after 3s
  const [fontTimeout, setFontTimeout] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setFontTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const appReady = fontsLoaded || fontError || fontTimeout;

  React.useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
          <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
          <AppWrapper />
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

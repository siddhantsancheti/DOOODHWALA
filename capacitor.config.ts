import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dooodhwala.app',
  appName: 'DOOODHWALA',
  webDir: 'dist/public',
  server: {
    url: process.env.MOBILE_APP_URL || 'http://localhost:5001',
    cleartext: process.env.NODE_ENV === 'development',
    androidScheme: 'https'
  }
};

export default config;

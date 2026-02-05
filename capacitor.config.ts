import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dooodhwala.app',
  appName: 'DOOODHWALA',
  webDir: 'dist/public',
  server: {
    // In production, we want the live URL. In development, we use localhost or IP.
    url: process.env.MOBILE_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://dooodhwala.com' : 'http://localhost:5001'),
    cleartext: process.env.NODE_ENV !== 'production', // Only allow cleartext in dev
    androidScheme: 'https'
  }
};

export default config;

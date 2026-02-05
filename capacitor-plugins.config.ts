// Capacitor Plugins Configuration for DOOODHWALA

export const CAPACITOR_PLUGINS = {
  // Geolocation - Required for location tracking
  Geolocation: {
    enabled: true,
    config: {
      timeout: 10000,
      enableHighAccuracy: true,
    }
  },

  // Camera - For profile pictures and product photos
  Camera: {
    enabled: true,
    webPath: '/assets/img/placeholder.png',
    promptLabelHeader: 'Photo',
    promptLabelCancel: 'Cancel',
    promptLabelPicture: 'From Photos',
    promptLabelPhoto: 'Take Photo',
  },

  // Filesystem - For offline file management
  Filesystem: {
    enabled: true,
  },

  // Keyboard - For better mobile keyboard handling
  Keyboard: {
    enabled: true,
    resizeOnContentResize: true,
  },

  // StatusBar - For better status bar management
  StatusBar: {
    enabled: true,
    backgroundColor: '#1f2937', // Dark background
    style: 'dark',
    overlaysWebView: false,
  },

  // SplashScreen - For startup experience
  SplashScreen: {
    enabled: true,
    autoHide: false,
    fadeOutDuration: 500,
  },

  // Push Notifications
  PushNotifications: {
    enabled: true,
    presentationOptions: ['badge', 'sound', 'alert'],
  },

  // Share - For sharing orders and referrals
  Share: {
    enabled: true,
  },

  // SMS - For order notifications
  SMS: {
    enabled: true,
  },

  // Contact - For WhatsApp integration
  Contacts: {
    enabled: true,
    permissions: ['read'],
  },

  // Device - For app version and device info
  Device: {
    enabled: true,
  },

  // Network - For offline detection
  Network: {
    enabled: true,
  },
};

// Platform-specific overrides
export const PLATFORM_CONFIG = {
  android: {
    minSdkVersion: 24,
    targetSdkVersion: 34,
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_CONTACTS',
      'android.permission.SEND_SMS',
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.POST_NOTIFICATIONS',
    ]
  },
  ios: {
    minOsVersion: 14.0,
    permissions: [
      'NSCameraUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSContactsUsageDescription',
    ]
  }
};

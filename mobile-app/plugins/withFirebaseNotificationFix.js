// Expo config plugin: resolve an Android manifest-merger conflict.
// Both expo-notifications and @react-native-firebase/messaging declare the
// Firebase "default notification" color/icon meta-data, with different resource
// values, which fails the merge. We add `tools:replace` so the app's values win.
const { withAndroidManifest } = require('@expo/config-plugins');

const CONFLICTING_META = [
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
];

module.exports = function withFirebaseNotificationFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application || !Array.isArray(application['meta-data'])) return cfg;

    for (const meta of application['meta-data']) {
      const name = meta?.$?.['android:name'];
      if (CONFLICTING_META.includes(name)) {
        // The app declares these with android:resource — let ours override.
        meta.$['tools:replace'] = 'android:resource';
      }
    }
    return cfg;
  });
};

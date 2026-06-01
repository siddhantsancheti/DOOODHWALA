// Expo config plugin: add Android 11+ package-visibility <queries> for the
// "upi" scheme so react-native-razorpay can detect & launch installed UPI apps
// (Google Pay, PhonePe, Paytm, BHIM). Without this the UPI intent flow breaks
// on API 30+ devices. Durable across `expo prebuild` (the generated android/
// folder is gitignored, so a raw manifest edit alone would not survive).
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withUpiQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [{}];
    const q = manifest.queries[0];
    q.intent = q.intent || [];

    const hasUpi = q.intent.some((i) =>
      (i.data || []).some((d) => d?.$?.['android:scheme'] === 'upi')
    );

    if (!hasUpi) {
      q.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'upi' } }],
      });
    }
    return cfg;
  });
};

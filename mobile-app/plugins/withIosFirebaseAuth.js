// Expo config plugin: add the Firebase phone-auth URL scheme on iOS.
// Firebase Phone Auth on iOS needs the app to register the GoogleService-Info
// REVERSED_CLIENT_ID as a CFBundleURLTypes scheme (for the reCAPTCHA / silent
// APNs verification callback). This reads it from ./GoogleService-Info.plist at
// build time and injects it, so phone OTP works on iOS without manual Xcode edits.
//
// Safe no-op until you add GoogleService-Info.plist (download it from the
// Firebase iOS app). See docs/IOS_RELEASE_PLAN.md.
const fs = require('fs');
const path = require('path');
const { withInfoPlist } = require('@expo/config-plugins');

/**
 * The callback scheme Firebase Auth will try to open, from the plist's text.
 *
 * REVERSED_CLIENT_ID only exists when an OAuth client does, which means Google
 * Sign-In. This app uses phone OTP alone, so the plist has no such key and the
 * documented fallback applies: the encoded app id, which is GOOGLE_APP_ID with
 * its colons turned into hyphens, prefixed "app-".
 *
 * Returning null here used to mean "no plist yet". It silently also meant "a
 * plist with no REVERSED_CLIENT_ID", which is this app's normal state, so the
 * scheme was never registered and build 33 shipped without it. Those two cases
 * are now distinct: absent plist is handled by the caller, and a plist we cannot
 * read a scheme out of throws.
 */
function schemeFrom(contents) {
  const reversed = contents.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);
  if (reversed) return reversed[1].trim();

  const appId = contents.match(/<key>GOOGLE_APP_ID<\/key>\s*<string>([^<]+)<\/string>/);
  if (appId) return 'app-' + appId[1].trim().replace(/:/g, '-');

  throw new Error(
    '[withIosFirebaseAuth] GoogleService-Info.plist has neither REVERSED_CLIENT_ID ' +
    'nor GOOGLE_APP_ID, so no phone-auth callback scheme can be registered. ' +
    'Re-download it from the Firebase console for com.dooodhwala.app.',
  );
}

module.exports = function withIosFirebaseAuth(config) {
  return withInfoPlist(config, (cfg) => {
    const plistPath = path.join(cfg.modRequest.projectRoot, 'GoogleService-Info.plist');
    if (!fs.existsSync(plistPath)) return cfg; // genuinely not added yet

    const scheme = schemeFrom(fs.readFileSync(plistPath, 'utf8'));

    const plist = cfg.modResults;
    plist.CFBundleURLTypes = plist.CFBundleURLTypes || [];
    const already = plist.CFBundleURLTypes.some(
      (t) => Array.isArray(t.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(scheme)
    );
    if (!already) {
      plist.CFBundleURLTypes.push({ CFBundleURLSchemes: [scheme] });
    }
    return cfg;
  });
};

module.exports.schemeFrom = schemeFrom;

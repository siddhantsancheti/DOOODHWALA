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

function readReversedClientId(projectRoot) {
  const plistPath = path.join(projectRoot, 'GoogleService-Info.plist');
  if (!fs.existsSync(plistPath)) return null;
  const contents = fs.readFileSync(plistPath, 'utf8');
  const m = contents.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);
  return m ? m[1].trim() : null;
}

module.exports = function withIosFirebaseAuth(config) {
  return withInfoPlist(config, (cfg) => {
    const reversed = readReversedClientId(cfg.modRequest.projectRoot);
    if (!reversed) return cfg; // plist not added yet — skip silently

    const plist = cfg.modResults;
    plist.CFBundleURLTypes = plist.CFBundleURLTypes || [];
    const already = plist.CFBundleURLTypes.some(
      (t) => Array.isArray(t.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(reversed)
    );
    if (!already) {
      plist.CFBundleURLTypes.push({ CFBundleURLSchemes: [reversed] });
    }
    return cfg;
  });
};

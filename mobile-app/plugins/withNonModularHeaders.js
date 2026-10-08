// Expo config plugin: set CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES
// on the Pods project, which is what lets @react-native-firebase/messaging
// compile at all.
//
// Why it is needed, since the symptom points nowhere near it:
//
//   RNFBMessaging+AppDelegate.h:26
//     @property _Nullable RCTPromiseRejectBlock registerPromiseRejecter;
//     declaration of 'RCTPromiseRejectBlock' must be imported from module
//     'RNFBApp.RNFBAppModule' before it is required
//   RNFBMessagingModule.m:33  RCT_EXPORT_MODULE();
//     type specifier missing, defaults to 'int'
//
// Pods build as framework modules under RN 0.83 whether or not the Podfile says
// use_frameworks!, so Xcode promotes -Wnon-modular-include-in-framework-module
// to an error. React Native's headers (RCTBridgeModule.h and friends) are not
// modular. RNFBApp includes RCTBridgeModule.h, so RNFBApp's module absorbs the
// RCTPromiseRejectBlock typedef and claims it; when RNFBMessaging includes the
// same non-modular header, Clang refuses it and says the declaration must come
// from RNFBApp's module instead. Once that include fails the rest of React's
// macros are gone too, which is where RCT_EXPORT_MODULE and RCT_EXTERN go
// missing. The includes are correct and work; this puts the diagnostic back to
// a warning, and only for the Pods project.
//
// RNFBAuth survives the same setup because its header only uses the
// RCTBridgeModule *protocol*. A protocol reference resolves; a typedef is the
// declaration kind the module system rejects. That is the whole difference
// between the pod that builds and the pod that does not.
//
// expo-build-properties exposes no option for this setting.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# dooodhwala: allow non-modular includes (see withNonModularHeaders.js)';

// The installer variable is captured rather than assumed. Expo fetches its
// Podfile template at prebuild time, so it cannot be checked from here, and a
// template that named it anything else would otherwise produce a Podfile that
// looks patched and refers to a variable that does not exist.
const snippet = (installerVar) => `
    ${MARKER}
    ${installerVar}.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

/**
 * The whole change, as a pure function, so it can be tested without an Xcode
 * project or a stubbed Expo. Idempotent: prebuild may run it more than once
 * against the same file.
 */
function patchPodfile(contents) {
    if (contents.includes(MARKER)) return contents;

    const anchor = /post_install do \|(\w+)\|/;
    const found = contents.match(anchor);
    if (!found) {
        // Failing loudly beats a build that dies twenty minutes later with the
        // same wall of errors and no sign that this plugin silently did nothing.
        throw new Error(
            '[withNonModularHeaders] Could not find "post_install do |installer|" in the ' +
            'Podfile. The Expo template changed; update this plugin.',
        );
    }

    return contents.replace(anchor, (match) => match + snippet(found[1]));
}

module.exports = function withNonModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (cfg) => {
            const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
            if (!fs.existsSync(podfile)) {
                throw new Error('[withNonModularHeaders] No Podfile at ' + podfile);
            }
            fs.writeFileSync(podfile, patchPodfile(fs.readFileSync(podfile, 'utf8')));
            return cfg;
        },
    ]);
};

module.exports.patchPodfile = patchPodfile;

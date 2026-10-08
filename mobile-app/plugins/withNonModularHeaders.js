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
// useFrameworks: "static" is not optional here — without it pod install fails
// outright, because the Swift Firebase pods (FirebaseAuth, FirebaseCoreInternal)
// depend on GoogleUtilities and the Interop pods, which define no modules. With
// it, every pod is a framework module, so Xcode promotes
// -Wnon-modular-include-in-framework-module to an error, and React Native's
// headers (RCTBridgeModule.h and friends) are not modular. This puts that
// diagnostic back to a warning, for the Pods project only.
//
// It is NOT the whole fix. A second, different error survives it:
//
//   declaration of 'RCTPromiseRejectBlock' must be imported from module
//   'RNFBApp.RNFBAppModule' before it is required
//
// That one is module *ownership*, not a non-modular include, and this setting
// does not suppress it. RNFBApp includes RCTBridgeModule.h, so RNFBApp's module
// absorbs and claims the RCTPromiseRejectBlock typedef; RNFBMessaging then
// includes the same header and Clang insists the declaration come from RNFBApp's
// module. RNFBAuth survives because its header only names the RCTBridgeModule
// *protocol* — a protocol reference resolves where a typedef does not, which is
// the entire difference between the pod that built and the pod that did not.
//
// What fixes that is ios.forceStaticLinking in expo-build-properties (added by
// expo/expo#39742 for this exact Firebase case): it overrides build_type to
// static_library for the named pods, so RNFBApp is not a framework and there is
// no module to own the typedef. app.json lists the three RNFB pods there.
//
// So this plugin is the belt and forceStaticLinking is the braces. Once a build
// is green it is worth checking whether this is still needed at all; it was
// written before forceStaticLinking was found and may now be redundant.
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

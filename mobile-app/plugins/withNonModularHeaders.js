// Expo config plugin: make @react-native-firebase work under
// useFrameworks: "static". Two separate things are needed, and the build fails
// differently depending on which is missing.
//
// 1. $RNFirebaseAsStaticFramework = true
//
//    RNFBApp.podspec reads this global and otherwise sets
//    `s.static_framework = false`. With use_frameworks! :linkage => :static in
//    the Podfile, that mismatch builds the Firebase pods as dynamic frameworks
//    while everything around them is static, and React's headers stop resolving
//    entirely — the build dies on "unknown type name 'RCT_EXTERN'" and
//    "declaration of 'RCTPromiseRejectBlock' must be imported from module
//    'RNFBApp.RNFBAppModule' before it is required". Nothing in those messages
//    points at linkage, which is what makes it hard to find.
//
// 2. CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES
//
//    Every pod is a framework module under useFrameworks, so Xcode promotes
//    -Wnon-modular-include-in-framework-module to an error. React Native's own
//    headers (RCTConvert.h, RCTBridgeModule.h, RCTEventEmitter.h) are not
//    modular and Firebase includes them. The includes are correct and work;
//    this puts it back to a warning, and only for the Pods project.
//
// Neither belongs in expo-build-properties, which exposes no option for either.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GLOBAL_MARKER = '$RNFirebaseAsStaticFramework';
const GLOBAL_SNIPPET = `# dooodhwala: see plugins/withNonModularHeaders.js
${GLOBAL_MARKER} = true
`;

const SETTINGS_MARKER = '# dooodhwala: allow non-modular includes (see withNonModularHeaders.js)';

// The installer variable is captured rather than assumed. Expo fetches its
// Podfile template at prebuild time, so it cannot be checked from here, and a
// template that named it anything else would otherwise produce a Podfile that
// looks patched and refers to a variable that does not exist.
const settingsSnippet = (installerVar) => `
    ${SETTINGS_MARKER}
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
    // A Ruby global, so it must be set before any podspec is evaluated. The top
    // of the file is the only place that is reliably true.
    if (!contents.includes(GLOBAL_MARKER)) {
        contents = GLOBAL_SNIPPET + contents;
    }

    if (!contents.includes(SETTINGS_MARKER)) {
        const anchor = /post_install do \|(\w+)\|/;
        const found = contents.match(anchor);
        if (!found) {
            // Failing loudly beats a build that dies twenty minutes later with
            // the same wall of errors and no sign that this plugin silently did
            // nothing.
            throw new Error(
                '[withNonModularHeaders] Could not find "post_install do |installer|" in the ' +
                'Podfile. The Expo template changed; update this plugin.',
            );
        }
        contents = contents.replace(anchor, (match) => match + settingsSnippet(found[1]));
    }

    return contents;
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

// Expo config plugin: let Firebase's pods include React Core headers.
//
// With useFrameworks: "static", every pod is built as a framework module, and
// Xcode then refuses any #include of a header that is not itself modular —
// -Wnon-modular-include-in-framework-module is promoted to an error. React
// Native's headers (RCTConvert.h, RCTBridgeModule.h, RCTEventEmitter.h) are not
// modular, and @react-native-firebase includes them, so the build dies with a
// wall of "include of non-modular header inside framework module 'RNFBApp...'".
//
// Nothing is actually wrong: the includes are correct and work. The setting
// below restores it to a warning, which is what Apple's own tooling does for
// mixed Objective-C projects. It is the documented workaround for this exact
// combination and applies only to the Pods project, not to our own code.
//
// Lives here rather than in expo-build-properties because that plugin exposes
// no option for this build setting.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# dooodhwala: allow non-modular includes (see withNonModularHeaders.js)';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

module.exports = function withNonModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (cfg) => {
            const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');

            if (!fs.existsSync(podfile)) {
                throw new Error('[withNonModularHeaders] No Podfile at ' + podfile);
            }

            let contents = fs.readFileSync(podfile, 'utf8');

            // Idempotent: prebuild can run more than once against the same file.
            if (contents.includes(MARKER)) return cfg;

            const anchor = /post_install do \|installer\|/;
            if (!anchor.test(contents)) {
                // Failing loudly beats a build that dies twenty minutes later
                // with the same wall of header errors and no clue why.
                throw new Error(
                    '[withNonModularHeaders] Could not find "post_install do |installer|" in the ' +
                    'Podfile. The Expo template changed; update this plugin.',
                );
            }

            contents = contents.replace(anchor, (match) => match + SNIPPET);
            fs.writeFileSync(podfile, contents);
            return cfg;
        },
    ]);
};

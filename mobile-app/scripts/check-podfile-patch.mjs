// The Podfile patch that makes @react-native-firebase/messaging compile.
// Run: node scripts/check-podfile-patch.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { patchPodfile } = require("../plugins/withNonModularHeaders.js");

// Shaped like the Podfile Expo's prebuild generates.
const TEMPLATE = `require "expo/scripts/autolinking"

platform :ios, '15.1'

target 'DOOODHWALA' do
  post_install do |installer|
    react_native_post_install(installer)
  end
end
`;

const once = patchPodfile(TEMPLATE);

assert.ok(/CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'\] = 'YES'/.test(once),
    "the non-modular include setting must be applied");
assert.ok(once.includes("post_install do |installer|"),
    "the original post_install hook must survive");
assert.ok(once.includes("react_native_post_install(installer)"),
    "Expo's own post_install work must not be clobbered");

// The setting is only ever wanted on the Pods project. Writing the user's app
// project from here would be a different and much riskier change.
assert.ok(/\.pods_project\.targets/.test(once), "it must target the Pods project");

// Idempotent — prebuild can run more than once against the same file, and a
// second loop would be a Podfile syntax problem waiting.
const twice = patchPodfile(once);
assert.equal(twice, once, "patching twice must change nothing");
assert.equal((twice.match(/CLANG_ALLOW_NON_MODULAR/g) || []).length, 1);

// Nothing should reintroduce the static-framework global. It was a wrong guess:
// it only means anything under use_frameworks! :linkage => :static, which this
// app no longer uses, and with it the build failed identically four times.
assert.ok(!/RNFirebaseAsStaticFramework/.test(twice),
    "the static-framework global was the wrong fix and must not come back");

// A changed Expo template must fail loudly at prebuild, not silently do nothing
// and let the same twenty-minute build die the same way.
assert.throws(
    () => patchPodfile("target 'App' do\nend\n"),
    /Could not find "post_install do \|installer\|"/,
    "a missing anchor must throw, not pass silently",
);

// Expo fetches its Podfile template at prebuild, so this cannot be verified
// against the real thing from here. A template that renamed the installer
// variable must still produce a Podfile that refers to the right one.
const renamed = patchPodfile(TEMPLATE.replace("|installer|", "|inst|"));
assert.ok(/\binst\.pods_project\.targets/.test(renamed),
    "the captured installer variable must be used, not a hardcoded one");
assert.ok(!/installer\.pods_project/.test(renamed),
    "the hardcoded installer name must not leak through");

console.log("podfile patch ok — setting applied to Pods project, idempotent, variable captured, loud on a real template change");

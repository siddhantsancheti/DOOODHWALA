// The Podfile patch that makes @react-native-firebase build under
// useFrameworks: "static". Both halves are required and the build fails
// differently depending on which is missing, so both are pinned here.
// Run: node scripts/check-podfile-patch.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { patchPodfile } = require("../plugins/withNonModularHeaders.js");

// Shaped like the Podfile Expo's prebuild generates.
const TEMPLATE = `require "expo/scripts/autolinking"

platform :ios, '15.1'

target 'DOOODHWALA' do
  use_frameworks! :linkage => :static

  post_install do |installer|
    react_native_post_install(installer)
  end
end
`;

const once = patchPodfile(TEMPLATE);

// 1. The Ruby global RNFBApp.podspec reads. Without it the podspec sets
//    static_framework = false and React's headers stop resolving.
assert.ok(/^\$RNFirebaseAsStaticFramework = true$/m.test(once),
    "the RNFirebase static-framework global must be set");
assert.ok(once.indexOf("RNFirebaseAsStaticFramework") < once.indexOf("target"),
    "a Ruby global must be set before any podspec is evaluated, so it goes at the top");

// 2. The build setting that stops non-modular includes being errors.
assert.ok(/CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'\] = 'YES'/.test(once),
    "the non-modular include setting must be applied");
assert.ok(once.includes("post_install do |installer|"),
    "the original post_install hook must survive");
assert.ok(once.includes("react_native_post_install(installer)"),
    "Expo's own post_install work must not be clobbered");

// Idempotent — prebuild can run more than once against the same file, and a
// second global or a second loop would be a Podfile syntax problem waiting.
const twice = patchPodfile(once);
assert.equal(twice, once, "patching twice must change nothing");
assert.equal((twice.match(/\$RNFirebaseAsStaticFramework/g) || []).length, 1);
assert.equal((twice.match(/CLANG_ALLOW_NON_MODULAR/g) || []).length, 1);

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

console.log("podfile patch ok — both halves applied, idempotent, variable captured, loud on a real template change");

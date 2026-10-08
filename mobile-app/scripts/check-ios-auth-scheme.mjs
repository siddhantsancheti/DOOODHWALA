// Firebase phone OTP on iOS falls back to a reCAPTCHA web flow whenever the
// APNs silent push does not land — a reviewer who denies notifications, a bad
// network, a misconfigured APNs key. That flow returns to the app through a
// custom URL scheme, and with no scheme registered there is no way back: the
// user is stranded mid-login. Build 33 shipped exactly that way.
// Run: node scripts/check-ios-auth-scheme.mjs
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { schemeFrom } = require("../plugins/withIosFirebaseAuth.js");

const plist = (body) => `<?xml version="1.0"?><plist><dict>${body}</dict></plist>`;

// Google Sign-In configured: use the OAuth client's reversed id verbatim.
assert.equal(
    schemeFrom(plist("<key>REVERSED_CLIENT_ID</key>\n\t<string>com.googleusercontent.apps.123-abc</string>")),
    "com.googleusercontent.apps.123-abc",
);

// Phone OTP only, which is this app: derive the encoded app id instead.
assert.equal(
    schemeFrom(plist("<key>GOOGLE_APP_ID</key>\n\t<string>1:975274362088:ios:fb188ebf</string>")),
    "app-1-975274362088-ios-fb188ebf",
);

// Both present — the OAuth client wins, since that is what Firebase opens.
assert.equal(
    schemeFrom(plist(
        "<key>GOOGLE_APP_ID</key><string>1:1:ios:a</string>" +
        "<key>REVERSED_CLIENT_ID</key><string>com.googleusercontent.apps.1</string>",
    )),
    "com.googleusercontent.apps.1",
);

// A plist that yields nothing must throw. Returning null here is what hid the
// bug: it was indistinguishable from "no plist yet" and skipped silently.
assert.throws(() => schemeFrom(plist("<key>BUNDLE_ID</key><string>x</string>")),
    /neither REVERSED_CLIENT_ID nor GOOGLE_APP_ID/);

// And the real file must actually produce one.
const real = new URL("../GoogleService-Info.plist", import.meta.url);
if (existsSync(real)) {
    const scheme = schemeFrom(readFileSync(real, "utf8"));
    assert.ok(scheme.length > 0);
    assert.ok(!scheme.includes(":"), "a URL scheme cannot contain a colon");
    console.log(`ios auth scheme ok — real plist yields ${scheme}`);
} else {
    console.log("ios auth scheme ok — logic verified; no plist present to check");
}

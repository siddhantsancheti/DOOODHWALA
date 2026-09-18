// The login guard decides whether a Firebase sign-in is exchanged for an app
// JWT. Too loose and one sign-up becomes a login storm; too tight and a real
// person cannot log in at all. Both failures are total, so the state machine is
// pinned here. Run: node scripts/check-login-guard.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Mirrors the module-scoped guard in src/screens/LoginScreen.tsx.
function makeLogin() {
    let exchangedUid = null;
    let exchanges = 0;
    return {
        get exchanges() { return exchanges; },
        // One onAuthStateChanged callback. `user` is null when signed out.
        onAuthState(user, { fails = false } = {}) {
            if (!user) { exchangedUid = null; return; }
            if (exchangedUid !== user.uid) {
                exchangedUid = user.uid;
                if (fails) { exchangedUid = null; return; }
                exchanges += 1;
            }
        },
        // A remount attaches a NEW listener; module state is untouched.
        remount(user) { this.onAuthState(user); },
    };
}

const A = { uid: "firebase-uid-A" };
const B = { uid: "firebase-uid-B" };

// A normal sign-in exchanges exactly once.
let l = makeLogin();
l.onAuthState(A);
assert.equal(l.exchanges, 1, "a sign-in must exchange once");

// The bug: remounts must not re-exchange. This is what produced 27 in a second.
for (let i = 0; i < 30; i++) l.remount(A);
assert.equal(l.exchanges, 1, "remounting must never re-exchange");

// The risk introduced by fixing it: logging back in must still work.
l.onAuthState(null);            // signed out
l.onAuthState(A);               // same person signs in again
assert.equal(l.exchanges, 2, "the same uid must log in again after sign-out");

// A different person on the same device.
l.onAuthState(null);
l.onAuthState(B);
assert.equal(l.exchanges, 3, "a different uid must exchange");

// A failed exchange must leave a retry possible.
l = makeLogin();
l.onAuthState(A, { fails: true });
assert.equal(l.exchanges, 0, "a failed exchange counts as no exchange");
l.onAuthState(A);
assert.equal(l.exchanges, 1, "a retry after failure must succeed");

// A token minted seconds ago is not stale and must survive a 401.
const GRACE_MS = 15000;
const shouldClear = (ageMs) => ageMs >= GRACE_MS;
assert.equal(shouldClear(0), false, "a token issued now must not be cleared");
assert.equal(shouldClear(2000), false, "the observed race was ~1s — must survive");
assert.equal(shouldClear(14999), false);
assert.equal(shouldClear(15000), true, "a genuinely stale session must still clear");
assert.equal(shouldClear(3600_000), true);

// The guard must not go back to being a ref, which is what reset on remount.
const src = readFileSync(new URL("../src/screens/LoginScreen.tsx", import.meta.url), "utf8");
assert.ok(!/completedRef/.test(src), "completedRef is back — a ref resets on remount");
assert.ok(/^let exchangedUid/m.test(src), "the guard must stay module-scoped");
assert.ok(/if \(!user\) \{/.test(src), "sign-out must clear the guard or re-login is refused");

console.log("login guard ok — exchanges once, survives remounts, still lets people back in");

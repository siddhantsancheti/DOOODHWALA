// The update gate must fail OPEN. Blocking wrongly takes every phone offline at
// once, including a dairyman mid-round; allowing wrongly costs one stale
// session. Run: node scripts/check-update-gate.mjs
import assert from "node:assert/strict";

// Mirrors isUpdateRequired() in src/components/UpdateRequired.tsx.
function isUpdateRequired(min, raw) {
    if (min == null) return false;
    const current = typeof raw === "string" ? parseInt(raw, 10) : raw;
    if (typeof current !== "number" || !Number.isFinite(current)) return false;
    return current < min;
}

// Blocks only when there is a published floor and this build is genuinely below it.
assert.equal(isUpdateRequired(31, 30), true, "an older build must be blocked");
assert.equal(isUpdateRequired(31, 31), false, "the floor itself must run");
assert.equal(isUpdateRequired(31, 32), false, "a newer build must run");
assert.equal(isUpdateRequired(31, "30"), true, "iOS reports a string build number");

// Every failure mode lets the user in.
assert.equal(isUpdateRequired(null, 30), false, "no floor published -> allow");
assert.equal(isUpdateRequired(undefined, 30), false, "config fetch failed -> allow");
assert.equal(isUpdateRequired(31, undefined), false, "version unreadable -> allow");
assert.equal(isUpdateRequired(31, null), false, "version missing -> allow");
assert.equal(isUpdateRequired(31, NaN), false, "version unparseable -> allow");
assert.equal(isUpdateRequired(31, "not a number"), false, "garbage version -> allow");

console.log("update gate ok — blocks only a real old build, fails open otherwise");

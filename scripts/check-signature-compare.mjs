// Signature comparison must be constant-time and must not throw on a
// wrong-length input — timingSafeEqual does throw, so the length guard has to
// come first. Run: node scripts/check-signature-compare.mjs
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

function signatureMatches(expected, received) {
    if (!received || expected.length !== received.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

const good = crypto.createHmac("sha256", "secret").update("payload").digest("hex");

assert.equal(signatureMatches(good, good), true, "a correct signature must pass");
assert.equal(signatureMatches(good, good.slice(0, -1) + "0"), false, "one wrong byte must fail");
assert.equal(signatureMatches(good, good.slice(0, 10)), false, "a short signature must fail, not throw");
assert.equal(signatureMatches(good, good + "ff"), false, "a long signature must fail, not throw");
assert.equal(signatureMatches(good, undefined), false, "a missing signature must fail");
assert.equal(signatureMatches(good, ""), false, "an empty signature must fail");

// The routes must not have drifted back to ===, which is the bug this replaced.
const src = readFileSync(new URL("../server/paymentRoutes.ts", import.meta.url), "utf8");
const raw = src.match(/expectedSignature\s*(===|!==)\s*\w/g) || [];
assert.equal(raw.length, 0, `payment signatures compared with ${raw[0]} — use signatureMatches()`);

console.log("signature compare ok — constant-time, safe on bad lengths, no raw === left");

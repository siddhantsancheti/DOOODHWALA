// What the admin screen is allowed to store as a percentage.
//
// The endpoint used to do `isNaN(parseFloat(v))` and then store `v.toString()`.
// parseFloat stops at the first non-numeric character, so "5abc" passed the
// check and "5abc" reached a decimal column; "150" and "-50" passed outright.
// A commission over 100 makes the milkman's payout negative, and a negative one
// pays him more than the goods were worth.
//
// Run: npx tsx scripts/check-rate-input.ts
import assert from "node:assert/strict";
import { parseRate, splitBill } from "../server/services/rateMath";

// --- accepted: the shapes a human types into a percent field ---
for (const [input, expected] of [
    ["0", 0], ["0.5", 0.5], ["1", 1], ["2.25", 2.25], ["100", 100],
    [0.5, 0.5], [1, 1], [100, 100],
    [" 2 ", 2],           // trimmed, because a pasted value often carries spaces
] as [unknown, number][]) {
    assert.equal(parseRate(input), expected, `${JSON.stringify(input)} should parse to ${expected}`);
}

// --- rejected: every way the old check let money through ---
for (const bad of [
    "5abc",      // parseFloat said 5; the column would have received "5abc"
    "150", 150,  // over 100 — payout goes negative
    "-50", -50,  // negative — pays him more than the goods were worth
    "1e3",       // parseFloat said 1000
    "0.123",     // more precision than the column holds, silently rounded
    "", "   ", "abc", "%5", "1,5", "Infinity", "NaN",
    null, undefined, {}, [], true, NaN, Infinity,
]) {
    assert.equal(parseRate(bad as unknown), null, `${JSON.stringify(bad)} must be rejected`);
}

// --- why it matters, in money ---
// A 150% commission on a ₹1000 month would have owed the milkman minus ₹500.
const bad = splitBill(1000, 1, 150);
assert.equal(bad.milkmanPayout, "-500.00", "this is what the old validation permitted");
assert.equal(parseRate("150"), null, "and this is what now stops it reaching the database");

// A negative rate would have paid him more than he sold.
assert.equal(splitBill(1000, 1, -50).milkmanPayout, "1500.00");
assert.equal(parseRate("-50"), null);

// The agreed rates still pass, unchanged.
assert.equal(parseRate("0.5"), 0.5);
assert.equal(parseRate("1"), 1);
const agreed = splitBill(1000, 1, 0.5);
assert.equal(agreed.totalAmount, "1010.00");
assert.equal(agreed.milkmanPayout, "995.00");

// --- clearing is not the same as zero ---
// The endpoint treats null and "" as "clear the override"; parseRate rejects
// both, so the two paths must never be confused by a caller that only checks
// for a number. Zero is a real, storable rate meaning "pays nothing".
assert.equal(parseRate(0), 0, "zero is a valid rate, not an absent one");
assert.equal(parseRate(""), null, "empty means clear, and must not fall through as zero");

console.log("rate input ok — bounded 0-100, two decimals, no parseFloat leakage");

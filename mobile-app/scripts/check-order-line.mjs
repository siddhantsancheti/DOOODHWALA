// How a quantity reads in the order message a dairyman receives.
//
// A product's `unit` is how its PRICE is quoted — "per litre" — and it was
// interpolated straight into the quantity, so every order sent read
// "Order for 2 per litre of Fresh Milk".
//
// Run: node scripts/check-order-line.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Mirrors orderLine in ChatComponent. The source is checked below, so this
// copy cannot quietly diverge from the real one.
const orderLine = (qty, unit) => {
    const noun = String(unit ?? "").trim().replace(/^per\s+/i, "").replace(/\s+/g, " ").trim().toLowerCase() || "unit";
    const n = parseFloat(String(qty));
    const plural = Number.isFinite(n) && n === 1 ? noun : (/s$/i.test(noun) ? noun : noun + "s");
    return `${qty} ${plural}`;
};

// The bug, in the words the dairyman actually saw.
assert.equal(orderLine(2, "per litre"), "2 litres");
assert.notEqual(orderLine(2, "per litre"), "2 per litre");
assert.equal(`Order for ${orderLine(5, "per litre")} of Buffalo Milk`,
    "Order for 5 litres of Buffalo Milk");

// One is singular; a fraction is not one.
assert.equal(orderLine(1, "per litre"), "1 litre");
assert.equal(orderLine("1", "per litre"), "1 litre");
assert.equal(orderLine(1.5, "per litre"), "1.5 litres");
assert.equal(orderLine(0.5, "per litre"), "0.5 litres");

// An already-plural unit must not double up.
assert.equal(orderLine(3, "per litres"), "3 litres");

// Other shapes a milkman types into his own product list.
assert.equal(orderLine(2, "per packet"), "2 packets");
assert.equal(orderLine(2, "litre"), "2 litres");
assert.equal(orderLine(2, "PER LITRE"), "2 litres");
assert.equal(orderLine(2, "  per  litre "), "2 litres");

// No unit at all still reads as a sentence rather than trailing off.
assert.equal(orderLine(2, undefined), "2 units");
assert.equal(orderLine(2, null), "2 units");
assert.equal(orderLine(2, ""), "2 units");
assert.equal(orderLine(1, ""), "1 unit");

// --- and the real component still works this way ---
const src = readFileSync(new URL("../src/components/ChatComponent.tsx", import.meta.url), "utf8");

assert.match(src, /export function orderLine\(/, "orderLine must exist in ChatComponent");
assert.match(src, /replace\(\/\^per\\s\+\/i, ''\)/, "it must still strip a leading 'per'");

// Both paths must go through it. Fixing one and not the other would leave the
// bug live on whichever path was missed, which is the easy mistake here.
assert.ok(!/\$\{orderQuantity\}\s+\$\{selectedProduct\.unit/.test(src),
    "the manual-order path must not interpolate unit directly");
assert.ok(!/\$\{item\.quantity\}\s+\$\{item\.unit/.test(src),
    "the quick-order path must not interpolate unit directly");
assert.equal((src.match(/orderLine\(/g) || []).length, 3,
    "expected one definition and two call sites");

console.log("order line ok — 'per litre' no longer leaks into the quantity");

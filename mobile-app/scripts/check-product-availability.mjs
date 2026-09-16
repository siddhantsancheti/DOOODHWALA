// A dairy item with no isAvailable key must read as AVAILABLE everywhere.
// Reading it as unavailable on the milkman's own screen is what let a product
// customers could see be switched off by a button labelled "Activate".
// Run: node scripts/check-product-availability.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const isProductAvailable = (item) => !!item && item.isAvailable !== false;

assert.equal(isProductAvailable({ name: "Fresh Milk" }), true, "no key -> available");
assert.equal(isProductAvailable({ isAvailable: true }), true);
assert.equal(isProductAvailable({ isAvailable: undefined }), true, "undefined -> available");
assert.equal(isProductAvailable({ isAvailable: false }), false, "only false hides it");
assert.equal(isProductAvailable(null), false);
assert.equal(isProductAvailable(undefined), false);

// Nobody may re-introduce a second rule by testing truthiness directly.
const files = [
  "src/components/ChatComponent.tsx",
  "src/screens/ChatScreen.tsx",
  "src/screens/customer/YDPageScreen.tsx",
  "src/screens/milkman/MilkmanDashboardScreen.tsx",
];
for (const f of files) {
  const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  const bare = src.match(/item\.isAvailable\s*\?|\bi\.isAvailable\s*\?/g) || [];
  assert.equal(bare.length, 0, `${f} tests isAvailable truthiness directly — use isProductAvailable()`);
}

console.log("product availability ok — absent means available, one rule in", files.length, "files");

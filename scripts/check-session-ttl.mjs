// Session length is a billing decision here: every expiry costs one SMS.
// It is also a security one, so it must stay visible and overridable rather
// than drift back to a literal buried in two call sites.
// Run: node scripts/check-session-ttl.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../server/authRoutes.ts", import.meta.url), "utf8");

// One constant, both issuing sites.
assert.ok(/const SESSION_TTL/.test(src), "SESSION_TTL must exist");
const literals = src.match(/expiresIn:\s*"[^"]+"/g) || [];
assert.equal(literals.length, 0,
    `a session length is hardcoded again: ${literals.join(", ")} — use SESSION_TTL`);

const uses = (src.match(/expiresIn:\s*SESSION_TTL/g) || []).length;
assert.equal(uses, 2, `expected both token sites to use SESSION_TTL, found ${uses}`);

// Overridable without a deploy, so it can be shortened in a hurry.
assert.ok(/process\.env\.SESSION_TTL/.test(src), "SESSION_TTL must be overridable by env");

// What the chosen default actually costs in SMS.
const ttl = src.match(/\|\|\s*"(\d+)d"/);
assert.ok(ttl, "the default must be a plain day count so its cost is legible");
const days = Number(ttl[1]);
assert.ok(days >= 90, `${days}d re-verifies too often — the SMS bill is the point of this`);
assert.ok(days <= 400, `${days}d is longer than a year; sessions should not be effectively permanent`);

const users = 5000;
const perMonth = Math.round(users / (days / 30));
console.log(
    `session ttl ok — ${days}d, one constant, env-overridable.`,
    `At ${users} users that is ~${perMonth} SMS/month (30d would be ${users}).`,
);

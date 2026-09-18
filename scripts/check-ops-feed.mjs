// The operator feed must never flood. Telegram accepts roughly one message a
// second to one chat and answers 429 above that, so "tell me everything" needs
// a queue, a dedup and a ceiling — and it must say when it dropped something,
// because a silent gap in the feed is worse than a known one.
// Run: node scripts/check-ops-feed.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../server/services/ops.ts", import.meta.url), "utf8");

// --- the guards that stop a flood ---
assert.ok(/const SPACING_MS = \d+/.test(src), "sends must be spaced apart");
const spacing = Number(src.match(/const SPACING_MS = (\d+)/)[1]);
assert.ok(spacing >= 1000, `spacing ${spacing}ms is under Telegram's ~1/sec limit`);

assert.ok(/const DEDUP_MS = /.test(src), "identical events must be deduped");
assert.ok(/const MAX_QUEUE = /.test(src), "the queue must have a ceiling");
assert.ok(/more event\(s\) in that burst/.test(src), "a drop must be reported, not silent");

// --- the contract that keeps it out of the request path ---
assert.ok(/export function notifyOps/.test(src), "notifyOps must not be async");
assert.ok(!/export async function notifyOps/.test(src),
    "notifyOps must not be awaitable — an event is a side effect, not part of the request");
assert.ok(/catch \(err\)/.test(src), "a failed send must never throw into a route");

// --- behaviour of the dedup + ceiling, mirrored ---
const DEDUP_MS = 10_000, MAX_QUEUE = 25;
function feed() {
    const recent = new Map(), queue = [];
    let dropped = 0, now = 0;
    return {
        at(t) { now = t; return this; },
        push(text) {
            for (const [k, a] of recent) if (now - a > DEDUP_MS) recent.delete(k);
            if (recent.has(text)) return "deduped";
            recent.set(text, now);
            if (queue.length >= MAX_QUEUE) { dropped++; return "dropped"; }
            queue.push(text); return "queued";
        },
        get queued() { return queue.length; },
        get dropped() { return dropped; },
    };
}

let f = feed();
assert.equal(f.at(0).push("A login"), "queued");
assert.equal(f.at(100).push("A login"), "deduped", "a repeat within the window is dropped");
assert.equal(f.at(11_000).push("A login"), "queued", "the same event later is real news");

// A runaway loop must be counted, not sent.
f = feed();
for (let i = 0; i < 100; i++) f.at(i).push(`event ${i}`);
assert.equal(f.queued, MAX_QUEUE, "the queue must stop at its ceiling");
assert.equal(f.dropped, 75, "everything past the ceiling must be counted");

console.log("ops feed ok — spaced", spacing + "ms, deduped, capped at", MAX_QUEUE, "with drops reported");

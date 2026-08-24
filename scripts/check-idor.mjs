// Fails if a route reads an owner id (milkmanId / customerId) straight from the
// request instead of deriving it from the signed-in user.
//
// Why this exists: `authenticateToken` only proves the caller holds a valid
// token. Three routes went on to trust `?milkmanId=` / `?customerId=` from the
// URL, so any signed-in account could read any household's chat history and any
// milkman's entire bill book by editing a number. The fix was to derive the
// identity from the token (see server/services/access.ts). This check stops the
// pattern coming back the next time a route is added in a hurry.
//
// Run: node scripts/check-idor.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SERVER_DIR = "server";

// Reading the id is fine when the same handler also proves the caller owns it.
// These markers are what "proved" looks like in this codebase.
const AUTHORIZED_MARKERS = [
    // Shared helpers in server/services/access.ts
    "isPartyToChat",
    "isSelfMilkman",
    "canAccessCustomer",
    "canTrackMilkman",
    "callerIdentities",
    // Hand-rolled equivalents: the handler looks the caller up by their own
    // user id before trusting the id it was given.
    "currentMilkman",
    "getMilkmanForUser",
    "milkmen.userId",
    "customers.userId",
];

const RISKY = /req\.(query|body|params)\.(milkmanId|customerId)|const\s*\{[^}]*\b(milkmanId|customerId)\b[^}]*\}\s*=\s*req\.(query|body|params)/;

// Reviewed and accepted: the id is not an ownership claim here.
// Each entry needs a reason — "it's probably fine" is how the original three
// holes got written.
const REVIEWED = {
    "productRoutes.ts GET /":
        "milkmanId is a catalogue filter; products are public by design.",
    "groupRoutes.ts POST /":
        "a customer naming the milkman they want a household chat with, like a service request.",
    "paymentRoutes.ts POST /cod/create-order":
        "ids are re-derived from the bill row before use; body values are only a fallback.",
};

function handlers(source) {
    // Split on route declarations so each handler is checked against its own body.
    const parts = source.split(/(?=router\.(get|post|put|patch|delete)\s*\()/);
    return parts.filter((p) => p.startsWith("router."));
}

const offenders = [];

for (const file of readdirSync(SERVER_DIR).filter((f) => f.endsWith("Routes.ts"))) {
    const path = join(SERVER_DIR, file);
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");

    for (const handler of handlers(source)) {
        if (!RISKY.test(handler)) continue;
        if (AUTHORIZED_MARKERS.some((m) => handler.includes(m))) continue;

        const route = handler.match(/router\.(\w+)\(\s*["'`]([^"'`]+)/);
        const label = route ? `${route[1].toUpperCase()} ${route[2]}` : "(unknown route)";
        if (REVIEWED[`${file} ${label}`]) continue;

        offenders.push(`${path}  ${label}`);
    }
}

if (offenders.length > 0) {
    console.error("IDOR risk — owner id taken from the request without an ownership check:\n");
    for (const o of offenders) console.error("  " + o);
    console.error(
        "\nDerive the id from the token instead. See server/services/access.ts " +
        "(callerIdentities / isPartyToChat), or add an explicit ownership check " +
        "in the handler.",
    );
    process.exit(1);
}

console.log("check-idor: OK — every owner id is derived or ownership-checked.");

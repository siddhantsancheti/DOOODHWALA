// Two bugs that look unrelated and share a cause: a screen that cannot know
// what it is sitting on.
//
// 1. A <Modal> is its own native root on iOS, so the SafeAreaProvider mounted
//    in App.tsx does not reach inside it and every inset reads zero. The Shared
//    Media header rendered at y=0, putting its back arrow behind the clock —
//    which read as "there is no back button on this page".
//
// 2. The dashboard's floating chat button navigated to Chat with whatever
//    assignedMilkmanId happened to be, including undefined, landing the
//    customer in an empty thread headed "Milkman".
//
// Run: node scripts/check-modal-insets.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// --- 1. every full-screen modal re-provides the safe area ---
const yd = read("../src/screens/customer/YDPageScreen.tsx");

assert.match(yd, /import \{[^}]*SafeAreaProvider[^}]*\} from 'react-native-safe-area-context'/,
    "SafeAreaProvider must be imported where full-screen modals live");

const fullScreenModals = (yd.match(/transparent=\{false\}/g) || []).length;
assert.ok(fullScreenModals >= 2, "expected the media and analytics modals");
assert.equal((yd.match(/<SafeAreaProvider>/g) || []).length, fullScreenModals,
    "every full-screen modal needs its own provider, or its header sits under the status bar");
assert.equal((yd.match(/<\/SafeAreaProvider>/g) || []).length, fullScreenModals,
    "providers must be balanced");

// Each full-screen Modal must be followed by a provider before its SafeAreaView,
// so a new modal added later cannot quietly inherit the old broken shape.
for (const block of yd.split(/<Modal /).slice(1)) {
    if (!block.includes("transparent={false}")) continue;
    const head = block.slice(0, block.indexOf("<SafeAreaView"));
    assert.match(head, /<SafeAreaProvider>/,
        "a full-screen Modal must re-provide the safe area before its SafeAreaView");
}

// --- 2. the chat button cannot open a chat that does not exist ---
const dash = read("../src/screens/customer/CustomerDashboardScreen.tsx");

assert.match(dash, /const handleNewOrderClick = \(\) => \{/, "the guarded handler must exist");
assert.match(dash, /if \(profile\?\.assignedMilkmanId\)/, "it must check for an assigned dairyman");
assert.match(dash, /navigation\.navigate\('YDPage'\)/, "and send them to pick one otherwise");

assert.match(dash, /style=\{styles\.floatingChatBtn\}\s*\n\s*onPress=\{handleNewOrderClick\}/,
    "the floating chat button must go through the guarded handler");

// The bug was navigating straight to Chat from the button. Only the guarded
// handler may do that, so there must be exactly one such navigate call.
assert.equal((dash.match(/navigation\.navigate\('Chat'/g) || []).length, 1,
    "only handleNewOrderClick may open the chat; a second call site is the bug returning");

console.log("modal insets + chat guard ok");

// What still blocks an iOS build or submit, named plainly.
//
// An EAS iOS build fails ten minutes in with a message about a missing resource
// or a rejected Apple ID, and neither says which of these it was. Run this
// first. Run: node scripts/check-ios-ready.mjs
import { readFileSync, existsSync } from "node:fs";

const url = (p) => new URL(p, import.meta.url);
const app = JSON.parse(readFileSync(url("../app.json"), "utf8")).expo;
const eas = JSON.parse(readFileSync(url("../eas.json"), "utf8"));

const blockers = [];
const warnings = [];
const ok = [];

// --- things that stop the build outright ---
const plist = app.ios?.googleServicesFile;
if (plist && !existsSync(url(`../${plist.replace(/^\.\//, "")}`))) {
    blockers.push(
        `${plist} is missing. app.json points at it, so the build fails before it starts.\n` +
        `      Firebase Console > Project settings > Add app > iOS > bundle id ${app.ios?.bundleIdentifier}`,
    );
} else if (plist) {
    ok.push(`${plist} present`);
}

if (!app.ios?.bundleIdentifier) blockers.push("app.json has no ios.bundleIdentifier.");
else ok.push(`bundle id ${app.ios.bundleIdentifier}`);

const iosBuild = eas.build?.production?.ios ?? {};
if (iosBuild.credentialsSource === "local") {
    const creds = existsSync(url("../credentials.json"))
        ? JSON.parse(readFileSync(url("../credentials.json"), "utf8"))
        : {};
    if (!creds.ios) {
        blockers.push(
            "eas.json asks for local iOS credentials but credentials.json has no ios entry.\n" +
            "      Use credentialsSource: \"remote\" and let EAS create the certificate.",
        );
    }
} else {
    ok.push(`iOS credentials: ${iosBuild.credentialsSource ?? "remote (EAS-managed)"}`);
}

// --- things that stop the submit, not the build ---
const submit = eas.submit?.production?.ios;
if (submit) {
    const fake = Object.entries(submit).filter(([, v]) => String(v).includes("your-"));
    if (fake.length) {
        blockers.push(
            `eas.json submit.production.ios still has placeholders: ${fake.map(([k]) => k).join(", ")}.\n` +
            "      Remove the block and eas submit will prompt for the real values.",
        );
    }
} else {
    ok.push("submit config absent — eas submit will prompt and remember");
}

// --- things that are fine now but must be real before the gate is used ---
if (!app.extra?.appStoreId) {
    warnings.push(
        "extra.appStoreId is empty, so the forced-update wall will not block iOS users.\n" +
        "      That is deliberate — there is no listing to send them to yet. Fill it in\n" +
        "      once the app is live, or a future min_version_code would brick them.",
    );
}

const versionsAligned = String(app.ios?.buildNumber) === String(app.android?.versionCode);
if (!versionsAligned) {
    warnings.push(
        `ios.buildNumber (${app.ios?.buildNumber}) and android.versionCode (${app.android?.versionCode}) differ.\n` +
        "      One min_version_code governs both stores, so they must match.",
    );
} else {
    ok.push(`both platforms at build ${app.ios?.buildNumber}`);
}

for (const o of ok) console.log(`  ok       ${o}`);
for (const w of warnings) console.log(`  note     ${w}`);
for (const b of blockers) console.log(`  BLOCKER  ${b}`);

console.log(
    blockers.length
        ? `\n${blockers.length} blocker(s) — an iOS build will fail until these are fixed.`
        : "\niOS build is ready. You still need an Apple Developer account ($99/yr) to submit.",
);
process.exit(blockers.length ? 1 : 0);

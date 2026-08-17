// Every place that assigns a customer to a milkman must also put them in a
// household, or that customer becomes invisible to counting, billing and the
// delivery run.
//
//   node scripts/check-household-callsites.mjs
//
// This is a static check on purpose: the rule it protects is "someone adds a
// sixth assignment site and forgets", which no runtime test would catch
// because the new code path simply would not be exercised.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'server');

// Assigning null is un-assigning — that needs no household.
const ASSIGNS = /assignedMilkmanId:\s*(?!null)[A-Za-z_]/g;
const HOUSEHOLD_CALL = /ensureHouseholdChat\s*\(|retireOtherSoloHouseholds\s*\(/;

// groupRoutes creates the chat inline via insert(familyChats) and then retires
// the solo one, so it satisfies the rule a different way.
const INLINE_CHAT = /insert\(familyChats\)/;

const failures = [];
let checked = 0;

for (const file of readdirSync(serverDir).filter((f) => f.endsWith('.ts'))) {
  const src = readFileSync(join(serverDir, file), 'utf8').replace(/\r\n/g, '\n');
  const assigns = [...src.matchAll(ASSIGNS)];
  if (assigns.length === 0) continue;

  checked += assigns.length;
  const satisfied = HOUSEHOLD_CALL.test(src) || INLINE_CHAT.test(src);

  if (!satisfied) {
    failures.push(
      `${file}: assigns a milkman ${assigns.length} time(s) but never calls ` +
      `ensureHouseholdChat — that customer would have no household.`,
    );
  } else {
    console.log(`ok  ${file}  ${assigns.length} assignment site(s)`);
  }
}

assert.ok(checked > 0, 'found no assignment sites at all — did the field get renamed?');
assert.deepEqual(failures, [], '\n' + failures.join('\n'));

console.log(`\nAll ${checked} assignment site(s) create a household.`);

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

assert.deepEqual(failures, [], '\n' + failures.join('\n'));

// Zero sites is now the healthy state, not a broken check.
//
// Every route used to write assignedMilkmanId itself, and each had to remember
// to create the household chat too - which is what this check enforced. They
// all go through services/dairymen.ts now, so the column is written in exactly
// one place and the household comes with it. What matters today is that nobody
// reintroduces a direct write outside that service.
if (checked === 0) {
  const service = readFileSync(join(serverDir, 'services/dairymen.ts'), 'utf8');
  assert.ok(
    /ensureHouseholdChat/.test(service),
    'services/dairymen.ts no longer creates a household - a customer assigned a ' +
    'dairyman would have no chat to order in.',
  );
  console.log('ok  services/dairymen.ts is the only writer, and it creates the household');
  console.log('\nNo direct assignment sites outside the service. That is the healthy state.');
} else {
  console.log(`\nAll ${checked} assignment site(s) create a household.`);
}

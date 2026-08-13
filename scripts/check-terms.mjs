// Integrity check for the published Terms & Conditions documents.
//   node scripts/check-terms.mjs
//
// These files are shown verbatim to users at signup and are the record of what
// they consented to, so the failure that matters is a document silently
// shipping garbled, truncated, or with internal notes left in.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = [
  { file: 'server/legal/customerTerms.ts', versionConst: 'CUSTOMER_TERMS_VERSION', sections: 18 },
  { file: 'server/legal/milkmanTerms.ts', versionConst: 'MILKMAN_TERMS_VERSION', sections: 18 },
];

const versions = new Set();

for (const { file, versionConst, sections } of DOCS) {
  // Normalise CRLF — this repo is developed on Windows and git may check the
  // files out with either line ending.
  const src = readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const where = (msg) => `${file}: ${msg}`;

  const version = src.match(new RegExp(`${versionConst} = "([^"]+)"`))?.[1];
  assert.ok(version, where(`${versionConst} missing`));
  assert.ok(!versions.has(version), where(`version "${version}" is not unique across roles`));
  versions.add(version);

  const body = src.match(/`\n([\s\S]*?)\n`\.trim\(\)/)?.[1];
  assert.ok(body, where('terms markdown template literal not found'));

  // Mojibake from the source PDFs — the failure this check exists for.
  assert.ok(!body.includes('�'), where('contains replacement characters (�)'));

  // Internal guidance addressed to the operator must never reach users.
  assert.ok(
    !/Implementation checklist/i.test(body),
    where('"Implementation checklist" must be stripped before publishing'),
  );

  assert.ok(body.startsWith('# DOOODHWALA'), where('missing top-level title'));

  const headings = body.match(/^## \d+\./gm) ?? [];
  assert.equal(headings.length, sections, where(`expected ${sections} numbered sections, found ${headings.length}`));

  // Clause numbering must be gapless and in order — a dropped section is the
  // kind of truncation that is invisible on screen but fatal in a dispute.
  headings.forEach((h, i) => {
    const n = Number(h.match(/\d+/)[0]);
    assert.equal(n, i + 1, where(`section out of order: expected ${i + 1}, got ${n}`));
  });

  // Unbalanced ** renders as literal asterisks in both the app and the web page.
  const stars = (body.match(/\*\*/g) ?? []).length;
  assert.equal(stars % 2, 0, where(`unbalanced bold markers (${stars})`));

  console.log(`ok  ${file}  version=${version}  sections=${headings.length}  ${body.length} chars`);
}

console.log('\nAll terms documents pass.');

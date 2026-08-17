// Reports UI text that is hardcoded English instead of going through t().
//
//   node scripts/check-i18n.mjs            # report
//   node scripts/check-i18n.mjs --max 117  # fail if it grows past a budget
//
// The app offers English, Hindi and Marathi. A string written straight into
// JSX stays English whichever language the user picked, so it is invisible in
// testing unless someone actually switches language and reads every screen.
//
// This is a ratchet, not a gate: it exists so the number goes down and never
// quietly back up.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'mobile-app', 'src');

const maxArg = process.argv.indexOf('--max');
const budget = maxArg > -1 ? Number(process.argv[maxArg + 1]) : null;

// Text between JSX tags: >Some Words< . Skips anything containing an
// expression, which is where t() lives.
const JSX_TEXT = />([A-Z][a-z]+(?: [A-Za-z'&]+){0,6})</g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const byFile = new Map();
let total = 0;

for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const hits = new Set();
  for (const m of src.matchAll(JSX_TEXT)) {
    const text = m[1].trim();
    // Single capitalised words are usually values or labels already handled;
    // require at least two words to keep the signal high.
    if (!text.includes(' ')) continue;
    hits.add(text);
  }
  if (hits.size > 0) {
    byFile.set(relative(root, file), [...hits]);
    total += hits.size;
  }
}

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [file, hits] of sorted) {
  console.log(`${String(hits.length).padStart(3)}  ${file}`);
  for (const h of hits.slice(0, 3)) console.log(`     "${h}"`);
  if (hits.length > 3) console.log(`     …and ${hits.length - 3} more`);
}

console.log(`\n${total} untranslated string(s) across ${byFile.size} file(s).`);

if (budget !== null && total > budget) {
  console.error(`\nFAIL: budget is ${budget}, found ${total}. New hardcoded UI text was added.`);
  process.exit(1);
}

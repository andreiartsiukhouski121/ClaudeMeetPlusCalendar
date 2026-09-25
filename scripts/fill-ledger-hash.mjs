#!/usr/bin/env node
/**
 * Substitutes the introducing commit hash for `pending` in the ledger: `pnpm ledger:fill`.
 *
 * Why a command rather than a manual replace: the word `pending` also appears in the **rules
 * text**, and a global replace does not tell them apart — it was replaced there twice by hand.
 * This script only edits table rows, the ones starting with `| <ID> |`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CHANGELOG = 'docs/CHANGELOG.md';
const ENTRY_ROW = /^\|\s*(?:FT|CH|FX)-\d{3}\s*\|/;

function repoRoot() {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('Monorepo root not found (pnpm-workspace.yaml)');
    }
    dir = parent;
  }
}

/**
 * The commit that added the ID to the ledger. Same trick as in `LG-API-03`: `-S` finds a change in
 * the number of occurrences, so it is the introducing commit rather than the one that replaced
 * `pending` with a hash.
 *
 * Why not `HEAD` for every entry: an entry may have been introduced by the **previous** commit
 * while its `pending` is filled by this one. The first version of this script stamped `HEAD` on
 * everything and would have attributed a foreign commit to `CH-008` — caught by the first CI run,
 * where `LG-API-03` named the exact entry.
 */
function introducingHash(root, id) {
  const found = execFileSync('git', ['log', '-1', '--format=%h', `-S${id}`, '--', CHANGELOG], {
    cwd: root,
    encoding: 'utf8',
  }).trim();

  return found === '' ? null : found;
}

const root = repoRoot();
const path = join(root, CHANGELOG);
const lines = readFileSync(path, 'utf8').split('\n');
const filled = [];
const unresolved = [];

const updated = lines.map((line) => {
  if (!ENTRY_ROW.test(line) || !line.includes('`pending`')) {
    return line;
  }

  /*
   * Only the COLUMN whose whole content is `pending` gets filled, not the first occurrence in the
   * line.
   *
   * Blindly replacing the first occurrence corrupted the description of entry FX-019, where the
   * word `pending` appears in the prose and turned into a hash. That was the third instance of the
   * same mistake — twice by hand, then in this very script (FX-021). So we address the column, not
   * a substring.
   *
   * The column lookup comes FIRST: a row where `pending` only appears in the description is
   * already filled, and there is nothing to report about it.
   */
  const cells = line.split('|');
  const targetIndex = cells.findIndex((cell) => cell.trim() === '`pending`');

  if (targetIndex === -1) {
    return line;
  }

  const id = ENTRY_ROW.exec(line)[0].replace(/[|\s]/g, '');
  const hash = introducingHash(root, id);

  if (hash === null) {
    unresolved.push(id);

    return line;
  }

  cells[targetIndex] = cells[targetIndex].replace('`pending`', `\`${hash}\``);
  filled.push(`${id} → ${hash}`);

  return cells.join('|');
});

if (unresolved.length > 0) {
  console.error(
    `Introducing commit not found for: ${unresolved.join(', ')}. The entry is not committed yet — ` +
      'fill its hash with the next commit.',
  );
}

if (filled.length === 0) {
  console.log(`No "pending" entries in ${CHANGELOG} — nothing to substitute.`);
  process.exit(0);
}

writeFileSync(path, updated.join('\n'), { encoding: 'utf8' });
console.log(`Filled: ${filled.join(', ')}`);
console.log('Commit this edit next — it needs no ledger entry of its own.');

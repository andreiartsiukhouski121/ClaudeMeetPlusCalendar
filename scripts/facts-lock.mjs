#!/usr/bin/env node
/**
 * The command-line half of the fact lock (`ADR-0022`). The parsing, the lock's shape and the
 * comparison all live in `facts-parse.mjs`, which the meta-test imports; this file is only the two
 * commands.
 *
 *   pnpm fact:lock     regenerate docs/facts-lock.json from the corpus
 *   pnpm fact:check    compare the corpus against it, offline; exits 1 on any difference
 *
 * `fact:lock` is deliberately not part of `pnpm verify`: a command that regenerates the thing being
 * checked cannot run inside its own check.
 */
import fs from 'node:fs';
import path from 'node:path';

import { LOCK_FILE, buildLock, lockDifferences } from './facts-parse.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const mode = process.argv[2] ?? 'check';

if (mode === 'write' || mode === 'lock') {
  const lock = buildLock(repoRoot);
  fs.writeFileSync(path.join(repoRoot, LOCK_FILE), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');

  const counts = Object.values(lock.facts).reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(', ');

  console.log(`Wrote ${LOCK_FILE} (${summary}).`);
} else if (mode === 'check') {
  const problems = lockDifferences(repoRoot);

  if (problems.length === 0) {
    console.log(`${LOCK_FILE} matches the corpus.`);
  } else {
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }
} else {
  console.error(`Unknown mode "${mode}". Use "write" or "check".`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Restore and verify external skill sets: `pnpm skills:sync` / `pnpm skills:check`.
 *
 * Why. `.agents/` sits in `.gitignore` like `node_modules`, while four adapters in
 * `.claude/skills/` reference it. Before this script there was **nothing** to restore a set with:
 * the `skills.sh` the adapters and `CLAUDE.md` pointed at does not exist here, and
 * `skills-lock.json` held neither a branch nor a commit — only a `computedHash` of unknown origin
 * that matched no file hash on disk (`FX-028`).
 *
 * What `sync` does: for each lock entry it fetches from GitHub exactly the directory holding the
 * skill, at exactly the recorded commit, into `.agents/skills/<name>/`, then computes `treeHash`
 * and compares it with the recorded one.
 *
 * What `check` does: **offline.** It recomputes `treeHash` of what is already on disk and compares
 * it with the lock file, so it can be called any time while `sync` needs the network. Neither is
 * wired into `pnpm verify`: acceptance must depend on neither the network nor a directory that a
 * fresh clone does not have.
 *
 * `treeHash` is a sha256 over the whole skill directory: sorted relative paths plus each file's
 * contents, line endings normalized to LF. This script computes it, so unlike `computedHash` it
 * can be verified.
 *
 * The `computedHash` field is left untouched: an external tool writes it, and we neither read nor
 * update it.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative, sep } from 'node:path';

const LOCK = 'skills-lock.json';
const SKILLS_DIR = join('.agents', 'skills');

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

/** Every file in the directory, as sorted relative paths with forward slashes. */
function filesOf(root) {
  const out = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '.git') {
          walk(full);
        }
      } else if (entry.isFile()) {
        out.push(relative(root, full).split(sep).join(posix.sep));
      }
    }
  };

  walk(root);
  return out.sort();
}

/**
 * sha256 over a directory: path + length + contents of every file. Line endings are normalized, or
 * the hash would drift between Windows and Linux for no reason.
 */
function treeHash(dir) {
  const hash = createHash('sha256');

  for (const rel of filesOf(dir)) {
    const body = readFileSync(join(dir, rel)).toString('utf8').replace(/\r\n/g, '\n');
    hash.update(rel);
    hash.update('\0');
    hash.update(String(body.length));
    hash.update('\0');
    hash.update(body);
    hash.update('\0');
  }

  return hash.digest('hex');
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

/**
 * Fetches one directory at one commit. `--filter=blob:none` plus sparse-checkout: the tree is
 * downloaded but only the needed subtree's files are. Otherwise `obra/superpowers` and
 * `github/awesome-copilot` come down whole for the sake of one file.
 */
function fetchSkill({ source, commit, dir }, into) {
  const tmp = mkdtempSync(join(tmpdir(), 'skills-sync-'));

  try {
    git(['init', '-q'], tmp);
    git(['remote', 'add', 'origin', `https://github.com/${source}.git`], tmp);
    git(['config', 'core.sparseCheckout', 'true'], tmp);
    git(['sparse-checkout', 'init', '--no-cone'], tmp);
    git(['sparse-checkout', 'set', '--no-cone', `/${dir}/*`], tmp);
    git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', commit], tmp);
    git(['checkout', '-q', 'FETCH_HEAD'], tmp);

    const from = join(tmp, ...dir.split(posix.sep));
    if (!existsSync(from)) {
      throw new Error(`commit ${commit} has no directory ${dir}`);
    }

    rmSync(into, { recursive: true, force: true });
    mkdirSync(dirname(into), { recursive: true });
    cpSync(from, into, { recursive: true });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const root = repoRoot();
const lockPath = join(root, LOCK);

if (!existsSync(lockPath)) {
  console.error(`No ${LOCK} — nothing to synchronize.`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const mode = process.argv[2] === 'check' ? 'check' : 'sync';
const names = process.argv.slice(3);
const entries = Object.entries(lock.skills ?? {}).filter(
  ([name]) => names.length === 0 || names.includes(name),
);

if (entries.length === 0) {
  console.error('The lock file has no matching entries.');
  process.exit(1);
}

let failed = 0;
let changed = false;

for (const [name, entry] of entries) {
  const target = join(root, SKILLS_DIR, name);
  const dir = posix.dirname(entry.skillPath);

  if (mode === 'sync') {
    if (entry.commit === undefined || entry.commit === null) {
      console.error(`${name}: no commit field in the lock — nothing to reproduce from. Skipped.`);
      failed += 1;
      continue;
    }

    try {
      process.stdout.write(`${name}: ${entry.source}@${entry.commit.slice(0, 7)} … `);
      fetchSkill({ source: entry.source, commit: entry.commit, dir }, target);
    } catch (error) {
      console.log('failed');
      console.error(`  ${error.message.split('\n')[0]}`);
      failed += 1;
      continue;
    }
  }

  if (!existsSync(target) || !statSync(target).isDirectory()) {
    console.error(`${name}: ${SKILLS_DIR}/${name} is missing — run pnpm skills:sync`);
    failed += 1;
    continue;
  }

  const actual = treeHash(target);

  if (entry.treeHash === undefined) {
    entry.treeHash = actual;
    changed = true;
    console.log(
      mode === 'sync' ? 'ok, treeHash recorded' : `${name}: treeHash recorded first time`,
    );
  } else if (entry.treeHash === actual) {
    console.log(mode === 'sync' ? 'ok' : `${name}: matches`);
  } else if (mode === 'sync') {
    entry.treeHash = actual;
    changed = true;
    console.log('contents changed, treeHash updated');
  } else {
    console.error(
      `${name}: contents drifted from the lock.\n` +
        `  in lock: ${entry.treeHash}\n  on disk: ${actual}\n` +
        `  Either the set was edited by hand or the lock is stale: pnpm skills:sync fixes both.`,
    );
    failed += 1;
  }
}

if (changed) {
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

if (failed > 0) {
  console.error(`\nEntries that did not match: ${failed}.`);
  process.exit(1);
}

console.log(`\n${mode === 'sync' ? 'Synchronized' : 'Verified'} sets: ${entries.length}.`);

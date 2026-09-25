import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Integrity of the changelog and the backlog. Cases live in the paired `ledger.api.cases.md`.
 *
 * Project `api`: no browser, plain `node:fs`. The `.api.spec.ts` suffix is mandatory (meta-test
 * rule 1) — without it the file joins no project and silently never runs.
 *
 * Why a machine check: a hand-maintained table of numbers already rotted in this project
 * (`FX-013`). An unchecked ledger degrades the same way, and then a second one gets started.
 */

const CHANGELOG = 'docs/CHANGELOG.md';
const BACKLOG = 'docs/BACKLOG.md';

/** Entry prefixes: three in the changelog, one in the backlog. */
const CHANGELOG_PREFIXES = ['FT', 'CH', 'FX'];
const BACKLOG_PREFIXES = ['BL'];

/** Ledger entry ID: `FT-001`, `BL-014`. Three digits — up to 999 entries. */
const ENTRY_ID = /\b((?:FT|CH|FX|BL)-\d{3})\b/g;

/** A table row starting with an ID: `| FT-001 | …`. */
const ENTRY_ROW = /^\|\s*((?:FT|CH|FX|BL)-\d{3})\s*\|(.*)$/;

/** Literal used instead of a hash for an entry added by the current change. */
const PENDING = 'pending';

/** Commit hash in the ledger column: 7–40 hex characters, usually in backticks. */
const COMMIT_HASH = /\b([0-9a-f]{7,40})\b/;

/** Where to look for dangling references to ledger entries. */
const REFERENCE_ROOTS = ['docs', '.claude/skills', 'e2e'];

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage']);

/**
 * The repository root, found by walking up from `config.rootDir` looking for
 * `pnpm-workspace.yaml`. `rootDir` alone will not do: it equals the resolved `testDir`, that is
 * `<repo>/e2e`, and the walk would find zero files — the cases would pass vacuously. The meta-test
 * already tripped over this (`FX-001`).
 */
function repoRoot(): string {
  let dir = test.info().config.rootDir;

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Monorepo root (pnpm-workspace.yaml) not found from ${dir} upwards`);
    }
    dir = parent;
  }
}

function read(root: string, relFile: string): string {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

interface Entry {
  id: string;
  /** The rest of the table row after the ID — the columns come from it. */
  rest: string;
}

/** Table rows that are entries: only those starting with an ID, skipping headers and rules. */
function entries(content: string): Entry[] {
  const found: Entry[] = [];

  for (const line of content.split(/\r?\n/)) {
    const match = ENTRY_ROW.exec(line);
    if (match !== null) {
      found.push({ id: match[1], rest: match[2] });
    }
  }

  return found;
}

/** Columns of a table row after the ID, without the empty edges. */
function columns(rest: string): string[] {
  return rest
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell, index, all) => !(cell === '' && (index === 0 || index === all.length - 1)));
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      dupes.add(value);
    }
    seen.add(value);
  }

  return [...dupes];
}

/** Every markdown file that may reference ledger entries. */
function referenceFiles(root: string): string[] {
  const files: string[] = ['CLAUDE.md'];

  const walk = (relDir: string): void => {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) {
      return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${relDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(rel);
        }
        continue;
      }
      if (entry.name.endsWith('.md')) {
        files.push(rel);
      }
    }
  };

  REFERENCE_ROOTS.forEach(walk);

  return files.filter((file) => fs.existsSync(path.join(root, file)));
}

/**
 * Whether a file has uncommitted edits. While it does, the change is still in progress and the
 * `pending` literal is legitimate.
 */
function hasUncommittedChanges(root: string, relFile: string): boolean {
  try {
    const status = execFileSync('git', ['status', '--porcelain', '--', relFile], {
      cwd: root,
      encoding: 'utf8',
    });

    return status.trim() !== '';
  } catch {
    // No git (an unpacked tarball): treat the change as finished — the strict option.
    return false;
  }
}

/** Hashes git cannot resolve. Outside the test because conditions in `test` are lint errors. */
function isShallowRepository(root: string): boolean {
  try {
    const answer = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();

    return answer === 'true';
  } catch {
    return false;
  }
}

function unresolvedCommits(root: string, hashes: string[]): string[] {
  // In a shallow clone the old commits simply are not there, and "does not exist" would tell a
  // lie about the ledger instead of the truth about the clone. The check has no subject (FX-018).
  if (isShallowRepository(root)) {
    return [];
  }

  const missing: string[] = [];

  for (const hash of hashes) {
    try {
      execFileSync('git', ['cat-file', '-e', `${hash}^{commit}`], { cwd: root, stdio: 'ignore' });
    } catch {
      missing.push(hash);
    }
  }

  return missing;
}

/**
 * The commit column is the **last** column of a row, in every ledger table. That is a format
 * invariant recorded in the rules of `docs/CHANGELOG.md`.
 *
 * An earlier version looked for the column "that contains a hash or pending" — it guessed by
 * content. The guess broke on entry `FX-019`, whose description contains the word `pending`: the
 * parser took the description for the commit column and declared the entry unfilled (`FX-022`).
 * Caught by a CI run. Position instead of content — which is why the commit column became last
 * everywhere.
 */
function commitCells(content: string): { id: string; cell: string }[] {
  return entries(content)
    .filter((entry) => CHANGELOG_PREFIXES.includes(entry.id.slice(0, 2)))
    .map((entry) => ({ id: entry.id, cell: columns(entry.rest).at(-1) ?? '' }));
}

/**
 * References to IDs that are not in the ledger. The walk is outside the test: branching inside
 * `test` is forbidden by `playwright/no-conditional-in-test`, raised to `error` deliberately
 * because a condition in a test hides an unexercised branch.
 */
function danglingReferences(root: string, declared: Set<string>): string[] {
  const dangling: string[] = [];

  for (const file of referenceFiles(root)) {
    for (const match of read(root, file).matchAll(ENTRY_ID)) {
      if (!declared.has(match[1])) {
        dangling.push(`${file}: references ${match[1]}, which is not in the ledger`);
      }
    }
  }

  return [...new Set(dangling)];
}

/**
 * The commit that **introduced** the ID into the ledger. `-S` finds a change in the number of
 * occurrences, so this is the introducing commit: later replacing `pending` with a hash does not
 * change the occurrence count and `-S` does not see it.
 */
function introducingCommit(root: string, id: string): string {
  try {
    return execFileSync('git', ['log', '-1', '--format=%H', `-S${id}`, '--', CHANGELOG], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function headCommit(root: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/**
 * `pending` entries that outlived their commit.
 *
 * The third version of this rule. The first two were refuted by runs (see `ledger.api.cases.md`),
 * and the second — "a file with no uncommitted edits must contain no pending" — broke on CI,
 * where the tree is **always** clean, so the very commit introducing an entry went red by
 * construction (`FX-019`).
 *
 * The precise form: `pending` is legitimate while the change that introduced the entry is still
 * happening — either the file is still being edited, or the entry was introduced by the current
 * `HEAD`. Anything else is a forgotten leftover.
 */
function stalePendingEntries(root: string): string[] {
  if (hasUncommittedChanges(root, CHANGELOG)) {
    return [];
  }

  const head = headCommit(root);

  return commitCells(read(root, CHANGELOG))
    .filter((entry) => entry.cell.includes(PENDING))
    .filter((entry) => introducingCommit(root, entry.id) !== head)
    .map((entry) => entry.id);
}

test.describe('Changelog and backlog', { tag: '@ledger' }, () => {
  test('LG-API-01 — both ledger files exist and are not empty', () => {
    const root = repoRoot();

    for (const file of [CHANGELOG, BACKLOG]) {
      expect(fs.existsSync(path.join(root, file)), `${file} is missing`).toBe(true);
      expect(
        entries(read(root, file)).length,
        `${file} holds no entry with an ID — an empty ledger is worse than none`,
      ).toBeGreaterThan(0);
    }
  });

  test('LG-API-02 — IDs are unique and well formed', () => {
    const root = repoRoot();

    for (const [file, allowed] of [
      [CHANGELOG, CHANGELOG_PREFIXES],
      [BACKLOG, BACKLOG_PREFIXES],
    ] as const) {
      const ids = entries(read(root, file)).map((entry) => entry.id);

      expect(duplicates(ids), `${file}: IDs repeat — two entries read as one`).toEqual([]);
      expect(
        ids.filter((id) => !allowed.includes(id.slice(0, 2))),
        `${file}: an ID with a foreign prefix (expected ${allowed.join(', ')})`,
      ).toEqual([]);
    }
  });

  test('LG-API-03 — every changelog entry has its commit filled in', () => {
    const root = repoRoot();
    const empty = commitCells(read(root, CHANGELOG))
      .filter((entry) => entry.cell === '')
      .map((entry) => entry.id);

    expect(empty, `${CHANGELOG}: entries carry no commit reference`).toEqual([]);

    /*
     * `pending` is legitimate while the change is in flight: the hash is unknown before the
     * commit, and one change may well add several entries — a feature and a defect found on the
     * way.
     *
     * Two earlier versions of this rule were wrong and both were caught by runs:
     *   1. "at most one pending entry" — broke on the first commit that carried a process change
     *      and a defect at once;
     *   2. "no pending entries at HEAD~1" — off by one: HEAD~1 is exactly the commit where
     *      pending is legitimate, and it gets filled by the next one.
     */
    const stale = stalePendingEntries(root);

    expect(
      stale,
      `${CHANGELOG}: entries ${stale.join(', ')} stayed "${PENDING}" in a committed file. ` +
        'The hash is filled in by the next commit — otherwise the ledger fills with promises',
    ).toEqual([]);
  });

  test('LG-API-04 — commit references resolve in git', () => {
    const root = repoRoot();
    const hashes = commitCells(read(root, CHANGELOG))
      .map((entry) => COMMIT_HASH.exec(entry.cell.replace(/`/g, ''))?.[1])
      .filter((hash): hash is string => hash !== undefined);

    expect(hashes.length, `${CHANGELOG}: not a single commit hash found`).toBeGreaterThan(0);
    expect(
      unresolvedCommits(root, hashes),
      `${CHANGELOG}: commits do not exist in the repository — the entry lost its change`,
    ).toEqual([]);
  });

  test('LG-API-05 — every backlog item has the "Conflicts with" column filled', () => {
    const root = repoRoot();
    const openSection = read(root, BACKLOG).split('## Rejected')[0];
    const incomplete = entries(openSection)
      .filter((entry) => entry.id.startsWith('BL-'))
      .filter((entry) => (columns(entry.rest).at(-1) ?? '') === '')
      .map((entry) => entry.id);

    expect(
      incomplete,
      `${BACKLOG}: the last column ("Conflicts with") is empty. An explicit "no" is fine, ` +
        'emptiness is not: an item nobody weighed against the rest of the project is where a ' +
        'second implementation of the same thing comes from',
    ).toEqual([]);
  });

  test('LG-API-06 — there are no references to non-existent entries', () => {
    const root = repoRoot();
    const declared = new Set([
      ...entries(read(root, CHANGELOG)).map((entry) => entry.id),
      ...entries(read(root, BACKLOG)).map((entry) => entry.id),
    ]);

    expect(
      danglingReferences(root, declared),
      'A dangling reference means an entry was deleted instead of having its status changed, ' +
        'and the reasoning behind the decision was lost',
    ).toEqual([]);
  });
});

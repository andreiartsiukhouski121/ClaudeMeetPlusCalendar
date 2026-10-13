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

/** Defects and fixes: the section of the changelog whose rows `LG-API-07` judges. */
const DEFECTS_HEADING = '## Defects and fixes';

/** From this number on an `FX-` row must name the path it took (`bugfix-pipeline` §4). */
const FIRST_MARKED_FIX = 48;

/** Criteria of `bugfix-pipeline` §4 an owner override may cite: 1 to 4. */
const CRITERIA = [1, 2, 3, 4];

/**
 * The three literal path-marker forms, as one global matcher. Group 2 is the `full` slug, group 3
 * the raw text after `criteria` in the override form (up to the end of the sentence or cell).
 */
const PATH_MARKER =
  /Path:\s*(full \(docs\/plans\/([^)]*)\)|short, below the threshold|short, threshold overridden by the owner: criteria([^.;|(`]*))/g;

/** The criteria list as it must read: integers separated by commas. */
const CRITERIA_LIST = /^\s*\d+(?:\s*,\s*\d+)*\s*$/;

/** The body of the Defects table: from its heading to the next `## ` heading. */
function defectsSection(content: string): string {
  const start = content.indexOf(DEFECTS_HEADING);

  if (start === -1) {
    return '';
  }

  const rest = content.slice(start + DEFECTS_HEADING.length);
  const next = rest.search(/^## /m);

  return next === -1 ? rest : rest.slice(0, next);
}

/** Why a row's path marker does not hold; empty when it does. One reason per row. */
function pathMarkerProblems(root: string, row: Entry): string[] {
  const markers = [...row.rest.matchAll(PATH_MARKER)];

  if (markers.length === 0) {
    return [`${row.id}: no path marker — the row does not say which path it took`];
  }
  if (markers.length > 1) {
    return [`${row.id}: ${markers.length} path markers — the row must carry exactly one`];
  }

  const [, form, slug, criteria] = markers[0];

  if (form.startsWith('full')) {
    const folder = path.join(root, 'docs', 'plans', slug);
    const named = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug);

    return named && fs.existsSync(folder) && fs.statSync(folder).isDirectory()
      ? []
      : [
          `${row.id}: "full" names docs/plans/${slug}, which is not a folder — a plan nobody can open`,
        ];
  }
  if (form.startsWith('short, below')) {
    return [];
  }
  if (!CRITERIA_LIST.test(criteria)) {
    return [`${row.id}: "overridden" carries no criteria list, or one that is not integers`];
  }

  const outside = criteria
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => !CRITERIA.includes(n));

  return outside.length === 0
    ? []
    : [`${row.id}: "overridden" cites criterion ${outside.join(', ')} outside 1–4`];
}

/** The Defects rows numbered 48 and above — the only ones the marker rule applies to. */
function markedScopeRows(content: string): Entry[] {
  return entries(defectsSection(content)).filter(
    (row) => row.id.startsWith('FX-') && Number(row.id.slice(3)) >= FIRST_MARKED_FIX,
  );
}

/** A real folder under `docs/plans/`, so the passing `full` sample cites one that exists. */
function existingPlanSlug(root: string): string {
  return (
    fs
      .readdirSync(path.join(root, 'docs', 'plans'), { withFileTypes: true })
      .find((entry) => entry.isDirectory())?.name ?? ''
  );
}

/** Sample rows for the vacuity guard; written here, never under `docs/`. */
function markerFixture(slug: string): string {
  return [
    `| FX-901 | 2026-10-13 | sound, full | Path: full (docs/plans/${slug}) | pending |`,
    '| FX-902 | 2026-10-13 | sound, below | Path: short, below the threshold | pending |',
    '| FX-903 | 2026-10-13 | sound, override | Path: short, threshold overridden by the owner: criteria 2, 4 | pending |',
    '| FX-904 | 2026-10-13 | no marker at all | pending |',
    '| FX-905 | 2026-10-13 | two | Path: short, below the threshold | Path: short, below the threshold | pending |',
    '| FX-906 | 2026-10-13 | no folder | Path: full (docs/plans/no-such-folder-lg-api-07) | pending |',
    '| FX-907 | 2026-10-13 | empty list | Path: short, threshold overridden by the owner: criteria | pending |',
    '| FX-908 | 2026-10-13 | out of range | Path: short, threshold overridden by the owner: criteria 5 | pending |',
  ].join('\n');
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

  test('LG-API-07 — every FX- row numbered 48 and above names the path it took', () => {
    const root = repoRoot();
    const content = read(root, CHANGELOG);

    // The real table parsed: a moved or reworded heading must not make this green by reading
    // zero rows.
    expect(
      entries(defectsSection(content)).filter((row) => row.id.startsWith('FX-')).length,
      `${CHANGELOG}: the "${DEFECTS_HEADING}" table yielded no FX- row`,
    ).toBeGreaterThan(0);

    // Vacuity guard: the ledger may hold no row numbered 48 or above, so the matcher is driven over
    // a fixture — three sound rows and five broken ones, each broken for its own reason.
    const sample = markedScopeRows(
      `${DEFECTS_HEADING}\n\n${markerFixture(existingPlanSlug(root))}`,
    );

    expect(
      sample.map((row) => row.id),
      'The fixture was not parsed into eight rows',
    ).toHaveLength(8);

    const verdicts = Object.fromEntries(
      sample.map((row) => [row.id, pathMarkerProblems(root, row).join('')]),
    );

    expect([verdicts['FX-901'], verdicts['FX-902'], verdicts['FX-903']]).toEqual(['', '', '']);
    expect(verdicts['FX-904']).toContain('no path marker');
    expect(verdicts['FX-905']).toContain('2 path markers');
    expect(verdicts['FX-906']).toContain('not a folder');
    expect(verdicts['FX-907']).toContain('no criteria list');
    expect(verdicts['FX-908']).toContain('outside 1–4');

    const problems = markedScopeRows(content).flatMap((row) => pathMarkerProblems(root, row));

    expect(
      problems,
      'Every FX- row numbered 48 and above carries exactly one literal path marker (bugfix-pipeline §4)',
    ).toEqual([]);
  });
});

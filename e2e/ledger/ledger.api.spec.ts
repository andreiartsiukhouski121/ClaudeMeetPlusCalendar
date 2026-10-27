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

/** The whole commit cell: a backticked hash or the backticked literal `pending`, nothing else. */
const COMMIT_CELL = /^`(?:[0-9a-f]{7,40}|pending)`$/;

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
 * The four literal path-marker forms, as one global matcher. Group 2 is the `full` or `medium`
 * slug, group 3 the raw text after `criteria` in the override form (up to the end of the sentence
 * or cell).
 */
const PATH_MARKER =
  /Path:\s*((?:full|medium) \(docs\/plans\/([^)]*)\)|short, below the threshold|short, threshold overridden by the owner: criteria([^.;|(`]*))/g;

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

  if (form.startsWith('full') || form.startsWith('medium')) {
    const folder = path.join(root, 'docs', 'plans', slug);
    const named = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug);

    return named && fs.existsSync(folder) && fs.statSync(folder).isDirectory()
      ? []
      : [
          `${row.id}: "${form.split(' ')[0]}" names docs/plans/${slug}, which is not a folder — a plan nobody can open`,
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

/** The Defects rows numbered `from` and above; 48 is the marker rule's floor. */
function markedScopeRows(content: string, from: number = FIRST_MARKED_FIX): Entry[] {
  return entries(defectsSection(content)).filter(
    (row) => row.id.startsWith('FX-') && Number(row.id.slice(3)) >= from,
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
    `| FX-909 | 2026-10-27 | sound, medium | Path: medium (docs/plans/${slug}) | pending |`,
    '| FX-910 | 2026-10-27 | no folder | Path: medium (docs/plans/no-such-folder-lg-api-07) | pending |',
  ].join('\n');
}

/* -------------- Tier marker and Cost clause (LG-API-09, LG-API-10, CH-044) -------------- */

const FEATURES_HEADING = '## Features';
const PROCESS_HEADING = '## Process and infrastructure changes';

/** First row numbers the tier rule judges; earlier rows are never rewritten. */
const FIRST_TIERED_FEATURE = 11;
const FIRST_TIERED_CHANGE = 45;

/** From this `FX-` number a short-path row owes a `Cost:` clause. */
const FIRST_COSTED_FIX = 56;

const TIER_DEPTHS = ['small', 'medium', 'large'];
const TIER_CRITERIA = ['C1', 'C2', 'C3', 'C4', 'C5'];

/** `Tier: <depth>; criteria: <list>`. Group 1 is the depth, group 2 the raw list. */
const TIER_MARKER = /Tier:\s*([^;|]*);\s*criteria:([^.;|(`]*)/g;

/** A `Cost:` clause: the text after the keyword up to the end of the cell or clause. */
const COST_CLAUSE = /Cost:([^|;`]*)/g;

/** The sound clause, matched as a prefix so a sentence may follow it. */
const COST_SOUND = /^\s*(?:not measured|\d+ tokens, \d+ dispatches, \d+ min)(?![\w,]|\.\d)/;

/** A section of the changelog from its heading to the next `## ` heading. */
function sectionOf(content: string, heading: string): string {
  const start = content.indexOf(heading);

  if (start === -1) {
    return '';
  }

  const rest = content.slice(start + heading.length);
  const next = rest.search(/^## /m);

  return next === -1 ? rest : rest.slice(0, next);
}

/** Rows `LG-API-09` judges: `FT-` from 11 in Features, `CH-` from 45 in Process. */
function tieredRows(content: string): Entry[] {
  return [
    ...entries(sectionOf(content, FEATURES_HEADING)).filter(
      (row) => row.id.startsWith('FT-') && Number(row.id.slice(3)) >= FIRST_TIERED_FEATURE,
    ),
    ...entries(sectionOf(content, PROCESS_HEADING)).filter(
      (row) => row.id.startsWith('CH-') && Number(row.id.slice(3)) >= FIRST_TIERED_CHANGE,
    ),
  ];
}

function tierProblems(row: Entry): string[] {
  const markers = [...row.rest.matchAll(TIER_MARKER)];

  if (markers.length === 0) {
    return [`${row.id}: no tier marker — the row does not say how the task was sized`];
  }
  if (markers.length > 1) {
    return [`${row.id}: ${markers.length} tier markers — the row must carry exactly one`];
  }

  const depth = markers[0][1].trim();
  const list = markers[0][2].trim();
  const problems: string[] = [];

  if (!TIER_DEPTHS.includes(depth)) {
    problems.push(`${row.id}: tier depth "${depth}" is not small, medium or large`);
  }
  if (list === '') {
    problems.push(`${row.id}: the criteria list is empty — write "none" or the ids`);
  } else if (list !== 'none') {
    const bad = list
      .split(',')
      .map((part) => part.trim())
      .filter((id) => !TIER_CRITERIA.includes(id));

    if (bad.length > 0) {
      problems.push(`${row.id}: criteria outside C1-C5: ${bad.map((id) => `"${id}"`).join(', ')}`);
    }
  }

  return problems;
}

/** The tier depth of a row with exactly one marker; empty otherwise. */
function tierDepth(row: Entry): string {
  const markers = [...row.rest.matchAll(TIER_MARKER)];

  return markers.length === 1 ? markers[0][1].trim() : '';
}

/** Rows `LG-API-10` judges: small-tier rows and short-path `FX-` rows from 56. */
function costedRows(content: string): Entry[] {
  const small = tieredRows(content).filter((row) => tierDepth(row) === 'small');
  const short = markedScopeRows(content, FIRST_COSTED_FIX).filter((row) =>
    row.rest.includes('Path: short, below the threshold'),
  );

  return [...small, ...short];
}

function costProblems(row: Entry): string[] {
  const clauses = [...row.rest.matchAll(COST_CLAUSE)];

  if (clauses.length === 0) {
    return [`${row.id}: no Cost: clause — a small change must record what it cost`];
  }
  if (clauses.length > 1) {
    return [`${row.id}: ${clauses.length} Cost: clauses — the row must carry exactly one`];
  }

  return COST_SOUND.test(clauses[0][1])
    ? []
    : [`${row.id}: Cost: figure is not integers in plain digits or "not measured"`];
}

/** Sample rows for both vacuity guards; written here, never under `docs/`. */
function tierFixture(): string {
  return [
    FEATURES_HEADING,
    '',
    '| FT-911 | 2026-10-27 | small sound | Tier: small; criteria: none | Cost: 1200 tokens, 3 dispatches, 7 min | pending |',
    '| FT-912 | 2026-10-27 | medium sound | Tier: medium; criteria: C1, C3 | pending |',
    '| FT-913 | 2026-10-27 | large sound | Tier: large; criteria: C2 | pending |',
    '| FT-914 | 2026-10-27 | no tier | pending |',
    '| FT-915 | 2026-10-27 | two tiers | Tier: small; criteria: none | Tier: medium; criteria: C1 | Cost: not measured | pending |',
    '| FT-916 | 2026-10-27 | bad depth | Tier: huge; criteria: none | pending |',
    '| FT-917 | 2026-10-27 | defect-only id | Tier: medium; criteria: C6 | pending |',
    '| FT-918 | 2026-10-27 | unknown id | Tier: medium; criteria: C0, X1 | pending |',
    '| FT-919 | 2026-10-27 | empty list | Tier: medium; criteria: | pending |',
    '| FT-005 | 2026-10-01 | out of scope, no tier | pending |',
    '',
    PROCESS_HEADING,
    '',
    '| CH-945 | 2026-10-27 | small, not measured | Tier: small; criteria: none | Cost: not measured | pending |',
    '| CH-946 | 2026-10-27 | small, no cost | Tier: small; criteria: none | pending |',
    '| CH-947 | 2026-10-27 | small, two costs | Tier: small; criteria: none | Cost: not measured | Cost: 1 tokens, 1 dispatches, 1 min | pending |',
    '| CH-948 | 2026-10-27 | small, approximate | Tier: small; criteria: none | Cost: ~5k tokens, 3 dispatches, 7 min | pending |',
    '| CH-949 | 2026-10-27 | small, n/a | Tier: small; criteria: none | Cost: n/a | pending |',
    '| CH-950 | 2026-10-27 | small, fraction | Tier: small; criteria: none | Cost: 1.5 tokens, 3 dispatches, 7 min | pending |',
    '| CH-951 | 2026-10-27 | small, separators | Tier: small; criteria: none | Cost: 2,005,983 tokens, 3 dispatches, 7 min | pending |',
    '| CH-952 | 2026-10-27 | small, empty | Tier: small; criteria: none | Cost: | pending |',
    '| CH-953 | 2026-10-27 | medium, no cost | Tier: medium; criteria: C4 | pending |',
    '| CH-044 | 2026-10-27 | out of scope, no tier | pending |',
    '',
    DEFECTS_HEADING,
    '',
    '| FX-956 | 2026-10-27 | short with cost | Path: short, below the threshold | Cost: 10 tokens, 1 dispatches, 2 min | pending |',
    '| FX-957 | 2026-10-27 | short without cost | Path: short, below the threshold | pending |',
    '| FX-958 | 2026-10-27 | full without cost | Path: full (docs/plans/x) | pending |',
    '| FX-959 | 2026-10-27 | medium without cost | Path: medium (docs/plans/x) | pending |',
    '| FX-960 | 2026-10-27 | override without cost | Path: short, threshold overridden by the owner: criteria 2 | pending |',
    '| FX-055 | 2026-10-27 | short, below floor | Path: short, below the threshold | pending |',
  ].join('\n');
}

/* ------------------- Epics and features (LG-API-08, CH-041, CH-042) ------------------- */

const EPICS = 'docs/EPICS.md';
const EPIC_KINDS = ['product', 'technical'];

interface Feature {
  id: string;
  tasks: string[];
}

interface Epic {
  id: string;
  kind: string;
  features: Feature[];
}

function field(text: string, name: string): string {
  return new RegExp('^- \\*\\*' + name + ':\\*\\*\\s*(.+)$', 'm').exec(text)?.[1] ?? '';
}

/**
 * `docs/EPICS.md`: `## EP-NN · Name` epics with a `Kind` line, each holding `### F-NNN · Title`
 * features with a `Tasks` line (`CH-042`).
 */
function parseEpics(content: string): Epic[] {
  return content
    .split(/^## /m)
    .slice(1)
    .flatMap((section) => {
      const id = /^(EP-\d+)\s*·/.exec(section)?.[1];
      if (id === undefined) return [];
      const [epicPart, ...featureParts] = section.split(/^### /m);
      const features = featureParts.flatMap((part) => {
        const featureId = /^(F-\d+)\s*·/.exec(part)?.[1];
        if (featureId === undefined) return [];
        const tasks = [...field(part, 'Tasks').matchAll(/\b((?:FT|CH|FX|BL)-\d{3})\b/g)];
        return [{ id: featureId, tasks: tasks.map((m) => m[1]) }];
      });
      return [{ id, kind: field(epicPart, 'Kind').trim(), features }];
    });
}

/**
 * Every record is a task of exactly one feature; no feature names a record that does not exist;
 * feature IDs are unique; every epic holds a feature and has a known kind.
 */
function epicProblems(epics: Epic[], records: string[]): string[] {
  const problems: string[] = [];
  const owners = new Map<string, string[]>();
  const featureIds = new Map<string, number>();
  const known = new Set(records);

  for (const epic of epics) {
    if (!EPIC_KINDS.includes(epic.kind)) {
      problems.push(`${epic.id} has Kind "${epic.kind}", not product or technical`);
    }
    if (epic.features.length === 0) problems.push(`${epic.id} holds no feature`);
    for (const feature of epic.features) {
      featureIds.set(feature.id, (featureIds.get(feature.id) ?? 0) + 1);
      for (const id of feature.tasks) {
        owners.set(id, [...(owners.get(id) ?? []), feature.id]);
        if (!known.has(id)) {
          problems.push(`${feature.id} lists ${id}, which no ledger or backlog row defines`);
        }
      }
    }
  }
  for (const [id, count] of featureIds) {
    if (count > 1) problems.push(`${id} is used by ${count} features`);
  }
  for (const id of records) {
    const in_ = owners.get(id) ?? [];
    if (in_.length === 0) problems.push(`${id} belongs to no feature`);
    if (in_.length > 1) problems.push(`${id} belongs to ${in_.length} features: ${in_.join(', ')}`);
  }
  return problems;
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
     * The cell holds exactly one of the two forms `pnpm ledger:fill` understands. A bare
     * `pending` passed the old check and was filled by nothing, so it went red one commit later
     * with a staleness message instead of a format one (BL-026, FX-048).
     */
    const malformed = commitCells(read(root, CHANGELOG))
      .filter((entry) => entry.cell !== '' && !COMMIT_CELL.test(entry.cell))
      .map((entry) => `${entry.id}: ${entry.cell}`);

    expect(
      malformed,
      `${CHANGELOG}: a commit cell is either a hash or \`${PENDING}\`, both in backticks — ` +
        '`pnpm ledger:fill` fills only the backticked form',
    ).toEqual([]);

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
    // a fixture — four sound rows and six broken ones, each broken for its own reason.
    const sample = markedScopeRows(
      `${DEFECTS_HEADING}\n\n${markerFixture(existingPlanSlug(root))}`,
    );

    expect(
      sample.map((row) => row.id),
      'The fixture was not parsed into ten rows',
    ).toHaveLength(10);

    const verdicts = Object.fromEntries(
      sample.map((row) => [row.id, pathMarkerProblems(root, row).join('')]),
    );

    expect([
      verdicts['FX-901'],
      verdicts['FX-902'],
      verdicts['FX-903'],
      verdicts['FX-909'],
    ]).toEqual(['', '', '', '']);
    expect(verdicts['FX-910']).toContain('"medium" names');
    expect(verdicts['FX-910']).toContain('not a folder');
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

  test('LG-API-08 — every ledger and backlog record is a task of exactly one feature', () => {
    const sample = parseEpics(
      [
        '## EP-01 · A',
        '- **Kind:** product',
        '### F-001 · One',
        '- **Tasks:** `FT-901`, `BL-901`',
        '### F-001 · Two',
        '- **Tasks:** `FT-901`, `FX-999`',
        '## EP-02 · B',
        '- **Kind:** sideways',
      ].join('\n'),
    );
    const sampleProblems = epicProblems(sample, ['FT-901', 'BL-901', 'CH-901']).join('\n');
    expect(sampleProblems).toContain('Kind "sideways"');
    expect(sampleProblems).toContain('EP-02 holds no feature');
    expect(sampleProblems).toContain('FX-999, which no ledger or backlog row defines');
    expect(sampleProblems).toContain('CH-901 belongs to no feature');
    expect(sampleProblems).toContain('FT-901 belongs to 2 features');
    expect(sampleProblems).toContain('F-001 is used by 2 features');

    const root = repoRoot();
    const epics = parseEpics(read(root, EPICS));
    const records = [...entries(read(root, CHANGELOG)), ...entries(read(root, BACKLOG))].map(
      (entry) => entry.id,
    );

    expect(
      epics.flatMap((epic) => epic.features).length,
      `${EPICS} must parse into features`,
    ).toBeGreaterThan(0);
    expect(records.length, 'the ledger and the backlog must parse into records').toBeGreaterThan(0);
    expect(
      epicProblems(epics, records),
      `Every FT-/CH-/FX-/BL- record is a task of exactly one feature in ${EPICS}: add a new record to its feature's Tasks line, or add a feature (the task board shows features)`,
    ).toEqual([]);
  });

  test('LG-API-09 — every FT- from 011 and CH- from 045 carries exactly one tier marker', () => {
    const root = repoRoot();
    const content = read(root, CHANGELOG);

    // Vacuity guard, part 2: the real Features and Process tables each parsed at least one row.
    expect(
      entries(sectionOf(content, FEATURES_HEADING)).filter((row) => row.id.startsWith('FT-'))
        .length,
      `${CHANGELOG}: the "${FEATURES_HEADING}" table yielded no FT- row`,
    ).toBeGreaterThan(0);
    expect(
      entries(sectionOf(content, PROCESS_HEADING)).filter((row) => row.id.startsWith('CH-')).length,
      `${CHANGELOG}: the "${PROCESS_HEADING}" table yielded no CH- row`,
    ).toBeGreaterThan(0);

    // Vacuity guard, part 1: no real row is in scope today, so the matcher runs over a fixture.
    const sample = tieredRows(tierFixture());
    const verdicts = Object.fromEntries(sample.map((row) => [row.id, tierProblems(row).join('')]));

    expect(
      sample.filter((row) => row.id.startsWith('FT-')),
      'The fixture did not parse into nine in-scope FT- rows (FT-005 is out of scope)',
    ).toHaveLength(9);
    expect([verdicts['FT-911'], verdicts['FT-912'], verdicts['FT-913']]).toEqual(['', '', '']);
    expect(verdicts['CH-945']).toBe('');
    expect(verdicts['FT-914']).toContain('no tier marker');
    expect(verdicts['FT-915']).toContain('2 tier markers');
    expect(verdicts['FT-916']).toContain('"huge" is not small, medium or large');
    expect(verdicts['FT-917']).toContain('"C6"');
    expect(verdicts['FT-918']).toContain('"C0", "X1"');
    expect(verdicts['FT-919']).toContain('criteria list is empty');
    expect(verdicts['FT-005']).toBeUndefined();
    expect(verdicts['CH-044']).toBeUndefined();

    const problems = tieredRows(content).flatMap((row) => tierProblems(row));

    expect(
      problems,
      'Every FT- row from 011 and CH- row from 045 carries exactly one "Tier: <depth>; criteria: <list>" marker (change-router)',
    ).toEqual([]);
  });

  test('LG-API-10 — every small-depth row carries exactly one Cost: clause', () => {
    const root = repoRoot();
    const content = read(root, CHANGELOG);
    const sample = costedRows(tierFixture());
    const verdicts = Object.fromEntries(sample.map((row) => [row.id, costProblems(row).join('')]));

    // Vacuity guard: both filters run. Medium, full, medium-path and override rows are not
    // judged, nor are the rows below each floor.
    expect(sample.map((row) => row.id).sort()).toEqual([
      'CH-945',
      'CH-946',
      'CH-947',
      'CH-948',
      'CH-949',
      'CH-950',
      'CH-951',
      'CH-952',
      'FT-911',
      'FX-956',
      'FX-957',
    ]);
    expect([verdicts['FT-911'], verdicts['CH-945'], verdicts['FX-956']]).toEqual(['', '', '']);
    expect(verdicts['CH-946']).toContain('no Cost: clause');
    expect(verdicts['FX-957']).toContain('no Cost: clause');
    expect(verdicts['CH-947']).toContain('2 Cost: clauses');
    expect(verdicts['CH-948']).toContain('not integers in plain digits');
    expect(verdicts['CH-949']).toContain('not integers in plain digits');
    expect(verdicts['CH-950']).toContain('not integers in plain digits');
    expect(verdicts['CH-951']).toContain('not integers in plain digits');
    expect(verdicts['CH-952']).toContain('not integers in plain digits');

    const problems = costedRows(content).flatMap((row) => costProblems(row));

    expect(
      problems,
      'Every small-tier row and every short-path FX- row from 056 carries exactly one "Cost: <n> tokens, <n> dispatches, <n> min" or "Cost: not measured" clause',
    ).toEqual([]);
  });
});

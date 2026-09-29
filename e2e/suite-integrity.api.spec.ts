import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The suite convention, made executable. Nine rules, one test each, so a failure names the exact
 * violation rather than "something is off with the structure".
 *
 * It works through node:fs, hence the `api` project: no browser needed, and the `.api.spec.ts`
 * suffix is mandatory by rule 1 — otherwise the file would join no project.
 *
 * Why at all: review does not catch a forgotten `.cases.md`, and a spec without the
 * `.api.`/`.functional.` suffix silently never runs — the "green" run checks nothing. This
 * meta-test catches both on every `pnpm e2e`.
 *
 * Its own tests carry no case IDs: it does not describe a feature, it executes the convention, so
 * it has no paired `suite-integrity.api.cases.md` either.
 */

/**
 * Rules 1–3 do not apply to the meta-test itself: it has no paired `.cases.md` and must not have
 * one. An explicit list, NOT a regex like "files in the e2e root": such a regex would grow to
 * cover something else, and the first spec dropped into the root "for a minute" would fall out of
 * the pairing check silently.
 */
const SELF_EXEMPT = ['suite-integrity.api.spec.ts'];

/**
 * Rule 8: the single scaffold baseline spec belonging to neither feature. New specs are not added
 * to this list: a spec in `apps/**\/src/**` belongs in a `*.unit.cases.md`.
 */
const UNIT_SPEC_EXEMPT = ['apps/api/src/app.controller.spec.ts'];

/**
 * Feature prefixes known to the convention. An explicit list rather than "any capitals", so a
 * failure names the cause ("register the prefix") instead of staying silent.
 *
 * **Adding a feature means adding its prefix here.** Forgetting is impossible: the test below
 * finds any `XX-API-01`-shaped ID with an unknown prefix in the case docs and goes red. Without
 * that guard a third feature (say `PR-API-01`) would not be recognized as an ID at all, and rules
 * 5–7 would go **vacuously green** — they would stop checking anything.
 */
const KNOWN_CASE_PREFIXES = ['AL', 'HD', 'SM', 'SEC', 'LG', 'PR', 'AR', 'MD'];

/** Case ID: `<FEATURE>-<TYPE>-<NN>`. The number is two or three digits. */
const CASE_ID_SOURCE = `(?:${KNOWN_CASE_PREFIXES.join('|')})-(?:API|FN|UT)-\\d{2,3}`;

/** The ID shape with ANY prefix — only to catch an unregistered one. */
const ANY_PREFIX_CASE_ID = /\b([A-Z]{2,5})-(?:API|FN|UT)-\d{2,3}\b/g;
const CASE_ID_ANYWHERE = new RegExp(CASE_ID_SOURCE, 'g');
const CASE_ID_HEADING = new RegExp(`^#{2,6}\\s+(${CASE_ID_SOURCE})\\b`);
const CASE_ID_TABLE_ROW = new RegExp(`^\\|\\s*(${CASE_ID_SOURCE})\\s*\\|`);

/**
 * The "deliberately not automated" marker. ONLY this syntax is recognized (rule 5): free prose
 * would mean any paragraph containing the words could switch the check off.
 */
const NOT_AUTOMATED_MARKER = /^\s*-\s*\*\*Not automated:\*\*/;

/** Path to a unit spec inside `apps/**`, as written in `*.unit.cases.md`. */
const APPS_SPEC_PATH = /apps\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.spec\.ts/g;

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'blob-report',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

/**
 * The monorepo root. `test.info().config.rootDir` will NOT do: it equals the resolved `testDir`,
 * that is `<repo>/e2e`, rather than the config directory (verified by probe). A meta-test treating
 * `e2e/` as the root would look for files in `e2e/e2e`, find zero and pass ALL rules vacuously —
 * green under any violation of the convention. That is exactly what the control experiment caught
 * while this file was being written, which is why a self-check of the walk sits below too.
 *
 * `process.cwd()` is unreliable as well: it depends on where `playwright test` was started. So we
 * walk up to the workspace marker.
 */
function findRepoRoot(startDir: string): string {
  let dir = startDir;

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Monorepo root (pnpm-workspace.yaml) not found in ${startDir} or above`);
    }
    dir = parent;
  }
}

/** Repository root for the current run. */
function repoRoot(): string {
  return findRepoRoot(test.info().config.rootDir);
}

/** Recursive walk skipping `node_modules` and build directories, or `apps/` is unwalkable. */
function walk(rootDir: string, relDir: string, acc: string[] = []): string[] {
  const abs = path.join(rootDir, relDir);
  if (!fs.existsSync(abs)) {
    return acc;
  }

  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(rootDir, rel, acc);
      }
      continue;
    }
    acc.push(rel);
  }

  return acc;
}

function e2eSpecs(root: string): string[] {
  return walk(root, 'e2e').filter((file) => file.endsWith('.spec.ts'));
}

function e2eCaseDocs(root: string): string[] {
  return walk(root, 'e2e').filter((file) => file.endsWith('.cases.md'));
}

/** Application unit specs. `apps/api/test/app.e2e-spec.ts` is excluded — it is not in `src/`. */
function appsUnitSpecs(root: string): string[] {
  return walk(root, 'apps').filter((file) =>
    /^apps\/[^/]+\/src\/.*(?<!\.e2e)\.spec\.ts$/.test(file),
  );
}

function isSelfExempt(file: string): boolean {
  return SELF_EXEMPT.includes(path.posix.basename(file));
}

function isUnitCaseDoc(file: string): boolean {
  return file.endsWith('.unit.cases.md');
}

function read(root: string, relFile: string): string {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

function pairedCaseDoc(specFile: string): string {
  return `${specFile.slice(0, -'.spec.ts'.length)}.cases.md`;
}

function pairedSpec(caseDoc: string): string {
  return `${caseDoc.slice(0, -'.cases.md'.length)}.spec.ts`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function matchLines(content: string, pattern: RegExp): string[] {
  const found: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match !== null) {
      found.push(match[1]);
    }
  }
  return found;
}

/** IDs whose subsection carries the "Not automated" marker. */
function notAutomatedIds(content: string): string[] {
  const exempt: string[] = [];
  let currentId = '';

  for (const line of content.split(/\r?\n/)) {
    const heading = CASE_ID_HEADING.exec(line);
    if (heading !== null) {
      currentId = heading[1];
    }
    if (!NOT_AUTOMATED_MARKER.test(line)) {
      continue;
    }
    // The ID may sit on the marker line itself — then the summary table can carry it too.
    exempt.push(...unique(line.match(CASE_ID_ANYWHERE) ?? []), currentId);
  }

  return unique(exempt.filter((id) => id !== ''));
}

/**
 * IDs in case docs whose prefix is not registered in `KNOWN_CASE_PREFIXES`.
 *
 * The walk is outside the test: branching inside `test` is forbidden by
 * `playwright/no-conditional-in-test`, raised to `error` deliberately because a condition in a
 * test hides an unexercised branch.
 */
function unregisteredPrefixes(root: string): string[] {
  const found: string[] = [];

  for (const doc of e2eCaseDocs(root)) {
    for (const match of read(root, doc).matchAll(ANY_PREFIX_CASE_ID)) {
      if (!KNOWN_CASE_PREFIXES.includes(match[1])) {
        found.push(`${doc}: prefix ${match[1]} (in ID ${match[0]}) is not registered`);
      }
    }
  }

  return unique(found);
}

interface UnitCaseRef {
  id: string;
  specPaths: string[];
}

/**
 * Maps unit case IDs to the spec they are listed under (rule 7). The marking rule: any line
 * mentioning an `apps/**\/*.spec.ts` path sets the "current spec" for itself and every following
 * line, until the next such mention. IDs seen before the first path belong to the file header and
 * summary table and are not checked by rule 7.
 */
function collectUnitCaseRefs(content: string): UnitCaseRef[] {
  const refs: UnitCaseRef[] = [];
  let currentSpecPaths: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const paths = line.match(APPS_SPEC_PATH);
    if (paths !== null) {
      currentSpecPaths = unique(paths);
    }
    if (currentSpecPaths.length === 0) {
      continue;
    }
    for (const id of unique(line.match(CASE_ID_ANYWHERE) ?? [])) {
      refs.push({ id, specPaths: currentSpecPaths });
    }
  }

  return refs;
}

// --- Rules -----------------------------------------------------------------------------------

function violationsRule1(root: string): string[] {
  return e2eSpecs(root)
    .filter((file) => !isSelfExempt(file))
    .filter((file) => !file.endsWith('.api.spec.ts') && !file.endsWith('.functional.spec.ts'))
    .map(
      (file) =>
        `${file} — rule 1: the name ends in neither .api.spec.ts nor .functional.spec.ts, so the ` +
        `file joins no playwright.config.ts project and silently never runs`,
    );
}

function violationsRule2(root: string): string[] {
  return e2eSpecs(root)
    .filter((file) => !isSelfExempt(file))
    .filter((file) => !fs.existsSync(path.join(root, pairedCaseDoc(file))))
    .map(
      (file) =>
        `${file} — rule 2: no paired case doc ${pairedCaseDoc(file)}. ` +
        `A spec without described cases is a blocker`,
    );
}

function violationsRule3(root: string): string[] {
  return e2eCaseDocs(root)
    .filter((file) => !isUnitCaseDoc(file) && !isSelfExempt(pairedSpec(file)))
    .filter((file) => !fs.existsSync(path.join(root, pairedSpec(file))))
    .map(
      (file) =>
        `${file} — rule 3: no paired spec ${pairedSpec(file)}. ` +
        `Nobody executes the described cases (the only exception is *.unit.cases.md)`,
    );
}

function violationsRule4(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root).filter(isUnitCaseDoc)) {
    for (const specPath of unique(read(root, doc).match(APPS_SPEC_PATH) ?? [])) {
      if (fs.existsSync(path.join(root, specPath))) {
        continue;
      }
      violations.push(
        `${doc} — rule 4: it mentions the path ${specPath}, which is not on disk. ` +
          `Either the spec was renamed or the path in the docs has a typo`,
      );
    }
  }

  return violations;
}

function violationsRule5(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root).filter((file) => !isUnitCaseDoc(file))) {
    const spec = pairedSpec(doc);
    if (!fs.existsSync(path.join(root, spec))) {
      continue; // a missing spec is rule 3; no need to duplicate the failure
    }

    const content = read(root, doc);
    const specText = read(root, spec);
    const exempt = new Set(notAutomatedIds(content));

    /*
     * Only IDs DECLARED in this file as cases count: a section heading or a summary table row.
     * Counting any mention would treat a prose cross-reference to a neighbouring case
     * ("duplicates HD-API-06 on purpose") as a declaration and break the rule.
     *
     * That is exactly what happened when `e2e/security/` was added: the rule demanded that
     * `HD-API-06` be automated inside the security spec.
     */
    const declared = unique([
      ...matchLines(content, CASE_ID_HEADING),
      ...matchLines(content, CASE_ID_TABLE_ROW),
    ]);

    for (const id of declared) {
      if (exempt.has(id) || specText.includes(id)) {
        continue;
      }
      violations.push(
        `${doc} — rule 5: case ${id} is described, but the ID does not appear in ${spec}. ` +
          `Either the test title does not start with the ID, or the case is not automated — ` +
          `then mark it with "- **Not automated:** <reason + task link>"`,
      );
    }
  }

  return violations;
}

function violationsRule6(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root)) {
    const content = read(root, doc);

    for (const id of findDuplicates(matchLines(content, CASE_ID_HEADING))) {
      violations.push(
        `${doc} — rule 6: ID ${id} is used in two case subsections. ` +
          `Numbers are never reused, not even after a case is deleted`,
      );
    }
    for (const id of findDuplicates(matchLines(content, CASE_ID_TABLE_ROW))) {
      violations.push(`${doc} — rule 6: ID ${id} appears in two summary table rows`);
    }
  }

  return violations;
}

function violationsRule7(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root).filter(isUnitCaseDoc)) {
    for (const ref of collectUnitCaseRefs(read(root, doc))) {
      const existing = ref.specPaths.filter((specPath) => fs.existsSync(path.join(root, specPath)));
      if (existing.length === 0) {
        continue; // a non-existent path is rule 4
      }
      if (existing.some((specPath) => read(root, specPath).includes(ref.id))) {
        continue;
      }
      violations.push(
        `${doc} — rule 7: case ${ref.id} is listed under ${existing.join(', ')}, ` +
          `but its ID does not appear there. A unit test title must start with the case ID — ` +
          `otherwise pnpm test:<feature> cannot filter it and automation cannot be verified`,
      );
    }
  }

  return violations;
}

function violationsRule8(root: string): string[] {
  const documented = e2eCaseDocs(root)
    .filter(isUnitCaseDoc)
    .flatMap((doc) => read(root, doc).match(APPS_SPEC_PATH) ?? []);
  const documentedSet = new Set(documented);

  return appsUnitSpecs(root)
    .filter((file) => !UNIT_SPEC_EXEMPT.includes(file))
    .filter((file) => !documentedSet.has(file))
    .map(
      (file) =>
        `${file} — rule 8: this unit spec is mentioned in no *.unit.cases.md. ` +
        `Add its cases to e2e/regression/<feature>/<feature>.unit.cases.md ` +
        `(new specs do not go into UNIT_SPEC_EXEMPT)`,
    );
}

/**
 * Rule 9: the server address is set in `playwright.config.ts` and reaches a test through a fixture
 * or an option — it is never recomputed inside the suite.
 *
 * Why: the Nest address formula lived in three files and the web address in a fourth, held
 * together by a comment promising they would be kept in sync (FX-023). The copies agreed then —
 * all read one environment variable — but a promise is not an invariant, and drift here does not
 * fail the run: the test starts comparing traffic against an address where no server was started,
 * and the BFF checks go vacuously green.
 *
 * It looks for the mechanism, not the mention: reading the port variable, and a quoted address.
 * Prose (`baseURL = http://127.0.0.1:3101` in spec headers) is untouched — it documents the
 * config rather than replacing it.
 *
 * Known gap: an address assembled by a template string without an environment variable is not
 * caught. Closing it with a backtick regex is impossible — it would swallow all the prose.
 */
const ADDRESS_IN_SUITE = [
  { pattern: /process\.env\.E2E_/, what: 'reading the run port variable' },
  { pattern: /['"]https?:\/\/127\.0\.0\.1/, what: 'a quoted address literal' },
];

function violationsRule9(root: string): string[] {
  return walk(root, 'e2e')
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) => {
      const content = read(root, file);

      return ADDRESS_IN_SUITE.filter(({ pattern }) => pattern.test(content)).map(
        ({ what }) =>
          `${file} — rule 9: ${what}. The server address is set only in playwright.config.ts ` +
          `and reaches the test as the project baseURL or the apiBaseURL option. A copy of the ` +
          `formula will drift from the config silently`,
      );
    });
}

// --- Tests -----------------------------------------------------------------------------------

// This describe deliberately carries no tag: `@smoke` means `e2e/smoke/**`, and the meta-test is
// its own acceptance step, launched by path.
test.describe('Regression suite convention', () => {
  // Not a "rule" but a guard against a vacuous pass: if the file walk returns empty lists (the
  // root calculation changed, a directory moved), all nine rules go green under any violation.
  // Such a meta-test is worse than none — it gives false confidence. So first make sure the
  // scanner found anything at all.
  test('walk self-check — the scanner finds both the suite and the app unit specs', () => {
    const root = repoRoot();

    expect(e2eSpecs(root), `Walking e2e/ from root ${root} found no specs`).toContain(
      'e2e/suite-integrity.api.spec.ts',
    );
    expect(e2eCaseDocs(root), `Walking e2e/ from root ${root} found no case docs`).toContain(
      'e2e/smoke/health.api.cases.md',
    );
    expect(appsUnitSpecs(root), `Walking apps/ from root ${root} found no unit specs`).toContain(
      UNIT_SPEC_EXEMPT[0],
    );
  });

  test('ID prefixes are registered — otherwise rules 5–7 are vacuously green', () => {
    const unregistered = unregisteredPrefixes(repoRoot());

    /*
     * Why a separate test rather than just "any capitals" in CASE_ID_SOURCE.
     *
     * While the prefix list is hard-coded, a new feature's ID (`PR-API-01`) is not recognized at
     * all — and rules 5, 6 and 7 find zero IDs, so they pass having checked nothing. That is the
     * worst kind of failure: the suite goes green while coverage disappears silently. Here an
     * unknown prefix fails the run with instructions on where to add it.
     */
    expect(
      unique(unregistered),
      `Add the prefix to KNOWN_CASE_PREFIXES (${KNOWN_CASE_PREFIXES.join(', ')}) ` +
        'in e2e/suite-integrity.api.spec.ts — otherwise the new feature IDs are not recognized ' +
        'and rules 5–7 stop checking anything',
    ).toEqual([]);
  });

  test('rule 1 — every spec in e2e/ carries the .api. or .functional. suffix', () => {
    expect(
      violationsRule1(repoRoot()),
      'A file without the suffix joins no Playwright project and never runs at all',
    ).toEqual([]);
  });

  test('rule 2 — every spec has a paired .cases.md', () => {
    expect(violationsRule2(repoRoot()), 'A spec without described cases is a blocker').toEqual([]);
  });

  test('rule 3 — every .cases.md has a paired spec (except *.unit.cases.md)', () => {
    expect(
      violationsRule3(repoRoot()),
      'A description without a spec means nobody executes the cases',
    ).toEqual([]);
  });

  test('rule 4 — unit spec paths from *.unit.cases.md exist on disk', () => {
    expect(
      violationsRule4(repoRoot()),
      'A reference to a missing file makes the feature documentation a lie',
    ).toEqual([]);
  });

  test('rule 5 — every ID from a .cases.md appears in the paired spec', () => {
    expect(
      violationsRule5(repoRoot()),
      'A case described but not automated must carry an explicit marker line',
    ).toEqual([]);
  });

  test('rule 6 — no duplicate IDs in a .cases.md', () => {
    expect(
      violationsRule6(repoRoot()),
      'A reused number makes the history of reports unreadable',
    ).toEqual([]);
  });

  test('rule 7 — a unit case ID appears in the spec it is listed under', () => {
    expect(
      violationsRule7(repoRoot()),
      'Without this, unit case IDs live only in markdown: unfilterable and unverifiable',
    ).toEqual([]);
  });

  test('rule 8 — every unit spec in apps/**/src/** is mentioned in a *.unit.cases.md', () => {
    expect(
      violationsRule8(repoRoot()),
      'Rules 4 and 7 are one-way: without rule 8 a new unit spec drops out of the docs silently',
    ).toEqual([]);
  });

  test('rule 9 — the server address is not recomputed in the suite but comes from the config', () => {
    expect(
      violationsRule9(repoRoot()),
      'A copy of the address formula will drift from playwright.config.ts silently, and the BFF ' +
        'checks will go vacuously green',
    ).toEqual([]);
  });
});

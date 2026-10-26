import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import ts from 'typescript';

/**
 * The suite convention, made executable. Twelve rules, one test each, so a failure names the exact
 * violation rather than "something is off with the structure". Rules 11 and 12 each have a
 * self-check test beside them.
 *
 * It works through node:fs, hence the `api` project: no browser needed, and the `.api.spec.ts`
 * suffix is mandatory by rule 1 — otherwise the file would join no project.
 *
 * Why at all: review does not catch a forgotten `.cases.md`, and a spec without the
 * `.api.`/`.functional.`/`.integration.` suffix silently never runs — the "green" run checks
 * nothing. This meta-test catches both on every `pnpm e2e`.
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
const KNOWN_CASE_PREFIXES = ['AL', 'HD', 'SM', 'SEC', 'LG', 'PR', 'AR', 'MD', 'ACC', 'MF'];

/**
 * Case ID: `<FEATURE>-<TYPE>-<NN>`. The number is two or three digits. `INT` (integration) joined
 * `API`/`FN`/`UT` with the second tuning round — a level with no type here would be invisible to
 * rules 5–7 while still passing the prefix guard below, which is exactly the vacuous-green failure
 * that guard exists to prevent.
 */
const CASE_ID_SOURCE = `(?:${KNOWN_CASE_PREFIXES.join('|')})-(?:API|FN|UT|INT)-\\d{2,3}`;

/** The ID shape with ANY prefix — only to catch an unregistered one. */
const ANY_PREFIX_CASE_ID = /\b([A-Z]{2,5})-(?:API|FN|UT|INT)-\d{2,3}\b/g;
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
    .filter(
      (file) =>
        !file.endsWith('.api.spec.ts') &&
        !file.endsWith('.functional.spec.ts') &&
        !file.endsWith('.integration.spec.ts'),
    )
    .map(
      (file) =>
        `${file} — rule 1: the name ends in none of .api.spec.ts, .functional.spec.ts or ` +
        `.integration.spec.ts, so the file joins no playwright.config.ts project and silently ` +
        `never runs`,
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

/**
 * Rule 10: the level tag on a Playwright spec matches the project its filename suffix already
 * routes it to. The level is carried twice on purpose once a spec is tagged — once by the suffix
 * (mechanism, checked by rule 1) and once by the tag (for `--grep`) — and a copy that can disagree
 * with the mechanism is worse than no copy: `@api` on a `.functional.spec.ts` file would filter in
 * a test that never runs against the contract it claims to.
 *
 * Only checked where a level tag is actually present: the vocabulary is additive (proposal 7, second
 * tuning round), so an untagged spec written before this rule existed is not retroactively broken.
 */
const LEVEL_TAG_SUFFIX: [tag: string, suffix: string][] = [
  ['@api', '.api.spec.ts'],
  ['@e2e', '.functional.spec.ts'],
  ['@integration', '.integration.spec.ts'],
];

function violationsRule10(root: string): string[] {
  const violations: string[] = [];

  for (const file of e2eSpecs(root).filter((name) => !isSelfExempt(name))) {
    const content = read(root, file);

    for (const [tag, suffix] of LEVEL_TAG_SUFFIX) {
      const tagPresent = content.includes(`'${tag}'`) || content.includes(`"${tag}"`);
      if (tagPresent && !file.endsWith(suffix)) {
        violations.push(
          `${file} — rule 10: carries the level tag ${tag}, but its name does not end in ` +
            `${suffix}. The tag has drifted from the project the filename suffix actually routes ` +
            `this file to`,
        );
      }
    }
  }

  return violations;
}

/**
 * Rules 11 and 12 read TypeScript, not text: a password read is allowed only inside the function
 * passed to one `test` call, and a test body must have one exact shape. Both need the call's
 * bounds, which only a parse gives (`FACT-3759`, `FACT-3811`).
 *
 * Both are pure functions of `{ path, text }` sources, so their self-checks feed them fixtures
 * through the very code the repository run uses (`ADR-0010`).
 */
interface SourceFile {
  path: string;
  text: string;
}

type FindingKind = 'read' | 'tag-location' | 'tagged-set' | 'no-test-call' | 'alias' | 'shape';

interface Finding {
  file: string;
  kind: FindingKind;
  message: string;
}

interface TestCall {
  title: string;
  line: number;
  tags: string[];
  fn: ts.ArrowFunction | ts.FunctionExpression;
  start: number;
  end: number;
}

interface ParsedSpec {
  sf: ts.SourceFile;
  calls: TestCall[];
  aliases: string[];
}

const TEST_MODIFIERS = new Set(['only', 'fixme', 'fail', 'slow', 'skip']);
const UI_LOGIN_TAG = '@ui-login';
const UI_LOGIN_TAG_LITERAL = /['"`]@ui-login['"`]/;
const AUTH_LOGIN_DIR = 'e2e/regression/auth-login/';
const FIXTURES_DIR = 'e2e/fixtures';
const LEADING_CASE_ID = /^[A-Z]{2,5}-(?:API|FN|UT|INT)-\d{2,3}/;

/** `test(...)` and `test.only|fixme|fail|slow|skip(...)`; `test.describe` and hooks are not tests. */
function isTestCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) {
    return expression.text === 'test';
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'test' &&
    TEST_MODIFIERS.has(expression.name.text)
  );
}

function stringsOf(expression: ts.Expression): string[] {
  if (ts.isStringLiteralLike(expression)) {
    return [expression.text];
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap((element) => stringsOf(element));
  }
  return [];
}

function tagsOf(call: ts.CallExpression): string[] {
  return call.arguments.filter(ts.isObjectLiteralExpression).flatMap((options) =>
    options.properties.flatMap((property) => {
      const named =
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === 'tag';
      return named ? stringsOf(property.initializer) : [];
    }),
  );
}

function parseSpec(file: SourceFile): ParsedSpec {
  const sf = ts.createSourceFile(
    file.path,
    file.text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const calls: TestCall[] = [];
  const aliases: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportSpecifier(node) &&
      (node.propertyName ?? node.name).text === 'test' &&
      node.name.text !== 'test'
    ) {
      aliases.push(`import { test as ${node.name.text} }`);
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isIdentifier(node.initializer) &&
      node.initializer.text === 'test' &&
      ts.isIdentifier(node.name) &&
      node.name.text !== 'test'
    ) {
      aliases.push(`const ${node.name.text} = test`);
    }
    if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
      const fn = node.arguments.find(
        (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
          ts.isArrowFunction(argument) || ts.isFunctionExpression(argument),
      );
      if (fn !== undefined) {
        const first = node.arguments[0];
        calls.push({
          title:
            first !== undefined && ts.isStringLiteralLike(first)
              ? first.text
              : '<no literal title>',
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          tags: tagsOf(node),
          fn,
          start: fn.getStart(sf),
          end: fn.getEnd(),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { sf, calls, aliases };
}

function lineOf(parsed: ParsedSpec, offset: number): number {
  return parsed.sf.getLineAndCharacterOfPosition(offset).line + 1;
}

function aliasFindings(file: SourceFile, parsed: ParsedSpec, rule: string): Finding[] {
  return parsed.aliases.map((alias) => ({
    file: file.path,
    kind: 'alias' as const,
    message:
      `${file.path} — ${rule}: ${alias}. A spec takes \`test\` under that name from ` +
      `e2e/fixtures/suite.ts; under another name the parse cannot find its calls`,
  }));
}

function noCallFinding(file: SourceFile, rule: string): Finding {
  return {
    file: file.path,
    kind: 'no-test-call',
    message:
      `${file.path} — ${rule}: no \`test\` call found in a file this rule covers, so there is ` +
      `nothing to bound and the rule would pass having checked nothing`,
  };
}

/**
 * Rule 11 (`FACT-3759`): the seed password is read through the form in two tests only. Scope:
 * `*.functional.spec.ts` outside `auth-login/`, and `e2e/fixtures/*.ts` except `seed.ts`.
 * `*.api.spec.ts` and `e2e/api/` sign in through the API, which needs the password, so they are
 * outside it. A read is allowed only inside the function of a `test` call tagged `@ui-login` —
 * a module-level helper called from one is a hit.
 */
const PASSWORD_READS: { pattern: RegExp; what: string }[] = [
  { pattern: /\.password\b/g, what: 'a `.password` member access' },
  {
    pattern: /\{[^}]*\bpassword\b[^}]*\}\s*=(?![=>])/g,
    what: 'a `password` binding in a destructuring pattern',
  },
  { pattern: /SEED_PASSWORD/g, what: 'the seed mirror password constant' },
  { pattern: /Passw0rd!/g, what: 'the seed password literal' },
];

function inRule11Scope(file: string): boolean {
  const spec = file.endsWith('.functional.spec.ts') && !file.startsWith(AUTH_LOGIN_DIR);
  const fixture =
    path.posix.dirname(file) === FIXTURES_DIR &&
    file.endsWith('.ts') &&
    path.posix.basename(file) !== 'seed.ts';
  return spec || fixture;
}

function rule11Findings(files: SourceFile[], expectedTaggedIds: string[]): Finding[] {
  const findings: Finding[] = [];
  const taggedIds: string[] = [];

  for (const file of files) {
    if (!file.path.endsWith('.functional.spec.ts') && UI_LOGIN_TAG_LITERAL.test(file.text)) {
      findings.push({
        file: file.path,
        kind: 'tag-location',
        message:
          `${file.path} — rule 11: carries the ${UI_LOGIN_TAG} tag outside a ` +
          `*.functional.spec.ts, where it would claim an exemption no browser test can use`,
      });
    }
  }

  for (const file of files.filter((candidate) => inRule11Scope(candidate.path))) {
    const parsed = parseSpec(file);
    const isSpec = file.path.endsWith('.functional.spec.ts');

    if (isSpec && parsed.calls.length === 0) {
      findings.push(noCallFinding(file, 'rule 11'));
    }
    if (isSpec) {
      findings.push(...aliasFindings(file, parsed, 'rule 11'));
    }

    const allowed = parsed.calls.filter((call) => call.tags.includes(UI_LOGIN_TAG));
    if (isSpec) {
      taggedIds.push(
        ...allowed.map(
          (call) => LEADING_CASE_ID.exec(call.title)?.[0] ?? `(no case ID) ${call.title}`,
        ),
      );
    }

    for (const { pattern, what } of PASSWORD_READS) {
      for (const match of file.text.matchAll(pattern)) {
        const offset = match.index;
        if (allowed.some((call) => offset >= call.start && offset < call.end)) {
          continue;
        }
        const enclosing = parsed.calls.find((call) => offset >= call.start && offset < call.end);
        findings.push({
          file: file.path,
          kind: 'read',
          message:
            `${file.path}:${lineOf(parsed, offset)} — rule 11: ${what} ` +
            `${enclosing === undefined ? 'at module level or in a helper' : `in test "${enclosing.title}"`}, ` +
            `which carries no ${UI_LOGIN_TAG} tag. A browser case signs in through the cookie ` +
            `builder; only the tagged tests type the password`,
        });
      }
    }
  }

  const got = unique(taggedIds).sort();
  const want = unique(expectedTaggedIds).sort();
  if (got.join(',') !== want.join(',')) {
    findings.push({
      file: 'e2e',
      kind: 'tagged-set',
      message:
        `e2e — rule 11: the tests tagged ${UI_LOGIN_TAG} are [${got.join(', ')}], but FACT-3806 ` +
        `names [${want.join(', ')}]`,
    });
  }

  return findings;
}

/** The case IDs on the line of `FACT-3806`, read by its key from the ADR log. */
function uiLoginIdsFromAdr(root: string): string[] {
  const ids: string[] = [];

  for (const file of walk(root, 'docs/adr').filter((name) => name.endsWith('.md'))) {
    let inside = false;
    for (const line of read(root, file).split(/\r?\n/)) {
      if (/^- `FACT-\d+`/.test(line)) {
        inside = line.startsWith('- `FACT-3806`');
      }
      if (inside) {
        ids.push(...(line.match(CASE_ID_ANYWHERE) ?? []));
      }
    }
  }

  return unique(ids).sort();
}

/**
 * Rule 12 (`FACT-3811`): every `test` call's function is exactly
 * `try { … } finally { await cleanup.run(); }`. The four meta-test areas read the repository and
 * create no data, so they are outside the scope by definition, not by exception.
 */
const RULE12_SUFFIXES = ['.api.spec.ts', '.functional.spec.ts', '.integration.spec.ts'];
const RULE12_OUT_OF_SCOPE = [
  'e2e/suite-integrity.api.spec.ts',
  'e2e/architecture/',
  'e2e/ledger/',
  'e2e/process/',
];

function inRule12Scope(file: string): boolean {
  return (
    file.startsWith('e2e/') &&
    RULE12_SUFFIXES.some((suffix) => file.endsWith(suffix)) &&
    !RULE12_OUT_OF_SCOPE.some((area) => file === area || file.startsWith(area))
  );
}

function isCleanupRunCall(expression: ts.Expression): boolean {
  return (
    ts.isCallExpression(expression) &&
    expression.arguments.length === 0 &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === 'cleanup' &&
    expression.expression.name.text === 'run'
  );
}

/** Why a function body is not the exact shape, or `null` when it is. */
function diagnoseBody(fn: ts.ArrowFunction | ts.FunctionExpression): string | null {
  const body = fn.body;
  if (!ts.isBlock(body)) {
    return 'the function is an expression, not a block holding one `try`';
  }
  if (!body.statements.some(ts.isTryStatement)) {
    return 'no `try` statement';
  }
  const only = body.statements[0];
  if (body.statements.length !== 1 || !ts.isTryStatement(only)) {
    return 'a statement before or after the `try`';
  }
  if (only.catchClause !== undefined) {
    return 'a `catch` clause (rethrowing or not)';
  }
  const statements = only.finallyBlock?.statements ?? [];
  if (statements.length === 0) {
    return 'an empty `finally`';
  }
  const [first] = statements;
  if (
    ts.isExpressionStatement(first) &&
    ts.isCallExpression(first.expression) &&
    isCleanupRunCall(first.expression)
  ) {
    return '`cleanup.run()` is not awaited';
  }
  const awaited =
    ts.isExpressionStatement(first) &&
    ts.isAwaitExpression(first.expression) &&
    isCleanupRunCall(first.expression.expression);
  if (!awaited) {
    return 'the `finally` lacks `await cleanup.run();`';
  }
  return statements.length === 1 ? null : 'the `finally` holds more than `await cleanup.run();`';
}

function rule12Findings(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => inRule12Scope(candidate.path))) {
    const parsed = parseSpec(file);

    if (parsed.calls.length === 0) {
      findings.push(noCallFinding(file, 'rule 12'));
    }
    findings.push(...aliasFindings(file, parsed, 'rule 12'));

    for (const call of parsed.calls) {
      const reason = diagnoseBody(call.fn);
      if (reason !== null) {
        findings.push({
          file: file.path,
          kind: 'shape',
          message:
            `${file.path}:${call.line} — rule 12: test "${call.title}": ${reason}. The body is ` +
            `exactly try { … } finally { await cleanup.run(); }`,
        });
      }
    }
  }

  return findings;
}

function e2eTsSources(root: string): SourceFile[] {
  return walk(root, 'e2e')
    .filter((file) => file.endsWith('.ts') && !isSelfExempt(file))
    .map((file) => ({ path: file, text: read(root, file) }));
}

function perFile(findings: Finding[]): string {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1);
  }
  return `${findings.length} findings in ${counts.size} files: ${[...counts]
    .map(([file, count]) => `${file} ×${count}`)
    .join('; ')}`;
}

// --- Self-checks of rules 11 and 12 ----------------------------------------------------------

const FIXTURE_FN = 'e2e/regression/meeting-files/meeting-files.functional.spec.ts';
const FIXTURE_IDS = ['MF-FN-09', 'SEC-FN-01'];

function taggedSpec(withSecond: boolean): SourceFile {
  const second = withSecond
    ? `
test('SEC-FN-01 — cookie flags', { tag: ['@p0', '@ui-login'] }, async ({ page }) => {
  const { email, password } = held;
  await page.getByLabel('Password').fill(SEED_PASSWORD + 'Passw0rd!');
});`
    : '';
  return {
    path: FIXTURE_FN,
    text: `import { test } from '@playwright/test';
test('MF-FN-09 — session expired', { tag: '@ui-login' }, async ({ page }) => {
  await page.getByLabel('Password').fill(held.password);
});${second}
test('MF-FN-10 — plain', async () => {});
`,
  };
}

const R11_HIT_FILE = 'e2e/regression/home-dashboard/home-dashboard.functional.spec.ts';

function functionalFile(
  body: string,
  header = "import { test } from '@playwright/test';",
): SourceFile {
  return { path: R11_HIT_FILE, text: `${header}\n${body}\n` };
}

/** Each must-hit scenario names the finding kind and file the rule has to produce. */
const RULE11_MUST_HIT: {
  name: string;
  files: SourceFile[];
  kind: FindingKind;
  file: string;
}[] = [
  {
    name: 'a .password read in an untagged test',
    files: [
      functionalFile("test('HD-FN-11 — a', async () => { use(SEED_USERS.teacher.password); });"),
    ],
    kind: 'read',
    file: R11_HIT_FILE,
  },
  {
    name: 'a password destructuring in an untagged test',
    files: [
      functionalFile(
        "test('HD-FN-11 — a', async () => { const { email, password } = SEED_USERS.teacher; });",
      ),
    ],
    kind: 'read',
    file: R11_HIT_FILE,
  },
  {
    name: 'the seed password constant in an untagged test',
    files: [functionalFile("test('HD-FN-11 — a', async () => { use(SEED_PASSWORD); });")],
    kind: 'read',
    file: R11_HIT_FILE,
  },
  {
    name: 'the seed password literal in an untagged test',
    files: [functionalFile("test('HD-FN-11 — a', async () => { use('Passw0rd!'); });")],
    kind: 'read',
    file: R11_HIT_FILE,
  },
  {
    name: 'a read in a module-level helper that a tagged test calls',
    files: [
      functionalFile(
        `function typed() { return SEED_USERS.teacher.password; }
test('MF-FN-09 — again', { tag: '@ui-login' }, async () => { use(typed()); });`,
      ),
    ],
    kind: 'read',
    file: R11_HIT_FILE,
  },
  {
    name: 'the tag in an .api.spec.ts',
    files: [
      {
        path: 'e2e/regression/home-dashboard/home-dashboard.api.spec.ts',
        text: "test('HD-API-01 — t', { tag: '@ui-login' }, async () => {});",
      },
    ],
    kind: 'tag-location',
    file: 'e2e/regression/home-dashboard/home-dashboard.api.spec.ts',
  },
  {
    name: 'a tagged set one ID short',
    files: [taggedSpec(false)],
    kind: 'tagged-set',
    file: 'e2e',
  },
  {
    name: 'a tagged set one ID too long',
    files: [functionalFile("test('HD-FN-11 — a', { tag: '@ui-login' }, async () => {});")],
    kind: 'tagged-set',
    file: 'e2e',
  },
  {
    name: 'a functional spec with no matched test call (P10 G)',
    files: [functionalFile("test.describe('only a group', () => {});")],
    kind: 'no-test-call',
    file: R11_HIT_FILE,
  },
  {
    name: 'a functional spec importing test as it (P10 G)',
    files: [
      functionalFile(
        "it('HD-FN-11 — a', async () => {});",
        "import { test as it } from '@playwright/test';",
      ),
    ],
    kind: 'alias',
    file: R11_HIT_FILE,
  },
  {
    name: 'a functional spec declaring const it = test (P10 H)',
    files: [functionalFile("const it = test;\ntest('HD-FN-11 — a', async () => {});")],
    kind: 'alias',
    file: R11_HIT_FILE,
  },
  {
    name: 'a read in a fixture file other than the seed',
    files: [
      {
        path: 'e2e/fixtures/auth.fixture.ts',
        text: 'const { email, password } = SEED_USERS[user];',
      },
    ],
    kind: 'read',
    file: 'e2e/fixtures/auth.fixture.ts',
  },
];

/** Must-miss: every one of these is legitimate, together they must raise nothing. */
const RULE11_MUST_MISS: SourceFile[] = [
  taggedSpec(true),
  {
    path: 'e2e/security/security.api.spec.ts',
    text: `const cases = { valid: { email: SEED_USERS.teacher.email, password: SEED_USERS.teacher.password } };
const SECRET_MARKERS = ['scrypt', 'passwordHash', 'password', SEED_USERS.teacher.password];
test('SEC-API-01 — a', async () => { use({ data: { email: x, password: SEED_USERS.teacher.password } }); });`,
  },
  {
    path: 'e2e/regression/home-dashboard/home-dashboard.api.spec.ts',
    text: "test('HD-API-01 — a', async () => { expect(text).not.toContain(TEACHER.password); });",
  },
  {
    path: 'e2e/accessibility/accessibility.functional.spec.ts',
    text: `test('ACC-FN-03 — a', async ({ page }) => {
  await page.getByLabel('Password').fill('definitely-not-the-password');
});`,
  },
  { path: 'e2e/fixtures/seed.ts', text: "export const SEED_PASSWORD = 'Passw0rd!';" },
  {
    path: 'e2e/regression/auth-login/auth-login.functional.spec.ts',
    text: "test('AL-FN-13 — a', async () => { use(TEACHER.password); });",
  },
];

function rule11SelfCheck(): string[] {
  const problems: string[] = [];

  for (const scenario of RULE11_MUST_HIT) {
    // The tagged baseline keeps the tagged-set comparison quiet; a scenario that brings its own
    // tagged spec at the same path (the one-short set) replaces it.
    const baseline = scenario.files.some((f) => f.path === FIXTURE_FN) ? [] : [taggedSpec(true)];
    const findings = rule11Findings([...baseline, ...scenario.files], FIXTURE_IDS);
    if (!findings.some((f) => f.kind === scenario.kind && f.file === scenario.file)) {
      problems.push(
        `rule 11 missed "${scenario.name}": wanted a ${scenario.kind} finding on ${scenario.file}, ` +
          `got [${findings.map((f) => f.kind).join(', ')}]`,
      );
    }
  }

  const missed = rule11Findings(RULE11_MUST_MISS, FIXTURE_IDS);
  if (missed.length > 0) {
    problems.push(
      `rule 11 flagged legitimate sources: ${missed.map((f) => f.message).join(' | ')}`,
    );
  }

  return problems;
}

const SHAPE_BROKEN: [id: string, body: string][] = [
  ['X-FN-01 — no try', 'await a(); await cleanup.run();'],
  [
    'X-FN-02 — rethrowing catch',
    'try { await a(); } catch (e) { throw e; } finally { await cleanup.run(); }',
  ],
  [
    'X-FN-03 — swallowing catch',
    'try { await a(); } catch { await b(); } finally { await cleanup.run(); }',
  ],
  ['X-FN-04 — finally without the run', 'try { await a(); } finally { await other(); }'],
  [
    'X-FN-05 — run plus another statement',
    'try { await a(); } finally { await cleanup.run(); await other(); }',
  ],
  ['X-FN-06 — run not awaited', 'try { await a(); } finally { cleanup.run(); }'],
  [
    'X-FN-07 — a statement before the try',
    'const x = 1; try { await a(); } finally { await cleanup.run(); }',
  ],
  ['X-FN-08 — empty finally', 'try { await a(); } finally { }'],
];

const SHAPE_PATH = 'e2e/regression/x/x.functional.spec.ts';

function shapeSpec(
  path: string,
  tests: string,
  header = "import { test } from '@playwright/test';",
): SourceFile {
  return { path, text: `${header}\n${tests}\n` };
}

const FULL_SHAPE = 'try { await a(); } finally { await cleanup.run(); }';

function rule12SelfCheck(): string[] {
  const problems: string[] = [];

  const broken = rule12Findings([
    shapeSpec(
      SHAPE_PATH,
      SHAPE_BROKEN.map(([title, body]) => `test('${title}', async () => { ${body} });`).join('\n'),
    ),
  ]);
  for (const [title] of SHAPE_BROKEN) {
    if (!broken.some((f) => f.kind === 'shape' && f.message.includes(`"${title}"`))) {
      problems.push(`rule 12 missed the broken shape "${title}"`);
    }
  }
  if (broken.length !== SHAPE_BROKEN.length) {
    problems.push(
      `rule 12 flagged ${broken.length} findings over ${SHAPE_BROKEN.length} broken shapes`,
    );
  }

  const noCall = rule12Findings([
    shapeSpec('e2e/x/describe-only.api.spec.ts', "test.describe('group', () => {});"),
  ]);
  if (!noCall.some((f) => f.kind === 'no-test-call')) {
    problems.push('rule 12 passed a file with no matched test call');
  }

  const imported = rule12Findings([
    shapeSpec(
      'e2e/x/import-alias.api.spec.ts',
      `it('X-API-01 — a', async () => { ${FULL_SHAPE} });`,
      "import { test as it } from '@playwright/test';",
    ),
  ]);
  if (
    !imported.some((f) => f.kind === 'alias') ||
    !imported.some((f) => f.kind === 'no-test-call')
  ) {
    problems.push('rule 12 passed `import { test as it }` (zero matched calls, aliased import)');
  }

  const declared = rule12Findings([
    shapeSpec(
      'e2e/x/const-alias.api.spec.ts',
      `const it = test;\ntest('X-API-02 — a', async () => { ${FULL_SHAPE} });`,
    ),
  ]);
  if (declared.length !== 1 || declared[0].kind !== 'alias') {
    problems.push('rule 12 did not flag `const it = test` exactly once');
  }

  const outOfScope = rule12Findings([
    shapeSpec('e2e/ledger/ledger.api.spec.ts', "test('LG-API-01 — a', () => { use(); });"),
    shapeSpec('e2e/x/helper.ts', "test('X-API-03 — a', () => { use(); });"),
  ]);
  if (outOfScope.length > 0) {
    problems.push(
      `rule 12 flagged sources outside its scope: ${outOfScope.map((f) => f.file).join(', ')}`,
    );
  }

  const legitimate = rule12Findings([
    shapeSpec(
      SHAPE_PATH,
      `test('X-FN-09 — the full shape', async () => { ${FULL_SHAPE} });
test.skip('X-FN-10 — skipped, same shape', async () => { ${FULL_SHAPE} });
test.fixme('X-FN-12 — fixme, same shape', async () => { ${FULL_SHAPE} });
test.describe('outer', () => {
  test.describe('nested', () => {
    test('X-FN-11 — nested describe', async () => { ${FULL_SHAPE} });
  });
});`,
    ),
  ]);
  if (legitimate.length > 0) {
    problems.push(
      `rule 12 flagged legitimate shapes: ${legitimate.map((f) => f.message).join(' | ')}`,
    );
  }

  return problems;
}

// --- Tests -----------------------------------------------------------------------------------

// This describe deliberately carries no tag: `@smoke` means `e2e/smoke/**`, and the meta-test is
// its own acceptance step, launched by path.
test.describe('Regression suite convention', () => {
  // Not a "rule" but a guard against a vacuous pass: if the file walk returns empty lists (the
  // root calculation changed, a directory moved), all twelve rules go green under any violation.
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

  test('rule 10 — a level tag matches the file it is written on', () => {
    expect(
      violationsRule10(repoRoot()),
      'A level tag that disagrees with the filename suffix filters in a test that does not run ' +
        'where the tag claims it does',
    ).toEqual([]);
  });

  test('rule 11 self-check — the seed-password rule hits what it must and misses what it must not', () => {
    expect(
      rule11SelfCheck(),
      'Without this, a parse that finds no test call would let rule 11 pass having checked nothing',
    ).toEqual([]);
  });

  test('rule 11 — only the @ui-login tests read the seed password', () => {
    const root = repoRoot();
    const expectedIds = uiLoginIdsFromAdr(root);
    const findings = rule11Findings(e2eTsSources(root), expectedIds);

    expect(expectedIds, 'FACT-3806 was not found in docs/adr, or names no case ID').not.toEqual([]);
    expect(
      findings.map((finding) => finding.message),
      `Browser cases sign in through the cookie builder (${perFile(findings)})`,
    ).toEqual([]);
  });

  test('rule 12 self-check — the body-shape rule hits what it must and misses what it must not', () => {
    expect(
      rule12SelfCheck(),
      'Without this, an aliased `test` would leave rule 12 nothing to bound and it would pass',
    ).toEqual([]);
  });

  test('rule 12 — every test body is try { … } finally { await cleanup.run(); }', () => {
    const findings = rule12Findings(e2eTsSources(repoRoot()));

    expect(
      findings.map((finding) => finding.message),
      `A create no body registers is found by the teardown comparison, not here (${perFile(findings)})`,
    ).toEqual([]);
  });
});

import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * The architecture corpus, made executable. Cases live in the paired `architecture.api.cases.md`.
 *
 * Project `api`: no browser, plain `node:fs`. The `.api.spec.ts` suffix is mandatory (suite rule 1)
 * — without it the file joins no project and silently never runs.
 *
 * Why at all: documentation rots quietly. The ADR log grows a second `ADR-0007`, a route is renamed
 * and the contract document keeps describing the old one, a guarded endpoint never reaches
 * `PROTECTED_ROUTES` and the security suite silently stops covering it. None of that shows up in a
 * diff, and all of it is mechanical to check (`ADR-0010`, `ADR-0015`).
 *
 * What it does NOT check: whether an ADR's reasoning is any good, or whether the prose in
 * `architecture.md` is true. Those are review's job — a check pretending to be smarter than it is
 * does more harm than no check.
 */

const ADR_DIR = 'docs/adr';
const ADR_INDEX = 'docs/adr/README.md';
const API_CONTRACT = 'docs/api-contract.md';
const SECURITY_SPEC = 'e2e/security/security.api.spec.ts';
const AGENTS_DIR = '.claude/agents';
const CONTROLLERS_DIR = 'apps/api/src';
const TEAM_ROLES_SKILL = '.claude/skills/team-roles/SKILL.md';
const PROCESS_DOC = 'docs/process.md';
const PROFILING_DIR = 'docs/profiling';

/** Files in `docs/adr/` that are not decisions. */
const ADR_NON_RECORDS = ['README.md', 'TEMPLATE.md'];

/** `ADR-0007-some-slug.md`. */
const ADR_FILE = /^(ADR-(\d{4}))-[a-z0-9][a-z0-9-]*\.md$/;

/** Sections every record must carry. Their content is review's business, their presence is not. */
const ADR_REQUIRED_SECTIONS = ['## Context', '## Decision', '## Consequences'];

const ADR_STATUSES = ['proposed', 'accepted', 'superseded', 'rejected'];

const ADR_STATUS_LINE = /^-\s*\*\*Status:\*\*\s*(\S+)\s*$/m;
const ADR_SUPERSEDED_BY = /^-\s*\*\*Superseded by:\*\*\s*(.+)$/m;
const ADR_SUPERSEDES = /^-\s*\*\*Supersedes:\*\*\s*(.+)$/m;
const ADR_HEADING = /^#\s+(ADR-\d{4})\s+—\s+\S/m;

/** Index row: `| [ADR-0007](ADR-0007-slug.md) | Title | accepted |`. */
const ADR_INDEX_ROW = /^\|\s*\[(ADR-\d{4})\]\(([^)]+)\)\s*\|[^|]*\|\s*([a-z]+)\s*\|/;

/** A row of the Routes table in the contract document. */
const CONTRACT_ROUTE_ROW = /^\|\s*`(GET|POST|PUT|PATCH|DELETE)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]*)\|/;

/**
 * A case ID (or the left half of a range) inside a Cases cell: `` `AL-API-01` `` optionally
 * followed by `` …`04` `` — U+2026, a single character, not three dots. The right-hand token of a
 * range is bare digits and inherits the prefix from the left one, so the prefix is captured
 * separately from the number rather than as part of one opaque token.
 */
const CASES_RANGE_TOKEN = /`([A-Z]{2,5}-API-)(\d{2,3})`(?:…`(\d{2,3})`)?/g;

/** Any case ID, anywhere in a `.cases.md` file — used to build the set of IDs that actually exist. */
const CASE_ID_ANYWHERE = /\b([A-Z]{2,5}-API-\d{2,3})\b/g;

/** `@Controller('auth')` / `@Controller()`. */
const CONTROLLER_DECORATOR = /@Controller\(\s*(?:'([^']*)')?\s*\)/;

/** `@Get('me')` / `@Post()`. */
const METHOD_DECORATOR = /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/;

/** A `PROTECTED_ROUTES` entry: `{ method: 'GET' as const, path: '/auth/me' }`. */
const PROTECTED_ROUTE_ENTRY = /method:\s*'(GET|POST|PUT|PATCH|DELETE)'[^}]*?path:\s*'([^']+)'/g;

/** Frontmatter fields every agent definition must declare. */
const AGENT_REQUIRED_FIELDS = ['name', 'description', 'tools', 'model'];

const SKIP_DIRS = new Set(['.git', '.next', 'dist', 'node_modules', 'test-results']);

/**
 * The monorepo root. `test.info().config.rootDir` equals the resolved `testDir` (`<repo>/e2e`), not
 * the config directory — a meta-test using it would look for files in `e2e/docs`, find zero and
 * pass every rule vacuously. So we walk up to the workspace marker, exactly as the neighbouring
 * meta-tests do.
 */
function repoRoot(): string {
  let dir = test.info().config.rootDir;

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Monorepo root (pnpm-workspace.yaml) not found above ${dir}`);
    }
    dir = parent;
  }
}

function read(root: string, relFile: string): string {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

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

function adrFiles(root: string): string[] {
  return fs
    .readdirSync(path.join(root, ADR_DIR))
    .filter((name) => !ADR_NON_RECORDS.includes(name))
    .sort();
}

function agentFiles(root: string): string[] {
  const dir = path.join(root, AGENTS_DIR);
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

function indexRows(root: string): { id: string; file: string; status: string }[] {
  const rows: { id: string; file: string; status: string }[] = [];

  for (const line of read(root, ADR_INDEX).split(/\r?\n/)) {
    const match = ADR_INDEX_ROW.exec(line);
    if (match !== null) {
      rows.push({ id: match[1], file: match[2], status: match[3] });
    }
  }

  return rows;
}

// --- ADR log ----------------------------------------------------------------------------------

function violationsAdrNaming(root: string): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();

  for (const name of adrFiles(root)) {
    const match = ADR_FILE.exec(name);

    if (match === null) {
      problems.push(
        `${ADR_DIR}/${name} — the name is not ADR-NNNN-kebab-slug.md. Create records with ` +
          '`pnpm adr:new <slug>`: it takes the next free number, which is how two ADR-0007s stop ' +
          'being possible',
      );
      continue;
    }

    const previous = seen.get(match[1]);
    if (previous !== undefined) {
      problems.push(
        `${ADR_DIR}/${name} — number ${match[1]} is already used by ${previous}. IDs are never ` +
          'reused, not even after a record is deleted: plans cite them',
      );
      continue;
    }
    seen.set(match[1], name);
  }

  return problems;
}

function violationsAdrShape(root: string): string[] {
  const problems: string[] = [];

  for (const name of adrFiles(root)) {
    const match = ADR_FILE.exec(name);
    if (match === null) {
      continue; // naming is the previous case; no need to report the same file twice
    }

    const content = read(root, `${ADR_DIR}/${name}`);
    const heading = ADR_HEADING.exec(content);
    const status = ADR_STATUS_LINE.exec(content);

    if (heading === null) {
      problems.push(`${ADR_DIR}/${name} — no "# ADR-NNNN — <title>" heading`);
    } else if (heading[1] !== match[1]) {
      problems.push(
        `${ADR_DIR}/${name} — the heading says ${heading[1]} while the file is named ${match[1]}`,
      );
    }

    if (status === null) {
      problems.push(`${ADR_DIR}/${name} — no "- **Status:**" line`);
    } else if (!ADR_STATUSES.includes(status[1])) {
      problems.push(
        `${ADR_DIR}/${name} — status "${status[1]}" is not one of ${ADR_STATUSES.join(', ')}`,
      );
    }

    for (const section of ADR_REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        problems.push(
          `${ADR_DIR}/${name} — no "${section}" section. A record without context cannot be ` +
            're-judged later, and re-judging is the only reason it is kept',
        );
      }
    }
  }

  return problems;
}

function violationsAdrIndex(root: string): string[] {
  const problems: string[] = [];
  const files = adrFiles(root);
  const rows = indexRows(root);
  const rowById = new Map(rows.map((row) => [row.id, row]));

  for (const name of files) {
    const match = ADR_FILE.exec(name);
    if (match === null) {
      continue;
    }

    const row = rowById.get(match[1]);

    if (row === undefined) {
      problems.push(
        `${ADR_DIR}/${name} — missing from the table in ${ADR_INDEX}. A record nobody can find ` +
          'from the index is a record nobody reads',
      );
      continue;
    }
    if (row.file !== name) {
      problems.push(
        `${ADR_INDEX} — the ${match[1]} row links to ${row.file}, but the file is ${name}`,
      );
    }

    const status = ADR_STATUS_LINE.exec(read(root, `${ADR_DIR}/${name}`));
    if (status !== null && status[1] !== row.status) {
      problems.push(
        `${ADR_INDEX} — the ${match[1]} row says "${row.status}" while the record says ` +
          `"${status[1]}". A status changes in both places or in neither`,
      );
    }
  }

  const known = new Set(files.map((name) => ADR_FILE.exec(name)?.[1]));
  for (const row of rows) {
    if (!known.has(row.id)) {
      problems.push(`${ADR_INDEX} — the table lists ${row.id}, but no such file is in ${ADR_DIR}`);
    }
  }

  return problems;
}

function violationsAdrSupersession(root: string): string[] {
  const problems: string[] = [];
  const present = new Set<string>();
  const contents = new Map<string, string>();

  for (const name of adrFiles(root)) {
    const match = ADR_FILE.exec(name);
    if (match === null) {
      continue;
    }
    present.add(match[1]);
    contents.set(match[1], read(root, `${ADR_DIR}/${name}`));
  }

  for (const [id, content] of contents) {
    const status = ADR_STATUS_LINE.exec(content)?.[1];
    const supersededBy = (ADR_SUPERSEDED_BY.exec(content)?.[1] ?? '').trim();
    const cited = supersededBy.match(/ADR-\d{4}/g) ?? [];

    if (status === 'superseded' && cited.length === 0) {
      problems.push(
        `${id} — status "superseded" without a "- **Superseded by:**" ADR reference. A decision ` +
          'replaced by nothing in particular is just a deleted decision',
      );
    }
    if (status !== 'superseded' && cited.length > 0) {
      problems.push(
        `${id} — it names a superseding record (${cited.join(', ')}) but its status is ` +
          `"${status ?? 'missing'}" rather than "superseded"`,
      );
    }

    for (const other of cited) {
      if (!present.has(other)) {
        problems.push(`${id} — "Superseded by" cites ${other}, which does not exist`);
        continue;
      }
      const back = contents.get(other) ?? '';
      if (!(ADR_SUPERSEDES.exec(back)?.[1] ?? '').includes(id)) {
        problems.push(
          `${other} — it supersedes ${id}, but its "- **Supersedes:**" line does not say so. ` +
            'The link is followed in both directions or the log cannot be read backwards',
        );
      }
    }
  }

  return problems;
}

// --- API contract against the code ---------------------------------------------------------

interface Route {
  method: string;
  path: string;
  guarded: boolean;
}

/** Joins a controller prefix and a method path into the route a client actually calls. */
function joinRoute(prefix: string, suffix: string): string {
  const segments = [prefix, suffix].filter((part) => part !== '');

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/**
 * Routes registered in the Nest controllers.
 *
 * A source scan rather than a running-app introspection on purpose: this file is in the `api`
 * project and must stay a `node:fs` check, and the decorators are the declaration — an endpoint
 * exists because a decorator says so.
 */
function codeRoutes(root: string): Route[] {
  const routes: Route[] = [];

  for (const file of walk(root, CONTROLLERS_DIR).filter((name) =>
    name.endsWith('.controller.ts'),
  )) {
    const lines = read(root, file).split(/\r?\n/);
    const controllerIndex = lines.findIndex((line) => CONTROLLER_DECORATOR.test(line));

    if (controllerIndex === -1) {
      continue;
    }

    const prefix = CONTROLLER_DECORATOR.exec(lines[controllerIndex])?.[1] ?? '';
    // A guard on the class covers every method; one on a method covers only that method. The
    // class-level decorator sits between @Controller and the class body.
    const classBody = lines.indexOf(
      lines.slice(controllerIndex).find((line) => /^export class /.test(line)) ?? '',
    );
    const classGuarded = lines
      .slice(controllerIndex, classBody === -1 ? controllerIndex : classBody)
      .some((line) => line.includes('@UseGuards('));

    for (let i = 0; i < lines.length; i += 1) {
      const method = METHOD_DECORATOR.exec(lines[i]);
      if (method === null) {
        continue;
      }
      // A method-level guard is written on the neighbouring decorator lines.
      const methodGuarded = lines
        .slice(Math.max(0, i - 3), i + 4)
        .some((line) => line.includes('@UseGuards('));

      routes.push({
        method: method[1].toUpperCase(),
        path: joinRoute(prefix, method[2] ?? ''),
        guarded: classGuarded || methodGuarded,
      });
    }
  }

  return routes;
}

/** Routes described in the contract document's Routes table. */
function documentedRoutes(root: string): Route[] {
  const routes: Route[] = [];

  for (const line of read(root, API_CONTRACT).split(/\r?\n/)) {
    const match = CONTRACT_ROUTE_ROW.exec(line);
    if (match !== null) {
      routes.push({
        method: match[1],
        path: match[2],
        guarded: match[3].includes('Bearer'),
      });
    }
  }

  return routes;
}

function key(route: Route): string {
  return `${route.method} ${route.path}`;
}

function violationsContractDrift(root: string): string[] {
  const problems: string[] = [];
  const inCode = codeRoutes(root);
  const inDoc = documentedRoutes(root);
  const documented = new Map(inDoc.map((route) => [key(route), route]));
  const implemented = new Map(inCode.map((route) => [key(route), route]));

  for (const route of inCode) {
    if (!documented.has(key(route))) {
      problems.push(
        `${key(route)} is registered in a controller but missing from the Routes table in ` +
          `${API_CONTRACT}. A contract nobody updated is a contract nobody can trust`,
      );
    }
  }

  for (const route of inDoc) {
    if (!implemented.has(key(route))) {
      problems.push(
        `${API_CONTRACT} documents ${key(route)}, but no controller registers it. Either the ` +
          'route was removed and the row stayed, or the path in the document has a typo',
      );
    }
  }

  for (const route of inCode) {
    const doc = documented.get(key(route));
    if (doc !== undefined && doc.guarded !== route.guarded) {
      problems.push(
        `${key(route)} — the code says ${route.guarded ? 'guarded' : 'public'} while ` +
          `${API_CONTRACT} says ${doc.guarded ? 'guarded' : 'public'}`,
      );
    }
  }

  return problems;
}

function protectedRoutes(root: string): Set<string> {
  const content = read(root, SECURITY_SPEC);
  const listed = new Set<string>();

  for (const match of content.matchAll(PROTECTED_ROUTE_ENTRY)) {
    // The list carries query strings (`/meetings?limit=3`); a route is identified by its path.
    listed.add(`${match[1]} ${match[2].split('?')[0]}`);
  }

  return listed;
}

function violationsProtectedList(root: string): string[] {
  const listed = protectedRoutes(root);

  return codeRoutes(root)
    .filter((route) => route.guarded)
    .filter((route) => !listed.has(key(route)))
    .map(
      (route) =>
        `${key(route)} carries a guard but is missing from PROTECTED_ROUTES in ${SECURITY_SPEC}. ` +
        'That list is the only thing connecting the cross-feature security suite to a growing ' +
        'application: forget a line and the check silently stops covering the new route ' +
        '(invariant 16)',
    );
}

// --- API contract Cases column ----------------------------------------------------------------

/**
 * The six cells of one Routes table row, in table order: Method, Path, Guard, Success, Errors,
 * Cases. A row starts and ends with `|`, so a plain `split('|')` yields an empty string on each
 * side of the six real cells — sliced off here rather than carried around by every caller.
 */
function contractRouteCells(root: string): string[][] {
  const rows: string[][] = [];

  for (const line of read(root, API_CONTRACT).split(/\r?\n/)) {
    if (CONTRACT_ROUTE_ROW.test(line)) {
      rows.push(
        line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );
    }
  }

  return rows;
}

/**
 * Expands a Cases cell into the individual IDs it cites. A cell citing none — the dash the new
 * `GET /meetings/:id` row carries until its own task fills it in — expands to `[]`, which is
 * vacuously fine: nothing to check yet, not a violation.
 */
function expandCasesCell(cell: string): string[] {
  const ids: string[] = [];

  for (const match of cell.matchAll(CASES_RANGE_TOKEN)) {
    const [, prefix, left, right] = match;

    if (right === undefined) {
      ids.push(`${prefix}${left}`);
      continue;
    }

    // The right-hand token is bare digits; the prefix and the digit width both come from the
    // left one, or the naive read gives the nonexistent ID `04` instead of `AL-API-04`.
    const width = left.length;
    for (let n = Number(left); n <= Number(right); n += 1) {
      ids.push(`${prefix}${String(n).padStart(width, '0')}`);
    }
  }

  return ids;
}

/** Every case ID that actually appears in some `.cases.md`, scanned across all of `e2e/`. */
function knownCaseIds(root: string): Set<string> {
  const ids = new Set<string>();

  for (const file of walk(root, 'e2e').filter((name) => name.endsWith('.cases.md'))) {
    for (const match of read(root, file).matchAll(CASE_ID_ANYWHERE)) {
      ids.add(match[1]);
    }
  }

  return ids;
}

/**
 * A stage or gate identifier — `FEAT-S1`, `FEAT-G4`, `FIX-S7`, `TUNE-G1`. The flow prefix is four
 * letters or fewer and uppercase, so it cannot collide with a case ID (`HD-API-01`): those carry
 * `-API-`/`-FN-`/`-UT-` in the middle, these carry `-S`/`-G` and a number.
 */
const STAGE_ID_ANYWHERE = /\b([A-Z]{3,4}-[SG]\d{1,2})\b/g;

/** Stage and gate IDs defined by the inventory in `docs/process.md` (ADR-0020). */
function definedStageIds(root: string): Set<string> {
  const ids = new Set<string>();

  for (const match of read(root, PROCESS_DOC).matchAll(STAGE_ID_ANYWHERE)) {
    ids.add(match[1]);
  }

  return ids;
}

/**
 * ADR-0020: a profiling record cites stages by ID so a renamed heading cannot silently break the
 * link between a measurement and the thing measured. A record naming a stage nobody defined is the
 * failure mode, and it is invisible to review — the ID still looks like an ID.
 */
function violationsStageCitations(root: string): string[] {
  const defined = definedStageIds(root);
  const problems: string[] = [];

  for (const file of walk(root, PROFILING_DIR).filter((name) => name.endsWith('.md'))) {
    const cited = new Set<string>();

    for (const match of read(root, file).matchAll(STAGE_ID_ANYWHERE)) {
      cited.add(match[1]);
    }

    for (const id of [...cited].sort()) {
      if (!defined.has(id)) {
        problems.push(
          `${file} cites the stage \`${id}\`, but ${PROCESS_DOC} does not define it. ` +
            'A measurement of a stage nobody declared cannot be compared with anything (ADR-0020)',
        );
      }
    }
  }

  return problems;
}

function violationsCasesCitations(root: string): string[] {
  const problems: string[] = [];
  const known = knownCaseIds(root);

  for (const [method, routePath, , , , casesCell] of contractRouteCells(root)) {
    for (const id of expandCasesCell(casesCell)) {
      if (!known.has(id)) {
        problems.push(
          `${API_CONTRACT} — \`${method}\` \`${routePath}\` cites ${id} in the Cases column, but ` +
            'no `.cases.md` under `e2e/` declares it. A cited ID that does not exist makes the ' +
            'column useless for tracing coverage back from the contract',
        );
      }
    }
  }

  return problems;
}

// --- Agent definitions ------------------------------------------------------------------------

function frontmatterFields(content: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  if (lines[0] !== '---') {
    return fields;
  }

  for (let i = 1; i < lines.length && lines[i] !== '---'; i += 1) {
    const match = /^([a-z]+):\s*(.+)$/.exec(lines[i]);
    if (match !== null) {
      fields.set(match[1], match[2].trim());
    }
  }

  return fields;
}

function violationsAgentDefinitions(root: string): string[] {
  const problems: string[] = [];

  for (const name of agentFiles(root)) {
    const fields = frontmatterFields(read(root, `${AGENTS_DIR}/${name}`));

    for (const field of AGENT_REQUIRED_FIELDS) {
      if (!fields.has(field)) {
        problems.push(
          `${AGENTS_DIR}/${name} — no "${field}" in the frontmatter. A role whose tools or model ` +
            'are left to the caller is a role with no boundary (ADR-0014)',
        );
      }
    }

    const declared = fields.get('name');
    const expected = name.replace(/\.md$/, '');
    if (declared !== undefined && declared !== expected) {
      problems.push(
        `${AGENTS_DIR}/${name} — the frontmatter name is "${declared}" but the file is ` +
          `"${expected}". The filename is what the dispatcher addresses`,
      );
    }
  }

  return problems;
}

/**
 * Roles named in the first column of the roles table in the `team-roles` skill.
 *
 * Reading the table rather than filtering names by prefix. The first version of this check kept only
 * `tester-*` and `implementer-*`, so the research and design families added later would have been
 * skipped — the case would have gone on passing while covering less of the skill than it claimed.
 * That is the "vacuously green" failure the suite meta-test names, arriving through a filter instead
 * of a moved directory.
 */
function rolesNamedInSkill(root: string): string[] {
  const named: string[] = [];

  for (const line of read(root, TEAM_ROLES_SKILL).split(/\r?\n/)) {
    const cell = /^\|\s*`([a-z][a-z-]*)`\s*\|/.exec(line);
    if (cell !== null) {
      named.push(cell[1]);
    }
  }

  return [...new Set(named)];
}

function violationsRolesExist(root: string): string[] {
  const defined = new Set(agentFiles(root).map((name) => name.replace(/\.md$/, '')));

  return rolesNamedInSkill(root)
    .filter((role) => !defined.has(role))
    .map(
      (role) =>
        `${TEAM_ROLES_SKILL} names the role \`${role}\`, but ${AGENTS_DIR}/${role}.md does not ` +
        'exist. A role that cannot be dispatched is a paragraph, not a boundary',
    );
}

/**
 * The other direction: a definition on disk that the roles table never mentions.
 *
 * One-way checks let each half rot in turn — a role nobody can find in the skill is a role nobody
 * dispatches, and it will drift from the flow it was written for.
 */
function violationsRolesDocumented(root: string): string[] {
  const named = new Set(rolesNamedInSkill(root));

  return agentFiles(root)
    .map((name) => name.replace(/\.md$/, ''))
    .filter((role) => !named.has(role))
    .map(
      (role) =>
        `${AGENTS_DIR}/${role}.md exists, but the roles table in ${TEAM_ROLES_SKILL} does not ` +
        'name it. A role nobody can find in the contract is a role nobody dispatches',
    );
}

// --- Tests ------------------------------------------------------------------------------------

test.describe('Architecture corpus', { tag: '@architecture' }, () => {
  test('walk self-check — the scanner finds the corpus, the controllers and the agents', () => {
    const root = repoRoot();

    // Without this, a moved directory makes every rule below pass having checked nothing — the
    // exact failure mode that once made suite-integrity green under any violation.
    expect(adrFiles(root).length, `No ADR records found under ${ADR_DIR}`).toBeGreaterThan(0);
    expect(codeRoutes(root).length, `No routes found under ${CONTROLLERS_DIR}`).toBeGreaterThan(0);
    expect(
      agentFiles(root).length,
      `No agent definitions found under ${AGENTS_DIR}`,
    ).toBeGreaterThan(0);
    expect(
      documentedRoutes(root).length,
      `No Routes table found in ${API_CONTRACT}`,
    ).toBeGreaterThan(0);
  });

  test('AR-API-01 — ADR files are named ADR-NNNN-slug.md and numbers are unique', () => {
    expect(
      violationsAdrNaming(repoRoot()),
      'A reused number makes every plan citing it ambiguous',
    ).toEqual([]);
  });

  test('AR-API-02 — every ADR has a heading, a known status and the three sections', () => {
    expect(
      violationsAdrShape(repoRoot()),
      'A record without Context, Decision and Consequences cannot be re-judged later',
    ).toEqual([]);
  });

  test('AR-API-03 — the ADR index and the directory agree in both directions', () => {
    expect(
      violationsAdrIndex(repoRoot()),
      'A record missing from the index is invisible; a row without a file is a dead link',
    ).toEqual([]);
  });

  test('AR-API-04 — superseded records link to their replacement, and back', () => {
    expect(
      violationsAdrSupersession(repoRoot()),
      'A decision replaced by nothing in particular is just a deleted decision',
    ).toEqual([]);
  });

  test('AR-API-05 — every controller route is in the API contract, and the other way round', () => {
    expect(
      violationsContractDrift(repoRoot()),
      'This is the place documentation usually rots: the code moves and the prose stays',
    ).toEqual([]);
  });

  test('AR-API-06 — every guarded route is listed in PROTECTED_ROUTES', () => {
    expect(
      violationsProtectedList(repoRoot()),
      'Forget a line and the security suite silently stops covering the new route (invariant 16)',
    ).toEqual([]);
  });

  test('AR-API-07 — every agent definition declares name, description, tools and model', () => {
    expect(
      violationsAgentDefinitions(repoRoot()),
      'A role whose tools are left to the caller has no boundary — only a request (ADR-0014)',
    ).toEqual([]);
  });

  test('AR-API-08 — the roles table and the agent definitions agree in both directions', () => {
    const root = repoRoot();

    // Guard against the filter going vacuous: the table must be found at all.
    expect(
      rolesNamedInSkill(root).length,
      `No role rows parsed out of ${TEAM_ROLES_SKILL} — the check would pass having read nothing`,
    ).toBeGreaterThan(0);

    expect(
      [...violationsRolesExist(root), ...violationsRolesDocumented(root)],
      'A role named but undefined cannot be dispatched; one defined but unnamed is unreachable',
    ).toEqual([]);
  });

  test('AR-API-09 — every ID cited in the Routes table Cases column exists in a cases doc', () => {
    const root = repoRoot();
    const cited = contractRouteCells(root).flatMap((cells) => expandCasesCell(cells[5]));

    // Guard against the range parser matching nothing and every row passing having checked
    // nothing: `POST /auth/login` alone expands to eight IDs across three ranges.
    expect(
      cited.length,
      'No IDs parsed out of the Routes table Cases column — the range parser matched nothing',
    ).toBeGreaterThan(0);

    expect(
      violationsCasesCitations(root),
      'A cell citing an ID no .cases.md declares is undetectable from the table itself — only a ' +
        'scan of e2e/**/*.cases.md catches it',
    ).toEqual([]);
  });

  test('AR-API-10 — every stage cited in a profiling record exists in the process inventory', () => {
    const root = repoRoot();

    // Guard against the scan going vacuous the way AR-API-09's nearly did: if the inventory parses
    // to nothing, every record passes while nothing is compared.
    expect(
      definedStageIds(root).size,
      `No stage ids parsed out of ${PROCESS_DOC} — the check would pass having read nothing`,
    ).toBeGreaterThan(0);

    expect(
      violationsStageCitations(root),
      'A profiling record citing an undefined stage measures something nobody can find (ADR-0020)',
    ).toEqual([]);
  });
});

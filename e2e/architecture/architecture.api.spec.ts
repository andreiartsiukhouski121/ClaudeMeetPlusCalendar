import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  FACT_BLOCKS,
  FACT_DEFINITION_LIST,
  FACT_KEY_ANYWHERE,
  RATIONALE_OPENER,
  allRetiredFacts,
  allStatedFacts,
  lockDifferences,
  maskedLines,
  blockFiles,
  factKey,
  hasSourceToken,
  parseRetiredRegister,
  statedFacts,
  type RetiredFact,
} from '../../scripts/facts-parse.mjs';

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

/* ------------------- Corpus fact keys and their lifecycle (ADR-0021, ADR-0022) ------------------- */

/**
 * `ADR-0021`: every statement of fact in the corpus carries a `FACT-NNNN` key and names its source,
 * and anything without a key is reasoning that must not be cited as fact. `ADR-0022`: a fact is
 * appended and retired, never deleted and never rewritten in place under the same key.
 *
 * The parsing lives in `scripts/facts-parse.mjs`, which `pnpm fact:lock` reads through too. A second
 * parser here would be the drift `FX-023` and `FX-027` record: the lock would bless a shape these
 * rules reject.
 *
 * What these rules check is form, not truth — the same line every other rule here draws. A key and a
 * source make a statement addressable and traceable; whether the source says what the statement
 * claims is review's job.
 *
 * The failure modes they catch are the invisible ones: two facts sharing a number; a fact stated
 * with nothing behind it; a key inside a rationale block, which would make reasoning citable as
 * fact; a reference to a key nobody defines; a fact deleted outright, so every reference held
 * outside this repository points at nothing; and a statement rewritten under its old key, which is
 * worse than deletion because every reference still resolves.
 */

/** Live documents must cite live facts; these keep records of what was true when written. */
const HISTORICAL_DIRS = ['docs/plans', 'docs/profiling'];

/** Where a `FACT-` reference may appear outside the corpus. */
const FACT_REFERENCE_SCAN = ['docs', 'e2e', '.claude', 'scripts'];

function violationsFactKeys(root: string): string[] {
  const problems: string[] = [];
  const seen = new Map<number, { file: string; line: number }>();

  for (const block of FACT_BLOCKS) {
    for (const fact of statedFacts(root, block.target)) {
      const key = factKey(fact.number);
      const first = seen.get(fact.number);

      if (first !== undefined) {
        problems.push(
          `${fact.file}:${fact.line} defines ${key}, already defined at ${first.file}:${first.line}. ` +
            'A number shared by two facts makes every reference to it ambiguous, and references ' +
            'are held outside this repository too (ADR-0021)',
        );
        continue;
      }
      seen.set(fact.number, { file: fact.file, line: fact.line });

      if (fact.number < block.from || fact.number > block.to) {
        problems.push(
          `${fact.file}:${fact.line} defines ${key}, outside this document's block ` +
            `${block.from}-${block.to}. Take the next free number with \`pnpm fact:next\` (ADR-0021)`,
        );
      }
    }
  }

  return problems;
}

function violationsFactSources(root: string): string[] {
  const problems: string[] = [];

  for (const fact of allStatedFacts(root)) {
    const key = factKey(fact.number);
    // The key itself is a `FACT-` token; it must not count as its own source.
    const withoutKey = fact.scope.split(`\`${key}\``).join('');

    if (!hasSourceToken(withoutKey)) {
      problems.push(
        `${fact.file}:${fact.line} — ${key} states a fact and names no source. A statement that ` +
          'cannot be traced is an inference wearing a key: give it a path, a case ID, an ADR, a ' +
          'ledger entry, an invariant, a probe, or move it into a rationale block (ADR-0021)',
      );
    }
  }

  return problems;
}

function violationsFactsInRationale(root: string): string[] {
  const problems: string[] = [];

  for (const block of FACT_BLOCKS) {
    for (const file of blockFiles(root, block.target)) {
      const lines = maskedLines(read(root, file));
      let inRationale = false;

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];

        if (RATIONALE_OPENER.test(line)) {
          inRationale = true;
        } else if (!line.trimStart().startsWith('>')) {
          inRationale = false;
        }

        if (!inRationale) {
          continue;
        }

        const listMatch = FACT_DEFINITION_LIST.exec(line.replace(/^\s*>\s?/, ''));
        if (listMatch !== null) {
          problems.push(
            `${file}:${i + 1} defines FACT-${listMatch[1]} inside a rationale block. A rationale ` +
              'block is reasoning and carries no keys — keying it makes it citable as fact, which ' +
              'is the separation ADR-0021 exists to draw',
          );
        }
      }
    }
  }

  return problems;
}

/** A register row opens with its key in the first cell, the shape `parseRetiredRegister` reads. */
const FACT_REGISTER_ROW = /^\s*\|\s*`FACT-(\d{4})`\s*\|/;

/**
 * Whether a line is the register's own record of a retired key — in either form a register can
 * take — rather than a reference to it. Its statement is kept exactly as it last stood (`ADR-0022`),
 * so the keys it cites may be retired too (`BL-062`).
 */
function isRegisterRow(line: string, retired: Map<number, unknown>): boolean {
  const key = FACT_DEFINITION_LIST.exec(line)?.[1] ?? FACT_REGISTER_ROW.exec(line)?.[1];
  return key !== undefined && retired.has(Number(key));
}

/**
 * A reference must resolve. In a living document it must resolve to a *stated* fact: pointing at a
 * retired key is how a document goes on relying on something the corpus withdrew. A historical
 * record — a change folder, a profiling run — may point at a retired key, because it records what
 * was true when it was written and editing it would falsify the record (`ADR-0011`).
 */
function violationsFactReferences(root: string): string[] {
  const problems: string[] = [];
  const stated = new Set(allStatedFacts(root).map((fact) => fact.number));
  const retired = new Map(allRetiredFacts(root).map((row) => [row.number, row]));

  for (const dir of FACT_REFERENCE_SCAN) {
    for (const file of walk(root, dir).filter((name) => name.endsWith('.md'))) {
      const historical = HISTORICAL_DIRS.some((prefix) => file.startsWith(prefix));
      const lines = maskedLines(read(root, file));

      for (let i = 0; i < lines.length; i += 1) {
        // A register row is the record of a retired key, not a reference to it.
        if (isRegisterRow(lines[i], retired)) {
          continue;
        }

        for (const match of lines[i].matchAll(FACT_KEY_ANYWHERE)) {
          const number = Number(match[1]);

          if (stated.has(number)) {
            continue;
          }

          const row = retired.get(number);
          if (row === undefined) {
            problems.push(
              `${file}:${i + 1} cites ${factKey(number)}, which the corpus does not define. A ` +
                'reference to a withdrawn or mistyped key looks exactly like a good one, and that ' +
                'is how a retired fact goes on being relied upon (ADR-0021)',
            );
            continue;
          }

          if (historical || file === row.file) {
            continue;
          }

          const successor =
            row.supersededBy === null ? 'nothing replaces it' : `see ${factKey(row.supersededBy)}`;
          problems.push(
            `${file}:${i + 1} cites ${factKey(number)}, which is ${row.status} — ${successor}. A ` +
              'living document cites a living fact; only a change folder or a profiling record may ' +
              'keep pointing at what was true when it was written (ADR-0022)',
          );
        }
      }
    }
  }

  return problems;
}

/**
 * Retirement integrity, as a pure function of the register and the live keys, so `AR-API-17` can
 * drive it with a fixture. Until the corpus has its first retirement a rule reading only real
 * documents would pass having parsed nothing — the vacuous-green class `ADR-0010` exists to close.
 */
export function violationsRetirement(retired: RetiredFact[], stated: Set<number>): string[] {
  const problems: string[] = [];
  const retiredNumbers = new Set(retired.map((row) => row.number));

  for (const row of retired) {
    const key = factKey(row.number);

    if (row.status === 'bad') {
      problems.push(
        `${row.file}:${row.line} — ${key} carries the status "${row.rawStatus}". A register row is ` +
          'either `retired by FACT-NNNN` or `withdrawn` (ADR-0022)',
      );
      continue;
    }

    if (stated.has(row.number)) {
      problems.push(
        `${row.file}:${row.line} — ${key} is both retired and still stated in the body of a ` +
          'document. A retired fact leaves the body; the register is where it survives (ADR-0022)',
      );
    }

    if (!row.recordedIn || row.recordedIn === '—') {
      problems.push(
        `${row.file}:${row.line} — ${key} names nothing that recorded its retirement. A ledger ` +
          'entry, an ADR or a commit, or the retirement is an edit nobody agreed to (ADR-0022)',
      );
    }

    if (row.status === 'withdrawn') {
      continue;
    }

    const successor = row.supersededBy;
    if (successor === null) {
      problems.push(
        `${row.file}:${row.line} — ${key} is retired and names no successor. A fact is closed by ` +
          'naming the key that replaces it, or it is `withdrawn` (ADR-0022)',
      );
      continue;
    }

    if (!stated.has(successor)) {
      problems.push(
        `${row.file}:${row.line} — ${key} names ${factKey(successor)} as its successor, and the ` +
          `corpus does not state it${retiredNumbers.has(successor) ? ' — that key is itself retired' : ''}. ` +
          'A chain of retirements that ends nowhere leaves the reader with no current fact (ADR-0022)',
      );
    }
  }

  return problems;
}

/**
 * A register with one good row and four broken ones, used by `AR-API-17`. It is written here rather
 * than in a file under `docs/` because it must never be mistaken for part of the corpus.
 */
const RETIREMENT_FIXTURE = [
  '# Fixture',
  '',
  '## Retired facts',
  '',
  '| Key         | Stated                     | Status                 | Recorded in |',
  '| ----------- | -------------------------- | ---------------------- | ----------- |',
  '| `FACT-1900` | a fact that was replaced   | `retired by FACT-1901` | `CH-024`    |',
  '| `FACT-1902` | a fact whose heir is gone  | `retired by FACT-1999` | `CH-024`    |',
  '| `FACT-1903` | a fact retired into a void | `retired by FACT-1904` | `CH-024`    |',
  '| `FACT-1904` | itself retired             | `withdrawn`            | `FX-041`    |',
  '| `FACT-1905` | a withdrawal nobody logged | `withdrawn`            | —           |',
  '',
].join('\n');

/* ------------------- Import boundary of domain/ and application/ (FACT-3732, FACT-3733) ------------------- */

const SOURCE_ROOT = 'apps/api/src';
const BOUNDED_LAYERS = ['domain', 'application'] as const;

/**
 * Every static form that names a module: `import … from`, `import type … from`, `export … from`
 * (named and `*`), a bare `import '…'`, and a dynamic `import('…')`. One alternation so a source
 * yields its specifiers in source order and no statement is counted twice. The `from` forms take
 * their clause from a closed shape (`*`, braces, a default name) rather than `[^;]*`, so one
 * statement cannot swallow the next. Braces may span lines.
 */
const SPECIFIER_FORMS = new RegExp(
  [
    String.raw`\b(?:import|export)\s*(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\}|[\w$]+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[\w$]+))?)\s*from\s*(['"])([^'"]+)\1`,
    String.raw`\bimport\s*(['"])([^'"]+)\3`,
    String.raw`\bimport\s*\(\s*(['"])([^'"]+)\5\s*\)`,
  ].join('|'),
  'g',
);

/** Blanks comments (keeping string contents), so an import quoted in a comment is not an import. */
function withoutComments(source: string): string {
  let out = '';
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') {
        i += 1;
      }
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      out += ' ';
    } else if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) {
        j += source[j] === '\\' ? 2 : 1;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += ch;
      i += 1;
    }
  }

  return out;
}

/** The one extractor: the walk and the fixture both go through it (FACT-3733). */
function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];

  for (const match of withoutComments(source).matchAll(SPECIFIER_FORMS)) {
    specifiers.push(match[2] ?? match[4] ?? match[6]);
  }

  return specifiers;
}

/** Repo-relative, forward-slash form of a path, whichever separator the OS produced. */
function posixPath(file: string): string {
  return file.replace(/\\/g, '/');
}

/**
 * Why one specifier is outside the allow-list, or `null` when it is admitted. `file` is the
 * repo-relative path of the importing file; relative specifiers are resolved against its own
 * directory on the posix form of both, so Windows separators cannot change the verdict.
 */
function importObjection(file: string, specifier: string): string | null {
  const normalFile = posixPath(file);
  const location = new RegExp(`^${SOURCE_ROOT}/([^/]+)/(domain|application)/`).exec(normalFile);

  if (location === null) {
    return `${normalFile} imports '${specifier}', but the file is not under a module's domain/ or application/`;
  }

  const [, moduleName, layer] = location;
  const reachable = layer === 'domain' ? ['domain'] : ['domain', 'application'];
  const normalSpecifier = posixPath(specifier);

  if (normalSpecifier.startsWith('node:')) {
    return null;
  }
  if (normalSpecifier === 'vitest' && normalFile.endsWith('.spec.ts')) {
    return null;
  }

  if (normalSpecifier.startsWith('.')) {
    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(normalFile), normalSpecifier),
    );
    // FACT-3732: each shared prefix is admitted only from its own layer, and compared as the
    // directory plus '/', so `shared/application-x/` is not inside `shared/application/`.
    const sharedKernel = layer === 'domain' ? ['domain'] : ['domain', 'application'];
    const bases = [
      ...reachable.map((dir) => `${SOURCE_ROOT}/${moduleName}/${dir}`),
      ...sharedKernel.map((dir) => `${SOURCE_ROOT}/shared/${dir}`),
    ];
    const inside = bases.some((base) => resolved === base || resolved.startsWith(`${base}/`));

    if (inside) {
      return null;
    }
    return (
      `${normalFile} imports '${specifier}' (resolves to ${resolved}), outside this module's ` +
      `${reachable.map((dir) => `${dir}/`).join(' and ')} and the shared ` +
      `${sharedKernel.map((dir) => `${dir}/`).join(' and ')}`
    );
  }

  return (
    `${normalFile} imports '${specifier}', which is neither a node: built-in nor a relative path ` +
    `inside the module${normalSpecifier === 'vitest' ? ' (vitest is for *.spec.ts only)' : ''}`
  );
}

function importObjections(file: string, source: string): string[] {
  return importSpecifiers(source).flatMap((specifier) => {
    const objection = importObjection(file, specifier);
    return objection === null ? [] : [objection];
  });
}

/**
 * What reads the clock or randomness (FACT-3738, FACT-0071). `new Date(value)` parses a value and
 * reads no clock, so only the empty call is listed. Matched on the comment-blanked source.
 */
const CLOCK_AND_RANDOMNESS: { form: string; pattern: RegExp }[] = [
  { form: 'new Date()', pattern: /\bnew\s+Date\s*\(\s*\)/g },
  { form: 'Date.now(', pattern: /\bDate\s*\.\s*now\s*\(/g },
  { form: 'performance.now(', pattern: /\bperformance\s*\.\s*now\s*\(/g },
  { form: 'Math.random(', pattern: /\bMath\s*\.\s*random\s*\(/g },
  { form: 'randomUUID', pattern: /\brandomUUID\b/g },
  { form: 'getRandomValues', pattern: /\bgetRandomValues\b/g },
];

/** One objection per occurrence, naming the file and the form; spec files are exempt. */
function clockObjections(file: string, source: string): string[] {
  const normalFile = posixPath(file);
  if (normalFile.endsWith('.spec.ts')) {
    return [];
  }

  const code = withoutComments(source);
  const imports = importSpecifiers(source)
    .filter((specifier) => specifier === 'node:crypto')
    .map((specifier) => `${normalFile} imports '${specifier}'`);
  const calls = CLOCK_AND_RANDOMNESS.flatMap(({ form, pattern }) =>
    [...code.matchAll(pattern)].map(() => `${normalFile} reads the clock or randomness: ${form}`),
  );

  return [...imports, ...calls];
}

const CLOCK_CONTROLS: { name: string; file: string; source: string; objections: number }[] = [
  {
    name: 'node:crypto import',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: "import { randomUUID } from 'node:crypto';",
    objections: 2,
  },
  {
    name: 'new Date()',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const t = new Date();',
    objections: 1,
  },
  {
    name: 'Date.now()',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const t = Date.now();',
    objections: 1,
  },
  {
    name: 'performance.now()',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const t = performance.now();',
    objections: 1,
  },
  {
    name: 'Math.random()',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const r = Math.random();',
    objections: 1,
  },
  {
    name: 'global crypto.randomUUID()',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const id = crypto.randomUUID();',
    objections: 1,
  },
  {
    name: 'global crypto.getRandomValues()',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'crypto.getRandomValues(buffer);',
    objections: 1,
  },
  {
    name: 'spaced new Date ( ) in application/',
    file: 'apps/api/src/meeting-files/application/x.ts',
    source: 'const now = new Date ( );',
    objections: 1,
  },
  {
    name: 'new Date(value) parses, reads no clock',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const at = new Date(stored.uploadedAt);',
    objections: 0,
  },
  {
    name: 'an instant passed in',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: 'const at = input.now.toISOString();',
    objections: 0,
  },
  {
    name: 'a comment',
    file: 'apps/api/src/meeting-files/domain/x.ts',
    source: '// never Date.now() here\nconst a = 1;',
    objections: 0,
  },
  {
    name: 'a spec file',
    file: 'apps/api/src/meeting-files/domain/x.spec.ts',
    source: 'const t = new Date();\nconst r = Math.random();',
    objections: 0,
  },
];

/** Every `.ts` file under a module's `domain/` and `application/`, repo-relative, posix form. */
function boundedFiles(root: string): string[] {
  const modulesDir = path.join(root, ...SOURCE_ROOT.split('/'));
  const files: string[] = [];

  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    for (const layer of BOUNDED_LAYERS) {
      for (const rel of walk(root, `${SOURCE_ROOT}/${entry.name}/${layer}`)) {
        if (rel.endsWith('.ts')) {
          files.push(posixPath(path.relative(root, path.join(root, rel))));
        }
      }
    }
  }

  return files.sort();
}

const MF = `${SOURCE_ROOT}/meeting-files`;

interface BoundaryControl {
  name: string;
  file: string;
  source: string;
  specifier: string;
  forbidden: boolean;
}

/**
 * In-memory sources with pretended paths, kept here and never under `apps/api/src`, so the
 * mechanism is proved with or without real files (`FACT-3504`). Seventeen forbidden, nine allowed (FACT-3733).
 */
const BOUNDARY_CONTROLS: BoundaryControl[] = [
  {
    name: 'domain: value import from @nestjs/common',
    file: `${MF}/domain/x.ts`,
    source: "import { Injectable } from '@nestjs/common';",
    specifier: '@nestjs/common',
    forbidden: true,
  },
  {
    name: 'domain: import type from express',
    file: `${MF}/domain/x.ts`,
    source: "import type { Response } from 'express';",
    specifier: 'express',
    forbidden: true,
  },
  {
    name: 'domain: export * from @nestjs/common',
    file: `${MF}/domain/x.ts`,
    source: "export * from '@nestjs/common';",
    specifier: '@nestjs/common',
    forbidden: true,
  },
  {
    name: 'domain: named re-export from @prisma/client',
    file: `${MF}/domain/x.ts`,
    source: "export { PrismaClient } from '@prisma/client';",
    specifier: '@prisma/client',
    forbidden: true,
  },
  {
    name: 'domain: bare import of reflect-metadata',
    file: `${MF}/domain/x.ts`,
    source: "import 'reflect-metadata';",
    specifier: 'reflect-metadata',
    forbidden: true,
  },
  {
    name: 'domain: multi-line import from @nestjs/common',
    file: `${MF}/domain/x.ts`,
    source: "import {\n  Injectable,\n  Inject,\n} from '@nestjs/common';",
    specifier: '@nestjs/common',
    forbidden: true,
  },
  {
    name: 'domain: dynamic import of express',
    file: `${MF}/domain/x.ts`,
    source: "const loaded = await import('express');",
    specifier: 'express',
    forbidden: true,
  },
  {
    name: 'domain: relative import into infrastructure/',
    file: `${MF}/domain/x.ts`,
    source: "import { Adapter } from '../infrastructure/prisma-meeting-file.repository';",
    specifier: '../infrastructure/prisma-meeting-file.repository',
    forbidden: true,
  },
  {
    name: 'domain: relative import into application/',
    file: `${MF}/domain/x.ts`,
    source: "import { UseCase } from '../application/upload-meeting-file';",
    specifier: '../application/upload-meeting-file',
    forbidden: true,
  },
  {
    name: "domain: relative import into another module's domain/",
    file: `${MF}/domain/x.ts`,
    source: "import { Meeting } from '../../meetings/domain/meeting';",
    specifier: '../../meetings/domain/meeting',
    forbidden: true,
  },
  {
    name: 'domain: vitest in a file that is not a spec',
    file: `${MF}/domain/x.ts`,
    source: "import { expect } from 'vitest';",
    specifier: 'vitest',
    forbidden: true,
  },
  {
    name: 'application: relative import into infrastructure/',
    file: `${MF}/application/x.ts`,
    source: "import { Adapter } from '../infrastructure/prisma-meeting-file.repository';",
    specifier: '../infrastructure/prisma-meeting-file.repository',
    forbidden: true,
  },
  {
    name: 'application: relative import of the module root file',
    file: `${MF}/application/x.ts`,
    source: "import { MeetingFilesModule } from '../meeting-files.module';",
    specifier: '../meeting-files.module',
    forbidden: true,
  },
  {
    name: 'domain: relative import of the application kernel',
    file: `${MF}/domain/x.ts`,
    source: "import { Port } from '../../shared/application/port';",
    specifier: '../../shared/application/port',
    forbidden: true,
  },
  {
    name: 'application: relative import of the infrastructure kernel',
    file: `${MF}/application/x.ts`,
    source: "import { SystemClock } from '../../shared/infrastructure/system-clock';",
    specifier: '../../shared/infrastructure/system-clock',
    forbidden: true,
  },
  {
    name: 'shared domain kernel: relative import into application/',
    file: `${SOURCE_ROOT}/shared/domain/x.ts`,
    source: "import { Port } from '../application/port';",
    specifier: '../application/port',
    forbidden: true,
  },
  {
    name: 'shared application kernel: relative import into infrastructure/',
    file: `${SOURCE_ROOT}/shared/application/x.ts`,
    source: "import { SystemClock } from '../infrastructure/system-clock';",
    specifier: '../infrastructure/system-clock',
    forbidden: true,
  },
  {
    name: 'domain: node: built-in',
    file: `${MF}/domain/x.ts`,
    source: "import { randomUUID } from 'node:crypto';",
    specifier: 'node:crypto',
    forbidden: false,
  },
  {
    name: 'domain: sibling file in domain/',
    file: `${MF}/domain/x.ts`,
    source: "import { fileName } from './file-name';",
    specifier: './file-name',
    forbidden: false,
  },
  {
    name: 'application: import from the same module domain/',
    file: `${MF}/application/x.ts`,
    source: "import { MeetingFile } from '../domain/meeting-file';",
    specifier: '../domain/meeting-file',
    forbidden: false,
  },
  {
    name: 'application: sibling file in application/',
    file: `${MF}/application/x.ts`,
    source: "import { MeetingFileRepository } from './meeting-file.repository';",
    specifier: './meeting-file.repository',
    forbidden: false,
  },
  {
    name: 'domain: vitest in a *.spec.ts',
    file: `${MF}/domain/x.spec.ts`,
    source: "import { expect } from 'vitest';",
    specifier: 'vitest',
    forbidden: false,
  },
  {
    name: 'domain: import from the domain kernel',
    file: `${MF}/domain/x.ts`,
    source: "import { Id } from '../../shared/domain/id';",
    specifier: '../../shared/domain/id',
    forbidden: false,
  },
  {
    name: 'application: import from the domain kernel',
    file: `${MF}/application/x.ts`,
    source: "import { Id } from '../../shared/domain/id';",
    specifier: '../../shared/domain/id',
    forbidden: false,
  },
  {
    name: 'shared application kernel: relative import of the domain kernel',
    file: `${SOURCE_ROOT}/shared/application/x.ts`,
    source: "import { Id } from '../domain/id';",
    specifier: '../domain/id',
    forbidden: false,
  },
  {
    name: 'application: import from the application kernel',
    file: `${MF}/application/x.ts`,
    source: "import { Port } from '../../shared/application/port';",
    specifier: '../../shared/application/port',
    forbidden: false,
  },
];

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

  test('AR-API-11 — every corpus fact key is unique and inside its document block', () => {
    const root = repoRoot();

    // Guard against the parser matching nothing and every rule below passing vacuously — the exact
    // failure `suite-integrity` once had.
    expect(
      allStatedFacts(root).length,
      'No FACT- definitions parsed out of the corpus — the check would pass having read nothing',
    ).toBeGreaterThan(0);

    expect(
      violationsFactKeys(root),
      'Two facts on one number make every citation of it ambiguous, including the ones held ' +
        'outside this repository (ADR-0021)',
    ).toEqual([]);
  });

  test('AR-API-12 — every keyed fact names a source', () => {
    expect(
      violationsFactSources(repoRoot()),
      'A keyed statement with nothing behind it is how an inference enters the corpus as a fact ' +
        '(ADR-0021)',
    ).toEqual([]);
  });

  test('AR-API-13 — no fact key is defined inside a rationale block', () => {
    expect(
      violationsFactsInRationale(repoRoot()),
      'Rationale is reasoning, and keying it makes it citable as fact — the separation ADR-0021 ' +
        'exists to draw',
    ).toEqual([]);
  });

  test('AR-API-14 — every FACT- reference resolves, and living documents cite living facts', () => {
    const retired = new Map([[1901, {}]]);
    expect(
      isRegisterRow('| `FACT-1901` | cites `FACT-1902` | `retired by FACT-1903` | x |', retired),
    ).toBe(true);
    expect(isRegisterRow('- `FACT-1901` cites `FACT-1902`', retired)).toBe(true);
    expect(isRegisterRow('| `FACT-1904` | a live row | x |', retired)).toBe(false);
    expect(isRegisterRow('| Pattern | cites `FACT-1901` | x |', retired)).toBe(false);

    expect(
      violationsFactReferences(repoRoot()),
      'A reference to a withdrawn or mistyped key is indistinguishable from a good one by eye ' +
        '(ADR-0021, ADR-0022)',
    ).toEqual([]);
  });

  test('AR-API-15 — the fact lock and the corpus agree: nothing deleted, added or reworded silently', () => {
    expect(
      lockDifferences(repoRoot()),
      'A fact is never deleted and never rewritten under its own key. Run `pnpm fact:lock` when ' +
        'the words changed but the fact did not, and retire-and-replace when the fact changed ' +
        '(ADR-0022)',
    ).toEqual([]);
  });

  test('AR-API-16 — every retired fact names a successor that exists, or a sourced withdrawal', () => {
    const root = repoRoot();
    const stated = new Set(allStatedFacts(root).map((fact) => fact.number));

    expect(
      violationsRetirement(allRetiredFacts(root), stated),
      'A fact closed without naming what replaces it leaves every reader holding an address with ' +
        'no forwarding note (ADR-0022)',
    ).toEqual([]);
  });

  test('AR-API-17 — the retirement register parses, so the two rules above are not vacuous', () => {
    // The corpus has no retirements yet, so AR-API-15 and AR-API-16 would pass having read an empty
    // register. This drives the same parser and the same rule over a register that is deliberately
    // broken in four ways, and requires each one to be reported.
    const rows = parseRetiredRegister(RETIREMENT_FIXTURE, 'docs/fixture.md');

    expect(rows, 'The register parser found no rows in the fixture').toHaveLength(5);
    expect(rows[0].status).toBe('retired');
    expect(rows[0].supersededBy).toBe(1901);
    expect(rows[3].status).toBe('withdrawn');

    const problems = violationsRetirement(rows, new Set([1901]));

    expect(
      problems.map((problem) => problem.replace(/^docs\/fixture\.md:\d+ — /, '').slice(0, 11)),
      'The rule must object to: an heir that does not exist, an heir that is itself retired, and ' +
        'a withdrawal naming nothing that recorded it',
    ).toEqual(['FACT-1902 n', 'FACT-1903 n', 'FACT-1905 n']);
  });

  test('AR-API-18 — domain/ and application/ import only what the allow-list admits', async () => {
    const root = repoRoot();

    await test.step('fixture: each source yields exactly its one specifier', () => {
      for (const control of BOUNDARY_CONTROLS) {
        expect(importSpecifiers(control.source), `extractor on "${control.name}"`).toEqual([
          control.specifier,
        ]);
      }
    });

    await test.step('fixture: every forbidden form is objected to, naming file and specifier', () => {
      const forbidden = BOUNDARY_CONTROLS.filter((control) => control.forbidden);
      expect(forbidden, 'the fixture holds seventeen forbidden sources').toHaveLength(17);

      for (const control of forbidden) {
        const objections = importObjections(control.file, control.source);

        expect(objections, `"${control.name}" must raise exactly one objection`).toHaveLength(1);
        expect(objections[0], `objection for "${control.name}" names the file`).toContain(
          control.file,
        );
        expect(objections[0], `objection for "${control.name}" names the specifier`).toContain(
          `'${control.specifier}'`,
        );
      }
    });

    await test.step('fixture: every allowed form raises nothing', () => {
      const allowed = BOUNDARY_CONTROLS.filter((control) => !control.forbidden);
      expect(allowed, 'the fixture holds nine allowed sources').toHaveLength(9);

      for (const control of allowed) {
        expect(importObjections(control.file, control.source), `"${control.name}"`).toEqual([]);
      }
    });

    const files = boundedFiles(root);
    const judged = files.map((file) => ({
      file,
      specifiers: importSpecifiers(read(root, file)),
    }));

    await test.step('the walk file list', async () => {
      await test.info().attach('walked-files.json', {
        body: JSON.stringify(judged, null, 2),
        contentType: 'application/json',
      });
    });

    await test.step('self-check: the walk found domain/ and application/ files', () => {
      const under = (layer: string) =>
        files.filter((file) => new RegExp(`^${SOURCE_ROOT}/[^/]+/${layer}/`).test(file));

      expect(
        under('domain').length > 0 && under('application').length > 0,
        'no domain/application files found: at least one domain/ file and one application/ file ' +
          `are required, found ${under('domain').length} and ${under('application').length}`,
      ).toBe(true);

      expect(
        judged.flatMap((entry) => entry.specifiers).length,
        'no import specifiers extracted from the walked files',
      ).toBeGreaterThan(0);
    });

    await test.step('the walk reaches the shared kernel', () => {
      expect(
        files.filter((file) => file.startsWith(`${SOURCE_ROOT}/shared/application/`)).length,
        `the walk found no file under ${SOURCE_ROOT}/shared/application/`,
      ).toBeGreaterThan(0);
    });

    await test.step('judgment: every walked file stays inside the allow-list', () => {
      const objections = files.flatMap((file) => importObjections(file, read(root, file)));

      expect(
        objections,
        'domain/ and application/ may import only node: built-ins and their own layers (FACT-3732)',
      ).toEqual([]);
    });
  });

  test('AR-API-19 — domain/ and application/ read no clock and no randomness', async () => {
    const root = repoRoot();

    await test.step('fixture: each forbidden form is objected to, each allowed one is not', () => {
      expect(CLOCK_CONTROLS.filter((control) => control.objections > 0)).toHaveLength(8);
      expect(CLOCK_CONTROLS.filter((control) => control.objections === 0)).toHaveLength(4);

      for (const control of CLOCK_CONTROLS) {
        const objections = clockObjections(control.file, control.source);

        expect(objections, `"${control.name}"`).toHaveLength(control.objections);
        for (const objection of objections) {
          expect(objection, `objection for "${control.name}" names the file`).toContain(
            control.file,
          );
        }
      }
    });

    const judged = boundedFiles(root).filter((file) => !file.endsWith('.spec.ts'));

    await test.step('the walk reaches the shared kernel', () => {
      expect(
        judged.filter((file) => file.startsWith(`${SOURCE_ROOT}/shared/application/`)).length,
        `the walk found no file under ${SOURCE_ROOT}/shared/application/`,
      ).toBeGreaterThan(0);
    });

    await test.step('judgment: no walked file reads the clock or randomness', () => {
      expect(judged.length, 'no non-spec domain/ or application/ file was judged').toBeGreaterThan(
        0,
      );

      expect(
        judged.flatMap((file) => clockObjections(file, read(root, file))),
        'domain/ and application/ get the instant and randomness through ports or arguments ' +
          '(FACT-3738): use Clock / UuidSource',
      ).toEqual([]);
    });
  });
});

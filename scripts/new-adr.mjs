#!/usr/bin/env node
/**
 * Creates an architecture decision record: `pnpm adr:new <slug> [--title "…"]`.
 *
 * Numbering by hand is how two `ADR-0007`s happen, and the ADR meta-test (`AR-API-01`) fails the
 * run when it does. Here the next number comes from the directory, so the collision is impossible
 * rather than merely discouraged.
 *
 * It also appends the index row in `docs/adr/README.md`: `AR-API-03` compares the table against the
 * directory in both directions, so a file created without a row would fail the next `pnpm verify`.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ADR_DIR = 'docs/adr';
const TEMPLATE = 'docs/adr/TEMPLATE.md';
const INDEX = 'docs/adr/README.md';

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

/** The next free number: max on disk plus one. Gaps are never filled — IDs are not reused. */
function nextNumber(root) {
  const numbers = readdirSync(join(root, ADR_DIR))
    .map((name) => /^ADR-(\d{4})-.*\.md$/.exec(name))
    .filter((match) => match !== null)
    .map((match) => Number(match[1]));

  return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

/** `pnpm adr:new session-refresh --title "Refresh tokens"` → "Refresh tokens"; else the slug. */
function titleFrom(args, slug) {
  const flag = args.indexOf('--title');
  if (flag !== -1 && args[flag + 1] !== undefined) {
    return args[flag + 1];
  }

  return slug.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase());
}

const args = process.argv.slice(2);

/** The first bare argument that is not the value of `--title`. */
function slugFrom(list) {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].startsWith('--') || list[i - 1] === '--title') {
      continue;
    }
    return list[i];
  }

  return undefined;
}

const slug = slugFrom(args);

if (slug === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(
    'Usage: pnpm adr:new <slug> [--title "One line"]\n' +
      'slug in kebab-case, naming the decision rather than the task:\n' +
      '  pnpm adr:new refresh-tokens --title "Sessions are refreshed, not re-issued"\n\n' +
      'An ADR is for a choice that constrains later work: module boundaries, the session scheme,\n' +
      'storage, the contract format, a refused dependency. Not for how a function is written.',
  );
  process.exit(1);
}

const root = repoRoot();
const number = String(nextNumber(root)).padStart(4, '0');
const id = `ADR-${number}`;
const fileName = `${id}-${slug}.md`;
const target = join(root, ADR_DIR, fileName);

if (existsSync(target)) {
  console.error(`${ADR_DIR}/${fileName} already exists.`);
  process.exit(1);
}

const title = titleFrom(args, slug);
const today = new Date().toISOString().slice(0, 10);

const body = readFileSync(join(root, TEMPLATE), 'utf8')
  .replace('# ADR-NNNN — <decision in one line>', `# ${id} — ${title}`)
  .replace('- **Date:** <YYYY-MM-DD>', `- **Date:** ${today}`);

writeFileSync(target, body, { encoding: 'utf8' });

// The index row goes at the end of the table: the log reads in decision order, oldest first.
const index = readFileSync(join(root, INDEX), 'utf8');
const rows = index.split(/\r?\n/);
const lastRow = rows.reduce((found, line, i) => (/^\| \[ADR-\d{4}\]/.test(line) ? i : found), -1);

if (lastRow === -1) {
  console.error(`No ADR table found in ${INDEX}. Add the row by hand: AR-API-03 checks for it.`);
} else {
  rows.splice(lastRow + 1, 0, `| [${id}](${fileName}) | ${title} | proposed |`);
  writeFileSync(join(root, INDEX), rows.join('\n'), { encoding: 'utf8' });
}

console.log(`Created ${ADR_DIR}/${fileName} and its row in ${INDEX}

Fill Context (what forced the decision, with facts), Decision (what was chosen, and which
alternatives were rejected and why) and Consequences (what it costs and what enforces it).
Set the status to "accepted" once it is agreed — in both the file and the index row.

An ADR is written BEFORE the code it constrains. Written afterwards it is a justification, not a
decision. Cite the ID in section 0 of the plan: pnpm check:orientation reads it.`);

/**
 * The one parser of corpus fact keys (`ADR-0021`, `ADR-0022`).
 *
 * Both `scripts/facts-lock.mjs` and `e2e/architecture/architecture.api.spec.ts` read the corpus
 * through this module. A second parser of the same format is the drift `FX-023` and `FX-027` record:
 * the two would disagree about what a fact is, and the lock would bless a shape the check rejects.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** The blocks, exactly as `ADR-0021` fixes them. */
export const FACT_BLOCKS = [
  { name: 'architecture', from: 1, to: 999, target: 'docs/architecture.md' },
  { name: 'data-model', from: 1000, to: 1999, target: 'docs/data-model.md' },
  { name: 'api-contract', from: 2000, to: 2999, target: 'docs/api-contract.md' },
  { name: 'adr', from: 3000, to: 3999, target: 'docs/adr' },
];

export const FACT_KEY_ANYWHERE = /\bFACT-(\d{4})\b/g;

/** A list-form definition: the key opens the line. */
export const FACT_DEFINITION_LIST = /^\s*-\s+`FACT-(\d{4})`/;

/** A table-form definition: a first or last cell holding nothing but the key. */
const FACT_DEFINITION_CELL = /^`FACT-(\d{4})`$/;

/** A rationale block opens with this marker and carries no keyed facts. */
export const RATIONALE_OPENER = /^\s*>\s*\*\*Rationale/;

/** A table-wide source, declared once above the table and inherited by its rows. */
const BLOCK_SOURCE = /^\s*\*\*Source:\*\*/;

/** The register of keys a document has allocated and no longer states (`ADR-0022`). */
const RETIRED_HEADING = /^##+\s+Retired facts\s*$/;

/** `retired by FACT-1073` or `withdrawn`. */
const RETIRED_STATUS = /^`?retired by\s+FACT-(\d{4})`?$/i;
const WITHDRAWN_STATUS = /^`?withdrawn`?$/i;

/**
 * The citation vocabulary, deliberately the one `research-protocol` already uses (`ADR-0021`): a
 * repository path, a case ID, an ADR, a ledger or backlog entry, another fact, an invariant, a
 * measured probe, a commit, or the record itself for a decision that has no home outside it.
 */
const SOURCE_TOKENS = [
  /`[^`]*\/[^`]*`/,
  /`[A-Z]{2,6}-(?:API|FN|UT|INT)-\d{2,3}`/,
  /`ADR-\d{4}`/,
  /`(?:FT|CH|FX|BL)-\d{3}`/,
  /`FACT-\d{4}`/,
  /`[A-Za-z0-9._-]+\.(?:ts|md|mjs|json|ya?ml)`/,
  /\binvariants?\s+\d+/,
  /\bprobes?\s+[A-Z]+\d*/,
  /\bthis record\b/,
  /\bcommit\s+[0-9a-f]{7,40}\b/,
];

export function hasSourceToken(text) {
  return SOURCE_TOKENS.some((pattern) => pattern.test(text));
}

export function factKey(number) {
  return `FACT-${String(number).padStart(4, '0')}`;
}

/**
 * What the lock pins. Whitespace is collapsed so that a prettier reflow is not a change of
 * statement — only the words are.
 */
export function statementHash(statement) {
  const normalized = statement.replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Splits into lines with everything inside a fenced code block blanked out, keeping the line count
 * so reported positions stay true.
 *
 * A fenced block is an illustration: `ADR-0022` shows the shape of a retirement register, and
 * without this the example would be parsed as five real facts in the wrong block — which is exactly
 * what happened the first time these rules ran.
 */
export function maskedLines(text) {
  const lines = text.split(/\r?\n/);
  let fenced = false;

  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return '';
    }
    return fenced ? '' : line;
  });
}

export function readFile(root, relFile) {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

/** Every markdown file a block covers, whether the block's target is a file or a directory. */
export function blockFiles(root, target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) {
    return [];
  }
  if (fs.statSync(absolute).isFile()) {
    return [target];
  }
  return fs
    .readdirSync(absolute)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => `${target}/${name}`);
}

/** Splits a markdown table row into its trimmed cells. */
function tableCells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/**
 * Every fact a document states, with the text a source may come from and the statement the lock
 * pins. A list item contributes itself and its continuation lines; a table row contributes itself,
 * and inherits the nearest `**Source:**` line above its table for the source check only — the hash
 * covers the row alone, so a reworded block source is not a rewritten fact.
 */
export function statedFacts(root, target) {
  const found = [];

  for (const file of blockFiles(root, target)) {
    const lines = maskedLines(readFile(root, file));
    let blockSource = '';
    let inRetired = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (RETIRED_HEADING.test(line)) {
        inRetired = true;
        continue;
      }
      if (inRetired) {
        if (/^##+\s+/.test(line)) {
          inRetired = false;
        } else {
          continue;
        }
      }

      if (BLOCK_SOURCE.test(line)) {
        blockSource = line;
        continue;
      }

      const listMatch = FACT_DEFINITION_LIST.exec(line);
      if (listMatch !== null) {
        let statement = line;
        for (let j = i + 1; j < lines.length; j += 1) {
          const next = lines[j];
          if (next.trim() === '' || /^\s*[->#|]/.test(next)) {
            break;
          }
          statement += `\n${next}`;
        }
        found.push({
          file,
          line: i + 1,
          number: Number(listMatch[1]),
          statement,
          scope: statement,
        });
        continue;
      }

      if (!line.trimStart().startsWith('|')) {
        continue;
      }

      const cells = tableCells(line);
      if (cells.length < 2) {
        continue;
      }

      for (const edge of [cells[0], cells[cells.length - 1]]) {
        const cellMatch = FACT_DEFINITION_CELL.exec(edge);
        if (cellMatch === null) {
          continue;
        }
        found.push({
          file,
          line: i + 1,
          number: Number(cellMatch[1]),
          statement: line,
          scope: `${blockSource}\n${line}`,
        });
        break;
      }
    }
  }

  return found;
}

export function allStatedFacts(root) {
  return FACT_BLOCKS.flatMap((block) => statedFacts(root, block.target));
}

/**
 * Parses a `## Retired facts` register out of the given markdown text. Exported separately from the
 * file walk so the meta-test can exercise it on a fixture: until the corpus has its first
 * retirement, a rule reading only real documents would pass having parsed nothing (`ADR-0022`).
 */
export function parseRetiredRegister(text, file = '<fixture>') {
  const rows = [];
  const lines = maskedLines(text);
  let inRetired = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (RETIRED_HEADING.test(line)) {
      inRetired = true;
      continue;
    }
    if (!inRetired) {
      continue;
    }
    if (/^##+\s+/.test(line)) {
      inRetired = false;
      continue;
    }
    if (!line.trimStart().startsWith('|')) {
      continue;
    }

    const cells = tableCells(line);
    if (cells.length < 4) {
      continue;
    }

    const keyMatch = FACT_DEFINITION_CELL.exec(cells[0]);
    if (keyMatch === null) {
      continue;
    }

    const [, stated, status, recordedIn] = cells;
    const retiredBy = RETIRED_STATUS.exec(status);

    rows.push({
      file,
      line: i + 1,
      number: Number(keyMatch[1]),
      stated,
      status: retiredBy !== null ? 'retired' : WITHDRAWN_STATUS.test(status) ? 'withdrawn' : 'bad',
      rawStatus: status,
      supersededBy: retiredBy !== null ? Number(retiredBy[1]) : null,
      recordedIn,
    });
  }

  return rows;
}

export function allRetiredFacts(root) {
  return FACT_BLOCKS.flatMap((block) =>
    blockFiles(root, block.target).flatMap((file) =>
      parseRetiredRegister(readFile(root, file), file),
    ),
  );
}

/** Which document a key belongs to, by its block. */
export function blockOf(number) {
  return FACT_BLOCKS.find((block) => number >= block.from && number <= block.to) ?? null;
}

/* ----------------------------- The fact lock (ADR-0022) ----------------------------- */

/**
 * `docs/facts-lock.json` pins every key the corpus has ever allocated, its status, its successor
 * where it has one, and a hash of its statement.
 *
 * It lives here rather than in `facts-lock.mjs` so the meta-test can import the comparison without
 * pulling in a CLI: Playwright transpiles a spec to CJS, and `import.meta` in an imported module
 * fails there. `facts-lock.mjs` keeps the command-line half and nothing else.
 */
export const LOCK_FILE = 'docs/facts-lock.json';

/** The lock as the corpus says it should be. */
export function buildLock(root) {
  const facts = {};

  for (const fact of allStatedFacts(root)) {
    facts[factKey(fact.number)] = {
      status: 'active',
      document: blockOf(fact.number)?.target ?? 'unknown',
      hash: statementHash(fact.statement),
    };
  }

  for (const retired of allRetiredFacts(root)) {
    const entry = {
      status: retired.status,
      document: blockOf(retired.number)?.target ?? 'unknown',
      hash: statementHash(retired.stated),
    };
    if (retired.supersededBy !== null) {
      entry.supersededBy = factKey(retired.supersededBy);
    }
    if (retired.recordedIn) {
      entry.recordedIn = retired.recordedIn;
    }
    facts[factKey(retired.number)] = entry;
  }

  const ordered = {};
  for (const key of Object.keys(facts).sort()) {
    ordered[key] = facts[key];
  }

  return { version: 1, facts: ordered };
}

function readLock(root) {
  const absolute = path.join(root, LOCK_FILE);
  if (!fs.existsSync(absolute)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

/** Every way the corpus and the lock can disagree, in the words a reader needs to act on. */
export function lockDifferences(root) {
  const problems = [];
  const onDisk = readLock(root);

  if (onDisk === null) {
    return [`${LOCK_FILE} is missing. Run \`pnpm fact:lock\` and commit the result (ADR-0022)`];
  }

  const expected = buildLock(root).facts;
  const actual = onDisk.facts ?? {};

  for (const key of Object.keys(actual).sort()) {
    if (expected[key] === undefined) {
      problems.push(
        `${key} is in ${LOCK_FILE} but the corpus neither states nor retires it. A fact is never ` +
          'deleted: retire it in the document\'s "Retired facts" register, naming the key that ' +
          'replaces it (ADR-0022)',
      );
    }
  }

  for (const key of Object.keys(expected).sort()) {
    const want = expected[key];
    const have = actual[key];

    if (have === undefined) {
      problems.push(
        `${key} is stated in the corpus but absent from ${LOCK_FILE}. Run \`pnpm fact:lock\` so ` +
          'the register knows the key exists (ADR-0022)',
      );
      continue;
    }

    if (have.status !== want.status) {
      problems.push(
        `${key} is "${have.status}" in ${LOCK_FILE} and "${want.status}" in the corpus. Run ` +
          '`pnpm fact:lock` after a retirement (ADR-0022)',
      );
    }

    if (have.hash !== want.hash) {
      problems.push(
        `${key} says something different from what ${LOCK_FILE} pinned. If the words changed but ` +
          'the fact did not, run `pnpm fact:lock` so the rewrite is visible in the diff; if the ' +
          'fact changed, retire this key and state the new one under a fresh number (ADR-0022)',
      );
    }
  }

  return problems;
}

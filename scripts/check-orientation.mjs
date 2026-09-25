#!/usr/bin/env node
/**
 * Validates section 0 "Orientation" in every active plan (`docs/plans/*.plan.md`).
 *
 * A standalone script rather than a suite case because `.husky/pre-commit` runs it too, and the
 * hook must finish in milliseconds — no Playwright, no dev servers.
 *
 * It does NOT judge whether a task duplicates another in substance. It proves the orientation was
 * done and written down; review judges the answers. A check pretending to be smarter than it is
 * does more harm than no check at all.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PLANS_DIR = 'docs/plans';

/**
 * One template per workflow (`feature-pipeline`, `bugfix-pipeline`). The list must be complete: it
 * supplies the "field left untouched" baseline, so a template missing here makes its own plans
 * unverifiable — an empty section 0 passes silently. Proven by control experiment when
 * `TEMPLATE-BUGFIX.md` was added.
 */
const TEMPLATES = ['docs/plans/TEMPLATE.md', 'docs/plans/TEMPLATE-BUGFIX.md'];
const PLAN_SUFFIX = '.plan.md';
const LEDGER_FILES = ['docs/CHANGELOG.md', 'docs/BACKLOG.md'];
const ADR_DIR = 'docs/adr';

/** "no" is not an answer; "no: … because …" is. */
const MIN_ANSWER_LENGTH = 20;

/** Non-empty brush-offs. A closed list: a loose heuristic would reject valid short answers. */
const PLACEHOLDERS = [
  '—',
  '-',
  '--',
  '?',
  '??',
  'todo',
  'tbd',
  'n/a',
  'na',
  'no',
  'no.',
  'yes',
  'none',
  'nothing',
  'unknown',
  'not applicable',
  'ok',
  '...',
  '…',
];

/**
 * The five orientation questions.
 *
 * `proof` names the register an answer must lean on: `ledger` for the changelog and the backlog,
 * `adr` for the decision log. A question with `proof: null` is judged in review only.
 *
 * "Architecture impact" exists because the corpus is meant to be read rather than re-derived from
 * code: code shows current behaviour and never the decision behind it (ADR-0015).
 */
const QUESTIONS = [
  { label: 'Duplicate', proof: 'ledger' },
  { label: 'Conflicts with shipped', proof: null },
  { label: 'Conflicts with planned', proof: 'ledger' },
  { label: 'Architecture impact', proof: 'adr' },
  { label: 'Open questions', proof: null },
];

/** Ledger entry ID. */
const LEDGER_ID = /\b(?:FT|CH|FX|BL)-\d{3}\b/g;

/** ADR ID, four digits: `ADR-0007`. */
const ADR_ID = /\bADR-\d{4}\b/g;

/**
 * Explicit denial for ledger-backed questions. Fixed phrasings, not any stray "no" — otherwise the
 * word itself becomes the proof.
 */
const EXPLICIT_NO_MATCH = ['no matches', 'nothing matches', 'found no matches'];

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

/** IDs declared in the ledger: an answer cannot cite an entry that does not exist. */
function declaredLedgerIds(root) {
  const ids = new Set();

  for (const file of LEDGER_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) {
      continue;
    }
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const row = /^\|\s*((?:FT|CH|FX|BL)-\d{3})\s*\|/.exec(line);
      if (row !== null) {
        ids.add(row[1]);
      }
    }
  }

  return ids;
}

/** ADR IDs present on disk: an answer cannot cite a decision that was never written. */
function declaredAdrIds(root) {
  const dir = join(root, ADR_DIR);
  const ids = new Set();

  if (!existsSync(dir)) {
    return ids;
  }

  for (const name of readdirSync(dir)) {
    const match = /^(ADR-\d{4})-.*\.md$/.exec(name);
    if (match !== null) {
      ids.add(match[1]);
    }
  }

  return ids;
}

function activePlans(root) {
  const dir = join(root, PLANS_DIR);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((name) => name.endsWith(PLAN_SUFFIX))
    .map((name) => `${PLANS_DIR}/${name}`);
}

/** Text after `- **Label:**` up to the end of the paragraph. */
function answerFor(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*-\\s*\\*\\*${escaped}:\\*\\*(.*)$`, 'm');
  const match = pattern.exec(content);

  if (match === null) {
    return null;
  }

  // An answer may continue on indented lines — collect those too.
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => pattern.test(line));
  const collected = [match[1]];

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*-\s*\*\*/.test(line) || line.trim() === '' || /^#/.test(line)) {
      break;
    }
    collected.push(line);
  }

  return collected.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * The templates' own prompt text is the "left untouched" baseline.
 *
 * Without this comparison an untouched plan passed: the prompt text is longer than the threshold
 * and already contains the phrase "no matches" from the instructions. Caught by the control
 * experiment "create a plan and fill nothing" — the very case this check exists for.
 */
function templateAnswers(root) {
  const answers = new Map(QUESTIONS.map(({ label }) => [label, new Set()]));

  for (const template of TEMPLATES) {
    const path = join(root, template);

    if (!existsSync(path)) {
      continue;
    }

    const content = readFileSync(path, 'utf8');

    for (const { label } of QUESTIONS) {
      const answer = answerFor(content, label);
      if (answer !== null) {
        answers.get(label).add(normalize(answer));
      }
    }
  }

  return answers;
}

/** Case, whitespace and markup must not rescue an answer from matching. */
function normalize(text) {
  return text.toLowerCase().replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
}

function violations(root) {
  const problems = [];
  const declaredIds = { ledger: declaredLedgerIds(root), adr: declaredAdrIds(root) };
  const fromTemplate = templateAnswers(root);
  const plans = activePlans(root);

  for (const plan of plans) {
    const content = readFileSync(join(root, plan), 'utf8');

    if (!/^##\s*0\.\s*Orientation/m.test(content)) {
      problems.push(
        `${plan}: no "## 0. Orientation" section. Copy it from docs/plans/TEMPLATE.md ` +
          '(or TEMPLATE-BUGFIX.md) — planning starts by reading the ledger, not the code',
      );
      continue;
    }

    for (const { label, proof } of QUESTIONS) {
      const answer = answerFor(content, label);

      if (answer === null) {
        problems.push(`${plan}: no "- **${label}:**" line in section 0`);
        continue;
      }
      if (answer === '') {
        problems.push(`${plan}: the answer to "${label}" is empty`);
        continue;
      }
      if (PLACEHOLDERS.includes(answer.toLowerCase().replace(/[`*]/g, '').trim())) {
        problems.push(
          `${plan}: the answer to "${label}" is a brush-off ("${answer}"). Say what you found in ` +
            'the ledger and the backlog, and what follows from it',
        );
        continue;
      }
      if (fromTemplate.get(label).has(normalize(answer))) {
        problems.push(
          `${plan}: the answer to "${label}" is the template's own prompt text — the field was ` +
            'never filled in. Orientation starts by reading docs/CHANGELOG.md and ' +
            'docs/BACKLOG.md, not by copying the template',
        );
        continue;
      }
      if (answer.length < MIN_ANSWER_LENGTH) {
        problems.push(
          `${plan}: the answer to "${label}" is shorter than ${MIN_ANSWER_LENGTH} characters ` +
            `("${answer}") — that is a checkbox, not orientation`,
        );
        continue;
      }

      if (proof === null) {
        continue;
      }

      const isAdr = proof === 'adr';
      const declared = declaredIds[proof];
      const cited = [...answer.matchAll(isAdr ? ADR_ID : LEDGER_ID)].map((match) => match[0]);
      const unknown = cited.filter((id) => !declared.has(id));
      const saysNoMatch = EXPLICIT_NO_MATCH.some((phrase) => answer.toLowerCase().includes(phrase));

      if (unknown.length > 0) {
        problems.push(
          `${plan}: the answer to "${label}" cites ${unknown.join(', ')} — no such ` +
            `${isAdr ? 'decisions in docs/adr/' : 'entries in the ledger'}`,
        );
        continue;
      }
      if (cited.length === 0 && !saysNoMatch) {
        problems.push(
          isAdr
            ? `${plan}: the answer to "${label}" does not lean on the decision log. Cite ADR IDs ` +
                '(ADR-0001…) or say "no matches" and why — otherwise there is no telling whether ' +
                'docs/adr/ was opened at all. A change to a decision needs a new ADR first'
            : `${plan}: the answer to "${label}" does not lean on the ledger. Cite entry IDs ` +
                '(FT-/CH-/FX-/BL-) or say "no matches" and why — otherwise there is no telling ' +
                'whether you opened docs/CHANGELOG.md and docs/BACKLOG.md at all',
        );
      }
    }
  }

  return { problems, planCount: plans.length };
}

const root = repoRoot();
const { problems, planCount } = violations(root);

if (problems.length > 0) {
  console.error('\nOrientation failed — planning cannot continue:\n');
  problems.forEach((problem) => console.error(`  • ${problem}`));
  console.error(
    '\nOrder: read docs/CHANGELOG.md (what was done, defects included), docs/BACKLOG.md ' +
      '(what is planned and what was rejected) and docs/adr/ (the decisions), then fill ' +
      'section 0 of the plan.\n' +
      'If the task turns out to be a duplicate, saying so is a result, not a refusal.\n',
  );
  process.exit(1);
}

console.log(
  planCount === 0
    ? `No active plans (${PLANS_DIR}/*${PLAN_SUFFIX}) — nothing to check.`
    : `Orientation passed in ${planCount} plan(s).`,
);

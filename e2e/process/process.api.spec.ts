import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * The planning process, made executable: the plan templates and the change folders the three
 * discovery stages live in. Cases live in the paired `process.api.cases.md`.
 *
 * Project `api`: no browser, plain `node:fs`. The `.api.spec.ts` suffix is mandatory (meta-test
 * rule 1) — without it the file joins no project and silently never runs.
 *
 * Why: section 0 "Orientation" has the same shape in every template, and `check-orientation.mjs`
 * parses it by five labels. A renamed label, or a template missing from the `TEMPLATES` list,
 * disables the check silently — reproduced by control experiment when `TEMPLATE-BUGFIX.md` was
 * added. The change-folder cases exist for the same reason one level up: a stage with no artifact,
 * or an artifact still holding its scaffold text, is a skipped stage nobody declared (`ADR-0016`).
 */

const PLANS_DIR = 'docs/plans';
const CHECKER = 'scripts/check-orientation.mjs';
const SCAFFOLDER = 'scripts/new-change.mjs';

/**
 * Templates are found by name, not by a list: the list is exactly what is under test here.
 *
 * Only the PLAN templates. The stage scaffolds are named `SCAFFOLD-*.md` on purpose — they carry no
 * section 0, and matching them here would make `PR-API-01` demand orientation labels from a
 * research index.
 */
const TEMPLATE_NAME = /^TEMPLATE.*\.md$/;

/**
 * What every change folder must contain, in the order the stages happen. `PR-API-03` requires
 * these; `PR-API-05` checks the scaffolder creates exactly them.
 */
const REQUIRED_STAGE_FILES = ['research/README.md', 'design.md'];

/** Left in a scaffolded file until a stage is actually written. */
const UNFILLED_MARKER = '<!-- fill this in -->';

/**
 * A statement counts as evidenced when it points at something: a file, a case ID, a ledger or ADR
 * entry. `- **Not found:**` is the other acceptable outcome — a sweep that came back empty is a
 * finding, and saying so is the whole point of the stage.
 */
const EVIDENCE_PATTERNS = [
  /`[^`]*\.(?:ts|tsx|mjs|js|md|json|css|ya?ml)(?::\d+)?`/,
  /\b(?:FT|CH|FX|BL)-\d{3}\b/,
  /\bADR-\d{4}\b/,
  /\b[A-Z]{2,5}-(?:API|FN|UT|INT)-\d{2,3}\b/,
  /^\s*-\s*\*\*Not found:\*\*/m,
];

/** The same five labels `check-orientation.mjs` reads. They diverge, the check diverges. */
const REQUIRED_LABELS = [
  'Duplicate',
  'Conflicts with shipped',
  'Conflicts with planned',
  'Architecture impact',
  'Open questions',
];

const ORIENTATION_HEADING = /^##\s*0\.\s*Orientation/;
const LABEL_LINE = /^\s*-\s*\*\*([^:*]+):\*\*/;

function repoRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Monorepo root not found (pnpm-workspace.yaml)');
    }
    dir = parent;
  }
}

/**
 * Change folders: every directory under `docs/plans/`. There is no other kind — the archive
 * documents and the templates are files. A regex on the name would let the next folder created "for
 * a minute" fall out of the check silently, which is how `SELF_EXEMPT` earned its comment in the
 * suite meta-test.
 */
function changeFolders(root: string): string[] {
  const dir = path.join(root, PLANS_DIR);

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function filesUnder(root: string, relDir: string, acc: string[] = []): string[] {
  const abs = path.join(root, relDir);

  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      filesUnder(root, rel, acc);
      continue;
    }
    acc.push(rel);
  }

  return acc;
}

/** Files the scaffolder copies in, read from its own source — the list is what is under test. */
function scaffoldedTargets(root: string): string[] {
  const source = fs.readFileSync(path.join(root, SCAFFOLDER), 'utf8');
  const block = /const SCAFFOLD = \[(.*?)\];/s.exec(source);

  return block === null
    ? []
    : [...block[1].matchAll(/target:\s*'([^']+)'/g)].map((match) => match[1]);
}

function violationsStageFiles(root: string): string[] {
  const problems: string[] = [];

  for (const slug of changeFolders(root)) {
    const folder = `${PLANS_DIR}/${slug}`;

    for (const required of REQUIRED_STAGE_FILES) {
      if (!fs.existsSync(path.join(root, folder, required))) {
        problems.push(
          `${folder}/ — no ${required}. Each stage is the next one's context: a plan with no ` +
            'research or no design is a stage somebody skipped without saying so. Create change ' +
            'folders with `pnpm change:new <slug>`',
        );
      }
    }

    if (!fs.existsSync(path.join(root, folder, `${slug}.plan.md`))) {
      problems.push(
        `${folder}/ — no ${slug}.plan.md. The plan is named after the folder so the change, the ` +
          'suite directory and the Playwright tag share one slug',
      );
    }
  }

  return problems;
}

/**
 * Markdown with code spans and fenced blocks removed.
 *
 * A stage document may legitimately *mention* the unfilled marker while explaining the convention —
 * this repository's own design document does. Quoting a rule must not count as breaking it, so only
 * prose is searched. Caught the first time `PR-API-04` ran against a real change folder.
 */
function prose(content: string): string {
  return content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function violationsUnfilled(root: string): string[] {
  const problems: string[] = [];

  for (const slug of changeFolders(root)) {
    const folder = `${PLANS_DIR}/${slug}`;

    for (const file of filesUnder(root, folder).filter((name) => name.endsWith('.md'))) {
      if (prose(fs.readFileSync(path.join(root, file), 'utf8')).includes(UNFILLED_MARKER)) {
        problems.push(
          `${file} — still carries "${UNFILLED_MARKER}". An untouched scaffold passes every ` +
            'check that only looks for presence, which is exactly how an empty section 0 used to ' +
            'pass; the marker is what makes "not written yet" visible',
        );
      }
    }
  }

  return problems;
}

function violationsEvidence(root: string): string[] {
  const problems: string[] = [];

  for (const slug of changeFolders(root)) {
    const researchDir = `${PLANS_DIR}/${slug}/research`;

    if (!fs.existsSync(path.join(root, researchDir))) {
      continue; // a missing research folder is PR-API-03; no need to report it twice
    }

    for (const file of filesUnder(root, researchDir).filter((name) => name.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(root, file), 'utf8');

      if (!EVIDENCE_PATTERNS.some((pattern) => pattern.test(content))) {
        problems.push(
          `${file} — not one citation and not one "- **Not found:**" line. Research records what ` +
            'is in the project, and a statement that points at nothing is a conclusion somebody ' +
            'drew. Cite a path, a case ID, a ledger or ADR entry — or say what came back empty',
        );
      }
    }
  }

  return problems;
}

const SCENARIOS_INDEX_SCRIPT = 'scripts/scenarios-index.mjs';

/**
 * Runs the generator in `check` mode: it regenerates `e2e/scenarios-index.md` in memory and exits
 * non-zero if that differs from the file on disk. A subprocess rather than an import so there is one
 * canonical generator instead of a second implementation here that could itself drift from it.
 */
function violationsScenarioIndex(root: string): string[] {
  try {
    execFileSync('node', [SCENARIOS_INDEX_SCRIPT, 'check'], { cwd: root, stdio: 'pipe' });
    return [];
  } catch (error) {
    const failure = error as { stdout?: Buffer; stderr?: Buffer };
    const output = `${failure.stdout?.toString() ?? ''}${failure.stderr?.toString() ?? ''}`.trim();

    return [output || 'e2e/scenarios-index.md is stale. Run `pnpm scenarios:index` to refresh it.'];
  }
}

function templates(root: string): string[] {
  return fs
    .readdirSync(path.join(root, PLANS_DIR))
    .filter((name) => TEMPLATE_NAME.test(name))
    .sort()
    .map((name) => `${PLANS_DIR}/${name}`);
}

/** Section 0 labels in order of appearance: from the section heading to the next heading. */
function orientationLabels(content: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => ORIENTATION_HEADING.test(line));

  if (start === -1) {
    return null;
  }

  const labels: string[] = [];

  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{2,6}\s/.test(lines[i])) {
      break;
    }
    const match = LABEL_LINE.exec(lines[i]);
    if (match !== null) {
      labels.push(match[1].trim());
    }
  }

  return labels;
}

test.describe('Planning process', { tag: '@process' }, () => {
  test('PR-API-01 — every plan template shares one set of section 0 labels', () => {
    const root = repoRoot();
    const found = templates(root);

    expect(
      found.length,
      'Fewer than two plan templates: there are two workflows — feature and bugfix',
    ).toBeGreaterThanOrEqual(2);

    for (const template of found) {
      const labels = orientationLabels(fs.readFileSync(path.join(root, template), 'utf8'));

      expect(labels, `${template}: no "## 0. Orientation" section`).not.toBeNull();
      expect(
        labels,
        `${template}: section 0 labels diverged from the ones ${CHECKER} reads. Plans of this ` +
          'workflow stop being checked: the checker finds no line and decides there is no question',
      ).toEqual(REQUIRED_LABELS);
    }
  });

  test('walk self-check — the scanner finds change folders at all', () => {
    /*
     * Without this, a moved or renamed directory makes PR-API-03, 04 and 06 pass having checked
     * nothing — green under any violation. Change folders are never deleted (they are the record of
     * how a change was developed, like the plans and the ledger), so an empty list means the walk
     * is broken, not that the project has none.
     */
    expect(
      changeFolders(repoRoot()),
      `No change folders found under ${PLANS_DIR}/. Three cases below would pass vacuously`,
    ).not.toEqual([]);
  });

  test('PR-API-03 — every change folder holds the three stages', () => {
    expect(
      violationsStageFiles(repoRoot()),
      "Each stage is the next one's context; a missing one is a skipped stage nobody declared",
    ).toEqual([]);
  });

  test('PR-API-04 — no scaffolded file is left unfilled', () => {
    expect(
      violationsUnfilled(repoRoot()),
      'An untouched scaffold passes every check that only looks for presence',
    ).toEqual([]);
  });

  test('PR-API-05 — the scaffolder creates exactly the files the stage check requires', () => {
    const scaffolded = scaffoldedTargets(repoRoot());

    /*
     * Both directions. A required file the scaffolder does not create has to be made by hand every
     * time, and will be forgotten; a file it creates that nothing requires can be deleted without
     * anything noticing. The same drift `PR-API-02` guards for the template list.
     */
    expect(
      [...scaffolded].sort(),
      `The SCAFFOLD list in ${SCAFFOLDER} and REQUIRED_STAGE_FILES here have drifted apart`,
    ).toEqual([...REQUIRED_STAGE_FILES].sort());
  });

  test('PR-API-06 — every research file carries evidence or says what it did not find', () => {
    expect(
      violationsEvidence(repoRoot()),
      'Research records what is in the project; an uncited statement is a conclusion somebody drew',
    ).toEqual([]);
  });

  test('PR-API-02 — every plan template is registered in check-orientation.mjs', () => {
    const root = repoRoot();
    const checker = fs.readFileSync(path.join(root, CHECKER), 'utf8');

    for (const template of templates(root)) {
      expect(
        checker.includes(`'${template}'`),
        `${template} is missing from the TEMPLATES list (${CHECKER}). That list supplies the ` +
          '"field left untouched" baseline: a forgotten template makes its own plans ' +
          'unverifiable — an empty section 0 passes because there is nothing to compare it to',
      ).toBe(true);
    }
  });

  test('PR-API-07 — the scenario index is regenerated, never hand-edited', () => {
    expect(
      violationsScenarioIndex(repoRoot()),
      'e2e/scenarios-index.md must match `node scripts/scenarios-index.mjs check` — run ' +
        '`pnpm scenarios:index` and commit the result',
    ).toEqual([]);
  });
});

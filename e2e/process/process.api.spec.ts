import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Plan template integrity. Cases live in the paired `process.api.cases.md`.
 *
 * Project `api`: no browser, plain `node:fs`. The `.api.spec.ts` suffix is mandatory (meta-test
 * rule 1) — without it the file joins no project and silently never runs.
 *
 * Why: section 0 "Orientation" has the same shape in every template, and `check-orientation.mjs`
 * parses it by four labels. A renamed label, or a template missing from the `TEMPLATES` list,
 * disables the check silently — reproduced by control experiment when `TEMPLATE-BUGFIX.md` was
 * added.
 */

const PLANS_DIR = 'docs/plans';
const CHECKER = 'scripts/check-orientation.mjs';

/** Templates are found by name, not by a list: the list is exactly what is under test here. */
const TEMPLATE_NAME = /^TEMPLATE.*\.md$/;

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
});

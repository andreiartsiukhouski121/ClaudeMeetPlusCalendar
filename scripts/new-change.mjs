#!/usr/bin/env node
/**
 * Creates the folder a change is developed in: `pnpm change:new <slug> [--bug]`.
 *
 * One folder per feature or defect, holding the three stages in the order they happen:
 *
 *   docs/plans/<slug>/
 *     research/README.md   ← stage 1, the researcher and its subagents
 *     design.md            ← stage 2, the designer, from research/
 *     <slug>.plan.md       ← stage 3, the planner, from research/ + design.md
 *
 * Why a folder rather than three loose files: each stage is the next one's context, and a context
 * that has to be assembled by hand gets assembled differently every time. The folder is also what
 * `PR-API-03` checks — a change with a plan but no research is a stage somebody skipped without
 * saying so.
 *
 * The scaffolded files carry `<!-- fill this in -->` markers, and `PR-API-04` fails while any
 * remain. That is the same lesson `check-orientation.mjs` learned: an untouched template passes
 * every check that only looks for presence.
 *
 * Replaces the old `plan:new`, which created a bare plan file — starting from a plan meant the
 * research and design stages had nowhere to live.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PLANS_DIR = 'docs/plans';

/**
 * What a change folder is made of. `PR-API-05` compares this list against the files `PR-API-03`
 * requires: the scaffold and the check drifting apart would mean a stage with nowhere to go, or a
 * required file nothing creates.
 */
const SCAFFOLD = [
  { target: 'research/README.md', from: 'docs/plans/SCAFFOLD-RESEARCH.md' },
  { target: 'design.md', from: 'docs/plans/SCAFFOLD-DESIGN.md' },
];

/** One plan template per workflow — a feature designs behaviour, a bugfix restores it. */
const TEMPLATES = {
  feature: { path: 'docs/plans/TEMPLATE.md', header: '# Plan: <feature>', title: 'Plan' },
  bugfix: {
    path: 'docs/plans/TEMPLATE-BUGFIX.md',
    header: '# Bugfix: <short defect name>',
    title: 'Bugfix',
  },
};

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

const args = process.argv.slice(2);
const isBug = args.includes('--bug');
const slug = args.find((arg) => !arg.startsWith('--'));

if (slug === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(
    'Usage: pnpm change:new <slug> [--bug]\n' +
      'slug in kebab-case, the same name as the feature directory in e2e/regression/ — that way\n' +
      'the change folder, the suite and the tags share a name: pnpm change:new meeting-editing\n' +
      '--bug scaffolds a bugfix plan instead of a feature plan.\n\n' +
      'Not every defect needs this: the threshold is in the bugfix-pipeline skill, section 4.\n' +
      'Below it the flow is a red test, the fix and an FX- entry — no folder, no stages.',
  );
  process.exit(1);
}

const root = repoRoot();
const folder = join(root, PLANS_DIR, slug);

if (existsSync(folder)) {
  console.error(`${PLANS_DIR}/${slug}/ already exists.`);
  console.error('Continue in it rather than starting a second one: two folders for one change');
  console.error('diverge, and the later stages cannot tell which context is current.');
  process.exit(1);
}

mkdirSync(join(folder, 'research'), { recursive: true });

for (const { target, from } of SCAFFOLD) {
  const path = join(folder, target);
  mkdirSync(dirname(path), { recursive: true });
  copyFileSync(join(root, from), path);
  // The heading carries the slug so a half-filled file never looks like the scaffold itself.
  writeFileSync(path, readFileSync(path, 'utf8').replace('&lt;slug&gt;', slug), 'utf8');
}

const template = isBug ? TEMPLATES.bugfix : TEMPLATES.feature;
const planPath = join(folder, `${slug}.plan.md`);

copyFileSync(join(root, template.path), planPath);
writeFileSync(
  planPath,
  readFileSync(planPath, 'utf8').replace(template.header, `# ${template.title}: ${slug}`),
  'utf8',
);

console.log(`Created ${PLANS_DIR}/${slug}/ (${isBug ? 'bugfix' : 'feature'})

  research/README.md   stage 1 — what the project already contains, with a citation per statement
  design.md            stage 2 — the shape of the change, from the research
  ${slug}.plan.md${' '.repeat(Math.max(0, 19 - slug.length - 8))}stage 3 — the task breakdown, from the research and the design

The stages run in that order, each behind its own review gate: research-reviewer, design-reviewer,
plan-reviewer. Start by dispatching the researcher; do not open the plan yet.

Section 0 of the plan still gates the commit: pnpm check:orientation runs in .husky/pre-commit, and
the <!-- fill this in --> markers fail PR-API-04 until every stage has been written.
The full order of work is the ${isBug ? 'bugfix-pipeline' : 'feature-pipeline'} skill.`);

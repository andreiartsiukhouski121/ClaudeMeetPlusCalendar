#!/usr/bin/env node
/**
 * Creates a plan from a template: `pnpm plan:new <slug> [--bug]`.
 *
 * The point is to make the right path shorter than the workaround. The file is named
 * `<slug>.plan.md` straight away, which puts it under `pnpm check:orientation` — and that runs in
 * the commit hook. Start a task with this command and skipping orientation stops being possible.
 *
 * Two templates because there are two workflows (`feature-pipeline`, `bugfix-pipeline`): a feature
 * designs new behaviour, a bugfix restores promised behaviour. Section 0 is identical in form —
 * check-orientation parses it.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PLANS_DIR = 'docs/plans';

/** One template per workflow. `header` is the line where the task name is substituted. */
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
    'Usage: pnpm plan:new <slug> [--bug]\n' +
      'slug in kebab-case, same as the feature directory in e2e/regression/ — that way the plan,\n' +
      'the suite and the tags share a name: pnpm plan:new meeting-editing\n' +
      '--bug creates a bugfix plan instead of a feature plan: pnpm plan:new login-timing --bug',
  );
  process.exit(1);
}

const template = isBug ? TEMPLATES.bugfix : TEMPLATES.feature;
const root = repoRoot();
const target = join(root, PLANS_DIR, `${slug}.plan.md`);

if (existsSync(target)) {
  console.error(`Plan already exists: ${PLANS_DIR}/${slug}.plan.md`);
  console.error('Edit it instead of creating a second one: two plans for one task will diverge.');
  process.exit(1);
}

copyFileSync(join(root, template.path), target);

// Substitute the slug into the heading so the file does not look untouched.
const content = readFileSync(target, 'utf8').replace(
  template.header,
  `# ${template.title}: ${slug}`,
);
writeFileSync(target, content, { encoding: 'utf8' });

console.log(`Created ${PLANS_DIR}/${slug}.plan.md (${isBug ? 'bugfix' : 'feature'})

Start with section 0 "Orientation": read docs/CHANGELOG.md, docs/BACKLOG.md and docs/adr/, then
answer the five questions. Without them the commit will not pass: pnpm check:orientation runs in
.husky/pre-commit. The full order of work is the ${isBug ? 'bugfix-pipeline' : 'feature-pipeline'} skill.`);

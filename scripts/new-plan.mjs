#!/usr/bin/env node
/**
 * Создаёт план новой задачи из шаблона: `pnpm plan:new <slug>`.
 *
 * Зачем: чтобы путь «сделать правильно» был короче пути «сделать в обход». Файл сразу получает
 * имя `<slug>.plan.md`, а значит попадает под `pnpm check:orientation` — который стоит в хуке
 * коммита. Начал задачу этой командой — забыть про ориентацию уже нельзя.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const TEMPLATE = 'docs/plans/TEMPLATE.md';
const PLANS_DIR = 'docs/plans';

function repoRoot() {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('Не найден корень монорепозитория (pnpm-workspace.yaml)');
    }
    dir = parent;
  }
}

const slug = process.argv[2];

if (slug === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(
    'Использование: pnpm plan:new <slug>\n' +
      'slug в kebab-case, как у каталога фичи в e2e/regression/ — так план, сьют и теги\n' +
      'называются одинаково: pnpm plan:new meeting-editing',
  );
  process.exit(1);
}

const root = repoRoot();
const target = join(root, PLANS_DIR, `${slug}.plan.md`);

if (existsSync(target)) {
  console.error(`План уже существует: ${PLANS_DIR}/${slug}.plan.md`);
  console.error('Правь его, а не создавай второй: два плана на одну задачу разойдутся.');
  process.exit(1);
}

copyFileSync(join(root, TEMPLATE), target);

// Заголовок шаблона — «План: <фича>»; подставляем slug, чтобы файл не выглядел неначатым.
const content = readFileSync(target, 'utf8').replace('# План: <фича>', `# План: ${slug}`);
writeFileSync(target, content, { encoding: 'utf8' });

console.log(`Создан ${PLANS_DIR}/${slug}.plan.md

Первым делом — раздел 0 «Ориентация»: прочитай docs/CHANGELOG.md и docs/BACKLOG.md и заполни
четыре ответа. Без них коммит не пройдёт: pnpm check:orientation стоит в .husky/pre-commit.`);

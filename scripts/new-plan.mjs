#!/usr/bin/env node
/**
 * Создаёт план новой задачи из шаблона: `pnpm plan:new <slug> [--bug]`.
 *
 * Зачем: чтобы путь «сделать правильно» был короче пути «сделать в обход». Файл сразу получает
 * имя `<slug>.plan.md`, а значит попадает под `pnpm check:orientation` — который стоит в хуке
 * коммита. Начал задачу этой командой — забыть про ориентацию уже нельзя.
 *
 * Шаблонов два, потому что потока работ два (скилы `feature-pipeline` и `bugfix-pipeline`):
 * фичевый проектирует новое поведение, багфикс восстанавливает заявленное. Разделы «Контракт» и
 * «Данные» второму не нужны, а «Воспроизведение», «Причина», «Влияние» и «Почему не поймали
 * раньше» первому — не о чем. Раздел 0 у них общий по форме: его парсит check-orientation.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PLANS_DIR = 'docs/plans';

/** Шаблон на поток работ. `header` — строка, в которой подменяется имя задачи. */
const TEMPLATES = {
  feature: { path: 'docs/plans/TEMPLATE.md', header: '# План: <фича>', title: 'План' },
  bugfix: {
    path: 'docs/plans/TEMPLATE-BUGFIX.md',
    header: '# Багфикс: <короткое имя дефекта>',
    title: 'Багфикс',
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
      throw new Error('Не найден корень монорепозитория (pnpm-workspace.yaml)');
    }
    dir = parent;
  }
}

const args = process.argv.slice(2);
const isBug = args.includes('--bug');
const slug = args.find((arg) => !arg.startsWith('--'));

if (slug === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(
    'Использование: pnpm plan:new <slug> [--bug]\n' +
      'slug в kebab-case, как у каталога фичи в e2e/regression/ — так план, сьют и теги\n' +
      'называются одинаково: pnpm plan:new meeting-editing\n' +
      '--bug создаёт план багфикса вместо плана фичи: pnpm plan:new login-timing --bug',
  );
  process.exit(1);
}

const template = isBug ? TEMPLATES.bugfix : TEMPLATES.feature;
const root = repoRoot();
const target = join(root, PLANS_DIR, `${slug}.plan.md`);

if (existsSync(target)) {
  console.error(`План уже существует: ${PLANS_DIR}/${slug}.plan.md`);
  console.error('Правь его, а не создавай второй: два плана на одну задачу разойдутся.');
  process.exit(1);
}

copyFileSync(join(root, template.path), target);

// Подставляем slug в заголовок, чтобы файл не выглядел неначатым.
const content = readFileSync(target, 'utf8').replace(
  template.header,
  `# ${template.title}: ${slug}`,
);
writeFileSync(target, content, { encoding: 'utf8' });

console.log(`Создан ${PLANS_DIR}/${slug}.plan.md (${isBug ? 'багфикс' : 'фича'})

Первым делом — раздел 0 «Ориентация»: прочитай docs/CHANGELOG.md и docs/BACKLOG.md и заполни
четыре ответа. Без них коммит не пройдёт: pnpm check:orientation стоит в .husky/pre-commit.
Порядок работ целиком — скил ${isBug ? 'bugfix-pipeline' : 'feature-pipeline'}.`);

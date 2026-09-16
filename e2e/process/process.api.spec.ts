import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Целостность шаблонов планов. Кейсы — в парном `process.api.cases.md`.
 *
 * Проект `api`: браузер не нужен, работа через `node:fs`. Суффикс `.api.spec.ts` обязателен по
 * правилу 1 мета-теста — иначе файл не попал бы ни в один проект и молча не запускался.
 *
 * Зачем: раздел 0 «Ориентация» одинаков по форме у всех шаблонов, и его парсит
 * `check-orientation.mjs` по четырём меткам. Переименованная метка или шаблон, забытый в списке
 * `TEMPLATES`, отключают проверку молча — воспроизведено контрольным опытом при заведении
 * `TEMPLATE-BUGFIX.md`.
 */

const PLANS_DIR = 'docs/plans';
const CHECKER = 'scripts/check-orientation.mjs';

/** Шаблоны находим по имени, а не списком: список — ровно то, что здесь и проверяется. */
const TEMPLATE_NAME = /^TEMPLATE.*\.md$/;

/** Те же четыре метки, что читает `check-orientation.mjs`. Расходятся — расходится и проверка. */
const REQUIRED_LABELS = [
  'Дубль',
  'Конфликт с реализованным',
  'Конфликт с планируемым',
  'Неясности',
];

const ORIENTATION_HEADING = /^##\s*0\.\s*Ориентация/;
const LABEL_LINE = /^\s*-\s*\*\*([^:*]+):\*\*/;

function repoRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Не найден корень монорепозитория (pnpm-workspace.yaml)');
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

/** Метки раздела 0 в порядке появления: от заголовка раздела до следующего заголовка. */
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

test.describe('Процесс планирования', { tag: '@process' }, () => {
  test('PR-API-01 — у всех шаблонов планов одинаковый набор меток раздела 0', () => {
    const root = repoRoot();
    const found = templates(root);

    expect(
      found.length,
      'Шаблонов планов меньше двух: потоков работ два — фича и багфикс',
    ).toBeGreaterThanOrEqual(2);

    for (const template of found) {
      const labels = orientationLabels(fs.readFileSync(path.join(root, template), 'utf8'));

      expect(labels, `${template}: нет раздела «## 0. Ориентация»`).not.toBeNull();
      expect(
        labels,
        `${template}: метки раздела 0 разошлись с теми, что читает ${CHECKER}. ` +
          'Планы этого потока перестанут проверяться: проверка не найдёт строку и решит, ' +
          'что вопроса нет',
      ).toEqual(REQUIRED_LABELS);
    }
  });

  test('PR-API-02 — каждый шаблон планов зарегистрирован в check-orientation.mjs', () => {
    const root = repoRoot();
    const checker = fs.readFileSync(path.join(root, CHECKER), 'utf8');

    for (const template of templates(root)) {
      expect(
        checker.includes(`'${template}'`),
        `${template} не перечислен в списке TEMPLATES (${CHECKER}). Из этого списка берётся ` +
          'эталон «поле не заполнено»: забытый шаблон делает свои планы непроверяемыми — ' +
          'незаполненный раздел 0 проходит, потому что сверять его не с чем',
      ).toBe(true);
    }
  });
});

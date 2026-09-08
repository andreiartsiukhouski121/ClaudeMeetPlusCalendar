#!/usr/bin/env node
/**
 * Подставляет хеш последнего коммита вместо `pending` в реестре: `pnpm ledger:fill`.
 *
 * Зачем отдельная команда вместо ручной замены: я дважды заменил слово `pending` в **тексте
 * правил** вместо ячейки таблицы, потому что глобальная замена не различает их. Скрипт правит
 * только строки таблиц — те, что начинаются с `| <ID> |`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CHANGELOG = 'docs/CHANGELOG.md';
const ENTRY_ROW = /^\|\s*(?:FT|CH|FX)-\d{3}\s*\|/;

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

/**
 * Коммит, добавивший упоминание ID в реестр. Тот же приём, что в кейсе `LG-API-03`: `-S` находит
 * изменение числа вхождений строки, то есть именно вводящий коммит, а не тот, что заменил
 * `pending` на хеш.
 *
 * Почему не хеш `HEAD` для всех записей: запись могла быть введена **предыдущим** коммитом, а её
 * `pending` заполняется этим. Первая редакция скрипта ставила всем `HEAD` и приписала бы `CH-008`
 * чужой коммит — поймано первым прогоном CI, где `LG-API-03` назвал точную запись.
 */
function introducingHash(root, id) {
  const found = execFileSync('git', ['log', '-1', '--format=%h', `-S${id}`, '--', CHANGELOG], {
    cwd: root,
    encoding: 'utf8',
  }).trim();

  return found === '' ? null : found;
}

const root = repoRoot();
const path = join(root, CHANGELOG);
const lines = readFileSync(path, 'utf8').split('\n');
const filled = [];
const unresolved = [];

const updated = lines.map((line) => {
  if (!ENTRY_ROW.test(line) || !line.includes('`pending`')) {
    return line;
  }

  /*
   * Заполняется только та ГРАФА, которая целиком равна `pending`, а не первое вхождение строки.
   *
   * Слепая замена первого вхождения испортила описание записи FX-019: там слово `pending` стоит
   * в тексте («Инвариант `pending` делал…»), и оно превратилось в хеш. Это третий случай одной и
   * той же ошибки — дважды я допустил её руками, потом в этом же скрипте (FX-021). Поэтому
   * адресуем графу, а не подстроку.
   *
   * Поиск графы идёт ПЕРВЫМ: строка, где `pending` встречается только в описании, уже заполнена,
   * и сообщать про неё нечего.
   */
  const cells = line.split('|');
  const targetIndex = cells.findIndex((cell) => cell.trim() === '`pending`');

  if (targetIndex === -1) {
    return line;
  }

  const id = ENTRY_ROW.exec(line)[0].replace(/[|\s]/g, '');
  const hash = introducingHash(root, id);

  if (hash === null) {
    unresolved.push(id);

    return line;
  }

  cells[targetIndex] = cells[targetIndex].replace('`pending`', `\`${hash}\``);
  filled.push(`${id} → ${hash}`);

  return cells.join('|');
});

if (unresolved.length > 0) {
  console.error(
    `Вводящий коммит не определён для: ${unresolved.join(', ')}. Запись ещё не закоммичена — ` +
      'заполни её хеш следующим коммитом.',
  );
}

if (filled.length === 0) {
  console.log(`В ${CHANGELOG} нет записей «pending» — подставлять нечего.`);
  process.exit(0);
}

writeFileSync(path, updated.join('\n'), { encoding: 'utf8' });
console.log(`Подставлено: ${filled.join(', ')}`);
console.log('Закоммить эту правку следующим коммитом — она сама записи в реестре не требует.');

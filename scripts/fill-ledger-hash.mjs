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

const root = repoRoot();
const hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();

const path = join(root, CHANGELOG);
const lines = readFileSync(path, 'utf8').split('\n');
const filled = [];

const updated = lines.map((line) => {
  if (!ENTRY_ROW.test(line) || !line.includes('`pending`')) {
    return line;
  }
  filled.push(ENTRY_ROW.exec(line)[0].replace(/[|\s]/g, ''));

  return line.replace('`pending`', `\`${hash}\``);
});

if (filled.length === 0) {
  console.log(`В ${CHANGELOG} нет записей «pending» — подставлять нечего.`);
  process.exit(0);
}

writeFileSync(path, updated.join('\n'), { encoding: 'utf8' });
console.log(`Подставлен ${hash} в записи: ${filled.join(', ')}`);
console.log('Закоммить эту правку следующим коммитом — она сама записи в реестре не требует.');

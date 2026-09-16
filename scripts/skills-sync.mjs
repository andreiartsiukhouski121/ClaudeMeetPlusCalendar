#!/usr/bin/env node
/**
 * Восстановление и сверка внешних наборов скилов: `pnpm skills:sync` / `pnpm skills:check`.
 *
 * Зачем. Каталог `.agents/` лежит в `.gitignore`, как `node_modules`, а четыре адаптера в
 * `.claude/skills/` на него ссылаются. До этого скрипта восстановить набор было **нечем**:
 * `skills.sh`, на который ссылались адаптеры и `CLAUDE.md`, в контуре не существует, а в
 * `skills-lock.json` не было ни ветки, ни коммита — только `computedHash` неизвестного
 * происхождения, не совпадающий ни с одним хешем файла на диске (`FX-028`).
 *
 * Что делает `sync`: по каждой записи lock-файла выкачивает из GitHub ровно тот каталог, где
 * лежит скил, ровно на том коммите, который записан, и кладёт в `.agents/skills/<name>/`.
 * Затем считает `treeHash` и сверяет с записанным.
 *
 * Что делает `check`: **офлайн.** Пересчитывает `treeHash` того, что уже лежит на диске, и
 * сравнивает с lock-файлом. Поэтому его можно звать в любой момент, а `sync` — только при живой
 * сети. В `pnpm verify` не встроено ни то, ни другое: приёмка не должна зависеть от сети и от
 * наличия каталога, которого в свежем клоне нет.
 *
 * `treeHash` — sha256 по всему каталогу скила: отсортированные относительные пути плюс содержимое
 * каждого файла, переводы строк нормализованы в LF. Хеш считает этот же скрипт, поэтому его можно
 * проверить, в отличие от `computedHash`.
 *
 * Поле `computedHash` оставлено нетронутым: его пишет внешний инструмент, мы его не читаем и не
 * обновляем.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative, sep } from 'node:path';

const LOCK = 'skills-lock.json';
const SKILLS_DIR = join('.agents', 'skills');

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

/** Все файлы каталога, относительными путями с прямыми слэшами, отсортированные. */
function filesOf(root) {
  const out = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '.git') {
          walk(full);
        }
      } else if (entry.isFile()) {
        out.push(relative(root, full).split(sep).join(posix.sep));
      }
    }
  };

  walk(root);
  return out.sort();
}

/**
 * sha256 по каталогу: путь + длина + содержимое каждого файла. Переводы строк нормализованы,
 * иначе хеш разъедется между Windows и Linux на ровном месте.
 */
function treeHash(dir) {
  const hash = createHash('sha256');

  for (const rel of filesOf(dir)) {
    const body = readFileSync(join(dir, rel)).toString('utf8').replace(/\r\n/g, '\n');
    hash.update(rel);
    hash.update('\0');
    hash.update(String(body.length));
    hash.update('\0');
    hash.update(body);
    hash.update('\0');
  }

  return hash.digest('hex');
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

/**
 * Выкачивает один каталог одного коммита. `--filter=blob:none` плюс sparse-checkout: скачивается
 * дерево, а из файлов — только нужное поддерево. Иначе `obra/superpowers` и `github/awesome-copilot`
 * тянутся целиком ради одного файла.
 */
function fetchSkill({ source, commit, dir }, into) {
  const tmp = mkdtempSync(join(tmpdir(), 'skills-sync-'));

  try {
    git(['init', '-q'], tmp);
    git(['remote', 'add', 'origin', `https://github.com/${source}.git`], tmp);
    git(['config', 'core.sparseCheckout', 'true'], tmp);
    git(['sparse-checkout', 'init', '--no-cone'], tmp);
    git(['sparse-checkout', 'set', '--no-cone', `/${dir}/*`], tmp);
    git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', commit], tmp);
    git(['checkout', '-q', 'FETCH_HEAD'], tmp);

    const from = join(tmp, ...dir.split(posix.sep));
    if (!existsSync(from)) {
      throw new Error(`в коммите ${commit} нет каталога ${dir}`);
    }

    rmSync(into, { recursive: true, force: true });
    mkdirSync(dirname(into), { recursive: true });
    cpSync(from, into, { recursive: true });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const root = repoRoot();
const lockPath = join(root, LOCK);

if (!existsSync(lockPath)) {
  console.error(`Нет ${LOCK} — нечего синхронизировать.`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const mode = process.argv[2] === 'check' ? 'check' : 'sync';
const names = process.argv.slice(3);
const entries = Object.entries(lock.skills ?? {}).filter(
  ([name]) => names.length === 0 || names.includes(name),
);

if (entries.length === 0) {
  console.error('В lock-файле нет подходящих записей.');
  process.exit(1);
}

let failed = 0;
let changed = false;

for (const [name, entry] of entries) {
  const target = join(root, SKILLS_DIR, name);
  const dir = posix.dirname(entry.skillPath);

  if (mode === 'sync') {
    if (entry.commit === undefined || entry.commit === null) {
      console.error(`${name}: в lock нет поля commit — нечем воспроизвести. Пропущен.`);
      failed += 1;
      continue;
    }

    try {
      process.stdout.write(`${name}: ${entry.source}@${entry.commit.slice(0, 7)} … `);
      fetchSkill({ source: entry.source, commit: entry.commit, dir }, target);
    } catch (error) {
      console.log('ошибка');
      console.error(`  ${error.message.split('\n')[0]}`);
      failed += 1;
      continue;
    }
  }

  if (!existsSync(target) || !statSync(target).isDirectory()) {
    console.error(`${name}: каталога ${SKILLS_DIR}/${name} нет — запусти pnpm skills:sync`);
    failed += 1;
    continue;
  }

  const actual = treeHash(target);

  if (entry.treeHash === undefined) {
    entry.treeHash = actual;
    changed = true;
    console.log(mode === 'sync' ? `ок, treeHash записан` : `${name}: treeHash записан впервые`);
  } else if (entry.treeHash === actual) {
    console.log(mode === 'sync' ? 'ок' : `${name}: совпадает`);
  } else if (mode === 'sync') {
    entry.treeHash = actual;
    changed = true;
    console.log('содержимое изменилось, treeHash обновлён');
  } else {
    console.error(
      `${name}: содержимое разошлось с lock.\n` +
        `  в lock: ${entry.treeHash}\n  на диске: ${actual}\n` +
        `  Либо набор правили руками, либо lock устарел: pnpm skills:sync обновит и то, и другое.`,
    );
    failed += 1;
  }
}

if (changed) {
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

if (failed > 0) {
  console.error(`\nНе сошлось записей: ${failed}.`);
  process.exit(1);
}

console.log(`\n${mode === 'sync' ? 'Синхронизировано' : 'Сверено'} наборов: ${entries.length}.`);

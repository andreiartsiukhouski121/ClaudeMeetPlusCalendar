import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Целостность реестра изменений и бэклога. Кейсы — в парном `ledger.api.cases.md`.
 *
 * Проект `api`: браузер не нужен, работа через `node:fs`. Суффикс `.api.spec.ts` обязателен по
 * правилу 1 мета-теста — иначе файл не попал бы ни в один проект и молча не запускался.
 *
 * Зачем машинная проверка: в этом проекте уже сгнила ручная таблица чисел в плане (`FX-013`) —
 * реестр без проверки деградирует так же и в итоге заводят второй.
 */

const CHANGELOG = 'docs/CHANGELOG.md';
const BACKLOG = 'docs/BACKLOG.md';

/** Префиксы записей: три в реестре изменений, один в бэклоге. */
const CHANGELOG_PREFIXES = ['FT', 'CH', 'FX'];
const BACKLOG_PREFIXES = ['BL'];

/** ID записи реестра: `FT-001`, `BL-014`. Три знака — до 999 записей, дальше не дожили. */
const ENTRY_ID = /\b((?:FT|CH|FX|BL)-\d{3})\b/g;

/** Строка таблицы, начинающаяся с ID: `| FT-001 | …`. */
const ENTRY_ROW = /^\|\s*((?:FT|CH|FX|BL)-\d{3})\s*\|(.*)$/;

/** Литерал вместо хеша для записи, добавляемой текущим изменением. */
const PENDING = 'pending';

/** Хеш коммита в графе реестра: 7–40 hex, обычно в обратных кавычках. */
const COMMIT_HASH = /\b([0-9a-f]{7,40})\b/;

/** Где искать висячие ссылки на записи реестра. */
const REFERENCE_ROOTS = ['docs', '.claude/skills', 'e2e'];

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage']);

/**
 * Корень репозитория — поиском `pnpm-workspace.yaml` вверх от `config.rootDir`.
 * Просто `rootDir` брать нельзя: он равен разрешённому `testDir`, то есть `<repo>/e2e`, и обход
 * нашёл бы ноль файлов — кейсы прошли бы вакуумно. На этом уже спотыкался мета-тест (`FX-001`).
 */
function repoRoot(): string {
  let dir = test.info().config.rootDir;

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Не найден корень монорепозитория (pnpm-workspace.yaml) от ${dir} и выше`);
    }
    dir = parent;
  }
}

function read(root: string, relFile: string): string {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

interface Entry {
  id: string;
  /** Остаток строки таблицы после ID — из него берутся графы. */
  rest: string;
}

/** Записи-строки таблиц: только те, что начинаются с ID, без строк-заголовков и разделителей. */
function entries(content: string): Entry[] {
  const found: Entry[] = [];

  for (const line of content.split(/\r?\n/)) {
    const match = ENTRY_ROW.exec(line);
    if (match !== null) {
      found.push({ id: match[1], rest: match[2] });
    }
  }

  return found;
}

/** Графы строки таблицы после ID, без пустых краёв. */
function columns(rest: string): string[] {
  return rest
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell, index, all) => !(cell === '' && (index === 0 || index === all.length - 1)));
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      dupes.add(value);
    }
    seen.add(value);
  }

  return [...dupes];
}

/** Все markdown-файлы, где могут встречаться ссылки на записи реестра. */
function referenceFiles(root: string): string[] {
  const files: string[] = ['CLAUDE.md'];

  const walk = (relDir: string): void => {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) {
      return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${relDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(rel);
        }
        continue;
      }
      if (entry.name.endsWith('.md')) {
        files.push(rel);
      }
    }
  };

  REFERENCE_ROOTS.forEach(walk);

  return files.filter((file) => fs.existsSync(path.join(root, file)));
}

/**
 * Есть ли у файла незакоммиченные правки. Признак «изменение ещё в работе»: пока он истинен,
 * литерал `pending` в реестре законен.
 */
function hasUncommittedChanges(root: string, relFile: string): boolean {
  try {
    const status = execFileSync('git', ['status', '--porcelain', '--', relFile], {
      cwd: root,
      encoding: 'utf8',
    });

    return status.trim() !== '';
  } catch {
    // Нет git (архив, распакованный tarball) — считаем изменение завершённым: строгий вариант.
    return false;
  }
}

/** Хеши, которые git не может разрешить. Вынесено из теста: условия в `test` запрещены линтом. */
function unresolvedCommits(root: string, hashes: string[]): string[] {
  const missing: string[] = [];

  for (const hash of hashes) {
    try {
      execFileSync('git', ['cat-file', '-e', `${hash}^{commit}`], { cwd: root, stdio: 'ignore' });
    } catch {
      missing.push(hash);
    }
  }

  return missing;
}

/** Графа коммита у записей реестра изменений: последняя непустая графа строки. */
function commitCells(content: string): { id: string; cell: string }[] {
  return entries(content)
    .filter((entry) => CHANGELOG_PREFIXES.includes(entry.id.slice(0, 2)))
    .map((entry) => {
      const cells = columns(entry.rest);
      // Таблица дефектов несёт коммит третьей графой, таблицы фич и изменений — последней
      // непустой. Берём ту, в которой есть хеш или `pending`, иначе — последнюю.
      const withCommit = cells.find(
        (cell) => COMMIT_HASH.test(cell.replace(/`/g, '')) || cell.includes(PENDING),
      );

      return { id: entry.id, cell: withCommit ?? cells.at(-1) ?? '' };
    });
}

/**
 * Ссылки на ID, которых нет в реестре. Обход вне теста: ветвление внутри `test` запрещено
 * правилом `playwright/no-conditional-in-test` — оно поднято до `error` осознанно, потому что
 * условие в тесте прячет непройденную ветку.
 */
function danglingReferences(root: string, declared: Set<string>): string[] {
  const dangling: string[] = [];

  for (const file of referenceFiles(root)) {
    for (const match of read(root, file).matchAll(ENTRY_ID)) {
      if (!declared.has(match[1])) {
        dangling.push(`${file}: ссылка на ${match[1]}, которого нет в реестре`);
      }
    }
  }

  return [...new Set(dangling)];
}

/**
 * Записи `pending`, оставшиеся в **завершённом** изменении. Ветвление вынесено из теста:
 * условия внутри `test` запрещены правилом `playwright/no-conditional-in-test`, поднятым до
 * `error` осознанно — условие в тесте прячет непройденную ветку.
 */
function stalePendingEntries(root: string): string[] {
  if (hasUncommittedChanges(root, CHANGELOG)) {
    return [];
  }

  return commitCells(read(root, CHANGELOG))
    .filter((entry) => entry.cell.includes(PENDING))
    .map((entry) => entry.id);
}

test.describe('Реестр изменений и бэклог', { tag: '@ledger' }, () => {
  test('LG-API-01 — оба файла реестра существуют и не пусты', () => {
    const root = repoRoot();

    for (const file of [CHANGELOG, BACKLOG]) {
      expect(fs.existsSync(path.join(root, file)), `${file} отсутствует`).toBe(true);
      expect(
        entries(read(root, file)).length,
        `${file} не содержит ни одной записи с ID — пустой реестр хуже отсутствующего`,
      ).toBeGreaterThan(0);
    }
  });

  test('LG-API-02 — ID уникальны и соответствуют форме', () => {
    const root = repoRoot();

    for (const [file, allowed] of [
      [CHANGELOG, CHANGELOG_PREFIXES],
      [BACKLOG, BACKLOG_PREFIXES],
    ] as const) {
      const ids = entries(read(root, file)).map((entry) => entry.id);

      expect(duplicates(ids), `${file}: ID повторяются — две записи читаются как одна`).toEqual([]);
      expect(
        ids.filter((id) => !allowed.includes(id.slice(0, 2))),
        `${file}: ID с чужим префиксом (ожидались ${allowed.join(', ')})`,
      ).toEqual([]);
    }
  });

  test('LG-API-03 — у каждой записи реестра изменений заполнен коммит', () => {
    const root = repoRoot();
    const empty = commitCells(read(root, CHANGELOG))
      .filter((entry) => entry.cell === '')
      .map((entry) => entry.id);

    expect(empty, `${CHANGELOG}: у записей нет ссылки на коммит`).toEqual([]);

    /*
     * `pending` законен, пока изменение в работе: хеш неизвестен до коммита, а одно изменение
     * вполне вносит несколько записей — фичу и найденный по ходу дефект.
     *
     * Две предыдущие редакции этого правила были неверны, и обе поймал прогон:
     *   1. «не больше одной записи pending» — сломалось на первом же коммите, вносившем
     *      изменение процесса и дефект одновременно;
     *   2. «на HEAD~1 записей pending нет» — off-by-one: HEAD~1 это и есть коммит, где pending
     *      законен, а заполняется он следующим.
     *
     * Точная формулировка: если файл реестра **не имеет незакоммиченных правок**, значит
     * изменение завершено — и `pending` в нём остаться не должен. Пока файл правится, `pending`
     * разрешён.
     */
    const stale = stalePendingEntries(root);

    expect(
      stale,
      `${CHANGELOG}: записи ${stale.join(', ')} остались «${PENDING}» в закоммиченном файле. ` +
        'Хеш подставляется следующим коммитом — иначе реестр наполняется обещаниями',
    ).toEqual([]);
  });

  test('LG-API-04 — ссылки на коммиты разрешаются в git', () => {
    const root = repoRoot();
    const hashes = commitCells(read(root, CHANGELOG))
      .map((entry) => COMMIT_HASH.exec(entry.cell.replace(/`/g, ''))?.[1])
      .filter((hash): hash is string => hash !== undefined);

    expect(hashes.length, `${CHANGELOG}: не найдено ни одного хеша коммита`).toBeGreaterThan(0);
    expect(
      unresolvedCommits(root, hashes),
      `${CHANGELOG}: коммиты не существуют в репозитории — запись потеряла связь с изменением`,
    ).toEqual([]);
  });

  test('LG-API-05 — у каждого пункта бэклога заполнена графа «Конфликтует с»', () => {
    const root = repoRoot();
    const openSection = read(root, BACKLOG).split('## Отклонено')[0];
    const incomplete = entries(openSection)
      .filter((entry) => entry.id.startsWith('BL-'))
      .filter((entry) => (columns(entry.rest).at(-1) ?? '') === '')
      .map((entry) => entry.id);

    expect(
      incomplete,
      `${BACKLOG}: не заполнена последняя графа («Конфликтует с»). Допускается явное «нет», ` +
        'но не пустота: пункт, о котором не подумали в разрезе проекта, — источник второй ' +
        'реализации того же самого',
    ).toEqual([]);
  });

  test('LG-API-06 — нет ссылок на несуществующие записи', () => {
    const root = repoRoot();
    const declared = new Set([
      ...entries(read(root, CHANGELOG)).map((entry) => entry.id),
      ...entries(read(root, BACKLOG)).map((entry) => entry.id),
    ]);

    expect(
      danglingReferences(root, declared),
      'Висячая ссылка означает, что запись удалили вместо смены статуса, ' +
        'и обоснование решения потерялось',
    ).toEqual([]);
  });
});

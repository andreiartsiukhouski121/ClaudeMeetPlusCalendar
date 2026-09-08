import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Исполняемая версия конвенции сьюта (тест-план §1.6). Восемь правил, каждое — отдельный тест,
 * чтобы падение называло конкретное нарушение, а не «что-то не так со структурой».
 *
 * Работает через node:fs, поэтому живёт в проекте `api`: браузер ему не нужен, а суффикс
 * `.api.spec.ts` обязателен по правилу 1 — иначе файл не попал бы ни в один проект.
 *
 * Зачем это вообще: ревью не ловит забытый `.cases.md`, а спек без суффикса `.api.`/`.functional.`
 * молча не запускается — «зелёный» прогон при этом ничего не проверяет. Мета-тест ловит и то, и то
 * на каждом `pnpm e2e`.
 *
 * У тестов этого файла ID-нумерации нет — так решено планом (тест-план §6.3): он не описывает
 * фичу, а исполняет конвенцию, поэтому и парного `suite-integrity.api.cases.md` у него нет.
 */

/**
 * Правила 1–3 не применяются к самому мета-тесту: парного `.cases.md` у него нет и быть не должно.
 * Явный список, а НЕ регулярка вида «файлы в корне e2e/»: такая регулярка со временем начнёт
 * покрывать что-то ещё, и первый же спек, положенный в корень «на минутку», выпадет из проверки
 * парности молча.
 */
const SELF_EXEMPT = ['suite-integrity.api.spec.ts'];

/**
 * Правило 8: единственный baseline-спек скаффолда, не относящийся ни к одной из двух фич.
 * Новые спеки в этот список не добавляются: попал спек в `apps/**\/src/**` — попал и в
 * `*.unit.cases.md`.
 */
const UNIT_SPEC_EXEMPT = ['apps/api/src/app.controller.spec.ts'];

/** ID кейса: `<ФИЧА>-<ТИП>-<NN>` (тест-план §2). */
const CASE_ID_SOURCE = '(?:AL|HD|SM|SEC)-(?:API|FN|UT)-\\d{2}';
const CASE_ID_ANYWHERE = new RegExp(CASE_ID_SOURCE, 'g');
const CASE_ID_HEADING = new RegExp(`^#{2,6}\\s+(${CASE_ID_SOURCE})\\b`);
const CASE_ID_TABLE_ROW = new RegExp(`^\\|\\s*(${CASE_ID_SOURCE})\\s*\\|`);

/**
 * Пометка «кейс сознательно не автоматизирован». Распознаётся ТОЛЬКО этот синтаксис
 * (тест-план §1.6 правило 5): свободная формулировка в прозе означала бы, что любой абзац
 * со словом «не автоматизирован» отключает проверку.
 */
const NOT_AUTOMATED_MARKER = /^\s*-\s*\*\*Не автоматизирован:\*\*/;

/** Путь к юнит-спеку внутри `apps/**`, как он пишется в `*.unit.cases.md`. */
const APPS_SPEC_PATH = /apps\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.spec\.ts/g;

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'blob-report',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

/**
 * Корень монорепозитория. `test.info().config.rootDir` для этого НЕ подходит: он равен
 * разрешённому `testDir`, то есть `<repo>/e2e`, а не каталогу конфига (проверено пробой:
 * `ROOTDIR=C:\GIT\PurpleSchool\e2e`). Мета-тест, посчитавший корнем `e2e/`, искал бы файлы
 * в `e2e/e2e`, находил бы ноль штук и проходил ВСЕ восемь правил вакуумно — то есть зеленел бы
 * при любом нарушении конвенции. Именно это поймал контрольный опыт при написании файла,
 * поэтому ниже стоит ещё и самопроверка обхода.
 *
 * `process.cwd()` тоже ненадёжен: зависит от того, откуда запущен `playwright test`.
 * Поэтому идём вверх до маркера рабочего пространства.
 */
function findRepoRoot(startDir: string): string {
  let dir = startDir;

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Не найден корень монорепозитория (pnpm-workspace.yaml) ни в ${startDir}, ни выше`,
      );
    }
    dir = parent;
  }
}

/** Корень репозитория для текущего прогона. */
function repoRoot(): string {
  return findRepoRoot(test.info().config.rootDir);
}

/** Рекурсивный обход без `node_modules` и сборочных каталогов: иначе обход `apps/` неподъёмен. */
function walk(rootDir: string, relDir: string, acc: string[] = []): string[] {
  const abs = path.join(rootDir, relDir);
  if (!fs.existsSync(abs)) {
    return acc;
  }

  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(rootDir, rel, acc);
      }
      continue;
    }
    acc.push(rel);
  }

  return acc;
}

function e2eSpecs(root: string): string[] {
  return walk(root, 'e2e').filter((file) => file.endsWith('.spec.ts'));
}

function e2eCaseDocs(root: string): string[] {
  return walk(root, 'e2e').filter((file) => file.endsWith('.cases.md'));
}

/** Юнит-спеки приложений. `apps/api/test/app.e2e-spec.ts` сюда не попадает — он не в `src/`. */
function appsUnitSpecs(root: string): string[] {
  return walk(root, 'apps').filter((file) =>
    /^apps\/[^/]+\/src\/.*(?<!\.e2e)\.spec\.ts$/.test(file),
  );
}

function isSelfExempt(file: string): boolean {
  return SELF_EXEMPT.includes(path.posix.basename(file));
}

function isUnitCaseDoc(file: string): boolean {
  return file.endsWith('.unit.cases.md');
}

function read(root: string, relFile: string): string {
  return fs.readFileSync(path.join(root, relFile), 'utf8');
}

function pairedCaseDoc(specFile: string): string {
  return `${specFile.slice(0, -'.spec.ts'.length)}.cases.md`;
}

function pairedSpec(caseDoc: string): string {
  return `${caseDoc.slice(0, -'.cases.md'.length)}.spec.ts`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function matchLines(content: string, pattern: RegExp): string[] {
  const found: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match !== null) {
      found.push(match[1]);
    }
  }
  return found;
}

/** ID, у которых в их подразделе стоит пометка «Не автоматизирован». */
function notAutomatedIds(content: string): string[] {
  const exempt: string[] = [];
  let currentId = '';

  for (const line of content.split(/\r?\n/)) {
    const heading = CASE_ID_HEADING.exec(line);
    if (heading !== null) {
      currentId = heading[1];
    }
    if (!NOT_AUTOMATED_MARKER.test(line)) {
      continue;
    }
    // ID может стоять и в самой строке пометки — тогда таблица-сводка тоже может её нести.
    exempt.push(...unique(line.match(CASE_ID_ANYWHERE) ?? []), currentId);
  }

  return unique(exempt.filter((id) => id !== ''));
}

interface UnitCaseRef {
  id: string;
  specPaths: string[];
}

/**
 * Сопоставляет ID юнит-кейсов со спеком, под чьим заголовком они перечислены (правило 7).
 * Правило маркировки: любая строка, упоминающая путь `apps/**\/*.spec.ts`, задаёт «текущий спек»
 * для себя и всех последующих строк — до следующего такого упоминания. ID, встреченные до первого
 * упоминания пути, относятся к шапке и сводной таблице файла и правилом 7 не проверяются.
 */
function collectUnitCaseRefs(content: string): UnitCaseRef[] {
  const refs: UnitCaseRef[] = [];
  let currentSpecPaths: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const paths = line.match(APPS_SPEC_PATH);
    if (paths !== null) {
      currentSpecPaths = unique(paths);
    }
    if (currentSpecPaths.length === 0) {
      continue;
    }
    for (const id of unique(line.match(CASE_ID_ANYWHERE) ?? [])) {
      refs.push({ id, specPaths: currentSpecPaths });
    }
  }

  return refs;
}

// --- Правила ---------------------------------------------------------------------------------

function violationsRule1(root: string): string[] {
  return e2eSpecs(root)
    .filter((file) => !isSelfExempt(file))
    .filter((file) => !file.endsWith('.api.spec.ts') && !file.endsWith('.functional.spec.ts'))
    .map(
      (file) =>
        `${file} — правило 1: имя не заканчивается ни на .api.spec.ts, ни на .functional.spec.ts, ` +
        `поэтому файл не попадёт ни в один проект playwright.config.ts и молча не запустится`,
    );
}

function violationsRule2(root: string): string[] {
  return e2eSpecs(root)
    .filter((file) => !isSelfExempt(file))
    .filter((file) => !fs.existsSync(path.join(root, pairedCaseDoc(file))))
    .map(
      (file) =>
        `${file} — правило 2: нет парного файла кейсов ${pairedCaseDoc(file)}. ` +
        `Спек без описания кейсов — блокер (тест-план §1.3)`,
    );
}

function violationsRule3(root: string): string[] {
  return e2eCaseDocs(root)
    .filter((file) => !isUnitCaseDoc(file) && !isSelfExempt(pairedSpec(file)))
    .filter((file) => !fs.existsSync(path.join(root, pairedSpec(file))))
    .map(
      (file) =>
        `${file} — правило 3: нет парного спека ${pairedSpec(file)}. ` +
        `Описанные кейсы никто не исполняет (исключение — только *.unit.cases.md)`,
    );
}

function violationsRule4(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root).filter(isUnitCaseDoc)) {
    for (const specPath of unique(read(root, doc).match(APPS_SPEC_PATH) ?? [])) {
      if (fs.existsSync(path.join(root, specPath))) {
        continue;
      }
      violations.push(
        `${doc} — правило 4: упомянут путь ${specPath}, которого нет на диске. ` +
          `Либо спек переименован, либо путь в документации опечатан`,
      );
    }
  }

  return violations;
}

function violationsRule5(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root).filter((file) => !isUnitCaseDoc(file))) {
    const spec = pairedSpec(doc);
    if (!fs.existsSync(path.join(root, spec))) {
      continue; // отсутствие спека — это правило 3, не надо дублировать падение
    }

    const content = read(root, doc);
    const specText = read(root, spec);
    const exempt = new Set(notAutomatedIds(content));

    /*
     * Считаются только ID, ОБЪЯВЛЕННЫЕ в этом файле как кейсы: заголовком раздела или строкой
     * сводной таблицы. Любое упоминание брать нельзя — тогда ссылка в прозе на соседний кейс
     * («дублирует HD-API-06 намеренно») трактуется как объявление и роняет правило.
     *
     * Так и случилось при добавлении `e2e/security/`: правило требовало автоматизировать
     * `HD-API-06` внутри security-спека. Обходной приём «писать номер без префикса» в
     * `auth-login.api.cases.md` появился ровно из-за этого ограничения — с сужением он больше
     * не нужен, а перекрёстные ссылки читаются нормально.
     */
    const declared = unique([
      ...matchLines(content, CASE_ID_HEADING),
      ...matchLines(content, CASE_ID_TABLE_ROW),
    ]);

    for (const id of declared) {
      if (exempt.has(id) || specText.includes(id)) {
        continue;
      }
      violations.push(
        `${doc} — правило 5: кейс ${id} описан, но ID не встречается в ${spec}. ` +
          `Либо заголовок теста не начинается с ID, либо кейс не автоматизирован — тогда ` +
          `пометь его строкой "- **Не автоматизирован:** <причина + ссылка на задачу>"`,
      );
    }
  }

  return violations;
}

function violationsRule6(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root)) {
    const content = read(root, doc);

    for (const id of findDuplicates(matchLines(content, CASE_ID_HEADING))) {
      violations.push(
        `${doc} — правило 6: ID ${id} использован в двух подразделах кейсов. ` +
          `Номера не переиспользуются даже после удаления кейса (тест-план §2)`,
      );
    }
    for (const id of findDuplicates(matchLines(content, CASE_ID_TABLE_ROW))) {
      violations.push(`${doc} — правило 6: ID ${id} встречается в двух строках таблицы-сводки`);
    }
  }

  return violations;
}

function violationsRule7(root: string): string[] {
  const violations: string[] = [];

  for (const doc of e2eCaseDocs(root).filter(isUnitCaseDoc)) {
    for (const ref of collectUnitCaseRefs(read(root, doc))) {
      const existing = ref.specPaths.filter((specPath) => fs.existsSync(path.join(root, specPath)));
      if (existing.length === 0) {
        continue; // несуществующий путь — это правило 4
      }
      if (existing.some((specPath) => read(root, specPath).includes(ref.id))) {
        continue;
      }
      violations.push(
        `${doc} — правило 7: кейс ${ref.id} перечислен под ${existing.join(', ')}, ` +
          `но его ID там не встречается. Заголовок юнит-теста обязан начинаться с ID кейса — ` +
          `иначе ни pnpm test:<feature> не отфильтрует его, ни проверить автоматизацию нельзя`,
      );
    }
  }

  return violations;
}

function violationsRule8(root: string): string[] {
  const documented = e2eCaseDocs(root)
    .filter(isUnitCaseDoc)
    .flatMap((doc) => read(root, doc).match(APPS_SPEC_PATH) ?? []);
  const documentedSet = new Set(documented);

  return appsUnitSpecs(root)
    .filter((file) => !UNIT_SPEC_EXEMPT.includes(file))
    .filter((file) => !documentedSet.has(file))
    .map(
      (file) =>
        `${file} — правило 8: юнит-спек не упомянут ни в одном *.unit.cases.md. ` +
        `Добавь его кейсы в e2e/regression/<feature>/<feature>.unit.cases.md ` +
        `(в UNIT_SPEC_EXEMPT новые спеки не вносятся)`,
    );
}

// --- Тесты -----------------------------------------------------------------------------------

// Тега у этого describe нет намеренно: `@smoke` по §1.9 тест-плана означает `e2e/smoke/**`,
// а мета-тест — отдельный шаг 1 пайплайна и запускается по пути.
test.describe('Конвенция регрессионного сьюта', () => {
  // Не «правило», а страховка от вакуумного прохода: если обход файлов вернёт пустые списки
  // (сменился способ вычисления корня, переехал каталог), все восемь правил станут зелёными
  // при любом нарушении конвенции. Такой мета-тест хуже отсутствующего — он даёт ложную
  // уверенность. Поэтому сначала убеждаемся, что сканер вообще что-то нашёл.
  test('самопроверка обхода — сканер находит и сьют, и юнит-спеки приложений', () => {
    const root = repoRoot();

    expect(e2eSpecs(root), `Обход e2e/ от корня ${root} не нашёл ни одного спека`).toContain(
      'e2e/suite-integrity.api.spec.ts',
    );
    expect(
      e2eCaseDocs(root),
      `Обход e2e/ от корня ${root} не нашёл ни одного файла кейсов`,
    ).toContain('e2e/smoke/health.api.cases.md');
    expect(
      appsUnitSpecs(root),
      `Обход apps/ от корня ${root} не нашёл ни одного юнит-спека`,
    ).toContain(UNIT_SPEC_EXEMPT[0]);
  });

  test('правило 1 — каждый спек в e2e/ имеет суффикс .api. или .functional.', () => {
    expect(
      violationsRule1(repoRoot()),
      'Файл без суффикса не попадает ни в один проект Playwright и не запускается вовсе',
    ).toEqual([]);
  });

  test('правило 2 — у каждого спека есть парный .cases.md', () => {
    expect(
      violationsRule2(repoRoot()),
      'Спек без описания кейсов — блокер по тест-плану §1.3',
    ).toEqual([]);
  });

  test('правило 3 — у каждого .cases.md есть парный спек (кроме *.unit.cases.md)', () => {
    expect(
      violationsRule3(repoRoot()),
      'Описание без спека означает, что кейсы никто не исполняет',
    ).toEqual([]);
  });

  test('правило 4 — пути юнит-спеков из *.unit.cases.md существуют на диске', () => {
    expect(
      violationsRule4(repoRoot()),
      'Ссылка на несуществующий файл делает документацию фичи ложной',
    ).toEqual([]);
  });

  test('правило 5 — каждый ID из .cases.md встречается в парном спеке', () => {
    expect(
      violationsRule5(repoRoot()),
      'Кейс, описанный но не автоматизированный, обязан быть помечен явной строкой',
    ).toEqual([]);
  });

  test('правило 6 — в .cases.md нет дублирующихся ID', () => {
    expect(
      violationsRule6(repoRoot()),
      'Переиспользованный номер делает историю отчётов нечитаемой',
    ).toEqual([]);
  });

  test('правило 7 — ID юнит-кейса встречается в том спеке, под которым он перечислен', () => {
    expect(
      violationsRule7(repoRoot()),
      'Без этого ID юнит-кейсов живут только в markdown: ни отфильтровать, ни проверить',
    ).toEqual([]);
  });

  test('правило 8 — каждый юнит-спек в apps/**/src/** упомянут в *.unit.cases.md', () => {
    expect(
      violationsRule8(repoRoot()),
      'Правила 4 и 7 односторонние: без правила 8 новый юнит-спек выпадет из документации молча',
    ).toEqual([]);
  });
});

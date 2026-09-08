#!/usr/bin/env node
/**
 * Проверка раздела 0 «Ориентация» во всех активных планах (`docs/plans/*.plan.md`).
 *
 * Зачем отдельный скрипт, а не кейс в сьюте: эта же проверка стоит в `.husky/pre-commit`, где
 * поднимать Playwright с двумя dev-серверами нельзя — хук должен отрабатывать за миллисекунды.
 * Логика живёт в одном месте и вызывается из трёх: хук, `pnpm check:orientation`, `pnpm verify`.
 *
 * Что именно не даём сделать: сдать план с пустой или отписочной ориентацией. До этой проверки
 * «пустой ответ означает, что шаг пропустили» было соглашением — то есть не значило ничего.
 *
 * Чего проверка НЕ умеет и не должна: понять, что задача дубль по сути. Она проверяет, что
 * ориентацию провели и записали, а смысл ответов оценивает ревью. Граница проведена намеренно:
 * проверка, притворяющаяся умнее, чем она есть, вреднее отсутствующей.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PLANS_DIR = 'docs/plans';
const TEMPLATE = 'docs/plans/TEMPLATE.md';
const PLAN_SUFFIX = '.plan.md';
const LEDGER_FILES = ['docs/CHANGELOG.md', 'docs/BACKLOG.md'];

/** Минимальная длина ответа. «нет» — не ответ; «нет: … потому что …» — ответ. */
const MIN_ANSWER_LENGTH = 20;

/**
 * Отписки, которые формально непусты. Список закрытый: свободная эвристика начала бы отклонять
 * законные короткие ответы, а закрытый список ловит именно галочку.
 */
const PLACEHOLDERS = [
  '—',
  '-',
  '--',
  '?',
  '??',
  'todo',
  'tbd',
  'n/a',
  'na',
  'нет',
  'нет.',
  'да',
  'не знаю',
  'не применимо',
  'ок',
  'ok',
  '...',
  '…',
];

/** Четыре вопроса ориентации. `needsLedgerProof` — ответ обязан опираться на реестр. */
const QUESTIONS = [
  { label: 'Дубль', needsLedgerProof: true },
  { label: 'Конфликт с реализованным', needsLedgerProof: false },
  { label: 'Конфликт с планируемым', needsLedgerProof: true },
  { label: 'Неясности', needsLedgerProof: false },
];

/** ID записи реестра. */
const LEDGER_ID = /\b(?:FT|CH|FX|BL)-\d{3}\b/g;

/**
 * Явное отрицание для вопросов, требующих опоры на реестр: «в реестре смотрел, совпадений нет».
 * Фиксированные формулировки, а не любое слово «нет»: иначе доказательством станет само слово.
 */
const EXPLICIT_NO_MATCH = ['совпадений нет', 'нет совпадений', 'совпадений не найдено'];

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

/** ID, объявленные в реестре: ответ не может ссылаться на несуществующую запись. */
function declaredLedgerIds(root) {
  const ids = new Set();

  for (const file of LEDGER_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) {
      continue;
    }
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const row = /^\|\s*((?:FT|CH|FX|BL)-\d{3})\s*\|/.exec(line);
      if (row !== null) {
        ids.add(row[1]);
      }
    }
  }

  return ids;
}

function activePlans(root) {
  const dir = join(root, PLANS_DIR);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((name) => name.endsWith(PLAN_SUFFIX))
    .map((name) => `${PLANS_DIR}/${name}`);
}

/** Текст после метки `- **Метка:**` до конца абзаца. */
function answerFor(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*-\\s*\\*\\*${escaped}:\\*\\*(.*)$`, 'm');
  const match = pattern.exec(content);

  if (match === null) {
    return null;
  }

  // Ответ может продолжаться на следующих строках с отступом — забираем их тоже.
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => pattern.test(line));
  const collected = [match[1]];

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*-\s*\*\*/.test(line) || line.trim() === '' || /^#/.test(line)) {
      break;
    }
    collected.push(line);
  }

  return collected.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Ответы из самого шаблона — эталон «поле не заполнено».
 *
 * Без этой сверки незаполненный план проходил проверку: текст-подсказка шаблона длиннее
 * порога и содержит фразу «совпадений нет» из инструкции, то есть формально удовлетворял всем
 * правилам. Поймано контрольным опытом «создать план и не заполнять» — ровно тем сценарием,
 * который проверка обязана ловить в первую очередь.
 */
function templateAnswers(root) {
  const answers = new Map();
  const path = join(root, TEMPLATE);

  if (!existsSync(path)) {
    return answers;
  }

  const content = readFileSync(path, 'utf8');

  for (const { label } of QUESTIONS) {
    const answer = answerFor(content, label);
    if (answer !== null) {
      answers.set(label, normalize(answer));
    }
  }

  return answers;
}

/** Сравнение по существу: регистр, пробелы и разметка не должны спасать от совпадения. */
function normalize(text) {
  return text.toLowerCase().replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
}

function violations(root) {
  const problems = [];
  const declared = declaredLedgerIds(root);
  const fromTemplate = templateAnswers(root);
  const plans = activePlans(root);

  for (const plan of plans) {
    const content = readFileSync(join(root, plan), 'utf8');

    if (!/^##\s*0\.\s*Ориентация/m.test(content)) {
      problems.push(
        `${plan}: нет раздела «## 0. Ориентация». Скопируй его из docs/plans/TEMPLATE.md — ` +
          'планирование начинается с чтения реестра и бэклога, а не с кода',
      );
      continue;
    }

    for (const { label, needsLedgerProof } of QUESTIONS) {
      const answer = answerFor(content, label);

      if (answer === null) {
        problems.push(`${plan}: нет строки «- **${label}:**» в разделе 0`);
        continue;
      }
      if (answer === '') {
        problems.push(`${plan}: ответ на «${label}» пуст`);
        continue;
      }
      if (PLACEHOLDERS.includes(answer.toLowerCase().replace(/[`*]/g, '').trim())) {
        problems.push(
          `${plan}: ответ на «${label}» — отписка («${answer}»). Нужен ответ по существу: ` +
            'что именно нашёл в реестре и бэклоге и что из этого следует',
        );
        continue;
      }
      if (fromTemplate.get(label) === normalize(answer)) {
        problems.push(
          `${plan}: ответ на «${label}» — это текст-подсказка из шаблона, то есть поле не ` +
            'заполняли. Ориентация начинается с чтения docs/CHANGELOG.md и docs/BACKLOG.md, ' +
            'а не с копирования шаблона',
        );
        continue;
      }
      if (answer.length < MIN_ANSWER_LENGTH) {
        problems.push(
          `${plan}: ответ на «${label}» короче ${MIN_ANSWER_LENGTH} символов («${answer}») — ` +
            'это галочка, а не ориентация',
        );
        continue;
      }

      if (!needsLedgerProof) {
        continue;
      }

      const cited = [...answer.matchAll(LEDGER_ID)].map((match) => match[0]);
      const unknown = cited.filter((id) => !declared.has(id));
      const saysNoMatch = EXPLICIT_NO_MATCH.some((phrase) => answer.toLowerCase().includes(phrase));

      if (unknown.length > 0) {
        problems.push(
          `${plan}: ответ на «${label}» ссылается на ${unknown.join(', ')} — таких записей в ` +
            'реестре нет',
        );
        continue;
      }
      if (cited.length === 0 && !saysNoMatch) {
        problems.push(
          `${plan}: ответ на «${label}» не опирается на реестр. Укажи ID записей ` +
            `(FT-/CH-/FX-/BL-) либо напиши прямо «совпадений нет» и почему — иначе неясно, ` +
            'смотрел ли ты docs/CHANGELOG.md и docs/BACKLOG.md вообще',
        );
      }
    }
  }

  return { problems, planCount: plans.length };
}

const root = repoRoot();
const { problems, planCount } = violations(root);

if (problems.length > 0) {
  console.error('\nОриентация не пройдена — планирование не может продолжаться:\n');
  problems.forEach((problem) => console.error(`  • ${problem}`));
  console.error(
    '\nПорядок: прочитать docs/CHANGELOG.md (что делали, включая все дефекты) и ' +
      'docs/BACKLOG.md (что предстоит и что уже отклонено), затем заполнить раздел 0 плана.\n' +
      'Если задача оказалась дублем — это результат работы, а не отказ: скажи об этом и ' +
      'остановись.\n',
  );
  process.exit(1);
}

console.log(
  planCount === 0
    ? `Активных планов (${PLANS_DIR}/*${PLAN_SUFFIX}) нет — проверять нечего.`
    : `Ориентация пройдена в ${planCount} плане(ах).`,
);

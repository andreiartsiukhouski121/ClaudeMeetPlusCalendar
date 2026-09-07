import { expect, test, type APIRequestContext } from '@playwright/test';

import { authHeadersFor } from '../../fixtures/auth.api.js';
import { FUTURE_STARTS_AT_ISO, SEED_USERS, TEACHER_MEETINGS } from '../../fixtures/seed.js';

/**
 * Контракт `GET /meetings` и `POST /meetings`. Кейсы — в парном
 * `home-dashboard.api.cases.md`; заголовок каждого теста начинается с ID кейса.
 *
 * Проект `api`: фикстура `request`, `baseURL = http://127.0.0.1:3101`, браузер не поднимается.
 * Пути относительные — абсолютный URL обошёл бы `baseURL` проекта и увёл прогон на чужой порт.
 *
 * Данные — только из `fixtures/seed.ts` (тест-план §5.6). Точные числа проверяются
 * исключительно на `teacher`/`student`: их мутировать запрещено. Мутирующие кейсы работают
 * под `planner` — он выделен именно для `*.api.spec.ts`, тогда как `*.functional.spec.ts`
 * мутирует `organizer`. Так снимается межпроектная гонка при `fullyParallel: true`
 * (тест-план §5.4), потому что `GET /meetings` изолирован по владельцу.
 */

const TEACHER = SEED_USERS.teacher;

/** Форма тела ошибки Nest, выведенная из `HttpException.createBody` (план имплементации §2.1). */
interface ErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

interface MeetingItem {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
}

interface MeetingsPageBody {
  items?: MeetingItem[];
  total?: number;
}

const UNAUTHORIZED = 'Требуется авторизация';

/** Ключи элемента списка по контракту §2: `ownerId` среди них нет — его срезает `toMeetingDto`. */
const MEETING_KEYS = ['durationMinutes', 'id', 'startsAt', 'title'];

/**
 * Заголовок создаваемой встречи — всегда уникальный: иначе `toContainText` совпал бы со
 * встречей от прошлого прогона (in-memory store живёт, пока жив процесс Nest).
 */
function uniqueTitle(prefix: string): string {
  return `${prefix} ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
}

/**
 * Хелперы вынесены из тел тестов не для красоты: `playwright/no-conditional-in-test`
 * стоит в `error`, а условие внутри теста — блокер по §6.3.
 */
function isNonIncreasing(values: number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] >= value);
}

async function readPage(
  request: APIRequestContext,
  headers: Record<string, string>,
  query = '',
): Promise<MeetingsPageBody> {
  const response = await request.get(`/meetings${query}`, { headers });

  expect(response.status()).toBe(200);

  return (await response.json()) as MeetingsPageBody;
}

/** `total` владельца. Мутирующие кейсы считают от него, а не от абсолютного числа. */
async function readTotal(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<number> {
  const page = await readPage(request, headers);

  return Number(page.total);
}

test.describe('Главная: контракт API', { tag: ['@regression', '@home-dashboard'] }, () => {
  test(
    'HD-API-01 — GET /meetings с токеном возвращает список и total',
    { tag: '@p0' },
    async ({ request }) => {
      const headers = await authHeadersFor(request, 'teacher');
      const response = await request.get('/meetings', { headers });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const body = (await response.json()) as MeetingsPageBody;

      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.total).toBe('number');
      expect(body.items?.length).toBeGreaterThan(0);

      for (const item of body.items ?? []) {
        // Именно полный набор ключей, а не «есть id»: так кейс ловит и утечку `ownerId`.
        expect(Object.keys(item).sort()).toEqual(MEETING_KEYS);
        expect(item).not.toHaveProperty('ownerId');
        expect(typeof item.startsAt).toBe('string');
        expect(Number.isNaN(Date.parse(item.startsAt))).toBe(false);
        expect(typeof item.durationMinutes).toBe('number');
      }

      // Текст ответа, а не разобранный объект: секрет мог бы уехать во вложенном поле.
      const text = await response.text();
      expect(text).not.toContain('passwordHash');
      expect(text).not.toContain(TEACHER.password);
      expect(text).not.toContain('ownerId');
    },
  );

  test('HD-API-02 — GET /meetings без токена даёт 401', { tag: '@p0' }, async ({ request }) => {
    const response = await request.get('/meetings');

    expect(response.status()).toBe(401);

    const body = (await response.json()) as ErrorBody & MeetingsPageBody;

    expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
    expect(body.items).toBeUndefined();
  });

  test('HD-API-03 — limit=3 отдаёт ровно 3 элемента', { tag: '@p0' }, async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');
    const body = await readPage(request, headers, `?limit=${String(TEACHER_MEETINGS.latestLimit)}`);

    expect(body.items).toHaveLength(TEACHER_MEETINGS.latestLimit);
  });

  test('HD-API-04 — сортировка по дате DESC', { tag: '@p0' }, async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');
    const body = await readPage(request, headers, `?limit=${String(TEACHER_MEETINGS.latestLimit)}`);
    const items = body.items ?? [];

    expect(isNonIncreasing(items.map((item) => Date.parse(item.startsAt)))).toBe(true);
    expect(items.map((item) => item.title)).toEqual([...TEACHER_MEETINGS.latestTitles]);

    // Две самые старые встречи срез обязан отсечь — половина смысла кейса именно тут.
    for (const omitted of TEACHER_MEETINGS.omittedTitles) {
      expect(items.map((item) => item.title)).not.toContain(omitted);
    }
  });

  test(
    'HD-API-05 — total это полное число встреч, а не длина items',
    { tag: '@p0' },
    async ({ request }) => {
      const headers = await authHeadersFor(request, 'teacher');
      const body = await readPage(
        request,
        headers,
        `?limit=${String(TEACHER_MEETINGS.latestLimit)}`,
      );

      expect(body.total).toBe(TEACHER_MEETINGS.total);
      expect(body.items).toHaveLength(TEACHER_MEETINGS.latestLimit);
      // Контрольный опыт T2.10 (`total = items.length`) обязан ронять именно этот ассерт.
      expect(body.total).not.toBe(body.items?.length);
    },
  );

  test('HD-API-06 — изоляция данных между пользователями', { tag: '@p0' }, async ({ request }) => {
    const teacherHeaders = await authHeadersFor(request, 'teacher');
    const studentHeaders = await authHeadersFor(request, 'student');

    const teacherPage = await readPage(request, teacherHeaders, '?limit=100');
    const studentPage = await readPage(request, studentHeaders, '?limit=100');

    const teacherIds = (teacherPage.items ?? []).map((item) => item.id);
    const studentIds = (studentPage.items ?? []).map((item) => item.id);

    expect(teacherIds.length).toBeGreaterThan(0);
    expect(studentIds).toEqual([]);
    expect(teacherIds.filter((id) => studentIds.includes(id))).toEqual([]);
    expect(studentPage.total).toBe(SEED_USERS.student.meetingsCount);
    expect(teacherPage.total).toBe(TEACHER_MEETINGS.total);
  });

  test('HD-API-07 — пользователь без встреч', async ({ request }) => {
    const headers = await authHeadersFor(request, 'student');
    const response = await request.get('/meetings?limit=3', { headers });

    // Именно 200, а не 404: отсутствие встреч — нормальное состояние, а не «не найдено».
    expect(response.status()).toBe(200);

    const body = (await response.json()) as MeetingsPageBody;

    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  test('HD-API-08 — нечисловой limit даёт 400', async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');
    const response = await request.get('/meetings?limit=abc', { headers });

    // Ни 500, ни «молча проигнорировали»: параметр разбирается и валидируется.
    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorBody;

    expect(Array.isArray(body.message)).toBe(true);
    // Сверка по вхождению: на нечисловом значении приходят три сообщения сразу (§2.1).
    expect(body.message.toString()).toContain('limit');
  });

  test('HD-API-09 — limit вне диапазона 1..100 даёт 400', async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');

    for (const limit of ['0', '-1', '101']) {
      const response = await request.get(`/meetings?limit=${limit}`, { headers });

      expect(response.status(), `limit=${limit} обязан давать 400`).toBe(400);

      const body = (await response.json()) as ErrorBody;
      expect(body.message.toString()).toContain('limit');
    }

    const tooBig = await request.get('/meetings?limit=101', { headers });
    const tooBigBody = (await tooBig.json()) as ErrorBody;

    // Верхняя граница контракта — ровно 100 (`@Max(100)`), а не 50.
    expect(tooBigBody.message.toString()).toContain('limit must not be greater than 100');
  });

  test('HD-API-10 — контракт limit: дефолт, превышение, неизвестный параметр', async ({
    request,
  }) => {
    const headers = await authHeadersFor(request, 'teacher');

    // Шаг 2. Без параметра — 200 и документированный дефолт 3. Именно этот шаг ловит
    // пропущенный `@IsOptional()`: без него ответ 400, и дашборд не грузится вовсе.
    const byDefault = await request.get('/meetings', { headers });
    expect(byDefault.status()).toBe(200);

    const byDefaultBody = (await byDefault.json()) as MeetingsPageBody;
    expect(byDefaultBody.items).toHaveLength(TEACHER_MEETINGS.latestLimit);
    expect(byDefaultBody.total).toBe(TEACHER_MEETINGS.total);

    // Шаг 3. `limit=100` — «отдай всё»: верхняя граница контракта.
    const full = await readPage(request, headers, '?limit=100');
    expect(full.items).toHaveLength(TEACHER_MEETINGS.total);
    expect(full.total).toBe(TEACHER_MEETINGS.total);

    // Шаг 4. `forbidNonWhitelisted` работает и на query, а не только на теле запроса.
    const unknownParam = await request.get('/meetings?limit=3&foo=bar', { headers });
    expect(unknownParam.status()).toBe(400);

    const unknownParamBody = (await unknownParam.json()) as ErrorBody;
    expect(unknownParamBody.message.toString()).toContain('property foo should not exist');
  });
});

/**
 * Кейсы под `planner`. Serial — страховка поверх изоляции данными: внутри одного файла два
 * теста под одним владельцем иначе могли бы уехать в разные воркеры, а `HD-API-14`,
 * `HD-API-15` и `HD-API-16` читают `total` до и после запроса и покраснели бы от чужой
 * вставки. Ассерты на счётчики — только относительные (`N` → `N + 1`).
 */
test.describe(
  'Главная: контракт API под planner',
  { tag: ['@regression', '@home-dashboard'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'HD-API-13 — POST /meetings создаёт встречу',
      { tag: ['@p0', '@mutating'] },
      async ({ request }) => {
        const headers = await authHeadersFor(request, 'planner');
        const before = await readTotal(request, headers);
        const title = uniqueTitle('E2E API встреча');

        const created = await request.post('/meetings', {
          headers,
          data: { title, startsAt: FUTURE_STARTS_AT_ISO, durationMinutes: 30 },
        });

        // 201 — правильный ответ на POST, декоратора кода здесь не требуется (§2.2 п.2).
        expect(created.status()).toBe(201);

        const createdBody = (await created.json()) as MeetingItem;
        expect(typeof createdBody.id).toBe('string');
        expect(createdBody.title).toBe(title);
        expect(createdBody.durationMinutes).toBe(30);

        const after = await readPage(request, headers, '?limit=3');
        expect(after.total).toBe(before + 1);
        // Дата 2030 года гарантирует, что новая встреча попала в топ-3: при дате раньше
        // сид-встречи владельца (2026-01-16) кейс был бы ложно-красным.
        expect((after.items ?? []).map((item) => item.title)).toContain(title);
      },
    );

    test(
      'HD-API-14 — POST /meetings без токена даёт 401 и данные не меняются',
      { tag: '@p0' },
      async ({ request }) => {
        const headers = await authHeadersFor(request, 'planner');
        const before = await readTotal(request, headers);

        const response = await request.post('/meetings', {
          data: { title: uniqueTitle('Без токена'), startsAt: FUTURE_STARTS_AT_ISO },
        });

        expect(response.status()).toBe(401);

        const body = (await response.json()) as ErrorBody;
        expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });

        expect(await readTotal(request, headers)).toBe(before);
      },
    );

    test('HD-API-15 — POST /meetings без обязательных полей даёт 400', async ({ request }) => {
      const headers = await authHeadersFor(request, 'planner');
      const before = await readTotal(request, headers);

      const response = await request.post('/meetings', { headers, data: {} });

      expect(response.status()).toBe(400);

      const body = (await response.json()) as ErrorBody;

      expect(Array.isArray(body.message)).toBe(true);
      expect(body.message.toString()).toContain('title');
      expect(body.message.toString()).toContain('startsAt');

      expect(await readTotal(request, headers)).toBe(before);
    });

    test('HD-API-16 — POST /meetings с лишним полем даёт 400', async ({ request }) => {
      const headers = await authHeadersFor(request, 'planner');
      const before = await readTotal(request, headers);

      const response = await request.post('/meetings', {
        headers,
        data: {
          title: uniqueTitle('Подмена владельца'),
          startsAt: FUTURE_STARTS_AT_ISO,
          ownerId: 'usr-teacher',
        },
      });

      expect(response.status()).toBe(400);

      const body = (await response.json()) as ErrorBody;
      expect(body.message.toString()).toContain('property ownerId should not exist');

      expect(await readTotal(request, headers)).toBe(before);
    });

    test(
      'HD-API-17 — созданная встреча принадлежит владельцу токена',
      { tag: '@mutating' },
      async ({ request }) => {
        const plannerHeaders = await authHeadersFor(request, 'planner');
        const title = uniqueTitle('Встреча planner');

        const created = await request.post('/meetings', {
          headers: plannerHeaders,
          data: { title, startsAt: FUTURE_STARTS_AT_ISO },
        });

        expect(created.status()).toBe(201);

        const createdBody = (await created.json()) as MeetingItem;
        const teacherPage = await readPage(
          request,
          await authHeadersFor(request, 'teacher'),
          '?limit=100',
        );
        const teacherItems = teacherPage.items ?? [];

        // `limit=100` допустим ровно потому, что верхняя граница контракта — `@Max(100)`.
        expect(teacherItems.map((item) => item.id)).not.toContain(createdBody.id);
        expect(teacherItems.map((item) => item.title)).not.toContain(title);
        expect(teacherPage.total).toBe(TEACHER_MEETINGS.total);
      },
    );

    test(
      'HD-API-20 — POST /meetings без durationMinutes даёт 201 и дефолт 60',
      { tag: ['@p0', '@mutating'] },
      async ({ request }) => {
        const headers = await authHeadersFor(request, 'planner');
        const title = uniqueTitle('Встреча без длительности');

        const response = await request.post('/meetings', {
          headers,
          // Ровно то тело, что отправляет форма дашборда: без `durationMinutes`.
          data: { title, startsAt: FUTURE_STARTS_AT_ISO },
        });

        // Без `@IsOptional()` на поле DTO здесь приходит 400 — и кнопка «Создать встречу»
        // не работает вовсе. Это и есть смысл кейса.
        expect(response.status()).toBe(201);

        const body = (await response.json()) as MeetingItem;
        expect(body.title).toBe(title);
        expect(body.durationMinutes).toBe(60);
        expect(Object.keys(body).sort()).toEqual(MEETING_KEYS);
      },
    );
  },
);

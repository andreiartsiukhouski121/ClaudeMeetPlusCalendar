import { createHmac } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { loginApi, authHeaders } from '../fixtures/auth.api.js';
import { FUTURE_STARTS_AT_ISO, SEED_USERS } from '../fixtures/seed.js';

/**
 * Межфичевые инварианты безопасности. Кейсы — в парном `security.api.cases.md`.
 *
 * Отличие от проверок внутри фич: `AL-API-14` фиксирует, что `GET /auth/me` без токена даёт 401 —
 * это контракт логина. Здесь проверяется, что **ни один** защищённый маршрут не отвечает без
 * токена, включая те, которых на момент написания ещё нет: добавил маршрут — допиши в
 * `PROTECTED_ROUTES`, и кейс подхватит его сам.
 *
 * Проект `api`: браузер не поднимается, `baseURL` = `http://127.0.0.1:3101`.
 */

/** Защищённые маршруты. Добавляя эндпоинт с guard'ом, добавь строку сюда. */
const PROTECTED_ROUTES = [
  { method: 'GET' as const, path: '/auth/me' },
  { method: 'GET' as const, path: '/meetings?limit=3' },
  { method: 'POST' as const, path: '/meetings' },
];

/** POST-маршруты с DTO — для проверки, что `forbidNonWhitelisted` включён глобально. */
const POST_ROUTES = [
  {
    path: '/auth/login',
    valid: { email: SEED_USERS.teacher.email, password: SEED_USERS.teacher.password },
    needsToken: false,
  },
  {
    path: '/meetings',
    valid: { title: 'Проверка whitelist', startsAt: FUTURE_STARTS_AT_ISO },
    needsToken: true,
  },
];

/** Значения, которых не должно быть ни в одном ответе. */
const SECRET_MARKERS = ['scrypt', 'passwordHash', 'password', SEED_USERS.teacher.password];

async function callRoute(
  request: APIRequestContext,
  route: { method: 'GET' | 'POST'; path: string },
  headers: Record<string, string> = {},
) {
  return route.method === 'GET'
    ? request.get(route.path, { headers })
    : request.post(route.path, { headers, data: {} });
}

test.describe('Безопасность: API', { tag: '@security' }, () => {
  test(
    'SEC-API-01 — все защищённые эндпоинты требуют токен',
    { tag: '@p0' },
    async ({ request }) => {
      // Тип задан явно: без него вывод даёт union `{Authorization?: undefined} | {Authorization: string}`,
      // который не подходит под `Record<string, string>` в опциях запроса.
      const headerVariants: Record<string, string>[] = [{}, { Authorization: 'Bearer' }];

      for (const route of PROTECTED_ROUTES) {
        for (const headers of headerVariants) {
          const response = await callRoute(request, route, headers);

          expect(
            response.status(),
            `${route.method} ${route.path} без валидного токена обязан отдавать 401`,
          ).toBe(401);

          const body = await response.text();
          // Не только код, но и отсутствие полезной нагрузки: 401 с данными в теле — тоже утечка.
          expect(body).not.toContain('accessToken');
          expect(body).not.toContain('items');
          expect(body).not.toContain(SEED_USERS.teacher.email);
        }
      }
    },
  );

  test('SEC-API-02 — подделанный токен даёт 401, а не 500', { tag: '@p0' }, async ({ request }) => {
    const valid = await loginApi(request, 'teacher');

    for (const header of brokenAuthorizationHeaders(valid)) {
      const response = await request.get('/auth/me', { headers: { Authorization: header } });

      // 500 означала бы, что исключение из разбора токена доходит до обработчика ошибок.
      expect(response.status(), `заголовок «${header.slice(0, 24)}…» обязан давать 401`).toBe(401);
    }
  });

  test(
    'SEC-API-03 — токен, подписанный другим секретом, отвергается',
    { tag: '@p0' },
    async ({ request }) => {
      const base64url = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '');

      const header = base64url({ alg: 'HS256', typ: 'JWT' });
      const payload = base64url({
        sub: 'usr-teacher',
        email: SEED_USERS.teacher.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const signature = createHmac('sha256', 'совершенно-другой-секрет')
        .update(`${header}.${payload}`)
        .digest('base64url')
        .replace(/=+$/, '');

      const response = await request.get('/auth/me', {
        headers: authHeaders(`${header}.${payload}.${signature}`),
      });

      // Подпись здесь арифметически корректна — проверяется, что секрет вообще сверяется.
      expect(response.status()).toBe(401);
    },
  );

  test(
    'SEC-API-04 — ни один ответ не содержит хеша или пароля',
    { tag: '@p0' },
    async ({ request }) => {
      const token = await loginApi(request, 'teacher');
      const responses = [
        await request.post('/auth/login', {
          data: { email: SEED_USERS.teacher.email, password: SEED_USERS.teacher.password },
        }),
        await request.get('/auth/me', { headers: authHeaders(token) }),
        await request.get('/meetings?limit=3', { headers: authHeaders(token) }),
      ];

      for (const response of responses) {
        // Именно текст, а не разобранный объект: разбор пропустит секрет во вложенном поле
        // или в сообщении об ошибке.
        const body = await response.text();

        for (const marker of SECRET_MARKERS) {
          expect(body, `в ответе ${response.url()} найдено «${marker}»`).not.toContain(marker);
        }
      }
    },
  );

  test(
    'SEC-API-05 — время ответа не выдаёт существование аккаунта',
    { tag: '@p0' },
    async ({ request }) => {
      const median = async (email: string): Promise<number> => {
        const samples: number[] = [];

        for (let i = 0; i < 5; i += 1) {
          const started = Date.now();
          const response = await request.post('/auth/login', {
            data: { email, password: 'definitely-wrong-password' },
          });
          samples.push(Date.now() - started);
          expect(response.status()).toBe(401);
        }

        return samples.sort((a, b) => a - b)[2];
      };

      const unknownAccount = await median('nobody@purpleschool.test');
      const wrongPassword = await median(SEED_USERS.teacher.email);

      /*
       * Порог мягкий намеренно: медианы измеряются под нагрузкой прогона, и цель — поймать
       * возврат раннего выхода без сверки пароля, а не измерить микросекунды.
       *
       * Замер до правки: неизвестный email 52 мс против 86–114 мс на неверном пароле —
       * то есть отношение около 2, стабильно различимое с первой попытки.
       */
      const ratio =
        Math.max(unknownAccount, wrongPassword) /
        Math.max(1, Math.min(unknownAccount, wrongPassword));

      expect(
        ratio,
        `медианы: неизвестный email ${unknownAccount} мс, неверный пароль ${wrongPassword} мс — ` +
          'разница выдаёт существование аккаунта',
      ).toBeLessThan(2.5);
    },
  );

  test('SEC-API-06 — тела ошибок не содержат стектрейса и путей файлов', async ({ request }) => {
    const errors = [
      await request.post('/auth/login', { data: { email: 'not-an-email' } }),
      await request.get('/meetings'),
      await request.get('/definitely-no-such-route'),
    ];

    for (const response of errors) {
      const body = await response.text();

      expect(body).not.toContain('stack');
      expect(body).not.toContain('node_modules');
      expect(body).not.toContain('.ts:');
      expect(body).not.toMatch(/\bat\s+\w+\s+\(/); // строка трассировки вида "at fn ("
      expect(body).not.toMatch(/[A-Za-z]:\\/); // абсолютный путь Windows

      const parsed: unknown = JSON.parse(body);
      expect(Object.keys(parsed as object).sort()).toEqual(['error', 'message', 'statusCode']);
    }
  });

  test('SEC-API-07 — лишние поля отвергаются на всех POST-эндпоинтах', async ({ request }) => {
    const token = await loginApi(request, 'planner');

    for (const route of POST_ROUTES) {
      const response = await request.post(route.path, {
        headers: route.needsToken ? authHeaders(token) : {},
        data: { ...route.valid, isAdmin: true, ownerId: 'usr-teacher' },
      });

      expect(response.status(), `${route.path} обязан отвергать лишние поля`).toBe(400);
      expect(await response.text()).toContain('should not exist');
    }
  });

  test('SEC-API-08 — ответ не раскрывает стек сервера', async ({ request }) => {
    for (const response of [
      await request.get('/'),
      await request.post('/auth/login', { data: {} }),
    ]) {
      const headers = response.headers();

      // Express отдаёт X-Powered-By по умолчанию — подсказка, какой стек и какие CVE пробовать.
      expect(headers, `ответ ${response.url()} раскрывает стек`).not.toHaveProperty('x-powered-by');
    }
  });

  test(
    'SEC-API-09 — данные пользователя недоступны под чужим токеном',
    { tag: '@p0' },
    async ({ request }) => {
      const teacherToken = await loginApi(request, 'teacher');
      const studentToken = await loginApi(request, 'student');

      const idsOf = async (token: string): Promise<string[]> => {
        const response = await request.get('/meetings?limit=100', { headers: authHeaders(token) });
        await expect(response).toBeOK();
        const body = (await response.json()) as { items: { id: string }[] };

        return body.items.map((item) => item.id);
      };

      const teacherIds = await idsOf(teacherToken);
      const studentIds = await idsOf(studentToken);

      expect(teacherIds.length).toBeGreaterThan(0);
      expect(studentIds).toEqual([]);
      expect(teacherIds.filter((id) => studentIds.includes(id))).toEqual([]);
    },
  );

  test('SEC-API-10 — в репозитории нет секретов и .env', async () => {
    const offenders = collectSecretOffenders(findRepoRoot());

    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

/**
 * Заголовки `Authorization`, которые сервер обязан отвергнуть.
 *
 * Собраны хелпером, а не в теле теста: ветвление внутри `test` запрещено правилом
 * `playwright/no-conditional-in-test`, поднятым до `error` осознанно — условие в тесте прячет
 * непройденную ветку, и тест остаётся зелёным, проверив половину.
 */
function brokenAuthorizationHeaders(validToken: string): string[] {
  const tamperedSignature = `${validToken.slice(0, -1)}${validToken.at(-1) === 'a' ? 'b' : 'a'}`;

  return [
    `Bearer ${tamperedSignature}`,
    'Bearer not.a.jwt',
    'Bearer ',
    'Basic dXNlcjpwYXNz',
    validToken, // валидный токен, но без схемы `Bearer`
  ];
}

/** Каталоги, которые обход секретов не смотрит: не наш код либо артефакты сборки. */
const SECRET_SCAN_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
]);

const SCANNED_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|json|md|yaml|yml|css|env|example|mts)$/;

/** Файлы репозитория с признаками секретов. Обход вне теста — по той же причине. */
function collectSecretOffenders(repoRoot: string): string[] {
  const offenders: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (statSync(full).isDirectory()) {
        if (!SECRET_SCAN_SKIP_DIRS.has(entry)) {
          walk(full);
        }
        continue;
      }

      const rel = relative(repoRoot, full).split(sep).join('/');

      // Сам этот спек содержит слова-маркеры по делу — иначе кейс ловил бы себя.
      if (rel === 'e2e/security/security.api.spec.ts') {
        continue;
      }

      if (/(^|\/)\.env($|\.)/.test(rel) && !rel.endsWith('.env.example')) {
        offenders.push(`${rel}: файл .env не должен попадать в репозиторий`);
        continue;
      }

      if (!SCANNED_EXTENSIONS.test(entry)) {
        continue;
      }

      const content = readFileSync(full, 'utf8');

      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) {
        offenders.push(`${rel}: приватный ключ`);
      }
      // Похоже на настоящий JWT: три base64-сегмента, суммарно длиннее 80 символов.
      if (/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) {
        offenders.push(`${rel}: строка, похожая на выпущенный JWT`);
      }
    }
  };

  walk(repoRoot);

  return offenders;
}

/**
 * Корень репозитория — поиском `pnpm-workspace.yaml` вверх от `config.rootDir`.
 *
 * Просто `config.rootDir` брать нельзя: он равен разрешённому `testDir`, то есть `<repo>/e2e`,
 * и обход по нему нашёл бы ноль файлов — кейс проходил бы вакуумно при любом закоммиченном
 * секрете. Ровно на этом уже спотыкался мета-тест конвенции, поэтому здесь та же формула, что
 * и в нём. `import.meta.dirname` не подходит: Playwright грузит спеки как CJS.
 */
function findRepoRoot(): string {
  let dir = test.info().config.rootDir;

  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`не найден pnpm-workspace.yaml ни в ${dir}, ни выше`);
    }
    dir = parent;
  }
}

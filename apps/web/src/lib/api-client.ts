/**
 * Клиент Nest для серверной части Next (BFF). Браузер сюда не попадает: весь трафик
 * страницы идёт в Next, а Next — в Nest (план имплементации §1.3).
 *
 * ВАЖНО: в файле НЕТ ни `import 'server-only'`, ни `next/headers`. Next алиасит `server-only`
 * на `next/dist/compiled/server-only`, которого нет в `node_modules`, и Vitest такой импорт не
 * резолвит (§0, риск 6) — а `resolveApiUrl` и нормализация сообщения ошибки покрыты юнитами
 * `AL-UT-23…26`. Всё, что требует `cookies()`, живёт в `session.ts`.
 */

/** Дефолт базы API (§3.6). Тот же адрес, что слушает `pnpm dev:api`. */
export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';

/**
 * Абсолютный URL эндпоинта Nest. Чистая функция: базу можно передать аргументом (так её
 * подставляют юниты), иначе берётся `process.env.API_URL` — Playwright задаёт его равным
 * `http://127.0.0.1:3101` через `webServer.env`.
 *
 * `process.env` читается на каждом вызове, а не один раз при загрузке модуля: иначе значение
 * замерзало бы на момент импорта, и переменная из `webServer.env` могла бы не примениться.
 */
export function resolveApiUrl(path: string, base?: string): string {
  const rawBase = base ?? process.env.API_URL ?? DEFAULT_API_BASE_URL;
  // Трейлинг-слэши базы срезаются, ведущий слэш пути добавляется: иначе `http://x:3001/`
  // плюс `/auth/me` дают `http://x:3001//auth/me`, и Nest отвечает 404.
  const normalizedBase = rawBase.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

/** Тело ошибки Nest: `message` — строка у `HttpException`, массив строк у `ValidationPipe` (§2.1). */
interface NestErrorBody {
  message?: unknown;
}

/**
 * Ошибка HTTP от Nest. Несёт статус, потому что решение «что показать пользователю» принимает
 * `loginAction`: 401 → «Неверный email или пароль», 400 → «Проверьте формат email».
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Собирает ошибку из разобранного тела ответа, нормализуя `message` из **обеих** форм
   * (`AL-UT-26`): у брошенного Nest-ом `UnauthorizedException` это строка, у `ValidationPipe`
   * — массив строк. Без нормализации пользователь увидел бы `[object Object]`.
   */
  static fromBody(status: number, body: unknown): ApiError {
    return new ApiError(status, extractErrorMessage(body, `HTTP ${String(status)}`));
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) {
    return fallback;
  }

  const { message } = body as NestErrorBody;

  if (typeof message === 'string' && message !== '') {
    return message;
  }
  if (Array.isArray(message)) {
    const lines = message.filter((item): item is string => typeof item === 'string');
    if (lines.length > 0) {
      return lines.join('; ');
    }
  }

  return fallback;
}

export interface ApiFetchOptions {
  /** JWT из cookie сессии. Уходит в `Authorization: Bearer`, если передан. */
  token?: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}

/**
 * Запрос к Nest. На не-2xx бросает `ApiError` — вызывающий Server Action решает, во что её
 * превратить для пользователя.
 *
 * `cache: 'no-store'` стоит явно, хотя в Next 16 `fetch` и так не кэшируется по умолчанию
 * (риск 13): без этой строки первый, кто включит `cacheComponents`, раздаст данные одного
 * пользователя всем остальным.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, method = 'GET', body } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveApiUrl(path), {
    method,
    headers,
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    // Тело ошибки может оказаться и не JSON (упавший прокси, обрыв) — тогда сообщение
    // соберётся из статуса, а не выбросится вторая, менее понятная ошибка.
    const errorBody: unknown = await response.json().catch(() => undefined);
    throw ApiError.fromBody(response.status, errorBody);
  }

  return (await response.json()) as T;
}

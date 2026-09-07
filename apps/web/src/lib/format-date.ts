/**
 * Форматирование даты встречи и разбор значения `<input type="datetime-local">`.
 *
 * Чистый модуль: **без** `import 'server-only'` и без `next/headers` — иначе юниты
 * `HD-UT-10`, `HD-UT-11`, `HD-UT-15`, `HD-UT-16` упали бы на импорте, который Vitest
 * не резолвит (риск 6).
 *
 * Часовой пояс во всём модуле прибит к **UTC** (план имплементации `T2.5`, §8 допущение 7):
 * иначе и юнит-тест, и e2e-ассерты зависели бы от TZ машины, на которой их запускают.
 * Пользователю нужна его локальная зона — это отдельная задача, и делать её надо сразу
 * в двух местах: в отображении и в разборе значения поля формы.
 */

/** Что показываем вместо даты, если строка не разбирается. */
export const INVALID_DATE_PLACEHOLDER = 'Дата не указана';

/**
 * Формат «12 янв. 2026 г., 09:00» — `dateStyle: 'medium'` + `timeStyle: 'short'`.
 *
 * `Intl.DateTimeFormat` создаётся на каждый вызов, а не один раз при загрузке модуля:
 * закэшированный инстанс замер бы вместе с окружением процесса, и `HD-UT-10`
 * («одинаковая строка при `TZ=UTC` и `TZ=Asia/Tokyo`») перестал бы что-либо доказывать.
 * Цена — микросекунды на встречу, их на странице не больше трёх.
 */
function formatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

/**
 * ISO-строка от Nest → человекочитаемая дата и время в UTC.
 *
 * Невалидная строка даёт плейсхолдер, а не `Invalid Date` в разметке и не исключение
 * (`HD-UT-11`): одна битая дата в данных не должна ронять всю страницу дашборда.
 */
export function formatMeetingDateTime(iso: string): string {
  const timestamp = Date.parse(iso);

  if (Number.isNaN(timestamp)) {
    return INVALID_DATE_PLACEHOLDER;
  }

  return formatter().format(new Date(timestamp));
}

/**
 * Значение `<input type="datetime-local">` (`2030-01-01T10:00`) — локальное время **без
 * зоны**. По спецификации ECMAScript такая строка разбирается как локальное время процесса,
 * то есть `Date.parse` дал бы разный результат на разных машинах — ровно то, что запрещает
 * `HD-UT-15`, и ровно то, от чего зависит `HD-FN-07`.
 *
 * Поэтому строке без указания зоны дописывается `Z`: раз встречи и показываются в UTC,
 * введённые «10:00» и отображаются как «10:00». Значение с явной зоной (или уже с `Z`)
 * принимается как есть.
 */
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

/**
 * Разбор поля формы в ISO 8601 UTC. Возвращает `null` — не бросает — на пустой и на
 * неразбираемой строке (`HD-UT-16`): иначе Server Action падал бы в 500 вместо `{ error }`.
 */
export function toIsoStartsAt(raw: string): string | null {
  const value = raw.trim();

  if (value === '') {
    return null;
  }

  const normalized = DATETIME_LOCAL.test(value) ? `${value}Z` : value;
  const timestamp = Date.parse(normalized);

  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

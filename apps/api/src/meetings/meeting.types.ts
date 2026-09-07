/**
 * Типы встреч (план имплементации §3.1).
 *
 * `startsAt` — строка ISO 8601 в UTC (`…Z`), а не `Date`: значение переживает
 * JSON-сериализацию без сюрпризов и стабильно сравнивается в тестах.
 */
export interface Meeting {
  id: string;
  ownerId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
}

/**
 * То, что уходит клиенту. `ownerId` срезается `toMeetingDto`: наружу принадлежность встречи
 * не отдаётся вовсе — проверяет `HD-API-01` по набору ключей элемента.
 */
export type MeetingDto = Omit<Meeting, 'ownerId'>;

/** Ответ `GET /meetings`: срез списка плюс ПОЛНОЕ число встреч владельца. */
export interface MeetingsPageDto {
  items: MeetingDto[];
  /**
   * Не длина `items`, а весь список владельца. Типовая ошибка фичи, вынесена в контрольный
   * опыт `T2.10` и покрыта на трёх уровнях: `HD-UT-03`, `HD-API-05`, `HD-FN-03`.
   */
  total: number;
}

/**
 * Вход `MeetingsService.create`. Поля `ownerId` здесь нет намеренно: владелец берётся из
 * токена (`@CurrentUser()`), а не из тела запроса (`HD-UT-07`, `HD-API-16`, `HD-API-17`).
 */
export interface CreateMeetingInput {
  title: string;
  startsAt: string;
  durationMinutes?: number;
}

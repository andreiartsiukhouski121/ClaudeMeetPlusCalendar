import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { CreateMeetingInput, Meeting } from './meeting.types.js';
import { SEED_MEETINGS } from './meetings.seed.js';

/** Сколько встреч показывает дашборд, если `limit` не передан (контракт §2.2 п.4). */
export const DEFAULT_MEETINGS_LIMIT = 3;

/** Длительность встречи по умолчанию, когда клиент её не прислал (контракт §2.2 п.5). */
export const DEFAULT_DURATION_MINUTES = 60;

/**
 * Сортировка списка: `startsAt` DESC, вторичная — по `id` по возрастанию.
 *
 * Вторичный ключ не косметика: при двух встречах с одинаковой датой порядок `Array#sort`
 * зависел бы от исходного порядка вставки, и `HD-FN-05` («порядок названий в UI совпадает
 * с порядком из API») начал бы флакать. Фиксирует `HD-UT-09`.
 *
 * Сравниваются миллисекунды, а не строки: клиент вправе прислать ISO-дату со смещением
 * (`+03:00`), и лексикографическое сравнение таких строк дало бы неверный порядок.
 */
function compareByStartsAtDesc(left: Meeting, right: Meeting): number {
  const byDate = Date.parse(right.startsAt) - Date.parse(left.startsAt);

  return byDate === 0 ? left.id.localeCompare(right.id) : byDate;
}

/**
 * In-memory хранилище встреч: БД в проекте нет, сид применяется в конструкторе.
 *
 * Следствие, о котором важно помнить при отладке: `nest start --watch` перезапускается
 * на каждой правке и обнуляет всё, что создали тесты (риск 8). Поэтому ни один тест
 * не должен зависеть от встречи, созданной другим тестом.
 */
@Injectable()
export class MeetingsService {
  private readonly meetingsById = new Map<string, Meeting>();

  constructor() {
    for (const seed of SEED_MEETINGS) {
      this.meetingsById.set(seed.id, { ...seed });
    }
  }

  /**
   * Последние встречи владельца: фильтр по `ownerId` → сортировка DESC → срез `limit`.
   * Возвращает доменные сущности; срезает `ownerId` уже контроллер через `toMeetingDto`.
   */
  findRecent(ownerId: string, limit: number = DEFAULT_MEETINGS_LIMIT): Meeting[] {
    return this.byOwner(ownerId).sort(compareByStartsAtDesc).slice(0, limit);
  }

  /**
   * **Полное** число встреч владельца, а не длина среза из `findRecent`. Главная ловушка
   * фичи: `items.length` вместо этого метода даёт «Всего встреч: 3» при пяти встречах
   * (`HD-UT-03`, `HD-API-05`, `HD-FN-03`).
   */
  countByOwner(ownerId: string): number {
    return this.byOwner(ownerId).length;
  }

  /**
   * Создание встречи. `ownerId` — **только** из аргумента (его контроллер берёт из токена),
   * `id` — из `randomUUID()`. В `CreateMeetingInput` поля владельца нет вовсе, а на HTTP-уровне
   * попытку прислать его отрезает `forbidNonWhitelisted` (`HD-API-16`, `HD-API-17`).
   *
   * `startsAt` приводится к каноническому UTC-виду: клиент вправе прислать дату со смещением,
   * а контракт обещает `…Z`. Без нормализации в хранилище лежали бы разноформатные строки.
   */
  create(ownerId: string, input: CreateMeetingInput): Meeting {
    const meeting: Meeting = {
      id: randomUUID(),
      ownerId,
      title: input.title,
      startsAt: new Date(input.startsAt).toISOString(),
      durationMinutes: input.durationMinutes ?? DEFAULT_DURATION_MINUTES,
    };

    this.meetingsById.set(meeting.id, meeting);

    return meeting;
  }

  /** Копии, а не ссылки на хранимые объекты: вызывающий код не должен мутировать store. */
  private byOwner(ownerId: string): Meeting[] {
    return [...this.meetingsById.values()]
      .filter((meeting) => meeting.ownerId === ownerId)
      .map((meeting) => ({ ...meeting }));
  }
}

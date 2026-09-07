import type { Meeting, MeetingDto } from './meeting.types.js';

/**
 * Единственный способ отдать встречу наружу. Поля перечислены явно, а не через
 * rest-деструктуризацию: новое внутреннее поле в `Meeting` не утечёт в ответ само.
 *
 * `ownerId` в результат не попадает — это и проверяет `HD-API-01` по набору ключей элемента.
 * Отдельного `meetings.mapper.spec.ts` нет намеренно (тест-план §1.1, план §9): функция —
 * одна строка, а её результат проверяется на контрактном уровне; спек без кейса в
 * `*.unit.cases.md` уронил бы мета-тест (правило 8 §1.6).
 */
export function toMeetingDto(meeting: Meeting): MeetingDto {
  return {
    id: meeting.id,
    title: meeting.title,
    startsAt: meeting.startsAt,
    durationMinutes: meeting.durationMinutes,
  };
}

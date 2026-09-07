import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Length, Max, Min } from 'class-validator';

/**
 * Тело `POST /meetings` (контракт §2.2 п.5).
 *
 * Поля `ownerId` здесь **нет** — и это часть защиты: владелец берётся из токена
 * (`@CurrentUser()`), а попытку прислать его отрезает `forbidNonWhitelisted` ответом
 * `400 property ownerId should not exist` (`HD-API-16`, `HD-API-17`).
 *
 * У `durationMinutes` **обязателен `@IsOptional()`**: без него `POST /meetings` без этого
 * поля даёт 400 (проверено пробой), а именно так его отправляют и `createMeetingAction`,
 * и форма «Создать встречу» — кнопка не работала бы вовсе. Ловит `HD-API-20`.
 */
export class CreateMeetingDto {
  @IsString()
  @Length(3, 100)
  title: string;

  /** ISO 8601. Значение из `<input type="datetime-local">` веб-слой нормализует сам. */
  @IsISO8601()
  startsAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;
}

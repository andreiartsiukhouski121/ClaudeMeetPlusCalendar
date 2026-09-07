import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query `GET /meetings?limit=` (контракт §2.2 п.4).
 *
 * **`@IsOptional()` обязателен.** Без него при `whitelist: true, transform: true`
 * отсутствующее поле всё равно проходит через `@IsInt/@Min/@Max`, и `GET /meetings`
 * **без параметра** отдаёт 400 (проверено пробой на `@nestjs/common@12.0.1` +
 * `class-validator@0.15.1`) — то есть дашборд не грузится вовсе. Ловит `HD-API-10` шаг 2,
 * страхует `SM-API-03`.
 *
 * Верхняя граница — 100, а не 50: `limit=100` используется как «отдай всё» в `HD-API-17`
 * и `SM-API-03`. Значение больше даёт 400 (§2.1).
 *
 * Дефолт (3) подставляет **сервис**, а не DTO: значение по умолчанию в DTO не переживает
 * `plainToInstance` предсказуемо, а `findRecent` всё равно обязан иметь свой дефолт для
 * прямых вызовов (`HD-UT-06`).
 */
export class ListMeetingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

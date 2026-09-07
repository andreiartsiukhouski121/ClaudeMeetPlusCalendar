import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types.js';
import { TokenService } from './token.service.js';

/**
 * Одна ветка отказа на все случаи: заголовка нет, схема не `Bearer`, токен не разбирается,
 * подпись не сходится, срок истёк. Разные сообщения ничего не дают клиенту и подсказывают
 * атакующему (AL-API-14, AL-API-15, AL-UT-28).
 */
export const UNAUTHORIZED_MESSAGE = 'Требуется авторизация';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(header: string | undefined): string | undefined {
  if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  return token === '' ? undefined : token;
}

/**
 * Глобальным guard этот класс НЕ регистрируется — он сломал бы публичные `GET /`
 * и `POST /auth/login`. Только `@UseGuards(JwtAuthGuard)` на защищённых маршрутах
 * (план имплементации §2.2 п.7).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (token === undefined) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    let payload: { sub: string; email: string };

    try {
      payload = await this.tokenService.verify(token);
    } catch {
      // Любая ошибка проверки токена — 401, а не 500: битый токен это не сбой сервера.
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    request.user = { id: payload.sub, email: payload.email };

    return true;
  }
}

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types.js';

/**
 * `@CurrentUser()` — то, что положил в запрос `JwtAuthGuard`. Работает только на маршрутах
 * под этим guard: без него в `request.user` ничего нет.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

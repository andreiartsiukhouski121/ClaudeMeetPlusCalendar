import type { Request } from 'express';

import type { PublicUser } from '../users/user.types.js';

/** Полезная нагрузка access-токена. Ничего секретного, кроме id и email, там не лежит. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** Что guard кладёт в запрос. Не `User`: `passwordHash` в запросе не нужен никому. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Ответ `POST /auth/login` (контракт §2). */
export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

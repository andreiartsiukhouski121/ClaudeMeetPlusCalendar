import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types.js';
import { TokenService } from './token.service.js';

/**
 * One rejection branch for every case: no header, non-`Bearer` scheme, unparseable token, bad
 * signature, expired. Distinct messages help nobody but an attacker (AL-API-14, AL-API-15,
 * AL-UT-28).
 */
export const UNAUTHORIZED_MESSAGE = 'Authentication required';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(header: string | undefined): string | undefined {
  if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  return token === '' ? undefined : token;
}

/**
 * Never registered as a global guard — that would break the public `GET /` and `POST /auth/login`.
 * Only `@UseGuards(JwtAuthGuard)` on protected routes.
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
      // Any verification failure is a 401, not a 500: a broken token is not a server fault.
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    request.user = { id: payload.sub, email: payload.email };

    return true;
  }
}

import type { Request } from 'express';

import type { PublicUser } from '../users/user.types.js';

/** Access token payload. Nothing secret beyond the id and the email lives in there. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** What the guard puts on the request. Not `User`: nobody needs `passwordHash` there. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** `POST /auth/login` response. */
export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

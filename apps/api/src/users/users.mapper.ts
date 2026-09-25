import type { PublicUser, User } from './user.types.js';

/**
 * The only way a user leaves the server. Fields are listed explicitly rather than removed by
 * `delete` or rest destructuring, so a new secret field on `User` cannot leak on its own
 * (AL-API-11, AL-UT-19).
 */
export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

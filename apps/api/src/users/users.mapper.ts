import type { PublicUser, User } from './user.types.js';

/**
 * Единственный способ отдать пользователя наружу. Явное перечисление полей, а не
 * `delete`/`rest`-деструктуризация: новое секретное поле в `User` не утечёт в ответ само
 * (AL-API-11, AL-UT-19).
 */
export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

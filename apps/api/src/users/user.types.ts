export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

/** То, что уходит клиенту: `passwordHash` срезается `toPublicUser` (AL-API-11). */
export type PublicUser = Omit<User, 'passwordHash'>;

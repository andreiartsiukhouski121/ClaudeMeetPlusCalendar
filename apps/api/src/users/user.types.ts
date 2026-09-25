export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

/** What goes out to the client: `toPublicUser` strips `passwordHash` (AL-API-11). */
export type PublicUser = Omit<User, 'passwordHash'>;

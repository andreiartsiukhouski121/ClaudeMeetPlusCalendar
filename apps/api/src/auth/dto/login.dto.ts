import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * No password-strength rules on login: they would turn a wrong password into a 400 instead of a
 * 401 and make "shows an error on bad credentials" unverifiable (AL-API-02).
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Никаких требований к сложности пароля на логине (план имплементации §2.2 п.3):
 * иначе неверный пароль давал бы 400 вместо 401, и пункт спецификации «показывает ошибку
 * при неверных данных» стал бы непроверяемым (AL-API-02).
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

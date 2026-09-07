import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Регистрация — PurpleSchool',
};

/**
 * Заглушка регистрации — осознанное допущение плана (§8 п.1). Спецификация требует только
 * ссылку на регистрацию, но ссылка в 404 непроверяема функциональным тестом (`AL-FN-06`
 * ждёт 200 и `h1`), поэтому страница существует и несёт ровно заголовок, пояснение и путь
 * назад. Формы регистрации, `POST /auth/register` и создания пользователей в проекте нет.
 */
export default function RegisterPage() {
  return (
    <>
      <h1>Регистрация</h1>
      <p>Регистрация появится позже</p>
      <p>
        <Link href="/auth/login">Вернуться ко входу</Link>
      </p>
    </>
  );
}

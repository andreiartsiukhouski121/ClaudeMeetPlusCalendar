import type { Metadata } from 'next';

import { CreateMeetingForm } from '@/components/create-meeting-form';
import { LogoutButton } from '@/components/logout-button';
import { MeetingList } from '@/components/meeting-list';
import { getCurrentUser, getMeetings } from '@/lib/dal';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Главная — PurpleSchool',
};

/**
 * Главная страница — дашборд. Async серверный компонент без пропсов (без `PageProps<'/'>`,
 * чтобы типы не зависели от свежести `next typegen`, риск 15).
 *
 * Страница **сама** проверяет сессию через `getCurrentUser()`, который редиректит на логин
 * при невалидном токене. Это повторная проверка поверх `proxy.ts`, как требует документация
 * Next: proxy видит только наличие cookie и гарантией безопасности не является.
 *
 * Требования разметки, продиктованные кейсами (тест-план §3.4, §5.1):
 *  - ровно ОДИН `h1` на странице, и в нём email пользователя (`HD-FN-02`, `HD-FN-14`);
 *  - счётчик — **одним текстовым узлом** и ровно в формате `Всего встреч: 5`, иначе
 *    `getByText('Всего встреч: 5')` из `HD-FN-03` не сработает. Склонения нет намеренно
 *    (§8 п.9): функции `pluralizeMeetings` в кодовой базе не существует.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const { items, total } = await getMeetings();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Здравствуйте, {user.email}</h1>
        <LogoutButton />
      </header>

      <p className={styles.counter}>{`Всего встреч: ${String(total)}`}</p>

      <div className={styles.content}>
        <MeetingList meetings={items} />
        <CreateMeetingForm />
      </div>
    </main>
  );
}

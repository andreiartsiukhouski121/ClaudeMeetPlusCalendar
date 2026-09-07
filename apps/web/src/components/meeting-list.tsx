import { formatMeetingDateTime } from '@/lib/format-date';
import type { Meeting } from '@/lib/types';

import styles from './meeting-list.module.css';

/**
 * Список последних встреч. **Серверный** компонент: `'use client'` не нужен — здесь нет
 * ни состояния, ни обработчиков.
 *
 * Разметка продиктована локаторами тестов (тест-план §5.1) и трогать её вслепую нельзя:
 *  - именно `ul`/`li`, а не набор `div` — `getByRole('list')` + `getByRole('listitem')`
 *    в `HD-FN-04`, `HD-FN-05`, `HD-FN-14`;
 *  - `aria-label="Последние встречи"` даёт списку доступное имя;
 *  - пустое состояние — явный текст «Встреч пока нет» (`HD-FN-09`), а не пустой `ul`:
 *    пустой список неотличим от «данные не загрузились».
 */
export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Последние встречи</h2>

      {meetings.length === 0 ? (
        <p className={styles.empty}>Встреч пока нет</p>
      ) : (
        <ul className={styles.list} aria-label="Последние встречи">
          {meetings.map((meeting) => (
            <li className={styles.item} key={meeting.id}>
              <span className={styles.title}>{meeting.title}</span>
              <span className={styles.meta}>
                {formatMeetingDateTime(meeting.startsAt)} · {meeting.durationMinutes} мин
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

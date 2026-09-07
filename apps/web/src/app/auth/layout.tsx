import type { ReactNode } from 'react';

import styles from './auth.module.css';

/**
 * Общая рамка страниц `/auth/*`: центрированная карточка на всю высоту экрана.
 *
 * Пропсы описаны вручную, а не через `LayoutProps<'/auth'>`: сгенерированные типы маршрутов
 * появляются только после `next typegen`, и зависеть от их свежести в новых файлах не стоит
 * (риск 15).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.screen}>
      <section className={styles.card}>{children}</section>
    </main>
  );
}

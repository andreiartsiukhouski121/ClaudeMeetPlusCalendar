import type { ReactNode } from 'react';

import styles from './auth.module.css';

/**
 * Shared frame for `/auth/*`: a centred card filling the viewport height.
 *
 * Props are declared by hand rather than via `LayoutProps<'/auth'>`: generated route types only
 * appear after `next typegen`, and new files should not depend on how fresh they are.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.screen}>
      <section className={styles.card}>{children}</section>
    </main>
  );
}

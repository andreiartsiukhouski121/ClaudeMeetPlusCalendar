import { HouseIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

/**
 * The navigation rail. A **server** component: a constant wordmark and one destination, nothing to
 * hold in state.
 *
 * Three routes exist and one is the signed-in page, so the rail ships exactly one destination:
 * `Dashboard` → `/`. `aria-current="page"` is written **literally**, not computed from
 * `usePathname` — this rail renders on `/` only, so the value can never vary, and computing a
 * constant would put `'use client'` on a component that needs none (`ADR-0026` §6.3).
 *
 * No `ul`/`li`: a second `role="list"` on `/` makes the unscoped `getByRole('list')` /
 * `getByRole('listitem')` locators in `home-dashboard.functional.spec.ts` ambiguous
 * (`HD-FN-04`, `HD-FN-05`, `HD-FN-07`, `HD-FN-09`, `HD-FN-14`). A list of one link conveys nothing
 * a screen reader can use that the `nav` landmark does not already say.
 */
export function NavRail() {
  return (
    <nav aria-label="Main" className="hidden lg:flex lg:flex-col lg:gap-6 lg:p-6">
      <p className="text-muted text-sm font-medium tracking-wide uppercase">PurpleSchool</p>

      <Link
        href="/"
        aria-current="page"
        className="text-muted hover:bg-surface hover:text-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-soft-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      >
        <HouseIcon size={20} weight="regular" aria-hidden="true" />
        Dashboard
      </Link>
    </nav>
  );
}

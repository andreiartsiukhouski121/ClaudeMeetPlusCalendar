import { CalendarCheckIcon } from '@phosphor-icons/react/ssr';
import { Card } from '@heroui/react';

/**
 * The one tile in the side rail's `Overview` landmark. A **server** component: two numbers the
 * page already holds, no fetch of its own.
 *
 * `shown` and `total` are plain numbers, never a token (invariant 19) — `page.tsx` passes
 * `items.length` and `total` straight through. The subject is "Meetings", not a noun phrase,
 * because "Recent meetings" is already the list's `h2` and the `ul`'s `aria-label`; neither line
 * collides with the counter's `/^Meetings total: \d+$/` pattern or any `getByText` query
 * (`ADR-0026` §6.5).
 *
 * The badge carries no category tint: there is no category field to label, so the icon sits on
 * `bg-background text-muted` — the pair measured at 5.05:1 — rather than one of the five
 * `--category-*` pairs (`ADR-0026` §6.4).
 */
export function StatTile({ shown, total }: { shown: number; total: number }) {
  return (
    <Card.Root className="rounded-2xl p-4">
      <Card.Content className="flex flex-row items-center gap-3 p-0">
        <span className="bg-background text-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
          <CalendarCheckIcon size={20} weight="regular" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-muted text-sm">{`${String(shown)} of ${String(total)} shown`}</span>
          <span className="truncate font-semibold">Meetings</span>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

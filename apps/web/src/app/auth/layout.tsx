import type { ReactNode } from 'react';

/**
 * Shared frame for `/auth/*`: a centred card filling the viewport height.
 *
 * Props are declared by hand rather than via `LayoutProps<'/auth'>`: generated route types only
 * appear after `next typegen`, and new files should not depend on how fresh they are.
 *
 * Tailwind utilities rather than a CSS module (`ADR-0023`). The vertical rhythm still comes from
 * the container's `gap`, not from heading margins — Tailwind's preflight clears those the same way
 * the old hand-written reset did.
 *
 * The card is `max-w-sm`, not `max-w-100`: a login form is two short fields, and a wider box only
 * stretches the inputs past the length of what goes in them (`ui-ux-pro-max`, Typography / Line
 * Length).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-foreground-500 text-center text-sm font-medium tracking-wide uppercase">
          PurpleSchool
        </p>

        <section className="bg-surface border-default-200 flex flex-col gap-6 rounded-2xl border p-8 shadow-sm">
          {children}
        </section>
      </div>
    </main>
  );
}

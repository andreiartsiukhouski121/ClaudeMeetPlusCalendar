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
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <section className="bg-surface border-default-200 flex w-full max-w-100 flex-col gap-4 rounded-xl border p-8">
        {children}
      </section>
    </main>
  );
}

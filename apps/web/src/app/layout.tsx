import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PurpleSchool',
  description: 'PurpleSchool meetings and lessons',
};

/**
 * HeroUI v3 needs **no provider** — that was v2. What it does need is the theme class and
 * `data-theme` on `<html>`, and the semantic background/foreground utilities on `<body>`
 * (`ADR-0023`).
 *
 * The theme is fixed to light rather than following the system: a `prefers-color-scheme` switch
 * would make the functional cases' contrast depend on the machine running them, which is the same
 * class of defect the `timeZone: 'UTC'` pin exists to prevent.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`light ${geistSans.variable} ${geistMono.variable}`}
      data-theme="light"
    >
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}

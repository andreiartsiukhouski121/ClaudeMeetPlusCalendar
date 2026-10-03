# Probes — raw code and output

Throwaway code for the probes cited in [`code.md`](code.md). Everything here ran in the scratchpad
`C:\Users\User\AppData\Local\Temp\claude\C--GIT-PurpleSchool\301e87d3-6eec-428c-b0f0-e74f71e9e575\scratchpad`,
never in the repository tree. Probes 1-6 installed nothing: the harness resolves the repository's
own installed `postcss` and `@tailwindcss/postcss` through `createRequire` anchored at
`apps/web/package.json`. Probe 7 does install — `npm install` into two scratchpad directories of its
own, never into `apps/web`, never touching `pnpm-lock.yaml`. `git status --porcelain` after the run printed exactly one line,
`?? docs/plans/design-language-rollout/`.

## The compiler harness

`scratchpad/compile.mjs`:

```js
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const require = createRequire('C:/GIT/PurpleSchool/apps/web/package.json');
const postcss = (await import(pathToFileURL(require.resolve('postcss')).href)).default;
const tw = (await import(pathToFileURL(require.resolve('@tailwindcss/postcss')).href)).default;

const classes = process.argv[2] ?? '';
const extraPath = process.argv[3];
const extra = extraPath && extraPath !== '-' ? fs.readFileSync(extraPath, 'utf8') : '';

const css = `@import 'tailwindcss';
@import '@heroui/styles';
@source inline("${classes}");
${extra}`;

const result = await postcss([tw()]).process(css, {
  from: 'C:/GIT/PurpleSchool/apps/web/src/app/__probe_virtual.css',
});
fs.writeFileSync(process.argv[4] ?? `${process.cwd()}/out.css`, result.css);
console.log('bytes:', result.css.length);
```

`from` points at a path that does not exist on disk — PostCSS never reads it, it only uses the
directory to resolve `@import`, which is how `tailwindcss` and `@heroui/styles` resolve out of
`apps/web/node_modules` without a file being written into the repository.

Installed versions used (`ls node_modules/.pnpm`):

```
@heroui+styles@3.2.6_tailwindcss@4.3.3
@tailwindcss+postcss@4.3.3
tailwindcss@4.3.3
postcss@8.5.28
```

## Probe 1 — the dead-class grep

Command (ripgrep through the Grep/`grep -rnoE` path, run over `apps/web/src` with
`--include=*.tsx --include=*.ts --include=*.css`), pattern:

```
(^|["' `])(text|bg|border|ring|divide|from|to|via|fill|stroke|outline|shadow|accent|caret|placeholder|decoration)-[a-z]+-(50|100|200|300|400|500|600|700|800|900|950)
```

Output:

```
apps/web/src/app/auth/layout.tsx:21:"text-foreground-500
apps/web/src/app/auth/layout.tsx:25: border-default-200
apps/web/src/app/auth/login/login-form.tsx:56:"text-foreground-500
apps/web/src/app/auth/login/page.tsx:22:"text-foreground-500
apps/web/src/app/auth/register/page.tsx:19:"text-foreground-500
apps/web/src/app/page.tsx:40:"text-foreground-500
apps/web/src/components/meeting-list.tsx:34: text-foreground-500
apps/web/src/components/meeting-list.tsx:34:"border-default-200
apps/web/src/components/meeting-list.tsx:45:"text-foreground-500
```

Nine hits total: seven `text-foreground-500`, two `border-default-200`. No other numeric-scale
colour utility occurs anywhere under `apps/web/src`.

Compile and grep:

```bash
node compile.mjs "text-foreground-500 border-default-200 text-muted border-border bg-surface" - out2.css
# bytes: 424650
awk '/^@layer utilities \{/,/^\}/' out2.css
```

```css
@layer utilities {
  .border-border {
    border-color: var(--border);
  }
  .bg-surface {
    background-color: var(--surface);
  }
  .text-muted {
    color: var(--muted);
  }
}
```

`grep -n "\.text-foreground-500" out2.css` → no match. `grep -n "\.border-default-200" out2.css` →
no match. `grep -n "text-foreground-500" out2.css` (unanchored, whole 11 940-line file) → no match.

## Probe 2 — what HeroUI v3 actually emits

```bash
node compile.mjs "text-muted bg-muted border-muted border-border divide-border ring-border bg-surface \
text-surface-foreground border-separator bg-separator divide-separator text-accent bg-accent \
text-accent-foreground bg-accent-soft text-accent-soft-foreground bg-danger-soft \
text-danger-soft-foreground text-danger text-foreground bg-background bg-overlay \
text-overlay-foreground bg-success-soft text-success-soft-foreground bg-warning-soft \
text-warning-soft-foreground bg-panel shadow-surface shadow-overlay rounded-sm rounded-md rounded-lg \
rounded-xl rounded-2xl rounded-3xl rounded-full text-foreground-500 border-default-200 bg-default-100 \
text-default-500 divide-default-200 ring-default-200 text-primary-500 bg-content1 bg-category-violet \
text-category-violet-foreground font-sans" - out3.css
```

Emitted utilities block (verbatim, braces collapsed onto one line for width):

```css
@layer utilities {
  :where(.divide-border > :not(:last-child)) { border-color: var(--border); }
  :where(.divide-separator > :not(:last-child)) { border-color: var(--separator); }
  .rounded-2xl { border-radius: calc(var(--radius) * 2); }
  .rounded-3xl { border-radius: calc(var(--radius) * 3); }
  .rounded-full { border-radius: calc(infinity * 1px); }
  .rounded-lg { border-radius: calc(var(--radius) * 1); }
  .rounded-md { border-radius: calc(var(--radius) * 0.75); }
  .rounded-sm { border-radius: calc(var(--radius) * 0.5); }
  .rounded-xl { border-radius: calc(var(--radius) * 1.5); }
  .border-border { border-color: var(--border); }
  .border-muted { border-color: var(--muted); }
  .border-separator { border-color: var(--separator); }
  .bg-accent { background-color: var(--accent); }
  .bg-accent-soft { background-color: var(--accent-soft); }
  .bg-background { background-color: var(--background); }
  .bg-danger-soft { background-color: var(--danger-soft); }
  .bg-muted { background-color: var(--muted); }
  .bg-overlay { background-color: var(--overlay); }
  .bg-separator { background-color: var(--separator); }
  .bg-success-soft { background-color: var(--success-soft); }
  .bg-surface { background-color: var(--surface); }
  .bg-warning-soft { background-color: var(--warning-soft); }
  .font-sans { font-family: var(--font-sans); }
  .text-accent { color: var(--accent); }
  .text-accent-foreground { color: var(--accent-foreground); }
  .text-accent-soft-foreground { color: var(--accent-soft-foreground); }
  .text-danger { color: var(--danger); }
  .text-danger-soft-foreground { color: var(--danger-soft-foreground); }
  .text-foreground { color: var(--foreground); }
  .text-muted { color: var(--muted); }
  .text-overlay-foreground { color: var(--overlay-foreground); }
  .text-success-soft-foreground { color: var(--success-soft-foreground); }
  .text-surface-foreground { color: var(--surface-foreground); }
  .text-warning-soft-foreground { color: var(--warning-soft-foreground); }
  .shadow-overlay {
    --tw-shadow: var(--overlay-shadow);
    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-surface {
    --tw-shadow: var(--surface-shadow);
    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }
  .ring-border { --tw-ring-color: var(--border); }
}
```

Requested but **absent** from the block: `text-foreground-500`, `border-default-200`,
`bg-default-100`, `text-default-500`, `divide-default-200`, `ring-default-200`, `text-primary-500`,
`bg-content1`, `bg-panel`, `bg-category-violet`, `text-category-violet-foreground`.

Token declarations, `grep` over `out3.css` (line numbers are of `out3.css`):

```
6:    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …   (@layer theme, :root, :host)
48:    --default-font-family: var(--font-sans);
69:    font-family: var(--default-font-family, -apple-system, …);             (@layer base, html/:host)
11239:        --radius: 0.5rem;
11240:        --field-radius: calc(var(--radius) * 1.5);
11241:        --accent: oklch(0.6204 0.195 253.83);
11242:        --accent-foreground: var(--snow);
11252:        --background: oklch(0.9702 0 0);
11253:        --foreground: var(--eclipse);
11254:        --surface: var(--white);
11262:        --muted: oklch(0.5517 0.0138 285.94);
11283:        --border: oklch(90% 0.004 286.32);
11284:        --separator: oklch(92% 0.004 286.32);
11355:        --accent-soft: var(--accent);
11357:          --accent-soft: color-mix(in oklab, var(--accent) 15%, transparent);
11359:        --accent-soft-foreground: var(--accent);
11361:          --accent-soft-foreground: color-mix(in oklab, var(--accent) 70%, var(--foreground) 30%);
11419:        --surface-shadow: 0 2px 4px 0 rgba(0,0,0,0.04), 0 1px 2px 0 rgba(0,0,0,0.06), 0 0 1px 0 rgba(0,0,0,0.06);
11421:        --overlay-shadow: 0 2px 8px 0 rgba(0,0,0,0.06), 0 -6px 12px 0 rgba(0,0,0,0.03), 0 14px 28px 0 rgba(0,0,0,0.08);
11438:        --muted: oklch(70.5% 0.015 286.067);   (dark block)
11459:        --border: oklch(28% 0.006 286.033);    (dark block)
```

Nesting and selectors (`sed -n '11139,11141p'`, `sed -n '11250p'`, `sed -n '11427p'`):

```css
@layer theme {
  @layer theme {
    @layer base {
      :root, :host { … --radius: 0.5rem; --accent: oklch(0.6204 0.195 253.83); … }
      :root, .light, .default, [data-theme="light"], [data-theme="default"],
      :host(.light), :host(.default), :host([data-theme="light"]), :host([data-theme="default"]) {
        color-scheme: light;
        --background: oklch(0.9702 0 0);
        …
      }
      .dark, [data-theme="dark"], :host(.dark), :host([data-theme="dark"]) { color-scheme: dark; … }
```

## Probe 3 — `next/font/google` and Plus Jakarta Sans

Resolved package: `node_modules/.pnpm/next@16.3.6_@playwright+tes_ad970ace61dd32a0280ba9af24098b29/node_modules/next`.

```bash
node -e "const d=require('./…/next/dist/compiled/@next/font/dist/google/font-data.json');
console.log(JSON.stringify(d['Plus Jakarta Sans'],null,1));
console.log('Geist', !!d['Geist'], 'Geist Mono', !!d['Geist Mono']);"
```

```json
{
  "weights": ["200", "300", "400", "500", "600", "700", "800", "variable"],
  "styles": ["normal", "italic"],
  "axes": [{ "tag": "wght", "min": 200, "max": 800, "defaultValue": 400 }],
  "subsets": ["cyrillic-ext", "latin", "latin-ext", "vietnamese"]
}
```

```
Geist true Geist Mono true
```

Type declaration, `next/dist/compiled/@next/font/dist/google/index.d.ts:14565`:

```ts
export declare function Plus_Jakarta_Sans<T extends CssVariable | undefined = undefined>(options?: {
  weight?:
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | 'variable'
    | Array<'200' | '300' | '400' | '500' | '600' | '700' | '800'>;
  style?: 'normal' | 'italic' | Array<'normal' | 'italic'>;
  display?: Display;
  variable?: T;
  preload?: boolean;
  fallback?: string[];
  adjustFontFallback?: boolean;
  subsets?: Array<'cyrillic-ext' | 'latin' | 'latin-ext' | 'vietnamese'>;
}): T extends undefined ? NextFont : NextFontWithVariable;
```

`apps/web/node_modules/next/font/google/index.d.ts` is one line —
`export * from 'next/dist/compiled/@next/font/dist/google'`.

## Probe 4 — `@theme inline` in the entry file

`tokens.css` copied to the scratchpad and appended to the probe entry:

```bash
cp .claude/skills/design-system/references/tokens.css scratchpad/tokens-copy.css
node compile.mjs "bg-category-violet text-category-violet-foreground bg-category-amber font-sans \
rounded-xl rounded-2xl text-muted bg-accent text-accent-foreground bg-background" tokens-copy.css out4.css
# bytes: 425928
```

```css
@layer utilities {
  .rounded-2xl { border-radius: calc(var(--radius) * 2); }
  .rounded-xl { border-radius: calc(var(--radius) * 1.5); }
  .bg-accent { background-color: var(--accent); }
  .bg-background { background-color: var(--background); }
  .bg-category-amber { background-color: var(--category-amber); }
  .bg-category-violet { background-color: var(--category-violet); }
  .font-sans { font-family: var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif; }
  .text-accent-foreground { color: var(--accent-foreground); }
  .text-category-violet-foreground { color: var(--category-violet-foreground); }
  .text-muted { color: var(--muted); }
}
```

`grep -n -- "--font-sans:" out4.css` → one hit:
`6:    --font-sans: var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif;`
(the Tailwind default at that line is replaced, not duplicated).

`sed -n '11548,11562p' out4.css`:

```css
  @layer components;
}
:root {
  --accent: oklch(0.55 0.21 285);
  --background: oklch(0.969 0.004 286);
  --muted: oklch(0.52 0.014 286);
  --radius: 0.75rem;
  --category-violet: oklch(0.955 0.022 285);
  --category-violet-foreground: oklch(0.45 0.16 285);
  --category-blue: oklch(0.955 0.022 245);
  --category-blue-foreground: oklch(0.47 0.11 245);
```

The `:root` block is emitted after the closing brace of the last `@layer`, i.e. unlayered.

## Probe 5 — the tokens file as written (**a file read, not a probe**)

**This entry is not a probe.** It executed nothing and established nothing that reading the file did
not already show: `.claude/skills/design-system/references/tokens.css` was read in full with `cat -n`
and quoted by line in `code.md`. Every other entry here runs a command against the installed
toolchain and records its output; this one has no command and no output. The number is kept so that
entries 1-4 and 6-7 are not renumbered, and so the probe count read off this file is honest:
**six executed probes — 1, 2, 3, 4, 6, 7 — plus this read.**

## Probe 6 — are the Geist CSS variables consumed anywhere?

```bash
grep -rn --exclude-dir=.next --exclude-dir=node_modules -- "font-geist\|font-sans\|font-mono" apps/web
```

```
apps/web/src/app/layout.tsx:6:  variable: '--font-geist-sans',
apps/web/src/app/layout.tsx:11:  variable: '--font-geist-mono',
```

`grep -c "font-geist" out3.css` → `0`.

## Probe 7 — does `@phosphor-icons/react` render in a Server Component?

Raised by the research review. `patterns.md` puts icons on the nav rail, the stat tile and the list
rows; those surfaces are Server Components today — `meeting-list.tsx:7`, `logout-button.tsx:6-7`,
`page.tsx:31`.

### 7a — the static side: what the package ships

Installed into `scratchpad/phosphor-probe` (its own `package.json`, its own `npm install`).

```bash
node -e "const p=require('./node_modules/@phosphor-icons/react/package.json');
console.log(JSON.stringify({version:p.version,main:p.main,module:p.module,types:p.types,
sideEffects:p.sideEffects,exports:p.exports,peerDependencies:p.peerDependencies},null,1));"
```

```json
{
 "version": "2.1.10",
 "main": "./dist/index.cjs.js",
 "module": "./dist/index.es.js",
 "types": "./dist/index.d.ts",
 "sideEffects": false,
 "exports": {
  ".":              { "import": "./dist/index.es.js",     "types": "./dist/index.d.ts",     "require": "./dist/index.cjs.js" },
  "./dist/icons/*": { "import": "./dist/csr/*.es.js",     "types": "./dist/csr/*.d.ts",     "require": "./dist/index.cjs.js" },
  "./dist/csr/*":   { "import": "./dist/csr/*.es.js",     "types": "./dist/csr/*.d.ts",     "require": "./dist/index.cjs.js" },
  "./dist/lib/*":   { "import": "./dist/lib/*.es.js",     "types": "./dist/lib/*.d.ts",     "require": "./dist/index.cjs.js" },
  "./lib":          { "import": "./dist/lib/index.es.js", "types": "./dist/lib/index.d.ts", "require": "./dist/index.cjs.js" },
  "./dist/ssr":     { "import": "./dist/ssr/index.es.js", "types": "./dist/ssr/index.d.ts", "require": "./dist/index.cjs.js" },
  "./ssr":          { "import": "./dist/ssr/index.es.js", "types": "./dist/ssr/index.d.ts", "require": "./dist/index.cjs.js" },
  "./dist/ssr/*":   { "import": "./dist/ssr/*.es.js",     "types": "./dist/ssr/*.d.ts",     "require": "./dist/index.cjs.js" },
  "./package.json": { "default": "./package.json" },
  "./*":            { "import": "./dist/csr/*.es.js",     "types": "./dist/csr/*.d.ts",     "require": "./dist/index.cjs.js" }
 },
 "peerDependencies": { "react": ">= 16.8", "react-dom": ">= 16.8" }
}
```

The directive grep over the whole installed package (cwd = `node_modules/@phosphor-icons/react`):

```bash
grep -rl -e "use client" -e "use server" .
echo "exit=$?"
```

```
exit=1
```

No path printed: **zero files in the package carry `'use client'` or `'use server'`.** The same grep
restricted to the entry files —
`grep -c "use client" dist/index.es.js dist/index.cjs.js dist/ssr/index.es.js` — returns:

```
dist/index.es.js:0
dist/index.cjs.js:0
dist/ssr/index.es.js:0
```

Size on disk. `find . -type f -printf '%s\n'` over 9 089 files did not finish inside the Bash
timeout, so the walk was done in node (`scratchpad/size.mjs`, `readdirSync` + `statSync`):

```
$ node size.mjs next-probe/node_modules/@phosphor-icons/react
files: 9089 bytes: 33027417 = 31.50 MiB
  dist 33008160 31.48 MiB
  (root) 19257 0.02 MiB

$ node size.mjs next-probe/node_modules/@phosphor-icons/react/dist
files: 9086 bytes: 33008160 = 31.48 MiB
  (root) 10338379 9.86 MiB
  ssr    8658652  8.26 MiB
  csr    8425817  8.04 MiB
  defs   5582127  5.32 MiB
  lib    3185     0.00 MiB

$ node -e "...readdirSync per dir..."
csr  entries: 3024 es.js: 1512
ssr  entries: 3026 es.js: 1513
defs entries: 3024 es.js: 1512
lib  entries: 8    es.js: 3
```

`du -sh dist/*` on the same tree: `index.cjs.js` 4.9M, `index.umd.js` 4.9M, `index.es.js` 192K,
`index.d.ts` 52K.

The two bases, read in full (`cat dist/lib/context.es.js`, `cat dist/lib/IconBase.es.js`,
`cat dist/lib/SSRBase.es.js`), minified identifiers as shipped:

```js
// dist/lib/context.es.js
import { createContext as r } from "react";
const o = r({ color: "currentColor", size: "1em", weight: "regular", mirrored: !1 });
export { o as IconContext };

// dist/lib/IconBase.es.js — imported by every dist/csr/*.es.js
import * as e from "react";
import { IconContext as h } from "./context.es.js";
const p = e.forwardRef((s, a) => {
  const { alt: n, color: r, size: t, weight: o, mirrored: c, children: i, weights: m, ...x } = s,
        { color: d = "currentColor", size: l, weight: f = "regular", mirrored: g = !1, ...w } = e.useContext(h);
  return /* @__PURE__ */ e.createElement("svg", { /* ... */ });
});

// dist/lib/SSRBase.es.js — imported by every dist/ssr/*.es.js; no context, defaults come from props
import * as e from "react";
const w = e.forwardRef((l, s) => {
  const { alt: r, color: a = "currentColor", size: t = "1em", weight: o = "regular",
          mirrored: i = !1, children: n, weights: c, ...m } = l;
  return /* @__PURE__ */ e.createElement("svg", { /* ... */ });
});
```

`head -c 500 dist/index.es.js` — the barrel pulls the ssr index **and** every csr module:

```js
import * as o from "./ssr/index.es.js";
import { Acorn as t, AcornIcon as n } from "./csr/Acorn.es.js";
import { AddressBook as p, AddressBookIcon as m } from "./csr/AddressBook.es.js";
```

`head -c 400 dist/csr/Calendar.es.js` and `dist/ssr/Calendar.es.js` — same icon, different base:

```js
// csr
import t from "../lib/IconBase.es.js";
import n from "../defs/Calendar.es.js";
const e = a.forwardRef((o, r) => a.createElement(t, { ref: r, ...o, weights: n }));

// ssr
import t from "../lib/SSRBase.es.js";
import m from "../defs/Calendar.es.js";
const e = a.forwardRef((r, o) => a.createElement(t, { ref: o, ...r, weights: m }));
```

### 7b — the dynamic side: `next build` on a minimal Next 16 app

`scratchpad/next-probe`, its own `npm install` (`added 24 packages in 31s`):

```json
{
  "name": "next-probe", "version": "0.0.0", "private": true,
  "scripts": { "build": "next build" },
  "dependencies": {
    "@phosphor-icons/react": "2.1.10",
    "next": "16.3.6",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  }
}
```

`app/layout.tsx` is a plain `html`/`body` root. `app/page.tsx` was swapped between five variants,
with `rm -rf .next && npx next build` after each swap.

**Variant A — baseline, no icon:**

```tsx
export default function BaselinePage() {
  return <main><h1>baseline, no icon</h1></main>;
}
```

```
✓ Generating static pages using 4 workers (3/3) in 640ms
Route (app)
┌ ○ /
└ ○ /_not-found
```

**Variant B — the barrel in a Server Component, no `'use client'`:**

```tsx
import { CalendarIcon } from '@phosphor-icons/react';

export default function BarrelPage() {
  return (
    <main>
      <h1>barrel import, server component, no use client</h1>
      <CalendarIcon size={24} weight="regular" />
    </main>
  );
}
```

```
✓ Compiled successfully in 2.3s
  Finished TypeScript in 809ms ...
  Collecting page data using 4 workers ...
Error: Failed to collect configuration for /
    at ignore-listed frames {
  [cause]: TypeError: (0 , c.createContext) is not a function
      at module evaluation (app\page.tsx:10:1)
}

> Build error occurred
Error: Failed to collect page data for /
```

**Variant C — the per-icon `csr` subpath in a Server Component, no `'use client'`:**

```tsx
import { CalendarIcon } from '@phosphor-icons/react/Calendar';
```

```
✓ Compiled successfully in 2.5s
  Collecting page data using 4 workers ...
Error: Failed to collect configuration for /
    at ignore-listed frames {
  [cause]: TypeError: (0 , c.createContext) is not a function
      at module evaluation (app\page.tsx:10:1)
}

> Build error occurred
Error: Failed to collect page data for /
```

**Variant D — the `/ssr` subpath in a Server Component, no `'use client'`:**

```tsx
import { CalendarIcon } from '@phosphor-icons/react/ssr';

export default function SsrPage() {
  return (
    <main>
      <h1>ssr subpath, server component, no use client</h1>
      <CalendarIcon size={24} weight="regular" />
    </main>
  );
}
```

```
✓ Compiled successfully in 2.4s
✓ Generating static pages using 4 workers (3/3) in 594ms
Route (app)
┌ ○ /
└ ○ /_not-found
```

```bash
grep -o '<svg[^>]*>' .next/server/app/index.html | head -3
grep -c '<svg' .next/server/app/index.html
grep -o '<path' .next/server/app/index.html | wc -l
wc -c .next/server/app/index.html baseline.html
```

```
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
1
1
 5712 .next/server/app/index.html
 4299 baseline.html
```

**Variant E — the barrel inside a `'use client'` component:**

```tsx
// app/icon-client.tsx
'use client';
import { CalendarIcon } from '@phosphor-icons/react';
export function IconClient() { return <CalendarIcon size={24} weight="regular" />; }

// app/page.tsx — a Server Component rendering it
import { IconClient } from './icon-client';
export default function ClientBarrelPage() {
  return (
    <main>
      <h1>barrel import inside a use client component</h1>
      <IconClient />
    </main>
  );
}
```

```
✓ Compiled successfully in 2.4s
✓ Generating static pages using 4 workers (3/3) in 696ms
Route (app)
┌ ○ /
└ ○ /_not-found
```

**Client JS measured per variant.** Next 16's Turbopack build prints no Size / First Load JS
columns, and `npx next build --experimental-analyze` added none, so the bytes were summed from
`.next/static` with `scratchpad/next-probe/measure.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';
function walk(d){ let out=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) out=out.concat(walk(p)); else out.push(p);} return out; }
const files = walk('.next/static').filter(f=>f.endsWith('.js'));
const total = files.reduce((s,f)=>s+fs.statSync(f).size,0);
console.log('client js files:', files.length, 'total bytes:', total, '=', (total/1024).toFixed(1),'KiB');
for (const f of files.sort((a,b)=>fs.statSync(b).size-fs.statSync(a).size).slice(0,5)) console.log('  ', path.basename(f), fs.statSync(f).size);
```

```
A  baseline, no icon             client js files: 9   total bytes: 566110 = 552.8 KiB
D  /ssr icon, server component   client js files: 9   total bytes: 566110 = 552.8 KiB
E  barrel icon, 'use client'     client js files: 10  total bytes: 570559 = 557.2 KiB
```

The three largest chunks are byte-identical across all three builds (229 156 / 183 103 / 112 594).
Δ(D − A) = **0 bytes**. Δ(E − A) = **+4 449 bytes** of client JS for one icon.

**Answers →** `@phosphor-icons/react` renders in a Server Component **only through the
`@phosphor-icons/react/ssr` subpath**. Its default entry and its per-icon `csr` subpath fail
`next build` at page-data collection with `TypeError: (0 , c.createContext) is not a function`; the
package ships no `'use client'` of its own, and the csr base calls `React.useContext` on a module-level
`createContext`. The `/ssr` path writes the `<svg>` into the prerendered HTML (+1 413 bytes for one
24 px icon) and adds zero bytes of client JS. The 31.50 MiB is install footprint, not shipped bytes.

## Tree cleanliness

```bash
git status --porcelain
```

```
?? docs/plans/design-language-rollout/
```

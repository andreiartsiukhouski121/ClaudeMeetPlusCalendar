# Patterns

The recurring surfaces of `apps/web`, written against HeroUI v3 and the tokens in
[`tokens.css`](tokens.css). The decision is `ADR-0026`; the values are in
[`SKILL.md`](../SKILL.md).

**Two things before any snippet below is copied.** Only `Card`, `Chip`, `Button`, `TextField`,
`Label` and `Input` are proven in this repository today — the rest are named with their exact API
left to live documentation, because model recall of HeroUI is v2:

```bash
cd .agents/skills/heroui-react
node scripts/list_components.mjs
node scripts/get_component_docs.mjs Avatar
```

And nothing here overrides the invariant table in [`SKILL.md`](../SKILL.md). A form in particular is
written against invariant 15, not against a HeroUI example.

## The shell

Three tracks on a wide screen, one column below `lg`. The navigation rail is fixed-width, the main
column is fluid, the side rail is fixed-width and drops first.

```tsx
<div className="bg-background min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
  <nav aria-label="Main" className="hidden lg:block">
    …
  </nav>

  <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4">…</header>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="flex flex-col gap-8">…</main>
      <aside aria-label="Overview" className="flex flex-col gap-6">
        …
      </aside>
    </div>
  </div>
</div>
```

- `minmax(0,1fr)` rather than `1fr`: a long unbroken title in a grid child otherwise widens the
  track past the viewport and brings back a horizontal scrollbar — a critical `ui-ux-pro-max` rule
  and one the `overflow-x: hidden` in `globals.css` would hide rather than fix.
- `main` appears exactly once per page, and so does `h1`. `ACC-FN-04` asserts both, because `axe`
  does not.
- Every landmark that repeats (`nav`, `aside`) carries an `aria-label`; two unnamed `nav`s are
  indistinguishable to a screen reader.
- Below `lg` the rail is not a hamburger drawer by default. A drawer is a feature with its own
  cases, not a responsive fallback — until it exists, the rail is simply absent and the page is
  reachable without it.

## Navigation rail

```tsx
<ul className="flex flex-col gap-1">
  <li>
    <Link
      href="/"
      aria-current={isActive ? 'page' : undefined}
      className="text-muted hover:bg-surface hover:text-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-soft-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
    >
      <House size={20} weight="regular" aria-hidden="true" />
      Dashboard
    </Link>
  </li>
</ul>
```

- The active item is marked with **`aria-current="page"`**, and the styling keys off that attribute.
  Styling an `isActive` boolean while telling assistive technology nothing is the usual version of
  this component and it is wrong.
- `--accent-soft` and `--accent-soft-foreground` are HeroUI's own derived pair, so the active state
  needs no new token.
- A section heading in the rail (`OVERVIEW`, `SETTINGS`) is a real heading or a labelled group, not
  a styled `div`.

## Hero banner

The violet block at the top of the dashboard. One per page, and it holds the page's single primary
action.

```tsx
<section className="bg-accent text-accent-foreground flex flex-col items-start gap-4 rounded-3xl p-6 sm:p-8">
  <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Online course</p>
  <h2 className="max-w-[28ch] text-2xl font-bold tracking-tight">Sharpen your skills…</h2>
  <Button type="button" variant="solid">
    Join now
  </Button>
</section>
```

- `text-accent-foreground` on `bg-accent` is the pair measured at 5.15:1. **Do not put `--muted`,
  `--foreground` or an opacity below 0.7 on text here** — the measurement stops holding.
- No gradient. The reference has one; a gradient makes the contrast of the text a function of
  position, which cannot be measured once. A flat accent is the trade this language takes.

## Card

```tsx
<Card.Root className="rounded-2xl p-5">
  <Card.Content className="flex flex-col gap-3 p-0">…</Card.Content>
</Card.Root>
```

- `Card.Content` sets `flex-direction: column` in HeroUI's own stylesheet, so a row layout needs an
  explicit `flex-row` — the mistake already made once in `meeting-list.tsx`.
- `p-0` on the content and the padding on the root, so one element owns the spacing.
- Raised (`shadow-surface`) **or** bordered (`border border-border`), never both.

## List of records

The shape `meeting-list.tsx` already uses, and the one to keep.

```tsx
<ul className="flex flex-col gap-3" aria-label="Recent meetings">
  <li>
    <Card.Root className="rounded-2xl px-4 py-3">
      <Card.Content className="flex flex-row items-center justify-between gap-4 p-0">
        …
      </Card.Content>
    </Card.Root>
  </li>
</ul>
```

- `ul`/`li` with a card **inside** the item. Not `ListBox`: it renders `listbox`/`option`, which is
  a different contract from the `list`/`listitem` `HD-FN-04` and `HD-FN-05` assert (`FACT-3512`).
- The list carries an `aria-label`; an unnamed list of five is unnavigable.
- An empty list is **explicit text**, never an empty `ul` — the two are indistinguishable from
  "the data failed to load" (`HD-FN-09`).

## Category chip

```tsx
<Chip.Root size="sm" className="bg-category-violet text-category-violet-foreground rounded-md">
  <Chip.Label>UI/UX Design</Chip.Label>
</Chip.Root>
```

- The label text is what says what the chip means. The tint is a second, redundant cue — remove the
  colour and the row still reads.
- One tint per category, assigned in a lookup the component imports, not computed from the string.
- A chip is not a button. If it filters something it is a `ToggleButton` with a name and a pressed
  state.

## Stat tile

```tsx
<Card.Root className="rounded-2xl p-4">
  <Card.Content className="flex flex-row items-center gap-3 p-0">
    <span className="bg-category-blue text-category-blue-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
      <Pencil size={20} weight="regular" aria-hidden="true" />
    </span>
    <div className="flex min-w-0 flex-col">
      <span className="text-muted text-sm">2/8 watched</span>
      <span className="truncate font-semibold">UI/UX Design</span>
    </div>
  </Card.Content>
</Card.Root>
```

The number is the smaller line and the subject is the larger one, not the other way round: a row of
tiles is scanned by subject first. For anything with a numeric progress, use HeroUI's `ProgressBar`
or `Meter` rather than a styled `div` — they carry the ARIA value attributes for free.

## Person row

Avatar, name, role, one action. HeroUI has `Avatar` and `AvatarGroup`.

- An avatar image gets `alt=""` and `aria-hidden` when the name is beside it: reading "Photo of
  Padhang Satrio. Padhang Satrio." twice is worse than not reading it.
- The action is a named `Button`, never an icon alone.
- Initials are the fallback, and the fallback is text — not a generated colour that encodes nothing.

## Form

The one surface where the library's own documentation is wrong for this repository. Written out in
full because it is the pattern most often copied from the wrong place:

```tsx
<form action={formAction} noValidate className="flex flex-col gap-4">
  <TextField name="email" className="flex flex-col gap-1.5">
    <Label>Email</Label>
    <Input type="text" />
  </TextField>

  {state.error ? (
    <p role="alert" className="text-danger text-sm">
      {state.error}
    </p>
  ) : null}

  <Button type="submit">Sign in</Button>
</form>
```

- **No `isRequired`, no `required`, no `validate`, and email is `type="text"`.** Each one on its own
  makes the browser or React Aria refuse the submission, so the Server Action never runs and the
  Nest validation branch is never reached (invariant 15).
- `noValidate` on the `<form>`, which stays a native element because `action={formAction}` is a
  Next.js binding and HeroUI's `Form` owns submission (`FACT-3510`).
- `<Button type="submit">`, never `onPress` (`FACT-3511`).
- One `role="alert"` paragraph for the whole form. Per-field errors are better and are deliberately
  not done yet — they change the Server Action's state shape and the locators, so they are `BL-029`,
  not an edit made while passing through.
- The password is never trimmed. `trim` applies to email only.

## Date and time

`formatMeetingDateTime` in `apps/web/src/lib/format-date.ts`, pinned to `timeZone: 'UTC'`. Never
`toLocaleString` with the machine's zone: both the units and the e2e would then depend on where they
run.

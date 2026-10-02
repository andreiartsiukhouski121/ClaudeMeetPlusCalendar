---
name: ui-ux-pro-max
description: UI/UX design intelligence — searchable guidance on accessibility, layout, typography, colour, interaction and charts — adapted to this repository, whose component library the set does not know. Use when designing or reviewing a page or component under apps/web, when choosing spacing, colour or type, when an accessibility question comes up, and before applying any of its stack-specific advice here.
---

Adapter for the external `ui-ux-pro-max` skill (`nextlevelbuilder/ui-ux-pro-max-skill`). The set
lives in `.agents/skills/ui-ux-pro-max/` — a gitignored directory — and carries 119 UX guidelines,
192 product palettes, 74 font pairings, 105 icons, 25 chart types and 22 technology stacks as
searchable CSV, plus a Python search tool. **This file is self-contained:** everything local is
here, and it keeps working when `.agents/` is absent.

## Running it, which the set documents wrongly for us

The set's own `SKILL.md` says to invoke the search as
`python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py"`. **That path does
not exist here.** This repository keeps external sets in `.agents/` and reserves `.claude/skills/`
for adapters like this one, so the invocation is:

```bash
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system
```

Domains: `ux`, `style`, `product`, `typography`, `color`, `icons`, `gsap`, `chart`, plus a stack
name. Python 3 is on this machine and the scripts need no third-party package. Query with two to
five meaningful terms and one dominant intent; if the result is empty or off-topic, retry once with
a narrower query and then say no verified match was found rather than inventing one.

The installer also symlinks the set into `.claude/skills/`. That symlink is **removed on purpose**:
it points into a gitignored directory, so committing it would hand a fresh clone a dangling link,
and it would sit exactly where this adapter has to live.

## What the set does not know about this repository

**It has no HeroUI stack.** Its 22 stacks include `nextjs`, `react`, `html-tailwind` and `shadcn`,
and `apps/web` is HeroUI v3 on Tailwind v4 (`ADR-0023`). So:

- **Take its `ux`, `typography`, `color`, `icons` and `chart` guidance** — those are about what a
  user sees and are library-independent.
- **Do not take its component code.** A `shadcn` or `html-tailwind` snippet is not our component
  library; translate the intent into HeroUI and check it against the `heroui-react` skill.
- `--stack nextjs` is still useful for App Router and rendering questions, which are ours.

**It does not know invariants 9–15 and 19**, and `CLAUDE.md` outranks it wherever they meet. The
collision to watch is forms: anything the set suggests that puts validation in the browser — a
`required` attribute, a client-side validator, a native email type — breaks invariant 15, because
the browser then refuses the submission and the Nest branch never runs. Its own "visible labels,
error near the field, helper text" advice is compatible and already followed.

## One divergence worth knowing, deliberately not acted on

The set's `Forms / Error Placement` rule asks for an inline error per invalid field, tied to the
input with `aria-describedby`. Our forms render **one** `role="alert"` paragraph for the whole
form, and `AL-FN-03`, `AL-FN-05` and `HD-FN-06` address it that way.

The set is right that per-field errors are better. Changing it is a **behaviour change**: the
locators move, the Server Action state shape changes from one `error` string to a per-field map,
and Nest's 400 body — an array of strings for a `ValidationPipe` failure, a string for 401 and 404
(invariant 8) — has to be parsed into that map. That is a feature with a plan, not an edit made
while passing through. Recorded as `BL-029`.

## Where it belongs in the flow

- **`FEAT-S2` design** (`designer`): the natural home. A UI design searches this set for the layout,
  type and colour decisions it is about to make, and names what it took.
- **`FEAT-S4` implementation** (`implementer-web`): for a specific question — contrast, touch
  target, focus behaviour — not as a second design pass.
- **UI review**: its accessibility and interaction checks are a useful list to press a change
  against, alongside the functional cases.

It is **not** a gate and adds no stage. Nothing in this repository requires a search before a UI
change, and nothing checks that one happened — it is a reference, and treating it as a step is the
shape `CH-004` is the ledger entry for.

For charts specifically, the machine-wide `dataviz` skill is the more opinionated of the two and
covers the same ground; this set's `chart` domain is a cross-check, not a second standard.

## Restoring the set

```bash
pnpm skills:sync     # by the lock file; needs the network
pnpm skills:check    # offline: compares the treeHash on disk with the lock
```

`skills-lock.json` pins the source, the branch, the commit and the `treeHash`, so a restore is
reproducible and drift is caught the same way as for the other sets.

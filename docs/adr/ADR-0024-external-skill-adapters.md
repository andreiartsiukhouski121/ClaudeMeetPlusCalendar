# ADR-0024 — An external skill set is wired in through an adapter and pinned by a lock file

- **Status:** accepted
- **Date:** 2026-10-02
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3518` Six external skill sets are in use — `git-commit`, `heroui-react`,
  `nestjs-best-practices`, `requesting-code-review`, `vercel-react-best-practices` and
  `ui-ux-pro-max` — and before this record the rule governing them existed only as prose in
  `CLAUDE.md`, with no ADR. — `skills-lock.json`, `CLAUDE.md`, "Skills: our own and external"
- `FACT-3519` A copied external rule drifts from its origin silently; `FX-023` is the ledger entry
  for that class, and an external set is updated upstream without this repository being involved. —
  `docs/CHANGELOG.md` `FX-023`
- `FACT-3520` Four rules of `nestjs-best-practices` contradict this repository's invariants
  outright, and HeroUI's own form documentation breaks invariant 15 in three places — so an
  external set cannot be followed as written. — `.claude/skills/nestjs-best-practices/SKILL.md`,
  `.claude/skills/heroui-react/SKILL.md`, `ADR-0023`
- `FACT-3521` Installers for these sets write into the consuming project: `npx skills add`
  symlinked `ui-ux-pro-max` into `.claude/skills/` and wrote a lock entry without `ref`, `commit`
  or `treeHash`. — `skills-lock.json`, `CH-027`

> **Rationale — not a fact.** The rule has worked six times and cost nothing to follow, which is
> exactly why it was never written down. It is recorded now because the sixth set arrived with an
> installer that broke two halves of it in one command, and prose in `CLAUDE.md` is not something a
> future change can be checked against.

## Decision

- `FACT-3522` An external set is wired in through an **adapter** in `.claude/skills/<name>/SKILL.md`,
  never by copying its rules into this repository. The adapter holds only the local part: what the
  set is wrong about here, what it does not know about this repository, and when to call it at all.
  — `.claude/skills/*/SKILL.md`
- `FACT-3523` The sets live in `.agents/skills/`, which is in `.gitignore`; `.claude/skills/` holds
  adapters and this repository's own skills, and nothing else. A symlink from one into the other is
  removed: it points into an ignored directory, so a fresh clone would receive a dangling link. —
  `.gitignore`, `.claude/skills/ui-ux-pro-max/SKILL.md`
- `FACT-3524` **An adapter must keep working without `.agents/`.** Anything it would lose its
  subject without lives next to it in git. — `CLAUDE.md`, "Skills: our own and external"
- `FACT-3525` Every set is pinned in `skills-lock.json`, which is in git, by source, branch, commit
  and `treeHash` — the hash of the whole directory, computed by `scripts/skills-sync.mjs`. A set
  published through a registry rather than a git tree carries an `install` command and a version in
  place of a commit, and is still pinned by `treeHash`. — `skills-lock.json`,
  `scripts/skills-sync.mjs`
- `FACT-3526` The invariants of `CLAUDE.md` outrank any rule of any external set, and a conflict is
  named in that set's adapter rather than resolved case by case. — `CLAUDE.md`,
  "Skills: our own and external"

Rejected, each in one line:

- **Copying the useful rules into our own skills** — that is `FX-023`'s failure mode, and the
  external set keeps moving afterwards.
- **Vendoring the sets into git** — it makes every upstream update a merge, and the `treeHash`
  already makes a restore reproducible without the bytes.
- **Letting the installer's layout stand** — `.claude/skills/` would then hold a mix of adapters and
  symlinked foreign trees, and the adapter would have nowhere to live.
- **An ADR per adopted set** — six sets, six records, none of which would say anything the adapter
  does not. The decision is the mechanism; the sets are instances of it.
- **Wiring `pnpm skills:check` into `pnpm verify`** — `verify` must run in a fresh clone, where
  `.agents/` does not exist yet.

## Consequences

- `FACT-3527` Adopting a set costs an adapter, a lock entry and a ledger row, and the adapter has to
  be re-read when the set is updated — nothing compares an adapter against its origin automatically.
  — `skills-lock.json`, `CLAUDE.md`
- `FACT-3528` Neither `pnpm skills:sync` nor `pnpm skills:check` is part of `pnpm verify`: `sync`
  needs the network and `check` needs a directory a fresh clone does not have. Drift is therefore
  caught only when someone runs `skills:check`. — `package.json`, `CLAUDE.md`
- `FACT-3529` An installer may write into `.claude/skills/` and into `skills-lock.json`. After any
  `npx skills add`, both are inspected before the change is committed: the symlink is removed and
  the lock entry completed with `ref` and `commit`. — `CH-027`

> **Rationale — not a fact.** The weak point of this decision is `FACT-3528`: nothing fails when an
> adapter goes stale against its set, the way the `heroui-react` adapter went stale against its own
> repository for one commit (`CH-026`). The cheap mechanical fix — a check that an adapter was
> touched when its `treeHash` moved — was not added, because it would fire on every upstream update
> whether or not the local part changed. Review is what holds this, and that is a known gap rather
> than an oversight.

What holds this in place: `skills-lock.json` in git with a `treeHash` per set; `pnpm skills:check`
run by hand; the adapters themselves, each stating its own conflicts; and `CLAUDE.md`, which states
the rule and that the invariants outrank any external rule.

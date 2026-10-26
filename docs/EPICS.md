# Epics

This file groups every ledger and backlog record into the eleven epics the owner tracks on the task board: five product epics for what a user of the app gets, and six technical epics for the work under the hood. Every `FT-`, `CH-`, `FX-` and `BL-` ID appears in exactly one epic, and a ledger check enforces it.

## EP-01 · Sign-in & account

- **Kind:** product
- **What it gives:** A user can sign in, stay signed in, sign out and get back in cleanly when a session expires, while the login resists guessing, timing tricks and account probing. Registration of new accounts is planned here too.
- **Members:** `FT-001`, `FX-004`, `FX-006`, `FX-007`, `BL-001`, `BL-002`, `BL-008`, `BL-041`

## EP-02 · Dashboard

- **Kind:** product
- **What it gives:** After signing in, the user lands on a home page that greets them, counts their meetings and shows the most recent ones, so they see where they stand at a glance.
- **Members:** `FT-002`, `BL-009`, `BL-035`

## EP-03 · Meetings

- **Kind:** product
- **What it gives:** A user can create meetings, open one to see its details and participants, and delete meetings they no longer need; only the owner ever sees or changes their meetings.
- **Members:** `FT-003`, `FT-010`, `CH-031`, `FX-046`, `BL-007`, `BL-024`, `BL-038`

## EP-04 · Meeting files

- **Kind:** product
- **What it gives:** A user can attach files to a meeting, see the list, download and delete them, within clear limits on size, type and count and with plain error messages when a limit is hit.
- **Members:** `FT-007`, `FX-041`, `FX-042`, `FX-043`, `FX-053`, `BL-056`

## EP-05 · Look & accessibility

- **Kind:** product
- **What it gives:** The app looks consistent and modern, with one design language for colours, type and layout, and it stays readable and usable for people relying on contrast, keyboards or screen readers.
- **Members:** `FT-004`, `FT-005`, `FT-006`, `CH-026`, `CH-028`, `CH-029`, `FX-039`, `FX-040`, `FX-049`, `BL-023`, `BL-029`, `BL-031`, `BL-032`, `BL-034`, `BL-036`, `BL-048`

## EP-06 · Security

- **Kind:** technical
- **What it gives:** Protects users and their data across the whole app: an automated security suite guards every protected page and endpoint, and known vulnerabilities in third-party packages are caught and fixed before they ship.
- **Members:** `CH-005`, `CH-030`, `CH-032`, `CH-036`, `CH-038`, `CH-039`, `FX-008`, `FX-016`, `FX-029`, `FX-036`, `FX-037`, `BL-003`, `BL-004`, `BL-005`, `BL-006`, `BL-011`, `BL-012`, `BL-018`, `BL-030`, `BL-033`, `BL-072`, `BL-073`, `BL-075`

## EP-07 · Clean architecture of the API

- **Kind:** technical
- **What it gives:** Reorganises the server code so business rules live apart from the database and the web framework, which makes new features cheaper and safer to add and lets machines check that the structure holds.
- **Members:** `FT-008`, `FT-009`, `CH-034`, `BL-043`, `BL-044`, `BL-049`, `BL-050`, `BL-051`, `BL-052`, `BL-053`, `BL-054`, `BL-060`

## EP-08 · Test architecture & reliability

- **Kind:** technical
- **What it gives:** Keeps the automated tests trustworthy and fast: a clear suite structure, checks that the tests themselves follow the rules, and fixes for tests that fail at random, so a green run really means the product works.
- **Members:** `CH-001`, `CH-002`, `CH-003`, `CH-037`, `FX-001`, `FX-002`, `FX-003`, `FX-009`, `FX-010`, `FX-011`, `FX-012`, `FX-014`, `FX-023`, `FX-030`, `FX-033`, `FX-035`, `FX-052`, `FX-054`, `FX-055`, `BL-028`, `BL-037`, `BL-045`, `BL-055`, `BL-058`, `BL-063`, `BL-064`, `BL-067`, `BL-069`, `BL-074`

## EP-09 · Development process & AI agent team

- **Kind:** technical
- **What it gives:** Defines how work gets done by the team of AI agents: the steps from idea to accepted change, who does what, the review gates, and the measurements used to make the process faster over time, including this task board.
- **Members:** `CH-004`, `CH-007`, `CH-011`, `CH-012`, `CH-013`, `CH-016`, `CH-017`, `CH-018`, `CH-019`, `CH-020`, `CH-021`, `CH-022`, `CH-025`, `CH-027`, `CH-033`, `CH-035`, `CH-040`, `CH-041`, `FX-013`, `FX-017`, `FX-024`, `FX-025`, `FX-026`, `FX-028`, `FX-034`, `FX-038`, `FX-047`, `FX-050`, `BL-013`, `BL-014`, `BL-020`, `BL-021`, `BL-022`, `BL-027`, `BL-039`, `BL-057`, `BL-070`

## EP-10 · Infrastructure & data

- **Kind:** technical
- **What it gives:** The foundations everything runs on: the database, automated builds and checks on every push, and the project's tooling, so the app can be developed, verified and eventually deployed reliably.
- **Members:** `CH-008`, `CH-009`, `FX-005`, `FX-015`, `FX-045`, `BL-010`, `BL-015`, `BL-016`, `BL-017`, `BL-025`, `BL-042`, `BL-046`, `BL-047`, `BL-066`

## EP-11 · Knowledge base & documentation

- **Kind:** technical
- **What it gives:** Keeps the project's written knowledge accurate and findable: how the system is built and why, every decision taken, and this record of what was done and what is next, with checks that catch contradictions.
- **Members:** `CH-006`, `CH-010`, `CH-014`, `CH-015`, `CH-023`, `CH-024`, `FX-018`, `FX-019`, `FX-020`, `FX-021`, `FX-022`, `FX-027`, `FX-031`, `FX-032`, `FX-044`, `FX-048`, `FX-051`, `BL-019`, `BL-026`, `BL-040`, `BL-059`, `BL-061`, `BL-062`, `BL-065`, `BL-068`, `BL-071`

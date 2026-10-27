# Epics

This file arranges the project's work in three levels for the owner reading the task board as a product owner. **Epics** are the eleven big areas: five product epics for what a user of the app gets, and six technical epics for the work under the hood. **Features** sit inside an epic and are the board's cards: each is a concrete, logically complete piece of functionality or change that is applied in the product, and it is done only when all of its tasks are. **Tasks** are the records the work is tracked by: the `FT-`, `CH-` and `FX-` entries of the ledger and the `BL-` rows of the backlog. Every `FT-`, `CH-`, `FX-` and `BL-` ID sits in exactly one feature, and a ledger check enforces it.

## EP-01 · Sign-in & account

- **Kind:** product
- **What it gives:** A user can sign in, stay signed in, sign out and get back in cleanly when a session expires, while the login resists guessing, timing tricks and account probing. Registration of new accounts is planned here too.

### F-001 · Sign in with email and password

- **What it gives:** A user signs in with their email and password, signs out, and gets back to the login page cleanly when a session breaks, without the login revealing which accounts exist.
- **Tasks:** `FT-001`, `FX-004`, `FX-006`, `FX-007`

### F-002 · Brute-force protection on login

- **What it gives:** Repeated wrong passwords are slowed down, so an attacker cannot guess a password by trying endlessly.
- **Tasks:** `BL-001`

### F-003 · Longer sessions with refresh tokens

- **What it gives:** A user stays signed in beyond one hour without having to enter the password again.
- **Tasks:** `BL-002`

### F-004 · Sign up for a new account

- **What it gives:** A new user can create an account themselves instead of relying on prepared accounts.
- **Tasks:** `BL-008`

### F-005 · One shared session check for every form

- **What it gives:** Every form action handles an expired session the same way, from one place, so a new form cannot get it wrong.
- **Tasks:** `BL-041`

## EP-02 · Dashboard

- **Kind:** product
- **What it gives:** After signing in, the user lands on a home page that greets them, counts their meetings and shows the most recent ones, so they see where they stand at a glance.

### F-006 · Home page with greeting and recent meetings

- **What it gives:** The home page greets the user, counts their meetings, shows the three most recent, lets them create a meeting and sign out.
- **Tasks:** `FT-002`

### F-007 · Times in the user's own time zone

- **What it gives:** Meeting times are shown in the time zone from the user's profile instead of always in UTC.
- **Tasks:** `BL-009`

### F-008 · Long email addresses stay readable

- **What it gives:** A long email in the home page greeting can still be read in full instead of being cut off.
- **Tasks:** `BL-035`

## EP-03 · Meetings

- **Kind:** product
- **What it gives:** A user can create meetings, open one to see its details and participants, and delete meetings they no longer need; only the owner ever sees or changes their meetings.

### F-009 · Meeting details with participants

- **What it gives:** A user opens one of their meetings to see its details and the list of participants, and never sees anyone else's.
- **Tasks:** `FT-003`, `CH-031`

### F-010 · Unguessable meeting and file identifiers

- **What it gives:** Every meeting and file gets an identifier that names its type and cannot be guessed, in one consistent format.
- **Tasks:** `FX-046`, `BL-024`, `BL-038`

### F-011 · Delete meetings and files

- **What it gives:** A user deletes a meeting or a single attached file they no longer need, and nobody else can delete theirs.
- **Tasks:** `FT-010`

### F-012 · Meeting editing

- **What it gives:** A user changes the title, time or participants of an existing meeting.
- **Tasks:** `BL-007`

## EP-04 · Meeting files

- **Kind:** product
- **What it gives:** A user can attach files to a meeting, see the list, download and delete them, within clear limits on size, type and count and with plain error messages when a limit is hit.

### F-013 · Attach, list and download meeting files

- **What it gives:** A user attaches files to a meeting, sees them listed and downloads them safely, within limits on size, type and count, with meetings kept in a real database.
- **Tasks:** `FT-007`, `FX-041`, `FX-043`

### F-014 · Clear error when no file is chosen

- **What it gives:** Submitting the upload form without choosing a file says that a file is required rather than complaining about the file type.
- **Tasks:** `FX-042`, `FX-053`

### F-015 · Friendly message for an oversized file

- **What it gives:** Uploading a file over the size limit shows a plain message that names the limit.
- **Tasks:** `BL-056`

## EP-05 · Look & accessibility

- **Kind:** product
- **What it gives:** The app looks consistent and modern, with one design language for colours, type and layout, and it stays readable and usable for people relying on contrast, keyboards or screen readers.

### F-016 · Modern component library for the interface

- **What it gives:** The whole interface is built on one modern component library, with the project's guidance updated to match.
- **Tasks:** `FT-004`, `CH-026`, `BL-023`

### F-017 · Clean, minimal interface

- **What it gives:** Pages are reworked for clear hierarchy, whitespace and one accent colour, with nothing decorative in the way.
- **Tasks:** `FT-005`

### F-018 · One design language for colours, type and layout

- **What it gives:** Colours, fonts, corner radii, icons and the page frame follow one written design language applied across every page.
- **Tasks:** `FT-006`, `CH-029`, `FX-040`, `BL-031`, `BL-032`

### F-019 · Readable contrast with automated accessibility checks

- **What it gives:** Buttons and error messages meet accessibility contrast rules, and an automated check scans pages for accessibility problems.
- **Tasks:** `CH-028`, `FX-039`, `FX-049`

### F-020 · Every error state checked for accessibility

- **What it gives:** Any new error message added to a page is automatically scanned for accessibility, not just the ones known today.
- **Tasks:** `BL-048`

### F-021 · Form errors shown next to each field

- **What it gives:** Form errors appear next to the field they are about and are announced with it by screen readers.
- **Tasks:** `BL-029`

### F-022 · Guard against broken styles

- **What it gives:** A style that renders nothing, a stray colour or a wrong font is caught automatically before it ships.
- **Tasks:** `BL-034`

### F-023 · Design guide corrections

- **What it gives:** The design guide stops contradicting itself and its sources, so new screens follow the right numbers.
- **Tasks:** `BL-036`

## EP-06 · Security

- **Kind:** technical
- **What it gives:** Protects users and their data across the whole app: an automated security suite guards every protected page and endpoint, and known vulnerabilities in third-party packages are caught and fixed before they ship.

### F-024 · Automated security suite

- **What it gives:** A dedicated test suite checks that protected pages and endpoints refuse strangers and that responses leak nothing about the server.
- **Tasks:** `CH-005`, `FX-008`

### F-025 · Security suite covers every page

- **What it gives:** Every page the app serves is guaranteed to be in the security suite, and its scenarios match what the tests actually do.
- **Tasks:** `BL-030`, `BL-072`

### F-026 · Vulnerable packages caught and patched

- **What it gives:** Known vulnerabilities in third-party packages are detected on every check and patched quickly, with tooling pinned so nothing unvetted is pulled in.
- **Tasks:** `CH-030`, `CH-032`, `CH-036`, `CH-038`, `CH-039`, `FX-016`, `FX-029`, `FX-036`, `FX-037`, `BL-033`

### F-027 · Remaining package advisories resolved

- **What it gives:** The advisories still accepted or below the blocking threshold are removed by upgrading the affected packages.
- **Tasks:** `BL-018`, `BL-073`, `BL-075`

### F-028 · Hardened production configuration

- **What it gives:** Production runs with browser security headers and without any built-in default secret.
- **Tasks:** `BL-005`, `BL-006`

### F-029 · Dedicated protection against cross-site requests

- **What it gives:** Forms carry their own anti-forgery token instead of relying on framework defaults alone.
- **Tasks:** `BL-003`

### F-030 · Seed passwords handled safely

- **What it gives:** Test account passwords can never be loaded into a production database.
- **Tasks:** `BL-004`

### F-031 · Secrets and licences audited

- **What it gives:** Leaked secrets are searched for across the whole history, and third-party licences are listed and checked.
- **Tasks:** `BL-011`, `BL-012`

## EP-07 · Clean architecture of the API

- **Kind:** technical
- **What it gives:** Reorganises the server code so business rules live apart from the database and the web framework, which makes new features cheaper and safer to add and lets machines check that the structure holds.

### F-032 · Clean architecture pilot on meeting files

- **What it gives:** The meeting files part of the server is rebuilt with business rules separated from the database and the framework, proving the approach.
- **Tasks:** `FT-008`, `BL-044`, `BL-049`

### F-033 · Meetings moved to clean architecture

- **What it gives:** The meetings part of the server follows the same separated structure as meeting files.
- **Tasks:** `FT-009`, `BL-050`

### F-034 · Architecture rules checked by machine

- **What it gives:** Automated checks fail the build when business code reaches into the clock, randomness or forbidden layers.
- **Tasks:** `CH-034`

### F-035 · Stronger architecture checks

- **What it gives:** The structure checks close their known loopholes and run early enough to catch mistakes before a commit.
- **Tasks:** `BL-053`, `BL-054`

### F-036 · Users and sign-in moved to clean architecture

- **What it gives:** The users and sign-in parts of the server follow the same separated structure without weakening login security.
- **Tasks:** `BL-051`, `BL-052`

### F-037 · File limit owned by the meeting

- **What it gives:** The rule of ten files per meeting lives with the meeting itself, in one place.
- **Tasks:** `BL-060`

### F-038 · One shared identifier generator

- **What it gives:** All identifiers are produced in one place, so none can be issued without its type prefix.
- **Tasks:** `BL-043`

## EP-08 · Test architecture & reliability

- **Kind:** technical
- **What it gives:** Keeps the automated tests trustworthy and fast: a clear suite structure, checks that the tests themselves follow the rules, and fixes for tests that fail at random, so a green run really means the product works.

### F-039 · Regression suite organised by feature

- **What it gives:** Tests are grouped by feature with a written scenario for each, and a self-check fails the run when the suite breaks its own rules.
- **Tasks:** `CH-001`, `CH-002`, `FX-001`, `FX-003`, `FX-009`, `FX-012`, `FX-035`

### F-040 · Reliable one-command test runs

- **What it gives:** A whole feature is accepted by running every test level in one command that starts the servers itself and cannot silently test the wrong build.
- **Tasks:** `CH-003`, `FX-002`, `FX-010`, `FX-014`, `FX-023`, `FX-030`

### F-041 · Flaky tests fixed

- **What it gives:** Tests that failed at random under load or in parallel now pass consistently, so a red run means a real problem.
- **Tasks:** `FX-011`, `FX-033`, `FX-052`, `BL-058`

### F-042 · User pool and cleanup for e2e tests

- **What it gives:** Each browser test takes its own user from a pool and cleans up after itself, so tests run in parallel without interfering.
- **Tasks:** `CH-037`, `FX-054`, `FX-055`

### F-043 · Remaining intermittent failures investigated

- **What it gives:** The last known rare failures in browser test runs are explained and removed.
- **Tasks:** `BL-063`, `BL-067`, `BL-069`

### F-044 · Suite self-checks without blind spots

- **What it gives:** The suite's self-checks cannot be satisfied by a comment or an empty test group, and its how-to guide is checked against the rules.
- **Tasks:** `BL-028`, `BL-037`, `BL-064`

### F-045 · Unit tests that match what they claim

- **What it gives:** Unit tests are named after what they test and actually check what their descriptions promise.
- **Tasks:** `BL-045`, `BL-055`, `BL-074`

## EP-09 · Development process & AI agent team

- **Kind:** technical
- **What it gives:** Defines how work gets done by the team of AI agents: the steps from idea to accepted change, who does what, the review gates, and the measurements used to make the process faster over time, including this task board.

### F-046 · Fast pipeline with mandatory orientation

- **What it gives:** Every change follows a short, named workflow for features or for bugs, and cannot start before checking what was already done or planned.
- **Tasks:** `CH-004`, `CH-007`, `CH-013`, `FX-013`, `FX-017`

### F-047 · External skills wired in as adapters

- **What it gives:** Outside guidance sets are pinned to exact versions and wrapped with local corrections, so they can be restored and never override the project's rules.
- **Tasks:** `CH-011`, `CH-012`, `CH-018`, `CH-027`, `FX-026`, `FX-028`

### F-048 · AI agent team with fixed roles

- **What it gives:** Work is split between agents whose permissions are fixed by their tools, so a reviewer cannot edit and an implementer cannot write tests.
- **Tasks:** `CH-016`, `FX-024`, `FX-025`, `BL-014`, `BL-070`

### F-049 · Research, design and plan before code

- **What it gives:** A change is researched, designed and planned, each step behind its own review, before any code is written.
- **Tasks:** `CH-017`

### F-050 · Measured process and tuning rounds

- **What it gives:** Every development cycle is measured, and the process is tuned from those numbers with the owner's approval.
- **Tasks:** `CH-019`, `CH-020`, `CH-021`, `CH-022`, `CH-025`, `CH-033`, `FX-034`, `FX-038`, `FX-047`, `BL-022`

### F-071 · Process depth sized by the task

- **What it gives:** Before work starts, the orchestrator sizes a feature or a bug as small, medium or large from checkable criteria, so a small change skips the planning stages and a risky one keeps every review.
- **Tasks:** `CH-044`

### F-051 · Gate verdicts captured automatically

- **What it gives:** Every review gate's verdict is saved in full without anyone copying it by hand.
- **Tasks:** `FX-050`, `BL-057`

### F-052 · Automatic formatting

- **What it gives:** Files are formatted as they are written, so formatting never fails a check later.
- **Tasks:** `CH-035`

### F-053 · Task board

- **What it gives:** The owner sees one generated page with epics, features, progress, the backlog and the history of what was done.
- **Tasks:** `CH-040`, `CH-041`, `CH-042`, `CH-043`

### F-054 · Parallel agents in separate workspaces

- **What it gives:** Several agents can work at once, each in its own copy of the repository, with setup and teardown handled by tooling.
- **Tasks:** `BL-013`

### F-055 · Pipeline rules enforced by machine

- **What it gives:** Which role may write which files is checked automatically rather than trusted to instructions.
- **Tasks:** `BL-020`, `BL-039`

### F-056 · Pipeline housekeeping

- **What it gives:** Old plan folders and audit documents are archived or corrected so they do not mislead.
- **Tasks:** `BL-021`, `BL-027`, `BL-076`, `FX-056`

## EP-10 · Infrastructure & data

- **Kind:** technical
- **What it gives:** The foundations everything runs on: the database, automated builds and checks on every push, and the project's tooling, so the app can be developed, verified and eventually deployed reliably.

### F-057 · Checks on every commit and push

- **What it gives:** Every commit runs the quick checks and every push runs the full verification and a production build in CI.
- **Tasks:** `CH-008`, `CH-009`, `FX-005`, `FX-015`, `BL-010`

### F-058 · Type checking covers all server code

- **What it gives:** Type checking reaches every server folder, including the database scripts, instead of passing vacuously.
- **Tasks:** `FX-045`

### F-059 · Project rules enforced by lint and config checks

- **What it gives:** Rules now held only by prose are enforced by lint, and no code folder can fall outside type checking.
- **Tasks:** `BL-046`, `BL-047`

### F-060 · Hardened CI

- **What it gives:** The main branch accepts only verified changes, and CI runs on current tooling with its settings stated explicitly.
- **Tasks:** `BL-015`, `BL-017`, `BL-066`

### F-061 · Deployment to production

- **What it gives:** The app is deployed automatically to a hosting platform.
- **Tasks:** `BL-016`

### F-062 · Smoother local verification

- **What it gives:** A fresh working session's first full check is not failed by the editor's own local settings file.
- **Tasks:** `BL-025`

### F-063 · Simpler web API client

- **What it gives:** The web app handles server errors through one path, so both kinds of requests report them the same way.
- **Tasks:** `BL-042`

## EP-11 · Knowledge base & documentation

- **Kind:** technical
- **What it gives:** Keeps the project's written knowledge accurate and findable: how the system is built and why, every decision taken, and this record of what was done and what is next, with checks that catch contradictions.

### F-064 · Ledger and backlog with automatic checks

- **What it gives:** Everything done and planned is recorded in a ledger and a backlog whose structure and commit links are checked automatically.
- **Tasks:** `CH-006`, `FX-018`, `FX-019`, `FX-020`, `FX-021`, `FX-022`, `FX-048`, `BL-026`

### F-065 · Architecture documents and decision records

- **What it gives:** How the system is built, why, and what each endpoint promises are written down once, with checks that the documents match the code.
- **Tasks:** `CH-010`, `CH-015`, `FX-027`, `FX-031`, `FX-032`

### F-066 · Every fact keyed and traceable

- **What it gives:** Every statement of fact in the architecture documents carries a key and a source, and outdated facts are retired rather than rewritten.
- **Tasks:** `CH-023`, `CH-024`, `FX-044`, `FX-051`, `BL-062`, `BL-068`

### F-067 · English-only project

- **What it gives:** Documents, code comments, tests, interface text and sample data are all in English.
- **Tasks:** `CH-014`

### F-068 · Known document inaccuracies corrected

- **What it gives:** The documented facts and guides that research found wrong or outdated are corrected.
- **Tasks:** `BL-059`, `BL-061`, `BL-065`, `BL-071`

### F-069 · Data model checked against the code

- **What it gives:** The documented data model is automatically compared with the code so they cannot drift apart.
- **Tasks:** `BL-019`

### F-070 · Code comments that point at lasting references

- **What it gives:** Code comments cite stable decisions instead of planning notes and line numbers that go stale.
- **Tasks:** `BL-040`

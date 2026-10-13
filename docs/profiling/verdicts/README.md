# Gate verdicts

Each file here is one gate reviewer's final report, saved verbatim by the `SubagentStop` hook
`scripts/save-verdict.mjs` (`ADR-0032`). **Never written by hand, never edited, append-only.** The
directory is excluded from Prettier, and the files are named
`<date>-<change slug>-<gate>-<agent id>.md`; a report whose verdict block is missing or malformed
carries `UNPARSED` in the name and is still kept.

The format of the block and the category list are in the `team-roles` skill, "The verdict block".
`pnpm verdicts:report` reads these files and prints what the gates keep finding.

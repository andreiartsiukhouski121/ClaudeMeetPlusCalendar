#!/usr/bin/env node
/**
 * Reads every saved gate verdict and prints a markdown report of what the gates keep finding.
 *
 *   pnpm verdicts:report                      all files in docs/profiling/verdicts/
 *   pnpm verdicts:report --since 2026-10-01   only files dated on or after that day
 *
 * It only reads: nothing is written, and the files are never normalised. The files are written by
 * `scripts/save-verdict.mjs` (a `SubagentStop` hook); the format is `team-roles`, "The verdict
 * block". Run it on the owner's request and before each tuning round (`pipeline-tuning`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { GATES, parseVerdict } from './verdicts-parse.mjs';

const DIR = path.join(path.resolve(import.meta.dirname, '..'), 'docs', 'profiling', 'verdicts');

const args = process.argv.slice(2);
const sinceAt = args.indexOf('--since');
const since = sinceAt === -1 ? undefined : args[sinceAt + 1];
if (since !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  console.error('--since takes YYYY-MM-DD');
  process.exit(1);
}

const files = fs.existsSync(DIR)
  ? fs
      .readdirSync(DIR)
      .filter((name) => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(name))
      .filter((name) => since === undefined || name.slice(0, 10) >= since)
      .sort()
  : [];

const verdicts = [];
const unparsed = [];
for (const name of files) {
  const parsed = parseVerdict(fs.readFileSync(path.join(DIR, name), 'utf8'));
  if (parsed.ok) verdicts.push({ name, ...parsed });
  else unparsed.push({ name, problems: parsed.problems });
}

const count = (map, key, by = 1) => map.set(key, (map.get(key) ?? 0) + by);
const sorted = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const table = (header, rows) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

const lines = [];
lines.push('# Gate verdicts' + (since ? ` since ${since}` : ''));
lines.push('');
lines.push(`${verdicts.length} parsed, ${unparsed.length} unparsed, ${files.length} files read.`);
lines.push('');

// Verdicts per gate.
const perGate = GATES.map((gate) => {
  const own = verdicts.filter((v) => v.gate === gate);
  const blockers = own.reduce(
    (sum, v) => sum + v.findings.filter((f) => f.severity === 'blocker').length,
    0,
  );
  return [
    gate,
    own.length,
    own.filter((v) => v.verdict === 'accept').length,
    own.filter((v) => v.verdict === 'accept-after-blockers').length,
    own.filter((v) => v.verdict === 'reject').length,
    own.filter((v) => v.pass === 're-run').length,
    blockers,
  ];
});
lines.push('## Verdicts per gate', '');
lines.push(
  table(
    ['Gate', 'Verdicts', 'accept', 'accept-after-blockers', 'reject', 're-runs', 'Blockers raised'],
    perGate,
  ),
);
lines.push('');

// Findings by category, kind and severity.
const findings = verdicts.flatMap((v) =>
  v.findings.map((f) => ({ ...f, gate: v.gate, change: v.change })),
);
const byCategory = new Map();
for (const f of findings) {
  const row = byCategory.get(f.category) ?? { shape: 0, correction: 0, nit: 0, changes: new Set() };
  if (f.severity === 'nit') row.nit += 1;
  else row[f.kind] += 1;
  row.changes.add(f.change);
  byCategory.set(f.category, row);
}
const total = (row) => row.shape + row.correction + row.nit;
const ranked = [...byCategory.entries()].sort(
  (a, b) => total(b[1]) - total(a[1]) || a[0].localeCompare(b[0]),
);

lines.push('## Findings by category', '');
lines.push(
  ranked.length === 0
    ? 'No findings.'
    : table(
        ['Category', 'Total', 'Blocker shape', 'Blocker correction', 'Nit', 'Change slugs'],
        ranked.map(([category, row]) => [
          category,
          total(row),
          row.shape,
          row.correction,
          row.nit,
          [...row.changes].sort().join(', '),
        ]),
      ),
);
lines.push('');

// Top categories per gate.
lines.push('## Top categories per gate', '');
for (const gate of GATES) {
  const map = new Map();
  for (const f of findings.filter((x) => x.gate === gate)) count(map, f.category);
  const top = sorted(map).slice(0, 3);
  lines.push(
    `- ${gate}: ${top.length === 0 ? 'none' : top.map(([c, n]) => `${c} (${n})`).join(', ')}`,
  );
}
lines.push('');

// Unparsed.
lines.push('## Unparsed files', '');
if (unparsed.length === 0) lines.push('None.');
for (const item of unparsed) lines.push(`- ${item.name} — ${item.problems.join('; ')}`);
lines.push('');

process.stdout.write(lines.join('\n'));

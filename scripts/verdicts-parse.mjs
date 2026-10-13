/**
 * Parses the verdict block a gate reviewer opens its report with.
 *
 * The format and the category list live in the `team-roles` skill, "The verdict block"; this file
 * only reads what that section describes. It is shared by `save-verdict.mjs` (which decides whether
 * a saved file is "UNPARSED") and `verdicts-report.mjs` (which counts), so the two cannot disagree
 * about what a well-formed block is.
 *
 * Nothing here throws: a block that does not parse comes back with `ok: false` and the reasons.
 */

export const GATES = ['FEAT-G1', 'FEAT-G2', 'FEAT-G3', 'FEAT-G4'];
export const PASSES = ['first', 're-run'];
export const VERDICTS = ['accept', 'accept-after-blockers', 'reject'];

/**
 * The prose verdicts' own words, accepted in the block and counted under the block's word, so a
 * reviewer who writes `rework` is not filed as UNPARSED (`team-roles`, "The verdict block").
 */
const VERDICT_ALIASES = { rework: 'reject', 'accept after blockers': 'accept-after-blockers' };
export const REVIEWERS = ['research-reviewer', 'design-reviewer', 'plan-reviewer', 'code-reviewer'];

const BLOCK = /^VERDICT[ \t]*\r?\n([\s\S]*?)^END VERDICT[ \t]*$/m;

/** `Key: value` lines before `Findings:` → an object; the rest is the findings list. */
export function parseVerdict(text) {
  const problems = [];
  const match = BLOCK.exec(text);
  if (match === null) {
    return { ok: false, problems: ['no VERDICT … END VERDICT block'], findings: [] };
  }

  const fields = {};
  const findings = [];
  let inFindings = false;

  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;

    if (/^Findings:\s*$/.test(line)) {
      inFindings = true;
      continue;
    }

    if (!inFindings) {
      const field = /^([A-Za-z]+):\s*(.*)$/.exec(line);
      if (field !== null) fields[field[1]] = field[2].trim();
      continue;
    }

    if (/^-\s*none\s*$/i.test(line)) continue;

    const parts = line
      .replace(/^-\s*/, '')
      .split('|')
      .map((part) => part.trim());
    const [severity, kind, category, ...rest] = parts;
    const validSeverity = severity === 'blocker' || severity === 'nit';
    const validKind =
      severity === 'blocker' ? kind === 'shape' || kind === 'correction' : kind === '-';

    if (!validSeverity || !validKind || !category || parts.length < 4) {
      problems.push(`malformed finding: ${line.slice(0, 80)}`);
      continue;
    }
    findings.push({ severity, kind, category, text: rest.join(' | ') });
  }

  if (fields.Verdict && VERDICT_ALIASES[fields.Verdict])
    fields.Verdict = VERDICT_ALIASES[fields.Verdict];

  if (!fields.Change || /^</.test(fields.Change)) problems.push('Change missing');
  if (!GATES.includes(fields.Gate)) problems.push('Gate missing or not FEAT-G1..G4');
  if (!PASSES.includes(fields.Pass)) problems.push('Pass missing or not first|re-run');
  if (!VERDICTS.includes(fields.Verdict)) problems.push('Verdict missing or not a listed value');
  if (!inFindings) problems.push('Findings: missing');

  return {
    ok: problems.length === 0,
    problems,
    change: fields.Change,
    gate: fields.Gate,
    pass: fields.Pass,
    verdict: fields.Verdict,
    findings,
  };
}

/** A path-safe slug: lower case, letters, digits and hyphens. */
export function safeSlug(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'unknown' : slug;
}

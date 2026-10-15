#!/usr/bin/env node
/**
 * `SubagentStop` hook: saves a gate reviewer's final report to `docs/profiling/verdicts/`.
 *
 * The reviewers are read-only (`ADR-0014`), so they cannot write their own verdict, and a verdict
 * held only in the conversation is lost with the session (the `FEAT-G2` verdict in the 2026-10-03
 * record). The hook runs outside the agent, so nothing about the reviewer's tool list changes.
 *
 *   echo '{"agent_type":"plan-reviewer", …}' | node scripts/save-verdict.mjs
 *
 * Stdin is the hook's JSON: `agent_type`, `agent_id`, `last_assistant_message`, `session_id`,
 * `transcript_path`, `cwd`. When `last_assistant_message` is empty the report is read from the
 * reviewer's own transcript. `VERDICTS_DIR` overrides the output directory (`PR-API-08`).
 * Anything that is not one of the four reviewers is ignored. A report whose VERDICT block is missing
 * or malformed is still saved, with `UNPARSED` in the file name, so nothing is lost.
 *
 * It always exits 0: a hook that fails must never break a review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REVIEWERS, parseVerdict, safeSlug } from './verdicts-parse.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const OUT_DIR = process.env.VERDICTS_DIR || path.join(repoRoot, 'docs', 'profiling', 'verdicts');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** Local calendar date, `YYYY-MM-DD`. */
function today(now) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Writes without overwriting: a resumed agent can stop twice under one id. */
function writeNew(base, content) {
  for (let n = 1; ; n += 1) {
    const file = path.join(OUT_DIR, n === 1 ? `${base}.md` : `${base}-${n}.md`);
    try {
      fs.writeFileSync(file, content, { flag: 'wx' });
      return file;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

/** The text blocks and `SubagentHandback` messages of one transcript line, in order. */
function reportsIn(line) {
  const content = line?.type === 'assistant' ? line.message?.content : undefined;
  if (!Array.isArray(content)) return [];
  return content
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.type === 'tool_use' && part.name === 'SubagentHandback') return part.input?.message;
      return undefined;
    })
    .filter((text) => typeof text === 'string' && text.trim() !== '');
}

/**
 * The reviewer's last report, read from its own transcript. Reviewers hand back through the
 * `SubagentHandback` tool, so their last turn holds no text and `last_assistant_message` arrives
 * empty (`FX-050`). Claude Code keeps a subagent's transcript at
 * `<directory of transcript_path>/<session_id>/subagents/agent-<agent_id>.jsonl`.
 */
function reportFromTranscript(input) {
  const file =
    input.agent_transcript_path ??
    (input.transcript_path && input.session_id && input.agent_id
      ? path.join(
          path.dirname(input.transcript_path),
          input.session_id,
          'subagents',
          `agent-${input.agent_id}.jsonl`,
        )
      : undefined);
  if (!file || !fs.existsSync(file)) return '';

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).reverse();
  for (const raw of lines) {
    if (raw.trim() === '') continue;
    let line;
    try {
      line = JSON.parse(raw);
    } catch {
      continue;
    }
    const reports = reportsIn(line);
    if (reports.length > 0) return reports.at(-1);
  }
  return '';
}

try {
  const input = JSON.parse(readStdin() || '{}');

  if (REVIEWERS.includes(input.agent_type)) {
    const message =
      String(input.last_assistant_message ?? '').trim() || reportFromTranscript(input);
    const parsed = parseVerdict(message);
    const now = new Date();

    const slug = safeSlug(parsed.change);
    const gate = safeSlug(parsed.gate);
    const agent = safeSlug(input.agent_id).slice(0, 8) || 'unknown';
    const tag = parsed.ok ? '' : '-UNPARSED';

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const header =
      `<!-- agent: ${input.agent_type}; session: ${input.session_id ?? 'unknown'}; ` +
      `captured: ${now.toISOString()} -->\n\n`;
    writeNew(`${today(now)}-${slug}-${gate}-${agent}${tag}`, header + message + '\n');
  }
} catch {
  // Swallowed on purpose: see the header.
}

process.exit(0);

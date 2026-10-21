#!/usr/bin/env node
/**
 * `PostToolUse` hook on `Write|Edit`: formats the file just written, and regenerates
 * `e2e/scenarios-index.md` when it was a `*.cases.md` (`CH-035`).
 *
 * Several roles hold `Write` without `Bash` on purpose (`ADR-0014`): they could not run
 * `prettier`, so their files reached `format:check` unformatted and `pnpm verify` went red two steps
 * later (`FX-034`), and a scenario edit left the index stale for `PR-API-07`. The hook runs outside
 * the agent, so it does both without handing any read-only role a shell.
 *
 *   echo '{"tool_input":{"file_path":"docs/x.md"}}' | node scripts/after-edit.mjs
 *
 * Files outside the repository, and files `prettier` does not handle or `.prettierignore` lists,
 * are left alone. It always exits 0: a hook that fails must never break an edit.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const PRETTIER = path.join(repoRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
const SCENARIOS_INDEX = path.join(repoRoot, 'scripts', 'scenarios-index.mjs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

try {
  const input = JSON.parse(readStdin() || '{}');
  const raw = input.tool_input?.file_path;

  if (typeof raw === 'string' && raw !== '') {
    const file = path.resolve(input.cwd ?? repoRoot, raw);
    const relative = path.relative(repoRoot, file);
    const inside = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);

    if (inside && fs.existsSync(file)) {
      execFileSync(process.execPath, [PRETTIER, '--write', '--ignore-unknown', file], {
        cwd: repoRoot,
        stdio: 'ignore',
      });

      const posix = relative.split(path.sep).join('/');
      if (posix.startsWith('e2e/') && posix.endsWith('.cases.md')) {
        execFileSync(process.execPath, [SCENARIOS_INDEX, 'write'], {
          cwd: repoRoot,
          stdio: 'ignore',
        });
        execFileSync(
          process.execPath,
          [PRETTIER, '--write', path.join(repoRoot, 'e2e', 'scenarios-index.md')],
          { cwd: repoRoot, stdio: 'ignore' },
        );
      }
    }
  }
} catch {
  // Swallowed on purpose: see the header.
}

process.exit(0);

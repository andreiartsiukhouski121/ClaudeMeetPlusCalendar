#!/usr/bin/env node
/**
 * Prints the next free `FACT-NNNN` number in each block of the architecture corpus (`ADR-0021`).
 *
 * Allocating a key by hand is how two `ADR-0007`s happen, which is why `pnpm adr:new` exists; this
 * is the same tool for facts. It only reports — it never edits a document.
 *
 *   pnpm fact:next            every block, with its next free number
 *   pnpm fact:next data       only the block whose name starts with "data"
 *   pnpm fact:next --used     also list the numbers already taken, per block
 *
 * A retired key keeps its number forever (`ADR-0021`, Consequences), so "next free" means one past
 * the highest ever used in the block, not the first gap.
 */
import fs from 'node:fs';
import path from 'node:path';

/** The blocks, exactly as `ADR-0021` fixes them. */
const BLOCKS = [
  { name: 'architecture', from: 1, to: 999, target: 'docs/architecture.md' },
  { name: 'data-model', from: 1000, to: 1999, target: 'docs/data-model.md' },
  { name: 'api-contract', from: 2000, to: 2999, target: 'docs/api-contract.md' },
  { name: 'adr', from: 3000, to: 3999, target: 'docs/adr' },
];

const FACT_KEY = /\bFACT-(\d{4})\b/g;

const repoRoot = path.resolve(import.meta.dirname, '..');

/** Every `.md` file under a target, whether the target is a file or a directory. */
function markdownFiles(target) {
  const absolute = path.join(repoRoot, target);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [absolute];
  return fs
    .readdirSync(absolute)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => path.join(absolute, entry));
}

/** Every number a block's documents mention, whether it belongs to that block or not. */
function numbersIn(target) {
  const found = new Set();
  for (const file of markdownFiles(target)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(FACT_KEY)) found.add(Number(match[1]));
  }
  return found;
}

const wanted = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const showUsed = process.argv.includes('--used');

const blocks = wanted.length
  ? BLOCKS.filter((block) => wanted.some((name) => block.name.startsWith(name)))
  : BLOCKS;

if (!blocks.length) {
  console.error(`No such block. Known: ${BLOCKS.map((block) => block.name).join(', ')}`);
  process.exit(1);
}

for (const block of blocks) {
  const own = [...numbersIn(block.target)]
    .filter((number) => number >= block.from && number <= block.to)
    .sort((a, b) => a - b);

  const next = own.length ? Math.max(...own) + 1 : block.from;
  const exhausted = next > block.to;

  const range = `${String(block.from).padStart(4, '0')}–${String(block.to).padStart(4, '0')}`;
  const nextKey = exhausted ? 'block full' : `FACT-${String(next).padStart(4, '0')}`;

  console.log(
    `${block.name.padEnd(13)} ${range}  used ${String(own.length).padStart(3)}  next ${nextKey}  ${block.target}`,
  );

  if (showUsed && own.length) {
    console.log(`  ${own.map((number) => `FACT-${String(number).padStart(4, '0')}`).join(' ')}`);
  }
}

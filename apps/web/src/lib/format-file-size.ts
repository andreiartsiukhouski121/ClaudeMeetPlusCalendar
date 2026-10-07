/**
 * Renders a meeting attachment's `sizeBytes` the way the user reads it (design §3): binary
 * divisors with binary labels, a single space, no thousands separator and **no `Intl`/locale** — a
 * locale-dependent decimal mark would make the page machine-dependent, the same class of problem
 * `timeZone: 'UTC'` is pinned against (invariant 14 keeps this module free of `server-only`, so it
 * stays unit-testable).
 *
 * | `sizeBytes`         | Output                                       |
 * | ------------------- | --------------------------------------------- |
 * | 0 … 1023            | the exact integer, a space, `B`, no decimals |
 * | 1024 … 1 048 575    | value ÷ 1024 to **one** decimal, ` KiB`      |
 * | 1 048 576 and above | value ÷ 1 048 576 to **one** decimal, ` MiB` |
 *
 * `KiB`/`MiB` rather than `KB`/`MB` deliberately: the divisor is 1024, and labelling a 1024-based
 * division `MB` would put the UI and the contract's 1 MiB ceiling 5% apart. The top of the KiB
 * band (1 048 575 bytes) renders as `1024.0 KiB` — one decimal of 1023.999, rounded — not `1.0 MiB`.
 */
const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = 1024 * 1024;

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < BYTES_PER_KIB) {
    return `${String(sizeBytes)} B`;
  }

  if (sizeBytes < BYTES_PER_MIB) {
    return `${(sizeBytes / BYTES_PER_KIB).toFixed(1)} KiB`;
  }

  return `${(sizeBytes / BYTES_PER_MIB).toFixed(1)} MiB`;
}

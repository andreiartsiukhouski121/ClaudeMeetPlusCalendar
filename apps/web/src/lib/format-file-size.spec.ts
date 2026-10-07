import { afterEach, describe, expect, it } from 'vitest';

import { formatFileSize } from './format-file-size';

/**
 * Cases `MF-UT-04`…`MF-UT-07` from
 * `e2e/regression/meeting-files/meeting-files.unit.cases.md`.
 *
 * Globals are off in `apps/web`, so `describe/it/expect` are imported explicitly. The module
 * carries no `server-only` (invariant 14), which is what keeps it unit-testable.
 */
const ORIGINAL_LANG = process.env.LANG;
const ORIGINAL_LC_ALL = process.env.LC_ALL;
const ORIGINAL_TZ = process.env.TZ;

function restoreEnvVar(key: 'LANG' | 'LC_ALL' | 'TZ', original: string | undefined): void {
  if (original === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = original;
  }
}

afterEach(() => {
  restoreEnvVar('LANG', ORIGINAL_LANG);
  restoreEnvVar('LC_ALL', ORIGINAL_LC_ALL);
  restoreEnvVar('TZ', ORIGINAL_TZ);
});

describe('formatFileSize', () => {
  it('MF-UT-04 — below 1024 bytes: the exact integer and " B", no decimals', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(48)).toBe('48 B');
    expect(formatFileSize(1023)).toBe('1023 B');

    // No thousands separator.
    expect(formatFileSize(1023)).not.toContain(' 023');
  });

  it('MF-UT-05 — the KiB and MiB bands, one decimal each, including the trailing .0', () => {
    expect(formatFileSize(1024)).toBe('1.0 KiB');
    expect(formatFileSize(1536)).toBe('1.5 KiB');
    expect(formatFileSize(1_048_576)).toBe('1.0 MiB');
  });

  it('MF-UT-06 — no Intl, no locale, no thousands separator, byte-identical across LANG/LC_ALL/TZ', () => {
    const sizes = [0, 1, 48, 1024, 1_048_576];

    const baseline = sizes.map((size) => formatFileSize(size));

    process.env.LANG = 'de_DE.UTF-8';
    process.env.LC_ALL = 'de_DE.UTF-8';
    process.env.TZ = 'Asia/Tokyo';
    const underGermanLocaleAndTokyoTz = sizes.map((size) => formatFileSize(size));

    process.env.LANG = 'ru_RU.UTF-8';
    process.env.LC_ALL = 'ru_RU.UTF-8';
    process.env.TZ = 'America/Sao_Paulo';
    const underRussianLocaleAndSaoPauloTz = sizes.map((size) => formatFileSize(size));

    expect(underGermanLocaleAndTokyoTz).toEqual(baseline);
    expect(underRussianLocaleAndSaoPauloTz).toEqual(baseline);

    // The decimal mark is always '.', never ',' — a locale-dependent mark would make this and
    // the page assertion depend on the machine.
    expect(formatFileSize(1024)).toContain('.');
    expect(formatFileSize(1024)).not.toContain(',');

    // The NaN/Infinity/undefined guard, across the same set of sizes.
    for (const size of sizes) {
      const output = formatFileSize(size);
      expect(output).not.toContain('NaN');
      expect(output).not.toContain('Infinity');
      expect(output).not.toContain('undefined');
    }
  });

  it('MF-UT-07 — 1 048 575 renders 1024.0 KiB, not 1.0 MiB: this is the contract, not an off-by-one', () => {
    // The band is chosen by the byte count, and one decimal of 1023.999... rounds to 1024.0 — a
    // future reader must not "fix" this into a silent behaviour change.
    expect(formatFileSize(1_048_575)).toBe('1024.0 KiB');
    expect(formatFileSize(1_048_575)).not.toBe('1.0 MiB');

    // 1 048 576 is the first value of the MiB band, pinned by MF-UT-05 above.
    expect(formatFileSize(1_048_576)).toBe('1.0 MiB');
  });
});

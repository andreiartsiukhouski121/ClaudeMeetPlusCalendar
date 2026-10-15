import { describe, expect, it } from 'vitest';

import { CryptoUuidSource } from './crypto-uuid-source.js';

/** Case `MF-UT-21` from `e2e/regression/meeting-files/meeting-files.unit.cases.md`. */
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('CryptoUuidSource', () => {
  it('MF-UT-21 — yields a fresh v4 UUID on every call', () => {
    const source = new CryptoUuidSource();
    const values = Array.from({ length: 100 }, () => source.next());

    for (const value of values) {
      expect(value).toMatch(V4);
    }
    expect(new Set(values).size).toBe(100);
  });
});

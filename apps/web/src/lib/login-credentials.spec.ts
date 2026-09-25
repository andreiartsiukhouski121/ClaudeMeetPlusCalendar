import { describe, expect, it } from 'vitest';

import { hasEmptyCredential, readLoginCredentials } from './login-credentials';

/**
 * Cases AL-UT-29 and AL-UT-30 (see `e2e/regression/auth-login/auth-login.unit.cases.md`).
 *
 * Filed as a fix task after accepting feature 1: `loginAction` trimmed not only the email but the
 * password too. A password with an edge space silently became a different password, and its owner
 * could never sign in. Without these tests the change would come straight back.
 */

function formDataOf(email: string, password: string): FormData {
  const data = new FormData();
  data.set('email', email);
  data.set('password', password);

  return data;
}

describe('readLoginCredentials', () => {
  it('AL-UT-29 — the email is trimmed, the password stays byte for byte', () => {
    const credentials = readLoginCredentials(
      formDataOf('  teacher@purpleschool.test  ', '  Pa ss  '),
    );

    expect(credentials.email).toBe('teacher@purpleschool.test');
    // The key assertion of the fix: no trim, no whitespace normalization inside.
    expect(credentials.password).toBe('  Pa ss  ');
  });

  it('AL-UT-30 — missing fields give empty strings and count as empty', () => {
    const empty = readLoginCredentials(new FormData());

    expect(empty).toEqual({ email: '', password: '' });
    expect(hasEmptyCredential(empty)).toBe(true);

    // A password of only spaces does NOT count as empty: it is a valid password, and whether it
    // fits is the server's call, not the form's.
    expect(hasEmptyCredential({ email: 'a@b.test', password: '   ' })).toBe(false);
    expect(hasEmptyCredential({ email: 'a@b.test', password: 'x' })).toBe(false);
  });
});

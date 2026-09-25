import type { LoginCredentials } from './types';

/**
 * Parsing of the login form fields.
 *
 * A separate pure function rather than three lines inside `loginAction`: a Server Action cannot be
 * unit tested, and the "never alter the password" rule would otherwise have nothing pinning it —
 * it would come back at the first refactor (AL-UT-29, AL-UT-30).
 *
 * Invariant 15: **the email is trimmed, the password is not.** Spaces around an address are
 * accidental and trimming rescues the login; the server normalizes it again anyway. A password is
 * an arbitrary string where a space is significant: trimming silently alters what was typed, and
 * an owner whose password ends in a space could never sign in. NIST SP 800-63B explicitly forbids
 * modifying or truncating a password before verification.
 */
export function readLoginCredentials(formData: FormData): LoginCredentials {
  return {
    email: String(formData.get('email') ?? '').trim(),
    // Exactly String(...), no .trim(): see above. This is not an oversight.
    password: String(formData.get('password') ?? ''),
  };
}

/**
 * An empty field is the only thing checked on the BFF side: the email format and everything else
 * is validated by Nest, whose 400 becomes error text in `loginAction`.
 *
 * A password of only spaces does NOT count as empty — it is a valid password, and whether it fits
 * is the server's call, not the form's.
 */
export function hasEmptyCredential({ email, password }: LoginCredentials): boolean {
  return email === '' || password === '';
}

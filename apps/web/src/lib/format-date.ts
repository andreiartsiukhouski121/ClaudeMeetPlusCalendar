/**
 * Meeting date formatting and parsing of the `<input type="datetime-local">` value.
 *
 * A pure module: invariant 14 keeps `server-only` and `next/headers` out, or units `HD-UT-10`,
 * `HD-UT-11`, `HD-UT-15`, `HD-UT-16` would fail on an import Vitest cannot resolve.
 *
 * The time zone is pinned to **UTC** throughout: otherwise both the unit tests and the e2e
 * assertions would depend on the machine's TZ. Showing the user their own zone is a separate task
 * and has to be done in two places at once — the display and the form value parsing.
 */

/** Shown instead of a date when the string does not parse. */
export const INVALID_DATE_PLACEHOLDER = 'Date not set';

/**
 * Format "12 Jan 2026, 09:00" — `dateStyle: 'medium'` plus `timeStyle: 'short'`.
 *
 * A fresh `Intl.DateTimeFormat` per call rather than one at module load: a cached instance would
 * freeze together with the process environment, and `HD-UT-10` ("same string under `TZ=UTC` and
 * `TZ=Asia/Tokyo`") would stop proving anything. The cost is microseconds per meeting, and there
 * are never more than three on the page.
 */
function formatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

/**
 * ISO string from Nest to a human-readable UTC date and time.
 *
 * An invalid string yields the placeholder rather than `Invalid Date` in the markup or an
 * exception (`HD-UT-11`): one broken date in the data must not take the dashboard down.
 */
export function formatMeetingDateTime(iso: string): string {
  const timestamp = Date.parse(iso);

  if (Number.isNaN(timestamp)) {
    return INVALID_DATE_PLACEHOLDER;
  }

  return formatter().format(new Date(timestamp));
}

/**
 * The `<input type="datetime-local">` value (`2030-01-01T10:00`) is local time **without a zone**.
 * Per the ECMAScript spec such a string parses as the process's local time, so `Date.parse` would
 * differ between machines — exactly what `HD-UT-15` forbids and what `HD-FN-07` depends on.
 *
 * So a zoneless string gets a `Z` appended: since meetings are displayed in UTC, "10:00" typed in
 * shows as "10:00". A value with an explicit zone (or already carrying `Z`) is taken as is.
 */
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

/**
 * Parses the form field into ISO 8601 UTC. Returns `null` — never throws — for an empty or
 * unparseable string (`HD-UT-16`), or the Server Action would 500 instead of returning `{ error }`.
 */
export function toIsoStartsAt(raw: string): string | null {
  const value = raw.trim();

  if (value === '') {
    return null;
  }

  const normalized = DATETIME_LOCAL.test(value) ? `${value}Z` : value;
  const timestamp = Date.parse(normalized);

  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

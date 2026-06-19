/**
 * Single source for the relationship's start date.
 *
 * Per-couple overrides come from the DB (`couples.startDate`), but every
 * untethered place in the codebase (loaders, public pages, helpers before
 * userData is hydrated) needs a default. That default lives here.
 *
 * If the date ever changes, change it here — not in 16 components.
 */

export const DEFAULT_START_DATE = "2026-03-11";

export function defaultStartDate(): Date {
  return new Date(DEFAULT_START_DATE);
}

/**
 * Returns the start date for a couple, falling back to the global default.
 * Accepts the string form stored in DB / userStore.
 */
export function startDateFrom(raw: string | null | undefined, withTimePrefix = false): Date {
  const s = raw && raw.length > 0 ? raw : DEFAULT_START_DATE;
  return new Date(withTimePrefix ? `${s}T00:00:00` : s);
}

/** Whole days elapsed since the (couple's) start date. Never negative. */
export function daysTogether(raw?: string | null): number {
  const start = startDateFrom(raw, true);
  const diff = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/**
 * Canonical "which day of us is `dateKey`" — day 1 is the start date. Uses the
 * couple's start (falling back to default) at LOCAL midnight, the same basis as
 * `daysTogether`, so every surface agrees instead of drifting by a day across
 * timezones / UTC-vs-local starts. `dateKey` is a YYYY-MM-DD string.
 */
export function dayNumber(dateKey: string, raw?: string | null): number {
  const start = startDateFrom(raw, true).getTime();
  const d = new Date(`${dateKey}T00:00:00`).getTime();
  return Math.max(0, Math.floor((d - start) / 86_400_000)) + 1;
}

/** Today's ordinal day number (day 1 = the start date). */
export function todayDayNumber(raw?: string | null): number {
  return daysTogether(raw) + 1;
}

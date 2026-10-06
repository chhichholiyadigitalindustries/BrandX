/**
 * BRANDX Timezone Utility — Asia/Kolkata (Indian Standard Time, UTC+5:30)
 * Ensures all daily content, calendars, festivals, and business dates strictly adhere
 * to Indian calendar dates without timezone drift or UTC truncation anomalies.
 */

export const INDIA_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD for the given Date or current moment in Asia/Kolkata timezone
 */
export function getIndiaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // 'en-CA' gives YYYY-MM-DD strictly
}

/**
 * Returns the start and end of a given Indian calendar date (YYYY-MM-DD) as UTC Date objects
 */
export function getIndiaDateRange(dateStr: string): { startUtc: Date; endUtc: Date } {
  // IST is UTC + 05:30
  // Midnight IST on dateStr = dateStr + 'T00:00:00.000+05:30'
  // End of day IST on dateStr = dateStr + 'T23:59:59.999+05:30'
  const startUtc = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endUtc = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { startUtc, endUtc };
}

/**
 * Returns current Date in India timezone
 */
export function getIndiaNow(): Date {
  return new Date();
}

/**
 * Offset day by N days from given IST date string (e.g. +1 for tomorrow, -1 for yesterday)
 */
export function getOffsetIndiaDateString(offsetDays: number, fromDateStr?: string): string {
  const baseStr = fromDateStr || getIndiaDateString();
  const { startUtc } = getIndiaDateRange(baseStr);
  const offsetDate = new Date(startUtc.getTime() + offsetDays * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000); // midday
  return getIndiaDateString(offsetDate);
}

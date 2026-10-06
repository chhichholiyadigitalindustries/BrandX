/**
 * BRANDX — Centralized Timezone Utilities (Asia/Kolkata)
 * Guarantees date calculations adhere to Indian Standard Time (IST)
 */

export const INDIA_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD string for a given date in Asia/Kolkata timezone
 */
export function getIndiaDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Formats a date into a localized Indian date-time string
 */
export function formatIndiaDateTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

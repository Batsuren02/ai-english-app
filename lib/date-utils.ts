/**
 * Date utilities — centralises date formatting used across all pages.
 */

/** Returns today's date as YYYY-MM-DD in local UTC time. */
export const getToday = (): string => new Date().toISOString().split('T')[0]

/** Returns the date N days ago as YYYY-MM-DD. */
export const getDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]

/** Formats an ISO date string for display, e.g. "Mar 18". */
export const formatDisplayDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

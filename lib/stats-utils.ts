import type { ReviewLog } from './supabase'
import { getDaysAgo } from './date-utils'

/** Returns a CSS color variable string based on accuracy percentage. */
export const getAccuracyColor = (pct: number): string =>
  pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)'

/** Calculates accuracy as a percentage, returns 0 if no attempts. */
export const calcAccuracy = (correct: number, total: number): number =>
  total === 0 ? 0 : Math.round((correct / total) * 100)

/** Groups review logs by quiz type with correct/total counts. */
export const groupLogsByType = (
  logs: ReviewLog[]
): Record<string, { correct: number; total: number }> =>
  logs.reduce(
    (acc, log) => {
      const t = log.quiz_type ?? 'flashcard'
      if (!acc[t]) acc[t] = { correct: 0, total: 0 }
      acc[t].total++
      if (log.result >= 3) acc[t].correct++
      return acc
    },
    {} as Record<string, { correct: number; total: number }>
  )

/**
 * Builds a daily activity array for the last N days.
 * Each entry has a date (YYYY-MM-DD) and count of reviews.
 */
export const buildDailyActivity = (
  logs: ReviewLog[],
  days = 7
): { date: string; count: number }[] => {
  const map: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) map[getDaysAgo(i)] = 0
  logs.forEach(l => {
    const d = l.created_at.split('T')[0]
    if (d in map) map[d]++
  })
  return Object.entries(map).map(([date, count]) => ({ date, count }))
}

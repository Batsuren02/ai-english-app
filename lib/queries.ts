/**
 * Centralized Supabase data access layer.
 * All pages import from here instead of calling supabase.from() directly.
 * Every function throws on Supabase error so callers can use try/catch.
 */
import { supabase } from './supabase'
import type { Word, Review, ReviewLog, UserProfile } from './supabase'
import { getToday, getDaysAgo } from './date-utils'

// ── User Profile ──────────────────────────────────────────────────────────

/** Returns the user profile row or null if not set up yet. */
export async function getUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getUserProfile: ${error.message}`)
  return data
}

/** Upserts (creates or updates) the user profile. Requires id field. */
export async function upsertUserProfile(
  profile: Partial<UserProfile> & { id: string }
): Promise<void> {
  const { error } = await supabase
    .from('user_profile')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
  if (error) throw new Error(`upsertUserProfile: ${error.message}`)
}

// ── Words ─────────────────────────────────────────────────────────────────

/** Returns all words ordered by creation date descending. */
export async function getWords(): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getWords: ${error.message}`)
  return data ?? []
}

/** Returns words that have never been reviewed (no review row). */
export async function getNewWords(limit: number, excludeWordIds?: Set<string>): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit * 4) // fetch extra to account for filtering
  if (error) throw new Error(`getNewWords: ${error.message}`)
  const words = data ?? []
  if (!excludeWordIds || excludeWordIds.size === 0) return words.slice(0, limit)
  return words.filter(w => !excludeWordIds.has(w.id)).slice(0, limit)
}

// ── Reviews ───────────────────────────────────────────────────────────────

/** Returns all reviews with joined word data. */
export async function getReviews(): Promise<(Review & { words: Word | null })[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, words(*)')
  if (error) throw new Error(`getReviews: ${error.message}`)
  return (data ?? []) as (Review & { words: Word | null })[]
}

/** Returns reviews due today or earlier, with joined word data, ordered by due date. */
export async function getDueReviews(): Promise<(Review & { words: Word })[]> {
  const today = getToday()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, words(*)')
    .lte('next_review', today)
    .order('next_review', { ascending: true })
  if (error) throw new Error(`getDueReviews: ${error.message}`)
  return ((data ?? []) as (Review & { words: Word | null })[]).filter(
    (r): r is Review & { words: Word } => r.words != null
  )
}

// ── Review Logs ───────────────────────────────────────────────────────────

/** Returns review logs from the last N days, ordered by creation date. */
export async function getRecentLogs(days = 7): Promise<ReviewLog[]> {
  const since = getDaysAgo(days)
  const { data, error } = await supabase
    .from('review_logs')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`getRecentLogs: ${error.message}`)
  return data ?? []
}

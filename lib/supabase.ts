import { createClient } from '@supabase/supabase-js'

// Initialize Supabase — use placeholders at build time, validated at runtime
export const supabase = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  // Warn at runtime (not build time) if real credentials are missing
  if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    console.error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file.')
  }

  return createClient(url, key)
})()

export type Word = {
  id: string
  word: string
  definition: string
  mongolian: string
  part_of_speech: string
  ipa: string
  examples: string[]
  word_family: string[]
  collocations: string[]
  confused_with: string[]
  etymology_hint: string
  category: 'academic' | 'business' | 'daily' | 'idiom' | 'phrasal_verb'
  cefr_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  goal_tag: 'ielts' | 'business' | 'travel' | 'general'
  notes: string
  audio_url: string
  created_at: string
}

export type Review = {
  id: string
  word_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review: string
  last_reviewed: string
  total_reviews: number
  correct_count: number
  streak: number
}

export type ReviewLog = {
  id: string
  word_id: string
  quiz_type: 'mcq' | 'fill_blank' | 'spelling' | 'matching' | 'sentence' | 'translation'
  result: number
  response_time_ms: number
  user_answer: string
  source: 'quiz' | 'reading' | 'drill' | 'pronunciation'
  created_at: string
}

export type UserProfile = {
  id: string
  cefr_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  goal: 'general' | 'ielts' | 'business' | 'travel'
  daily_target_minutes: number
  current_streak: number
  longest_streak: number
  weak_patterns: string[]
  preferred_quiz_types: string[]
  active_hours: number[]
  interleave_ratio: number
  interleave_category_penalty: number
  notification_enabled: boolean
  notification_hour: number
  quiet_hours_start: number
  quiet_hours_end: number
  updated_at: string
}

export type ReadingSession = {
  id: string
  user_id: string
  text_input: string
  word_count: number
  known_word_count: number
  created_at: string
}

export type ReadingSessionWord = {
  id: string
  session_id: string
  word_id: string
  is_unknown: boolean
  added_to_deck: boolean
  created_at: string
}

export type PronunciationAttempt = {
  id: string
  user_id: string
  word_id: string
  audio_duration_ms: number
  transcript: string
  similarity_score: number
  feedback: string
  created_at: string
}

export type PushSubscription = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export type NotificationLog = {
  id: string
  user_id: string
  notification_type: string
  sent_at: string
}

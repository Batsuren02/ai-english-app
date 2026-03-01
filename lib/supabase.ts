import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  created_at: string
}

export type UserProfile = {
  id: string
  cefr_level: string
  goal: string
  daily_target_minutes: number
  current_streak: number
  longest_streak: number
  total_xp: number
  level: number
  weak_patterns: string[]
  preferred_quiz_types: string[]
  active_hours: number[]
  updated_at: string
}

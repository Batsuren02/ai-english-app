import { Word, Review } from '@/lib/supabase'

export const CATEGORIES = ['academic', 'business', 'daily', 'idiom', 'phrasal_verb'] as const
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export interface WordWithReview extends Word {
  review?: Review
  masteryLevel?: 'mastered' | 'learning' | 'needs_review'
  progressPercent?: number
}

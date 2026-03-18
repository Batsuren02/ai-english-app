// lib/achievements.ts
// Achievement badge definitions and unlock check logic.

export interface Achievement {
  id: string
  label: string
  desc: string
  icon: string
  threshold: number
  metric: AchievementMetric
}

export type AchievementMetric =
  | 'word_count'
  | 'total_reviews'
  | 'streak'
  | 'mastered_count'
  | 'perfect_quizzes'
  | 'quiz_types_tried'
  | 'writing_count'

export interface AchievementStats {
  wordCount: number
  totalReviews: number
  streak: number
  masteredCount: number
  perfectQuizzes: number
  quizTypesTried: number
  writingCount: number
}

export const ACHIEVEMENTS: Achievement[] = [
  // Vocabulary milestones
  { id: 'words_10',     label: 'First Steps',      desc: 'Add 10 words',           icon: '📚', threshold: 10,  metric: 'word_count' },
  { id: 'words_50',     label: 'Bookworm',          desc: 'Add 50 words',           icon: '📖', threshold: 50,  metric: 'word_count' },
  { id: 'words_100',    label: 'Lexicon',           desc: 'Add 100 words',          icon: '🏛️', threshold: 100, metric: 'word_count' },
  { id: 'words_500',    label: 'Wordsmith',         desc: 'Add 500 words',          icon: '⚔️', threshold: 500, metric: 'word_count' },
  // Review milestones
  { id: 'reviews_50',   label: 'Diligent',          desc: '50 total reviews',       icon: '✏️', threshold: 50,  metric: 'total_reviews' },
  { id: 'reviews_500',  label: 'Dedicated',         desc: '500 total reviews',      icon: '🎯', threshold: 500, metric: 'total_reviews' },
  // Streak milestones
  { id: 'streak_3',     label: 'Consistent',        desc: '3-day streak',           icon: '🔥', threshold: 3,   metric: 'streak' },
  { id: 'streak_7',     label: 'Week Warrior',      desc: '7-day streak',           icon: '⚡', threshold: 7,   metric: 'streak' },
  { id: 'streak_30',    label: 'Monthly Master',    desc: '30-day streak',          icon: '🌟', threshold: 30,  metric: 'streak' },
  // Mastery milestones
  { id: 'mastered_10',  label: 'Getting There',     desc: 'Master 10 words',        icon: '🥉', threshold: 10,  metric: 'mastered_count' },
  { id: 'mastered_50',  label: 'Solid Foundation',  desc: 'Master 50 words',        icon: '🥈', threshold: 50,  metric: 'mastered_count' },
  { id: 'mastered_100', label: 'Fluent',            desc: 'Master 100 words',       icon: '🥇', threshold: 100, metric: 'mastered_count' },
  // Activity milestones
  { id: 'perfect_quiz', label: 'Perfectionist',     desc: '100% on any quiz',       icon: '💯', threshold: 1,   metric: 'perfect_quizzes' },
  { id: 'all_rounder',  label: 'All-Rounder',       desc: 'Try all quiz types',     icon: '🎲', threshold: 7,   metric: 'quiz_types_tried' },
  { id: 'writing_10',   label: 'Wordcrafter',       desc: '10 writing exercises',   icon: '✍️', threshold: 10,  metric: 'writing_count' },
]

const METRIC_MAP: Record<AchievementMetric, keyof AchievementStats> = {
  word_count:       'wordCount',
  total_reviews:    'totalReviews',
  streak:           'streak',
  mastered_count:   'masteredCount',
  perfect_quizzes:  'perfectQuizzes',
  quiz_types_tried: 'quizTypesTried',
  writing_count:    'writingCount',
}

/**
 * Returns IDs of newly unlocked achievements.
 * Compare current stats against thresholds, filter out already-unlocked.
 */
export function checkAchievements(stats: AchievementStats, currentUnlocked: string[]): string[] {
  const unlockedSet = new Set(currentUnlocked)
  return ACHIEVEMENTS
    .filter(a => !unlockedSet.has(a.id) && stats[METRIC_MAP[a.metric]] >= a.threshold)
    .map(a => a.id)
}

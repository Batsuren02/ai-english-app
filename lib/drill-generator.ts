import { Word, Review } from './supabase'
import { Quiz, QuizType, generateMCQ, generateFillBlank, generateTranslation, generateSpelling, generateMatching } from './quiz-generator'

export type DrillConfig = {
  easeFactorThreshold: number    // e.g., 2.8 - words below this are "weak"
  daysAgoThreshold: number       // e.g., 7 - must have been reviewed within N days
  sessionLength: number          // e.g., 10 - number of questions per session
  difficultyProgression: boolean // if true, start easy and increase difficulty
}

export const DEFAULT_DRILL_CONFIG: DrillConfig = {
  easeFactorThreshold: 2.8,
  daysAgoThreshold: 7,
  sessionLength: 10,
  difficultyProgression: true,
}

export type DrillStats = {
  totalWeakWords: number
  easeFactorRange: { min: number; max: number }
  averageEase: number
  accuracyByType: Record<string, number>
}

/**
 * Filter words for drill practice.
 * Returns words with ease_factor below threshold that were reviewed recently.
 */
export function getWeakWords(
  words: Word[],
  reviews: Review[],
  config: DrillConfig
): Word[] {
  const reviewMap = new Map(reviews.map((r) => [r.word_id, r]))
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.daysAgoThreshold)

  return words.filter((word) => {
    const review = reviewMap.get(word.id)
    if (!review) return false

    // Must have ease factor below threshold
    if (review.ease_factor >= config.easeFactorThreshold) return false

    // Must have been reviewed recently
    const lastReviewDate = new Date(review.last_reviewed)
    if (lastReviewDate < cutoffDate) return false

    return true
  })
}

/**
 * Calculate drill session statistics.
 */
export function calculateDrillStats(weakWords: Word[], reviews: Review[]): DrillStats {
  const reviewMap = new Map(reviews.map((r) => [r.word_id, r]))
  const easeFacs = weakWords
    .map((w) => reviewMap.get(w.id)?.ease_factor ?? 2.5)
    .filter((e) => e !== undefined)

  return {
    totalWeakWords: weakWords.length,
    easeFactorRange: {
      min: Math.min(...easeFacs),
      max: Math.max(...easeFacs),
    },
    averageEase: easeFacs.reduce((a, b) => a + b, 0) / easeFacs.length,
    accuracyByType: {}, // Populated during session
  }
}

/**
 * Generate a quiz for drill practice.
 * Uses difficulty progression if enabled.
 */
export function generateDrillQuiz(
  word: Word,
  allWords: Word[],
  questionNumber: number,
  totalQuestions: number,
  difficultyProgression: boolean
): Quiz | null {
  if (!difficultyProgression) {
    // Random quiz type, no progression
    return generateRandomDrillQuiz(word, allWords)
  }

  // Progressive difficulty: easier questions early, harder later
  const progressRatio = questionNumber / totalQuestions
  const generators = getDifficultyProgression(progressRatio)

  for (const generator of generators) {
    const quiz = generator(word, allWords)
    if (quiz) return quiz
  }

  // Fallback
  return generateMCQ(word, allWords)
}

function generateRandomDrillQuiz(word: Word, allWords: Word[]): Quiz | null {
  const generators = [
    () => generateMCQ(word, allWords),
    () => generateFillBlank(word),
    () => generateTranslation(word),
    () => generateSpelling(word),
  ]

  for (const gen of generators) {
    const quiz = gen()
    if (quiz) return quiz
  }

  return null
}

/**
 * Get quiz generators ordered by difficulty (easy to hard).
 * MCQ (easiest) -> Fill Blank -> Translation -> Spelling (hardest)
 */
function getDifficultyProgression(progressRatio: number): Array<(w: Word, all: Word[]) => Quiz | null> {
  if (progressRatio < 0.33) {
    // Early: mostly MCQ
    return [
      (w, all) => generateMCQ(w, all),
      (w, all) => generateFillBlank(w),
      (w, all) => generateTranslation(w),
    ]
  } else if (progressRatio < 0.66) {
    // Middle: mix of MCQ, fill blank, translation
    return [
      (w, all) => generateFillBlank(w),
      (w, all) => generateTranslation(w),
      (w, all) => generateMCQ(w, all),
    ]
  } else {
    // Late: harder types (translation, spelling)
    return [
      (w, all) => generateTranslation(w),
      (w, all) => generateSpelling(w),
      (w, all) => generateMCQ(w, all),
    ]
  }
}

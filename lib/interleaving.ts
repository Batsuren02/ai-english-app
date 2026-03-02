import { Word, UserProfile } from './supabase'

export type InterleaveConfig = {
  newWordRatio: number           // 0.0 to 1.0, e.g., 0.25 = 25% new words
  categoryPenalty: number        // 0.0 to 1.0, how strongly to avoid same-category runs
}

export const DEFAULT_INTERLEAVE_CONFIG: InterleaveConfig = {
  newWordRatio: 0.25,            // matches current ~1 new per 3+1=4 words
  categoryPenalty: 0.6,
}

export type InterleavableWord = {
  id: string
  category?: string
  isNew?: boolean
}

/**
 * Deterministic slot-based interleaving algorithm.
 * Distributes new words at mathematically even intervals across the session.
 *
 * @param dueWords - Words that are due for review
 * @param newWords - New words to introduce
 * @param config - Interleaving configuration
 * @returns Interleaved array of words
 */
export function interleaveWords<T extends InterleavableWord>(
  dueWords: T[],
  newWords: T[],
  config: InterleaveConfig
): T[] {
  // If no words to interleave, return due words
  if (dueWords.length === 0) return newWords
  if (newWords.length === 0) return dueWords

  // Calculate total session size based on ratio
  const maxNewWords = Math.floor(dueWords.length + newWords.length) * config.newWordRatio
  const numNewWords = Math.min(Math.floor(maxNewWords), newWords.length)
  const totalSize = dueWords.length + numNewWords

  // If no new words to insert, return due words
  if (numNewWords === 0) return dueWords

  // Calculate evenly-spaced slot indices using Bresenham distribution
  const newSlots = new Set<number>()
  if (numNewWords > 0) {
    for (let i = 0; i < numNewWords; i++) {
      const slot = Math.floor((i + 1) * (totalSize / (numNewWords + 1)))
      newSlots.add(Math.min(slot, totalSize - 1))
    }
  }

  // Build the interleaved result
  const result: T[] = []
  let dueIndex = 0
  let newIndex = 0

  for (let i = 0; i < totalSize; i++) {
    if (newSlots.has(i) && newIndex < numNewWords) {
      // Place a new word
      const newWord = newWords[newIndex]
      result.push({ ...newWord, isNew: true })
      newIndex++
    } else if (dueIndex < dueWords.length) {
      // Place a due word
      result.push({ ...dueWords[dueIndex], isNew: false })
      dueIndex++
    } else if (newIndex < numNewWords) {
      // Fallback: place remaining new words
      const newWord = newWords[newIndex]
      result.push({ ...newWord, isNew: true })
      newIndex++
    }
  }

  return result
}

/**
 * Pick a word with weighted preference toward weak words and category variety.
 *
 * @param words - Available words to pick from
 * @param easeMap - Map of word IDs to ease factors
 * @param recentCategories - Last few word categories shown (for penalty)
 * @param categoryPenalty - How strongly to penalize recent categories (0-1)
 * @returns Selected word
 */
export function pickInterleavedWord(
  words: Word[],
  easeMap: Record<string, number>,
  recentCategories: string[] = [],
  categoryPenalty: number = 0.6
): Word {
  if (words.length === 0) throw new Error('No words available to pick from')
  if (words.length === 1) return words[0]

  // Calculate weights: lower ease = higher weight (harder words get practice)
  const weights = words.map((w) => {
    let weight = Math.max(0.2, 3.2 - (easeMap[w.id] ?? 2.5))

    // Apply category penalty if word's category was recently shown
    if (recentCategories.includes(w.category)) {
      weight *= 1 - categoryPenalty
    }

    return Math.max(0.1, weight)
  })

  // Weighted random selection
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total

  for (let i = 0; i < words.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return words[i]
  }

  return words[words.length - 1]
}

/**
 * Parse interleaving config from user profile, with fallback defaults.
 */
export function parseInterleaveConfig(profile: Partial<UserProfile> | null): InterleaveConfig {
  if (!profile) return DEFAULT_INTERLEAVE_CONFIG

  return {
    newWordRatio: Math.max(0, Math.min(1, profile.interleave_ratio ?? DEFAULT_INTERLEAVE_CONFIG.newWordRatio)),
    categoryPenalty: Math.max(0, Math.min(1, profile.interleave_category_penalty ?? DEFAULT_INTERLEAVE_CONFIG.categoryPenalty)),
  }
}

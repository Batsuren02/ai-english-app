import { Word } from './supabase'

export type QuizType = 'mcq' | 'fill_blank' | 'spelling' | 'matching' | 'sentence' | 'translation' | 'listen_and_choose' | 'collocation_match'

export type Quiz = {
  type: QuizType
  word: Word
  question: string
  options?: string[]
  answer: string
  hint?: string
  pairs?: { word: string; definition: string }[]
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateMCQ(word: Word, allWords: Word[], reverse = false): Quiz {
  if (reverse) {
    const wrong = shuffleArray(allWords.filter(w => w.id !== word.id && w.definition)).slice(0, 3).map(w => w.definition)
    return {
      type: 'mcq', word,
      question: `What is the definition of "${word.word}"?`,
      options: shuffleArray([word.definition, ...wrong]),
      answer: word.definition,
      hint: word.ipa,
    }
  }
  const wrong = shuffleArray(allWords.filter(w => w.id !== word.id)).slice(0, 3).map(w => w.word)
  return {
    type: 'mcq', word,
    question: word.definition || `What word means: "${word.mongolian}"?`,
    options: shuffleArray([word.word, ...wrong]),
    answer: word.word,
    hint: word.ipa,
  }
}

export function generateFillBlank(word: Word): Quiz | null {
  const examples = word.examples as string[]
  if (!examples?.length) return null
  const sentence = examples[Math.floor(Math.random() * examples.length)]
  const regex = new RegExp(`\\b${word.word}\\b`, 'gi')
  const blanked = sentence.replace(regex, '___')
  if (blanked === sentence) return null
  return { type: 'fill_blank', word, question: blanked, answer: word.word.toLowerCase(), hint: word.definition }
}

export function generateTranslation(word: Word): Quiz {
  return {
    type: 'translation', word,
    question: `Translate to English: "${word.mongolian || word.definition}"`,
    answer: word.word.toLowerCase(),
    hint: word.part_of_speech,
  }
}

export function generateSpelling(word: Word): Quiz {
  return { type: 'spelling', word, question: 'Listen and spell the word', answer: word.word.toLowerCase(), hint: word.definition }
}

export function generateSentence(word: Word): Quiz {
  return {
    type: 'sentence', word,
    question: `Write a sentence using the word "${word.word}"`,
    answer: word.word.toLowerCase(),
    hint: `${word.part_of_speech ? word.part_of_speech + ' — ' : ''}${word.definition}`,
  }
}

export function generateMatching(words: Word[]): Quiz | null {
  const valid = words.filter(w => w.definition)
  if (valid.length < 3) return null
  const selected = shuffleArray(valid).slice(0, Math.min(5, valid.length))
  const pairs = selected.map(w => ({ word: w.word, definition: w.definition }))
  return { type: 'matching', word: selected[0], question: 'Match each word to its definition', pairs, answer: 'matching' }
}

/**
 * Listen & Choose: TTS plays the definition, user picks the correct word from 4 options.
 * The question field holds the definition text (spoken by TTS on display).
 */
export function generateListenAndChoose(word: Word, allWords: Word[]): Quiz | null {
  if (!word.definition || allWords.length < 4) return null
  const wrong = shuffleArray(allWords.filter(w => w.id !== word.id)).slice(0, 3).map(w => w.word)
  return {
    type: 'listen_and_choose',
    word,
    question: word.definition, // This text is read aloud via TTS
    options: shuffleArray([word.word, ...wrong]),
    answer: word.word,
    hint: word.ipa || undefined,
  }
}

// Common distractor verbs for collocation questions
const COLLOC_DISTRACTORS = ['do', 'make', 'take', 'have', 'get', 'give', 'keep', 'put', 'bring', 'come', 'go', 'hold', 'run', 'set', 'turn']

/**
 * Collocation Match: fill in the missing collocate in a sentence.
 * Example: "She will _____ a decision tomorrow." → make
 * Uses the word's collocations[] array (entries like "make a decision").
 */
export function generateCollocationMatch(word: Word): Quiz | null {
  const collocations = (word.collocations as string[] || []).filter(Boolean)
  if (!collocations.length) return null

  const colloc = collocations[Math.floor(Math.random() * collocations.length)]
  const parts = colloc.split(' ')
  if (parts.length < 2) return null

  const answer = parts[0].toLowerCase() // first word = collocate (usually a verb)
  const nounPhrase = parts.slice(1).join(' ')

  // Build distractors from common verbs, excluding the correct answer
  const distractors = shuffleArray(COLLOC_DISTRACTORS.filter(v => v !== answer)).slice(0, 3)

  return {
    type: 'collocation_match',
    word,
    question: `Complete the collocation: "She will _____ ${nounPhrase}."`,
    options: shuffleArray([answer, ...distractors]),
    answer,
    hint: `Word: ${word.word} — ${word.definition}`,
  }
}

// Weighted quiz type: boosts types where user is weak
export function getWeightedQuizType(weakTypes: Partial<Record<QuizType, number>> = {}): QuizType {
  const weights: Record<QuizType, number> = {
    mcq: 25, fill_blank: 20, spelling: 20, matching: 15, translation: 15, sentence: 5,
    listen_and_choose: 10, collocation_match: 10,
  }
  for (const [type, accuracy] of Object.entries(weakTypes)) {
    const t = type as QuizType
    if ((accuracy as number) < 60) weights[t] += 25
    else if ((accuracy as number) < 80) weights[t] += 10
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (const [key, w] of Object.entries(weights)) {
    rand -= w; if (rand <= 0) return key as QuizType
  }
  return 'mcq'
}

// Pick word weighted toward weak (low ease_factor)
export function pickWeightedWord(words: Word[], easeMap: Record<string, number>): Word {
  const weights = words.map(w => Math.max(0.2, 3.2 - (easeMap[w.id] ?? 2.5)))
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < words.length; i++) {
    rand -= weights[i]; if (rand <= 0) return words[i]
  }
  return words[words.length - 1]
}

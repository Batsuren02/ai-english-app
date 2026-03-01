import { Word } from './supabase'

export type Quiz = {
  type: 'mcq' | 'fill_blank' | 'spelling' | 'translation' | 'sentence'
  word: Word
  question: string
  options?: string[]
  answer: string
  hint?: string
}

export function generateMCQ(word: Word, allWords: Word[]): Quiz {
  const options = [word.word]
  const pool = allWords.filter(w => w.id !== word.id)
  while (options.length < 4 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    options.push(pool[idx].word)
    pool.splice(idx, 1)
  }
  // Shuffle
  options.sort(() => Math.random() - 0.5)

  return {
    type: 'mcq',
    word,
    question: word.definition || `What word means: "${word.mongolian}"?`,
    options,
    answer: word.word,
    hint: word.ipa,
  }
}

export function generateFillBlank(word: Word): Quiz | null {
  const examples = word.examples as string[]
  if (!examples?.length) return null

  const sentence = examples[0]
  const regex = new RegExp(`\\b${word.word}\\b`, 'gi')
  const blanked = sentence.replace(regex, '___')

  if (blanked === sentence) return null // word not found in sentence

  return {
    type: 'fill_blank',
    word,
    question: blanked,
    answer: word.word.toLowerCase(),
    hint: word.definition,
  }
}

export function generateTranslation(word: Word): Quiz {
  return {
    type: 'translation',
    word,
    question: word.mongolian || word.definition,
    answer: word.word.toLowerCase(),
    hint: word.part_of_speech,
  }
}

export function generateSpelling(word: Word): Quiz {
  return {
    type: 'spelling',
    word,
    question: `Listen and spell: "${word.word}"`,
    answer: word.word.toLowerCase(),
    hint: word.definition,
  }
}

export function generateSentence(word: Word): Quiz {
  return {
    type: 'sentence',
    word,
    question: `Write a sentence using the word: "${word.word}"`,
    answer: word.word.toLowerCase(),
    hint: word.definition,
  }
}

export function getRandomQuizType(): Quiz['type'] {
  const types: Quiz['type'][] = ['mcq', 'fill_blank', 'spelling', 'translation', 'sentence']
  const weights = [30, 25, 20, 15, 10]
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < types.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return types[i]
  }
  return 'mcq'
}

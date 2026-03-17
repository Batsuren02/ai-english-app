/**
 * Simple text tokenizer for Reading Mode.
 * Extracts words from text, handles punctuation, and matches against vocabulary.
 */

// Common English stop words to filter out (100 most common)
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'might',
  'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'you',
  'your', 'yours', 'yourself', 'yourselves'
])

export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase())
}

export type Token = {
  word: string            // the actual word (lowercased)
  original: string        // original casing from text
  startIndex: number      // position in original text
  endIndex: number        // end position in original text
  isKnown?: boolean       // populated after vocabulary check
}

/**
 * Tokenize text into words, removing punctuation and normalizing.
 * Returns array of Token objects with position information.
 */
export function tokenizeText(text: string): Token[] {
  const tokens: Token[] = []
  // Match word characters and apostrophes (for contractions like "it's", "don't")
  const wordRegex = /\b[\w']+\b/g
  let match

  while ((match = wordRegex.exec(text)) !== null) {
    const original = match[0]
    // Normalize: lowercase, remove trailing apostrophes (from possessives)
    const word = original.toLowerCase().replace(/[^\w']+$/g, '')

    if (word.length > 0 && /[a-z]/.test(word)) {
      // Only include tokens that contain letters
      tokens.push({
        word,
        original,
        startIndex: match.index,
        endIndex: match.index + original.length,
      })
    }
  }

  return tokens
}

/**
 * Get unique words from tokens (for vocabulary checking).
 */
export function getUniqueWords(tokens: Token[]): string[] {
  return [...new Set(tokens.map((t) => t.word))]
}

/**
 * Mark tokens as known/unknown based on a set of known word strings.
 */
export function markKnownTokens(tokens: Token[], knownWords: Set<string>): Token[] {
  return tokens.map((token) => ({
    ...token,
    isKnown: knownWords.has(token.word),
  }))
}

/**
 * Calculate comprehension percentage from tokens.
 */
export function calculateComprehension(tokens: Token[]): {
  percentage: number
  knownCount: number
  totalCount: number
} {
  // Exclude stop words — only count meaningful content words
  const contentTokens = tokens.filter((t) => !isStopWord(t.word))
  const knownCount = contentTokens.filter((t) => t.isKnown).length
  const totalCount = contentTokens.length

  return {
    percentage: totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0,
    knownCount,
    totalCount,
  }
}

/**
 * Reconstruct text with highlighting markup.
 * Used for display in React (as spans, not actual HTML).
 */
export function buildHighlightedTokens(
  text: string,
  tokens: Token[]
): Array<{ text: string; isHighlighted: boolean; isKnown?: boolean }> {
  if (tokens.length === 0) {
    return [{ text, isHighlighted: false }]
  }

  const result: Array<{ text: string; isHighlighted: boolean; isKnown?: boolean }> = []
  let lastEnd = 0

  for (const token of tokens) {
    // Add text before token
    if (token.startIndex > lastEnd) {
      result.push({
        text: text.substring(lastEnd, token.startIndex),
        isHighlighted: false,
      })
    }

    // Add token with highlighting
    result.push({
      text: token.original,
      isHighlighted: true,
      isKnown: token.isKnown,
    })

    lastEnd = token.endIndex
  }

  // Add remaining text
  if (lastEnd < text.length) {
    result.push({
      text: text.substring(lastEnd),
      isHighlighted: false,
    })
  }

  return result
}

/**
 * Get unknown words from tokens, excluding stop words.
 */
export function getUnknownWords(tokens: Token[]): string[] {
  return [...new Set(tokens.filter((t) => !t.isKnown && !isStopWord(t.word)).map((t) => t.word))]
}

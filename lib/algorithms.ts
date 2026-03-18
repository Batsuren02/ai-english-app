// lib/algorithms.ts
// Pure algorithm utilities shared across feature pages.

/**
 * Levenshtein edit distance between two strings.
 * Used by drills for typo-tolerant answer checking.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

/**
 * Returns true if userAnswer matches correct within 1 typo for words longer than 4 chars.
 */
export function isAnswerCorrect(userAnswer: string, correct: string): boolean {
  const u = userAnswer.trim().toLowerCase()
  const c = correct.trim().toLowerCase()
  if (u === c) return true
  return c.length > 4 && levenshtein(u, c) <= 1
}

// Shared constants for the AI English app.

// ── XP System ────────────────────────────────────────────────────────────────

export const XP_CONFIG = {
  /** XP for a hard word (ease_factor < 2.0) */
  BASE_HARD: 20,
  /** XP for a medium word (ease_factor 2.0–2.5) */
  BASE_MEDIUM: 10,
  /** XP for an easy word (ease_factor > 2.5) */
  BASE_EASY: 5,
  /** Bonus multiplier for 100% accuracy in a session */
  ACCURACY_BONUS: 1.5,
  /** Per-streak-day multiplier step */
  STREAK_MULT_STEP: 0.1,
  /** Maximum streak multiplier cap */
  MAX_STREAK_MULT: 2.0,
  /** Base XP coefficient for level thresholds */
  LEVEL_XP_BASE: 500,
  /** Exponent for level threshold formula */
  LEVEL_XP_EXP: 1.5,
} as const

// ── Daily Login Bonus Tiers ───────────────────────────────────────────────────

export const STREAK_BONUS_TIERS = [
  { minDays: 30, xp: 50, label: 'Legendary dedication! 👑' },
  { minDays: 14, xp: 35, label: "You're on fire! 🔥" },
  { minDays: 7,  xp: 25, label: 'One week streak! 🔥' },
  { minDays: 2,  xp: 15, label: 'Keep it up!' },
  { minDays: 0,  xp: 10, label: 'Welcome back! Start your streak.' },
] as const

// ── Query Helpers ─────────────────────────────────────────────────────────────

/** Columns needed for quiz word selection (avoids heavy fields like audio_url, notes). */
export const QUIZ_WORD_SELECT =
  'id, word, definition, part_of_speech, mongolian, examples, category, cefr_level, collocations, word_family, confused_with' as const

/** Default page size for paginated word lists. */
export const WORDS_PAGE_SIZE = 30

/** Level label by level number (1-indexed). */
export const LEVEL_LABELS = ['Beginner', 'Explorer', 'Scholar', 'Expert', 'Master', 'Legend'] as const

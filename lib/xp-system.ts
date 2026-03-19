import { supabase } from './supabase'
import { XP_CONFIG, LEVEL_LABELS } from './constants'

// ── XP per correct answer based on word difficulty ──────────────────────────

function baseXP(easeFactor: number): number {
  if (easeFactor < 2.0) return XP_CONFIG.BASE_HARD
  if (easeFactor <= 2.5) return XP_CONFIG.BASE_MEDIUM
  return XP_CONFIG.BASE_EASY
}

// ── Multipliers ──────────────────────────────────────────────────────────────

function accuracyMultiplier(correctCount: number, totalCount: number): number {
  return correctCount === totalCount && totalCount > 0 ? XP_CONFIG.ACCURACY_BONUS : 1.0
}

function streakMultiplier(streak: number): number {
  return Math.min(1.0 + streak * XP_CONFIG.STREAK_MULT_STEP, XP_CONFIG.MAX_STREAK_MULT)
}

// ── Quiz session XP ──────────────────────────────────────────────────────────

export interface QuizResult {
  correct: boolean
  easeFactor: number
}

export function calculateQuizXP(results: QuizResult[], streak: number): number {
  const correct = results.filter(r => r.correct)
  const base = correct.reduce((sum, r) => sum + baseXP(r.easeFactor), 0)
  const multiplier = accuracyMultiplier(correct.length, results.length) * streakMultiplier(streak)
  return Math.round(base * multiplier)
}

// ── Single review card XP ────────────────────────────────────────────────────

export function calculateReviewXP(easeFactor: number, streak: number): number {
  return Math.round(baseXP(easeFactor) * streakMultiplier(streak))
}

// ── Level system ─────────────────────────────────────────────────────────────


export interface LevelReward {
  icon: string
  title: string
  message: string
}

export const LEVEL_REWARDS: Record<number, LevelReward> = {
  1: { icon: '📚', title: 'Beginner',  message: 'Welcome to Lexicon! Start building your vocabulary.' },
  2: { icon: '🧭', title: 'Explorer',  message: "You've started your journey! Keep reviewing daily." },
  3: { icon: '📖', title: 'Scholar',   message: 'Scholar rank earned — your consistency is paying off.' },
  4: { icon: '🎯', title: 'Expert',    message: 'Expert Badge unlocked — shown on your profile.' },
  5: { icon: '🏅', title: 'Master',    message: 'Mastery achieved! Hard words now feel familiar.' },
  6: { icon: '👑', title: 'Legend',    message: 'Legend Crown — the highest rank in Lexicon. You did it!' },
}

/** Cumulative XP required to reach `level` (level 1 = 0 XP). */
function xpThreshold(level: number): number {
  if (level <= 1) return 0
  return Math.round(XP_CONFIG.LEVEL_XP_BASE * Math.pow(level - 1, XP_CONFIG.LEVEL_XP_EXP))
}

export function getLevelInfo(totalXp: number): {
  level: number
  label: string
  currentXP: number
  xpToNext: number
  progress: number
} {
  const xp = Math.max(0, totalXp)
  let level = 1
  while (xpThreshold(level + 1) <= xp) level++

  const currentLevelXP = xpThreshold(level)
  const nextLevelXP = xpThreshold(level + 1)
  const currentXP = xp - currentLevelXP
  const xpToNext = nextLevelXP - currentLevelXP
  const progress = Math.min(currentXP / xpToNext, 1)
  const label = LEVEL_LABELS[Math.min(level - 1, LEVEL_LABELS.length - 1)]

  return { level, label, currentXP, xpToNext, progress }
}

// ── Award XP to the current user ─────────────────────────────────────────────

export interface AwardXPResult {
  xpAwarded: number
  newLevel: number
  oldLevel: number
  didLevelUp: boolean
  totalXp: number
}

/** Returns the current user's streak (0 if not found). */
export async function getUserStreak(): Promise<number> {
  const { data } = await supabase
    .from('user_profile')
    .select('current_streak')
    .limit(1)
    .maybeSingle()
  return data?.current_streak ?? 0
}

export async function awardXP(xp: number): Promise<AwardXPResult | null> {
  if (xp <= 0) return null

  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, total_xp, level')
    .limit(1)
    .maybeSingle()

  if (!profile) return null

  const oldLevel = profile.level ?? 1
  const newTotalXp = (profile.total_xp ?? 0) + xp
  const { level: newLevel } = getLevelInfo(newTotalXp)
  const didLevelUp = newLevel > oldLevel

  await supabase
    .from('user_profile')
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq('id', profile.id)

  return { xpAwarded: xp, newLevel, oldLevel, didLevelUp, totalXp: newTotalXp }
}

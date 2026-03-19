import { supabase } from './supabase'
import { awardXP } from './xp-system'
import { STREAK_BONUS_TIERS } from './constants'

function getBonusTier(streak: number): { xp: number; label: string } {
  const tier = STREAK_BONUS_TIERS.find((t) => streak >= t.minDays)
  return tier ?? STREAK_BONUS_TIERS[STREAK_BONUS_TIERS.length - 1]
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface DailyBonusResult {
  xpAwarded: number
  streakDays: number
  label: string
  alreadyClaimed: boolean
}

/**
 * Awards daily login bonus XP the first time the user visits each day.
 * Safe to call on every page load — returns `alreadyClaimed: true` if already run today.
 * Returns `null` if the user profile could not be fetched.
 */
export async function claimDailyBonus(): Promise<DailyBonusResult | null> {
  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, current_streak, last_login_date')
    .limit(1)
    .maybeSingle()

  if (!profile) return null

  const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

  // Already claimed today — return info without re-awarding
  if (profile.last_login_date === today) {
    const { xp, label } = getBonusTier(profile.current_streak ?? 0)
    return { xpAwarded: xp, streakDays: profile.current_streak ?? 0, label, alreadyClaimed: true }
  }

  // First visit of the day — award XP and stamp today's date
  const streak = profile.current_streak ?? 0
  const { xp, label } = getBonusTier(streak)

  await Promise.all([
    awardXP(xp),
    supabase
      .from('user_profile')
      .update({ last_login_date: today })
      .eq('id', profile.id),
  ])

  return { xpAwarded: xp, streakDays: streak, label, alreadyClaimed: false }
}

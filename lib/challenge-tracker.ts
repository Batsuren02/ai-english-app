import { supabase } from './supabase'
import { awardXP } from './xp-system'

type ChallengeType = 'flashcard_sprint' | 'perfect_streak' | 'category_blitz' | 'new_words'

export interface ChallengeProgressResult {
  completed: boolean
  rewardXp: number
  progress: number
  target: number
}

/**
 * Increments progress for today's challenge of the given type.
 * Awards XP if the challenge is newly completed.
 */
export async function incrementChallengeProgress(
  type: ChallengeType
): Promise<ChallengeProgressResult> {
  const today = new Date().toISOString().split('T')[0]

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .select('id, challenge_type, progress, target_count, completed, reward_xp')
    .eq('date', today)
    .eq('challenge_type', type)
    .maybeSingle()

  if (!challenge || challenge.completed) {
    return { completed: false, rewardXp: 0, progress: challenge?.progress ?? 0, target: challenge?.target_count ?? 0 }
  }

  const newProgress = challenge.progress + 1
  const completed = newProgress >= challenge.target_count

  await supabase
    .from('daily_challenges')
    .update({ progress: newProgress, completed, updated_at: new Date().toISOString() })
    .eq('id', challenge.id)

  if (completed) {
    await awardXP(challenge.reward_xp)
  }

  return { completed, rewardXp: completed ? challenge.reward_xp : 0, progress: newProgress, target: challenge.target_count }
}

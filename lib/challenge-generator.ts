import { supabase } from './supabase'

export type ChallengeType = 'flashcard_sprint' | 'perfect_streak' | 'category_blitz' | 'new_words'

export interface DailyChallenge {
  id: string
  date: string
  challenge_type: ChallengeType
  target_count: number
  progress: number
  completed: boolean
  reward_xp: number
  description: string
  icon: string
}

/**
 * Generate or fetch today's daily challenge
 */
export async function getDailyChallenge(): Promise<DailyChallenge> {
  const today = new Date().toISOString().split('T')[0]

  // Try to fetch existing challenge
  const { data: existing } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single()

  if (existing) {
    return formatChallenge(existing)
  }

  // Generate new challenge
  const challenge = generateNewChallenge()

  // Store in database
  const { data } = await supabase
    .from('daily_challenges')
    .insert([
      {
        date: today,
        challenge_type: challenge.challenge_type,
        target_count: challenge.target_count,
        progress: 0,
        completed: false,
        reward_xp: challenge.reward_xp,
      },
    ])
    .select()
    .single()

  return formatChallenge(data)
}

/**
 * Generate a new daily challenge based on user's performance
 */
function generateNewChallenge(): Omit<DailyChallenge, 'id' | 'date' | 'progress' | 'completed' | 'description' | 'icon'> {
  const challengeTypes: ChallengeType[] = [
    'flashcard_sprint',
    'perfect_streak',
    'category_blitz',
    'new_words',
  ]

  // Random challenge type
  const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)]

  const targets = {
    flashcard_sprint: {
      target: 10,
      xp: 20,
    },
    perfect_streak: {
      target: 5,
      xp: 25,
    },
    category_blitz: {
      target: 8,
      xp: 20,
    },
    new_words: {
      target: 5,
      xp: 15,
    },
  }

  const { target, xp } = targets[type]

  return {
    challenge_type: type,
    target_count: target,
    reward_xp: xp,
  }
}

/**
 * Format challenge with description and icon
 */
function formatChallenge(data: any): DailyChallenge {
  const descriptions = {
    flashcard_sprint:
      'Review 10 words using flashcards. Speed and accuracy matter!',
    perfect_streak: 'Get 5 correct answers in a row. No mistakes allowed!',
    category_blitz:
      'Review all words in a specific category today.',
    new_words: 'Learn 5 new words and add them to your deck.',
  }

  const icons = {
    flashcard_sprint: '⚡',
    perfect_streak: '🔥',
    category_blitz: '🎯',
    new_words: '✨',
  }

  return {
    id: data.id,
    date: data.date,
    challenge_type: data.challenge_type,
    target_count: data.target_count,
    progress: data.progress || 0,
    completed: data.completed || false,
    reward_xp: data.reward_xp,
    description: descriptions[data.challenge_type],
    icon: icons[data.challenge_type],
  }
}

/**
 * Update challenge progress
 */
export async function updateChallengeProgress(
  challengeId: string,
  newProgress: number,
  targetCount: number
) {
  const completed = newProgress >= targetCount

  const { data, error } = await supabase
    .from('daily_challenges')
    .update({
      progress: newProgress,
      completed,
    })
    .eq('id', challengeId)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('Challenge not found')

  return {
    challenge: formatChallenge(data),
    justCompleted: completed && !data.completed, // Was not completed before
  }
}

/**
 * Check if challenge is completed
 */
export async function checkChallengeCompletion(challengeId: string) {
  const { data, error } = await supabase
    .from('daily_challenges')
    .select('completed, reward_xp')
    .eq('id', challengeId)
    .single()

  if (error) throw error
  return {
    completed: data?.completed || false,
    reward_xp: data?.reward_xp || 0,
  }
}

/**
 * Get challenge completion stats
 */
export async function getChallengeStats() {
  const { data, error } = await supabase
    .from('daily_challenges')
    .select('id, date, completed')
    .order('date', { ascending: false })
    .limit(30)

  if (error) throw error

  const total = data?.length || 0
  const completed = data?.filter((c) => c.completed).length || 0
  const streak = calculateStreak(data || [])

  return {
    total,
    completed,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    current_streak: streak,
  }
}

/**
 * Calculate current challenge streak
 */
function calculateStreak(challenges: any[]): number {
  if (!challenges.length) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < challenges.length; i++) {
    const challengeDate = new Date(challenges[i].date)
    challengeDate.setHours(0, 0, 0, 0)

    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)

    if (
      challengeDate.getTime() === expectedDate.getTime() &&
      challenges[i].completed
    ) {
      streak++
    } else {
      break
    }
  }

  return streak
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getDailyChallenge, getChallengeStats, type DailyChallenge } from '@/lib/challenge-generator'
import { ChevronRight, Trophy } from 'lucide-react'
import Link from 'next/link'

export default function DailyChallengeCard() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [stats, setStats] = useState<{ current_streak: number; completion_rate: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChallengeData()
  }, [])

  async function loadChallengeData() {
    try {
      const [challengeData, statsData] = await Promise.all([
        getDailyChallenge(),
        getChallengeStats(),
      ])
      setChallenge(challengeData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load challenge:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !challenge) {
    return (
      <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-lg p-6 h-32 animate-pulse" />
    )
  }

  const progressPercent = Math.min(
    (challenge.progress / challenge.target_count) * 100,
    100
  )

  return (
    <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/30 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{challenge.icon}</span>
            <h3 className="font-semibold text-lg">Today's Challenge</h3>
          </div>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </div>

        {challenge.completed && (
          <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
            <Trophy className="w-3.5 h-3.5" />
            Completed
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Progress: <span className="font-medium text-ink">{challenge.progress}</span> /{' '}
            <span className="font-medium">{challenge.target_count}</span>
          </span>
          <span className="font-medium text-accent">+{challenge.reward_xp} XP</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-background/50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Current Streak</div>
            <div className="text-lg font-bold text-accent flex items-center gap-1">
              {stats.current_streak} <span className="text-xl">🔥</span>
            </div>
          </div>
          <div className="bg-background/50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Completion Rate</div>
            <div className="text-lg font-bold text-accent">{stats.completion_rate}%</div>
          </div>
        </div>
      )}

      {/* CTA */}
      {!challenge.completed ? (
        <Link href={getChallengeLink(challenge.challenge_type)} className="block">
          <Button className="w-full gap-2" variant="default">
            Start Challenge
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : (
        <Button className="w-full" disabled variant="ghost">
          Challenge Completed! Return Tomorrow
        </Button>
      )}
    </div>
  )
}

/**
 * Get the appropriate link for the challenge type
 */
function getChallengeLink(type: string): string {
  switch (type) {
    case 'flashcard_sprint':
    case 'perfect_streak':
      return '/learn'
    case 'category_blitz':
      return '/quiz'
    case 'new_words':
      return '/words'
    default:
      return '/learn'
  }
}

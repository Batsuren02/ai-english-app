'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, UserProfile, Word, Review } from '@/lib/supabase'
import Link from 'next/link'
import { Brain, BookMarked, Flame, TrendingUp, Zap, ChevronRight, AlertTriangle } from 'lucide-react'
import DailyChallengeCard from '@/components/DailyChallengeCard'
import StatCard from '@/components/design/StatCard'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { TextPrimary, TextSecondary } from '@/components/design/Text'

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [weakWords, setWeakWords] = useState<(Word & { ease_factor: number })[]>([])
  const [recentActivity, setRecentActivity] = useState<{ date: string; count: number }[]>([])
  const [readingSessions, setReadingSessions] = useState(0)
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]

    const [profileRes, wordsRes, dueRes, weakRes, logsRes, readingRes, pronunciationRes] = await Promise.all([
      supabase.from('user_profile').select('*').single(),
      supabase.from('words').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).lte('next_review', today),
      supabase.from('reviews').select('word_id, ease_factor, words(id, word, definition)').order('ease_factor').limit(5),
      supabase.from('review_logs').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('reading_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('pronunciation_attempts').select('id', { count: 'exact', head: true }),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (wordsRes.count !== null) setTotalWords(wordsRes.count)
    if (dueRes.count !== null) setDueCount(dueRes.count)
    if (readingRes.count !== null) setReadingSessions(readingRes.count)
    if (pronunciationRes.count !== null) setPronunciationAttempts(pronunciationRes.count)

    if (weakRes.data) {
      const ww = weakRes.data
        .filter((r: any) => r.words)
        .map((r: any) => ({ ...r.words, ease_factor: r.ease_factor }))
      setWeakWords(ww)
    }

    if (logsRes.data) {
      const counts: Record<string, number> = {}
      logsRes.data.forEach((log: any) => {
        const d = log.created_at.split('T')[0]
        counts[d] = (counts[d] || 0) + 1
      })
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]
        return { date: d.slice(5), count: counts[d] || 0 }
      })
      setRecentActivity(last7)
    }

    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <TextSecondary className="italic">Loading your progress...</TextSecondary>
    </div>
  )

  return (
    <div className="fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="h2 text-[var(--text)] mb-2">Good day! 👋</h1>
        <p className="body text-[var(--text-secondary)]">
          {dueCount > 0 ? `You have ${dueCount} words to review today.` : 'All caught up! Great work.'}
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Brain size={28} className="text-[var(--accent)]" />}
          label="Due Today"
          value={dueCount}
          color={dueCount > 0 ? 'var(--accent)' : 'var(--success)'}
          trend={dueCount > 0 ? { direction: 'up', percent: 5 } : undefined}
        />
        <StatCard
          icon={<BookMarked size={28} className="text-[var(--accent)]" />}
          label="Total Words"
          value={totalWords}
          color="var(--accent)"
          animated
        />
        <StatCard
          icon={<Flame size={28} className="text-red-600" />}
          label="Streak"
          value={`${profile?.current_streak || 0}d`}
          color="#dc2626"
          trend={profile?.current_streak ? { direction: 'up', percent: 10 } : undefined}
        />
      </div>

      {/* Daily Challenge */}
      <DailyChallengeCard />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dueCount > 0 && (
          <Link href="/learn" className="no-underline">
            <SurfaceCard
              hover
              gradient
              elevation="md"
              className="bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/80 text-white flex items-center justify-between cursor-pointer min-h-28"
            >
              <div>
                <h4 className="font-bold text-base mb-1 text-white">Start Review</h4>
                <p className="text-sm opacity-85">{dueCount} words due</p>
              </div>
              <ChevronRight size={24} />
            </SurfaceCard>
          </Link>
        )}
        <Link href="/words" className="no-underline">
          <SurfaceCard hover elevation="sm" className="flex items-center justify-between cursor-pointer min-h-24">
            <div>
              <h4 className="font-semibold text-sm mb-1">Add Word</h4>
              <p className="text-xs text-[var(--text-secondary)]">Paste from Claude</p>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
        <Link href="/quiz" className="no-underline">
          <SurfaceCard hover elevation="sm" className="flex items-center justify-between cursor-pointer min-h-24">
            <div>
              <h4 className="font-semibold text-sm mb-1">Practice Quiz</h4>
              <p className="text-xs text-[var(--text-secondary)]">6 quiz types</p>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
        <Link href="/reading" className="no-underline">
          <SurfaceCard hover elevation="sm" className="flex items-center justify-between cursor-pointer min-h-24">
            <div>
              <h4 className="font-semibold text-sm mb-1">Reading</h4>
              <p className="text-xs text-[var(--text-secondary)]">Learn from text</p>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
        <Link href="/pronunciation" className="no-underline">
          <SurfaceCard hover elevation="sm" className="flex items-center justify-between cursor-pointer min-h-24">
            <div>
              <h4 className="font-semibold text-sm mb-1">Pronunciation</h4>
              <p className="text-xs text-[var(--text-secondary)]">Practice speaking</p>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
      </div>

      {/* Activity Chart */}
      <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={18} className="text-[var(--accent)]" />
          <h3 className="h4 text-[var(--text)]">7-Day Activity</h3>
        </div>
        <div className="flex gap-3 items-end h-24 px-2">
          {recentActivity.map(({ date, count }) => {
            const maxC = Math.max(...recentActivity.map(r => r.count), 1)
            const h = count ? (count / maxC) * 80 + 4 : 4
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg transition-all duration-300 bg-gradient-to-t from-[var(--accent)] to-[var(--accent)]/60"
                  style={{
                    height: `${h}px`,
                    background: count ? 'var(--gradient-accent-soft)' : 'var(--border)',
                  }}
                  title={`${count} reviews`}
                />
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">{date}</span>
              </div>
            )
          })}
        </div>
      </SurfaceCard>

      {/* Feature Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={<span className="text-3xl">📖</span>}
          label="Reading Sessions"
          value={readingSessions}
          color="var(--accent)"
          animated
        />
        <StatCard
          icon={<span className="text-3xl">🎤</span>}
          label="Pronunciations"
          value={pronunciationAttempts}
          color="var(--accent)"
          animated
        />
      </div>

      {/* Weak Words */}
      {weakWords.length > 0 && (
        <SurfaceCard padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="h4 text-[var(--text)]">Words Needing Attention</h3>
          </div>
          <div className="space-y-3">
            {weakWords.map((w: any) => (
              <div key={w.id} className="flex justify-between items-start gap-3 pb-3 border-b border-[var(--border)] last:border-0">
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text)]">{w.word}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{w.definition?.slice(0, 60)}...</p>
                </div>
                <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">EF: {w.ease_factor.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Empty State */}
      {totalWords === 0 && (
        <EmptyState
          icon={<Zap size={56} className="text-[var(--accent)]" />}
          title="Start your learning journey!"
          description="Add your first words to begin building your vocabulary with spaced repetition."
          action={
            <Link href="/words">
              <InteractiveButton variant="primary" size="md">
                Add Your First Words
              </InteractiveButton>
            </Link>
          }
        />
      )}
    </div>
  )
}

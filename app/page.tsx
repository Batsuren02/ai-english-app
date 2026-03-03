'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, UserProfile, Word, Review } from '@/lib/supabase'
import Link from 'next/link'
import { Brain, BookMarked, Flame, TrendingUp, Zap, ChevronRight, AlertTriangle, FileText, Mic2 } from 'lucide-react'
import DailyChallengeCard from '@/components/DailyChallengeCard'
import StatCard from '@/components/design/StatCard'
import SurfaceCard from '@/components/design/SurfaceCard'
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
    <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <TextPrimary className="text-3xl font-bold mb-1">Good day! 👋</TextPrimary>
        <TextSecondary className="text-base">
          {dueCount > 0 ? `You have ${dueCount} words to review today.` : 'All caught up! Great work.'}
        </TextSecondary>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon={<Brain size={24} />} label="Due Today" value={dueCount} color={dueCount > 0 ? 'var(--accent)' : 'var(--success)'} />
        <StatCard icon={<BookMarked size={24} />} label="Total Words" value={totalWords} color="var(--accent)" />
        <StatCard icon={<Flame size={24} />} label="Streak" value={`${profile?.current_streak || 0}d`} color="#dc2626" />
      </div>

      {/* Daily Challenge */}
      <div className="mb-8">
        <DailyChallengeCard />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {dueCount > 0 && (
          <Link href="/learn" className="no-underline">
            <SurfaceCard hover className="bg-[var(--accent)] text-white flex items-center justify-between cursor-pointer">
              <div>
                <TextPrimary className="font-bold text-base mb-0.5">Start Review</TextPrimary>
                <TextSecondary className="text-xs opacity-85">{dueCount} words due</TextSecondary>
              </div>
              <ChevronRight size={20} />
            </SurfaceCard>
          </Link>
        )}
        <Link href="/words" className="no-underline">
          <SurfaceCard hover className="flex items-center justify-between cursor-pointer">
            <div>
              <TextPrimary className="font-bold text-sm mb-0.5">Add Word</TextPrimary>
              <TextSecondary className="text-xs">Paste from Claude</TextSecondary>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
        <Link href="/quiz" className="no-underline">
          <SurfaceCard hover className="flex items-center justify-between cursor-pointer">
            <div>
              <TextPrimary className="font-bold text-sm mb-0.5">Practice Quiz</TextPrimary>
              <TextSecondary className="text-xs">6 quiz types</TextSecondary>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
        <Link href="/reading" className="no-underline">
          <SurfaceCard hover className="flex items-center justify-between cursor-pointer">
            <div>
              <TextPrimary className="font-bold text-sm mb-0.5">Reading</TextPrimary>
              <TextSecondary className="text-xs">Learn from text</TextSecondary>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
        <Link href="/pronunciation" className="no-underline">
          <SurfaceCard hover className="flex items-center justify-between cursor-pointer">
            <div>
              <TextPrimary className="font-bold text-sm mb-0.5">Pronunciation</TextPrimary>
              <TextSecondary className="text-xs">Practice speaking</TextSecondary>
            </div>
            <ChevronRight size={18} />
          </SurfaceCard>
        </Link>
      </div>

      {/* Activity chart */}
      <SurfaceCard padding="md" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[var(--accent)]" />
          <TextPrimary className="text-sm font-semibold">7-Day Activity</TextPrimary>
        </div>
        <div className="flex gap-2 items-end h-20">
          {recentActivity.map(({ date, count }) => {
            const maxC = Math.max(...recentActivity.map(r => r.count), 1)
            const h = count ? (count / maxC) * 64 + 4 : 4
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded transition-all duration-300"
                  style={{
                    height: `${h}px`,
                    background: count ? 'var(--accent)' : 'var(--border)',
                  }}
                  title={`${count} reviews`}
                />
                <span className="text-[10px] text-[var(--text-secondary)]">{date}</span>
              </div>
            )
          })}
        </div>
      </SurfaceCard>

      {/* Phase 4 Features Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div>
          <StatCard
            icon={<span className="text-3xl">📖</span>}
            label="Reading Sessions"
            value={readingSessions}
            color="var(--accent)"
          />
        </div>
        <div>
          <StatCard
            icon={<span className="text-3xl">🎤</span>}
            label="Pronunciations"
            value={pronunciationAttempts}
            color="var(--accent)"
          />
        </div>
      </div>

      {/* Weak words */}
      {weakWords.length > 0 && (
        <SurfaceCard padding="md">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-yellow-500" />
            <TextPrimary className="text-sm font-semibold">Words Needing Attention</TextPrimary>
          </div>
          <div className="space-y-2.5">
            {weakWords.map((w: any) => (
              <div key={w.id} className="flex justify-between items-center">
                <div>
                  <TextPrimary className="font-semibold">{w.word}</TextPrimary>
                  <TextSecondary className="text-xs ml-2">{w.definition?.slice(0, 50)}...</TextSecondary>
                </div>
                <span className="text-xs font-semibold text-red-600">EF: {w.ease_factor}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {totalWords === 0 && (
        <SurfaceCard padding="lg" className="text-center mt-6">
          <div className="flex justify-center mb-3">
            <Zap size={40} className="text-[var(--accent)]" />
          </div>
          <TextPrimary className="text-lg font-bold mb-2">Start your journey!</TextPrimary>
          <TextSecondary className="text-sm mb-4">Add your first words to get started.</TextSecondary>
          <Link href="/words"><button className="btn-primary">Add Words</button></Link>
        </SurfaceCard>
      )}
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, UserProfile, Word } from '@/lib/supabase'
import Link from 'next/link'
import { TrendingUp, AlertTriangle, BookOpen, Mic2, FileText, Zap, ChevronRight } from 'lucide-react'
import DailyChallengeCard from '@/components/DailyChallengeCard'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [weakWords, setWeakWords] = useState<(Word & { ease_factor: number })[]>([])
  const [recentActivity, setRecentActivity] = useState<{ date: string; count: number }[]>([])
  const [readingSessions, setReadingSessions] = useState(0)
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

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
      setWeakWords(weakRes.data.filter((r: any) => r.words).map((r: any) => ({ ...r.words, ease_factor: r.ease_factor })))
    }
    if (logsRes.data) {
      const counts: Record<string, number> = {}
      logsRes.data.forEach((log: any) => {
        const d = log.created_at.split('T')[0]
        counts[d] = (counts[d] || 0) + 1
      })
      setRecentActivity(Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]
        return { date: d.slice(5), count: counts[d] || 0 }
      }))
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <p className="text-[var(--text-secondary)] text-[13px]">Loading your progress…</p>
    </div>
  )

  const streak = profile?.current_streak || 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="fade-in space-y-5">

      {/* ── Header ── */}
      <div className="pb-1">
        <h1 className="h2 text-[var(--text)]">{greeting}</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {dueCount > 0
            ? `${dueCount} ${dueCount === 1 ? 'word' : 'words'} waiting for review.`
            : totalWords > 0 ? 'All caught up — great work.' : 'Start adding words to begin.'}
        </p>
      </div>

      {/* ── Bento Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Due Today — spans 2 cols, primary CTA */}
        <div className={`col-span-2 rounded-2xl border border-[var(--border)] p-5 flex items-end justify-between
          ${dueCount > 0
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--surface)]'}`}
          style={{ minHeight: 120 }}
        >
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${dueCount > 0 ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
              Due Today
            </p>
            <div className={`stat-number ${dueCount > 0 ? 'text-white' : 'text-[var(--text)]'}`}>
              {dueCount}
            </div>
          </div>
          {dueCount > 0 && (
            <Link href="/learn">
              <button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all flex items-center gap-1.5">
                Review <ChevronRight size={14} />
              </button>
            </Link>
          )}
        </div>

        {/* Total Words */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" style={{ minHeight: 120 }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Words</p>
          <div className="stat-number text-[var(--text)]">{totalWords}</div>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" style={{ minHeight: 120 }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Streak</p>
          <div className="stat-number text-[var(--text)]">
            {streak}<span className="text-[18px] font-normal ml-1 text-[var(--text-secondary)]">d</span>
          </div>
        </div>
      </div>

      {/* ── Daily Challenge ── */}
      <DailyChallengeCard />

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Practice</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { href: '/quiz',          icon: BookOpen, label: 'Quiz',          sub: '6 types'         },
            { href: '/reading',       icon: FileText, label: 'Reading',       sub: 'Learn from text' },
            { href: '/pronunciation', icon: Mic2,     label: 'Speak',         sub: 'Pronunciation'   },
            { href: '/drills',        icon: Zap,      label: 'Drills',        sub: 'Quick practice'  },
          ].map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href} className="no-underline">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 flex items-center gap-3
                hover:border-[var(--accent)]/40 hover:shadow-sm transition-all cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--accent)]/10 transition-colors">
                  <Icon size={15} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text)] leading-tight">{label}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-tight">{sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Activity Chart ── */}
      <SurfaceCard padding="lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--accent)]" />
            <span className="text-[13px] font-semibold text-[var(--text)]">7-Day Activity</span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {recentActivity.reduce((s, r) => s + r.count, 0)} reviews total
          </span>
        </div>
        <div className="flex gap-2 items-end h-20">
          {recentActivity.map(({ date, count }) => {
            const maxC = Math.max(...recentActivity.map(r => r.count), 1)
            const h = count ? Math.max((count / maxC) * 68, 6) : 3
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-sm transition-all duration-500"
                  style={{ height: `${h}px`, background: count ? 'var(--accent)' : 'var(--border)', opacity: count ? 1 : 0.5 }}
                  title={`${count} reviews`}
                />
                <span className="text-[10px] text-[var(--text-secondary)]">{date}</span>
              </div>
            )
          })}
        </div>
      </SurfaceCard>

      {/* ── Secondary Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Reading</p>
          <p className="stat-number text-[var(--text)] !text-[32px]">{readingSessions}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">sessions</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Speaking</p>
          <p className="stat-number text-[var(--text)] !text-[32px]">{pronunciationAttempts}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">attempts</p>
        </div>
      </div>

      {/* ── Weak Words ── */}
      {weakWords.length > 0 && (
        <SurfaceCard padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-[var(--warning)]" />
            <span className="text-[13px] font-semibold text-[var(--text)]">Needs Attention</span>
          </div>
          <div className="space-y-2.5">
            {weakWords.map((w: any) => (
              <div key={w.id} className="flex justify-between items-start gap-3 pb-2.5 border-b border-[var(--border)] last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text)]">{w.word}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{w.definition?.slice(0, 55)}…</p>
                </div>
                <span className="text-[11px] font-bold text-[var(--warning)] whitespace-nowrap bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                  EF {w.ease_factor.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* ── Empty state ── */}
      {totalWords === 0 && (
        <EmptyState
          icon={<BookOpen size={48} className="text-[var(--accent)]" />}
          title="Start your journey"
          description="Add your first words to begin learning with spaced repetition."
          action={
            <Link href="/words">
              <InteractiveButton variant="primary" size="md">Add Your First Words</InteractiveButton>
            </Link>
          }
        />
      )}

    </div>
  )
}

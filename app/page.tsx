'use client'

import { useEffect, useState } from 'react'
import { supabase, UserProfile, Word } from '@/lib/supabase'
import Link from 'next/link'
import { TrendingUp, AlertTriangle, BookOpen, Mic2, FileText, Zap, ChevronRight, Dumbbell, Shield } from 'lucide-react'
import DailyChallengeCard from '@/components/DailyChallengeCard'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import HeroSection from '@/components/design/HeroSection'
import { SkeletonStat } from '@/components/design/Skeleton'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [weakWords, setWeakWords] = useState<(Word & { ease_factor: number })[]>([])
  const [recentActivity, setRecentActivity] = useState<{ date: string; count: number }[]>([])
  const [readingSessions, setReadingSessions] = useState(0)
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [streakProtected, setStreakProtected] = useState(false)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [profileRes, wordsRes, dueRes, weakRes, logsRes, readingRes, pronunciationRes] = await Promise.all([
        supabase.from('user_profile').select('*').limit(1).maybeSingle(),
        supabase.from('words').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).lte('next_review', today),
        supabase.from('reviews').select('word_id, ease_factor, words(id, word, definition)').order('ease_factor', { ascending: true }).limit(5),
        supabase.from('review_logs').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('reading_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('pronunciation_attempts').select('id', { count: 'exact', head: true }),
      ])
      if (profileRes.data) {
        setProfile(profileRes.data)
        // Streak recovery — 1 free freeze per week (localStorage-based, no migration needed)
        try {
          const streak = profileRes.data.current_streak || 0
          if (streak > 0) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
            const weekKey = `streak_freeze_week_${new Date().toISOString().slice(0, 7)}`
            const usedThisWeek = localStorage.getItem(weekKey) === 'used'
            const lastActivity = localStorage.getItem('last_activity_date')
            if (lastActivity && lastActivity < yesterday && !usedThisWeek) {
              // Missed a day — auto-protect streak if freeze available
              localStorage.setItem(weekKey, 'used')
              setStreakProtected(true)
            }
          }
          // Track today's activity date
          localStorage.setItem('last_activity_date', new Date().toISOString().split('T')[0])
        } catch {}
      }
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
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-6 fade-in">
      {/* Hero section skeleton */}
      <div className="rounded-2xl shimmer" style={{ height: 100, background: 'var(--border)' }} />

      {/* Bento stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Due Today — wide */}
        <div className="col-span-2 rounded-2xl shimmer flex flex-col justify-between p-5" style={{ minHeight: 120, background: 'var(--border)' }}>
          <div className="h-3 w-20 rounded shimmer" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
          <div className="h-10 w-16 rounded-lg shimmer" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
        </div>
        {/* Words */}
        <div className="rounded-2xl shimmer flex flex-col justify-between p-5" style={{ minHeight: 120, background: 'var(--border)' }}>
          <div className="h-3 w-14 rounded" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
          <div className="h-9 w-12 rounded-lg" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
        </div>
        {/* Streak */}
        <div className="rounded-2xl shimmer flex flex-col justify-between p-5" style={{ minHeight: 120, background: 'var(--border)' }}>
          <div className="h-3 w-14 rounded" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
          <div className="h-9 w-12 rounded-lg" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
        </div>
      </div>

      {/* Practice cards skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-16 rounded shimmer" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 flex items-center gap-3 border-l-4" style={{ borderLeftColor: 'var(--border)' }}>
              <div className="w-8 h-8 rounded-lg shimmer" style={{ background: 'var(--border)', flexShrink: 0 }} />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-14 rounded shimmer" style={{ background: 'var(--border)' }} />
                <div className="h-2.5 w-20 rounded shimmer" style={{ background: 'var(--border)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity chart skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded shimmer" style={{ background: 'var(--border)' }} />
          <div className="h-3 w-20 rounded shimmer" style={{ background: 'var(--border)' }} />
        </div>
        <div className="flex items-end gap-2 h-16">
          {[40,65,30,80,55,70,45].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-sm shimmer" style={{ height: `${h}%`, background: 'var(--border)' }} />
              <div className="h-2 w-6 rounded shimmer" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const streak = profile?.current_streak || 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="fade-in space-y-6">

      {/* ── Hero Header ── */}
      <HeroSection
        greeting={greeting}
        subtitle={
          dueCount > 0
            ? `${dueCount} ${dueCount === 1 ? 'word' : 'words'} waiting for review.`
            : totalWords > 0 ? 'All caught up — great work.' : 'Start adding words to begin.'
        }
      />

      {/* ── Streak Protected Banner ── */}
      {streakProtected && (
        <div className="scale-in flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--warning)]/40 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]">
          <Shield size={18} className="text-[var(--warning)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">Streak Protected 🛡️</p>
            <p className="text-xs text-[var(--text-secondary)]">Your freeze was used automatically — 1 available per week.</p>
          </div>
        </div>
      )}

      {/* ── Bento Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Due Today — spans 2 cols, primary CTA */}
        <div
          className={`col-span-2 rounded-2xl border p-5 flex items-end justify-between scale-in stagger-1
            ${dueCount > 0 ? 'border-transparent pulse-urgent' : 'border-[var(--border)] bg-[var(--surface)]'}`}
          style={{
            minHeight: 120,
            ...(dueCount > 0 ? {
              background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, #000) 100%)',
            } : {}),
          }}
        >
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${dueCount > 0 ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
              Due Today
            </p>
            <div
              className={dueCount > 0 ? 'text-white' : 'text-[var(--text)]'}
              style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: 800, fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {dueCount}
            </div>
          </div>
          {dueCount > 0 && (
            <Link href="/learn">
              <button className="bg-white text-[var(--accent)] rounded-xl px-4 py-2 text-[13px] font-semibold transition-all hover:opacity-90 flex items-center gap-1.5">
                Review <ChevronRight size={14} />
              </button>
            </Link>
          )}
        </div>

        {/* Total Words */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 scale-in stagger-2" style={{ minHeight: 120 }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Words</p>
          <div className="stat-number text-[var(--text)]">{totalWords}</div>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 scale-in stagger-3" style={{ minHeight: 120 }}>
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
            { href: '/quiz',          icon: BookOpen, label: 'Quiz',          sub: '6 types',        color: '#2563eb' },
            { href: '/reading',       icon: FileText, label: 'Reading',       sub: 'Learn from text', color: '#7c3aed' },
            { href: '/pronunciation', icon: Mic2,     label: 'Speak',         sub: 'Pronunciation',  color: '#0891b2' },
            { href: '/drills',        icon: Zap,      label: 'Drills',        sub: 'Quick practice', color: '#d97706' },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="no-underline">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 flex items-center gap-3
                hover:shadow-sm transition-all cursor-pointer border-l-4"
                style={{ borderLeftColor: color }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
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
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={recentActivity} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="url(#activityGrad)" strokeWidth={2} dot={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: 12 }}
              formatter={(v: any) => [v, 'Reviews']}
            />
          </AreaChart>
        </ResponsiveContainer>
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
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[var(--warning)]" />
              <span className="text-[13px] font-semibold text-[var(--text)]">Needs Attention</span>
            </div>
            <Link href="/drills">
              <button className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity">
                <Dumbbell size={12} /> Drill These
              </button>
            </Link>
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

'use client'

import { useMemo } from 'react'
import { supabase, ReviewLog, Review, Word, UserProfile } from '@/lib/supabase'
import dynamic from 'next/dynamic'
const StatsBarChart = dynamic(() => import('@/components/StatsBarChart'), { ssr: false })
const StatsPieChart = dynamic(() => import('@/components/StatsPieChart'), { ssr: false })
import { Download, TrendingUp, Target, Flame, BookMarked, AlertTriangle, Clock, CalendarDays } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import LoadingSpinner from '@/components/design/LoadingSpinner'
import EmptyState from '@/components/design/EmptyState'
import Link from 'next/link'
import { usePageCache } from '@/lib/hooks/usePageCache'

interface StatsData {
  weeklyData: { date: string; total: number; correct: number }[]
  quizTypeData: { type: string; accuracy: number; count: number }[]
  calendarData: Record<string, number>
  wordsPerLevel: { level: string; count: number }[]
  weakWords: (Pick<Word, 'word' | 'definition'> & { ease_factor: number })[]
  totalReviews: number
  avgAccuracy: number
  totalWords: number
  profile: UserProfile | null
  forecastData: { day: string; count: number }[]
  avgStudyMinutes: number
}

async function fetchStats(): Promise<StatsData> {
  const { addDays: _addDays, startOfDay: _startOfDay, format: _format } = await import('date-fns')
  const todayStart = _startOfDay(new Date())
  const next7 = _addDays(todayStart, 7)

  const [logsRes, wordsRes, reviewsRes, profileRes, forecastRes] = await Promise.all([
    supabase.from('review_logs').select('created_at, quiz_type, result, response_time_ms').gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString()).limit(500),
    supabase.from('words').select('id, cefr_level, category'),
    supabase.from('reviews').select('word_id, ease_factor, words(word, definition)').order('ease_factor', { ascending: true }).limit(10),
    supabase.from('user_profile').select('*').limit(1).maybeSingle(),
    supabase.from('reviews').select('next_review').gte('next_review', todayStart.toISOString().split('T')[0]).lte('next_review', next7.toISOString().split('T')[0]),
  ])

  type LogEntry = Pick<ReviewLog, 'created_at' | 'quiz_type' | 'result' | 'response_time_ms'>
  const logs: LogEntry[] = logsRes.data ?? []
  const totalReviews = logs.length
  const correct = logs.filter((l: LogEntry) => l.result >= 3).length
  const avgAccuracy = logs.length ? Math.round(correct / logs.length * 100) : 0

  // 7-day chart
  const days: Record<string, { total: number; correct: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    days[d] = { total: 0, correct: 0 }
  }
  logs.forEach((l: LogEntry) => {
    const d = l.created_at.split('T')[0]
    if (days[d]) { days[d].total++; if (l.result >= 3) days[d].correct++ }
  })
  const weeklyData = Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v }))

  // Calendar: last 12 weeks
  const calendarData: Record<string, number> = {}
  logs.forEach((l: LogEntry) => { const d = l.created_at.split('T')[0]; calendarData[d] = (calendarData[d] || 0) + 1 })

  // Avg daily study time
  const dayTotals = new Map<string, number>()
  logs.forEach((l: LogEntry) => {
    if (l.response_time_ms > 0) {
      const day = l.created_at.split('T')[0]
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + l.response_time_ms)
    }
  })
  const activeDays = dayTotals.size
  const totalMs = [...dayTotals.values()].reduce((a, b) => a + b, 0)
  const avgStudyMinutes = activeDays > 0 ? Math.max(1, Math.round(totalMs / activeDays / 1000 / 60)) : 0

  // Quiz type accuracy
  const types: Record<string, { total: number; correct: number }> = {}
  logs.forEach((l: LogEntry) => {
    if (!types[l.quiz_type]) types[l.quiz_type] = { total: 0, correct: 0 }
    types[l.quiz_type].total++; if (l.result >= 3) types[l.quiz_type].correct++
  })
  const quizTypeData = Object.entries(types).map(([type, v]) => ({
    type, accuracy: v.total > 0 ? Math.round(v.correct / v.total * 100) : 0, count: v.total
  }))

  // Words per level
  const lvls: Record<string, number> = {}
  ;(wordsRes.data ?? []).forEach((w: Pick<Word, 'id' | 'cefr_level' | 'category'>) => {
    if (w.cefr_level) lvls[w.cefr_level] = (lvls[w.cefr_level] || 0) + 1
  })
  const wordsPerLevel = Object.entries(lvls).map(([level, count]) => ({ level, count }))

  // Weak words
  type WordEmbed = { word: string; definition: string }
  type ReviewWithWord = { word_id: string; ease_factor: number; words: WordEmbed | WordEmbed[] | null }
  const typed = (reviewsRes.data ?? []) as ReviewWithWord[]
  const weakWords = typed.filter((r) => r.words).map((r) => {
    const w = Array.isArray(r.words) ? r.words[0] : r.words!
    return { word: w.word, definition: w.definition, ease_factor: r.ease_factor }
  })

  // 7-day forecast
  const forecastData = Array.from({ length: 7 }, (_, i) => {
    const day = _addDays(todayStart, i)
    const dayStr = day.toISOString().split('T')[0]
    const count = (forecastRes.data ?? []).filter((r: Pick<Review, 'next_review'>) => {
      return r.next_review.split('T')[0] === dayStr
    }).length
    return { day: i === 0 ? 'Today' : _format(day, 'EEE'), count }
  })

  return {
    weeklyData, quizTypeData, calendarData, wordsPerLevel, weakWords,
    totalReviews, avgAccuracy, totalWords: wordsRes.data?.length ?? 0,
    profile: profileRes.data ?? null, forecastData, avgStudyMinutes,
  }
}

export default function StatsPage() {
  const { data, loading, error, reload } = usePageCache<StatsData>('stats', fetchStats, 60_000)

  const weeklyData = data?.weeklyData ?? []
  const quizTypeData = data?.quizTypeData ?? []
  const calendarData = data?.calendarData ?? {}
  const wordsPerLevel = data?.wordsPerLevel ?? []
  const weakWords = data?.weakWords ?? []
  const totalReviews = data?.totalReviews ?? 0
  const avgAccuracy = data?.avgAccuracy ?? 0
  const totalWords = data?.totalWords ?? 0
  const profile = data?.profile ?? null
  const forecastData = data?.forecastData ?? []
  const avgStudyMinutes = data?.avgStudyMinutes ?? 0

  async function exportForClaude() {
    const { data: logs } = await supabase.from('review_logs').select('*, words(word, category, cefr_level)').order('created_at', { ascending: false }).limit(200)
    const blob = new Blob([JSON.stringify({ generated_at: new Date().toISOString(), total_reviews: totalReviews, accuracy: avgAccuracy, logs }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'review-logs.json'; a.click()
  }

  // Calendar rendering: last 16 weeks (memoized — only recomputes when calendarData changes)
  const calendarJSX = useMemo(() => {
    const today = new Date()
    const weeks: string[][] = []
    const start = new Date(today)
    start.setDate(start.getDate() - 112 - start.getDay())

    for (let w = 0; w < 16; w++) {
      const week: string[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        week.push(date.toISOString().split('T')[0])
      }
      weeks.push(week)
    }

    const maxCount = Math.max(...Object.values(calendarData), 1)

    return (
      <div className="overflow-x-auto">
        <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {week.map(date => {
                const count = calendarData[date] || 0
                const intensity = count === 0 ? 0 : Math.min(4, Math.ceil(count / maxCount * 4))
                        const colors = [
                  'var(--border)',
                  'color-mix(in srgb, var(--success) 20%, transparent)',
                  'color-mix(in srgb, var(--success) 45%, transparent)',
                  'color-mix(in srgb, var(--success) 70%, transparent)',
                  'var(--success)',
                ]
                return (
                  <div
                    key={date}
                    title={`${date}: ${count} reviews`}
                    className="rounded transition-all"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '3px',
                      background: colors[intensity],
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-secondary)]">
          <span>Less</span>
          {[
            'var(--border)',
            'color-mix(in srgb, var(--success) 20%, transparent)',
            'color-mix(in srgb, var(--success) 45%, transparent)',
            'color-mix(in srgb, var(--success) 70%, transparent)',
            'var(--success)',
          ].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '2px', background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>
    )
  }, [calendarData])

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <LoadingSpinner size="md" label="Loading your stats..." />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <p className="body text-[var(--error)]">{error}</p>
      <button onClick={reload} className="text-sm text-[var(--accent)] underline">
        Try again
      </button>
    </div>
  )

  if (totalReviews === 0 && totalWords === 0) return (
    <EmptyState
      icon={<TrendingUp size={56} className="text-[var(--accent)]" />}
      title="No stats yet"
      description="Start reviewing words to see your progress, accuracy, and streaks here."
      action={
        <Link href="/learn">
          <InteractiveButton variant="primary" size="md">Start Reviewing</InteractiveButton>
        </Link>
      }
    />
  )

  return (
    <div className="fade-in max-w-6xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="h2 text-[var(--text)] mb-2">Progress & Stats</h1>
          <p className="body text-[var(--text-secondary)]">Track your learning journey and identify improvement areas</p>
        </div>
        <InteractiveButton
          variant="secondary"
          size="md"
          onClick={exportForClaude}
          className="flex items-center gap-2"
        >
          <Download size={16} />
          Export Data
        </InteractiveButton>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<BookMarked size={28} className="text-blue-500" />}
          label="Total Words"
          value={totalWords}
          color="var(--accent)"
          animated
        />
        <StatCard
          icon={<TrendingUp size={28} className="text-purple-500" />}
          label="Reviews (30d)"
          value={totalReviews}
          color="var(--accent)"
          animated
          trend={{ direction: 'up', percent: 10 }}
        />
        <StatCard
          icon={<Target size={28} className={avgAccuracy >= 80 ? 'text-green-500' : 'text-amber-600'} />}
          label="Accuracy"
          value={`${avgAccuracy}%`}
          color={avgAccuracy >= 80 ? '#16a34a' : '#d97706'}
          trend={avgAccuracy >= 80 ? { direction: 'up', percent: 5 } : undefined}
        />
        <StatCard
          icon={<Flame size={28} className="text-red-600" />}
          label="Streak"
          value={`${profile?.current_streak || 0}d`}
          color="#dc2626"
          trend={profile?.current_streak ? { direction: 'up', percent: profile.current_streak } : undefined}
        />
        <StatCard
          icon={<Clock size={28} className="text-sky-500" />}
          label="Avg Study Time"
          value={avgStudyMinutes > 0 ? `${avgStudyMinutes} min/day` : '—'}
          color="var(--accent)"
        />
      </div>

      {/* Streak Calendar */}
      <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <div className="flex items-center gap-2 mb-6">
          <Flame size={18} className="text-amber-600" />
          <h3 className="h4 text-[var(--text)]">Review Activity (16 weeks)</h3>
        </div>
        {calendarJSX}
      </SurfaceCard>

      {/* 7-day chart */}
      <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <h3 className="h4 text-[var(--text)] mb-6">7-Day Reviews</h3>
        <StatsBarChart
          data={weeklyData}
          height={200}
          xDataKey="date"
          bars={[
            { dataKey: 'total', fill: 'rgba(251,146,60,0.2)', name: 'Total', radius: [8, 8, 0, 0] },
            { dataKey: 'correct', fill: 'var(--accent)', name: 'Correct', radius: [8, 8, 0, 0] },
          ]}
        />
      </SurfaceCard>

      {/* Upcoming Reviews Forecast */}
      {forecastData.length > 0 && (
        <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays size={18} className="text-[var(--accent)]" />
            <h3 className="h4 text-[var(--text)]">Upcoming Reviews (Next 7 Days)</h3>
          </div>
          <StatsBarChart
            data={forecastData}
            height={160}
            xDataKey="day"
            yAxisProps={{ allowDecimals: false }}
            bars={[{ dataKey: 'count', fill: 'var(--accent)', name: 'Due', radius: [6, 6, 0, 0] }]}
            tooltipFormatter={(v) => [v, 'Due']}
          />
          <p className="text-xs text-[var(--text-secondary)] mt-3 italic">Plan your study schedule based on upcoming reviews</p>
        </SurfaceCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy by quiz type */}
        {quizTypeData.length > 0 && (
          <SurfaceCard padding="lg">
            <h3 className="h4 text-[var(--text)] mb-6">By Quiz Type</h3>
            <div className="space-y-4">
              {quizTypeData.sort((a, b) => a.accuracy - b.accuracy).map(({ type, accuracy }) => (
                <div key={type}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="label text-[var(--text)] capitalize">{type.replace('_', ' ')}</span>
                    <span className={`label font-bold ${
                      accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {accuracy}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        accuracy >= 80 ? 'bg-green-600' : accuracy >= 60 ? 'bg-amber-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}

        {/* Words by CEFR */}
        {wordsPerLevel.length > 0 && (
          <SurfaceCard padding="lg">
            <h3 className="h4 text-[var(--text)] mb-6">CEFR Levels</h3>
            <StatsPieChart data={wordsPerLevel} />
          </SurfaceCard>
        )}
      </div>

      {/* Weak words */}
      {weakWords.length > 0 && (
        <SurfaceCard padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="h4 text-[var(--text)]">Weakest Words (by ease factor)</h3>
          </div>
          <div className="space-y-3">
            {weakWords.slice(0, 7).map((w, i) => (
              <div key={i} className="flex justify-between items-start gap-3 pb-3 border-b border-[var(--border)] last:border-0">
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text)]">{w.word}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{w.definition?.slice(0, 60)}...</p>
                </div>
                <span className="text-xs font-semibold text-red-600 whitespace-nowrap">EF: {w.ease_factor?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Claude Analysis */}
      <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <h3 className="h4 text-[var(--text)] mb-2">🤖 AI-Powered Analysis</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Export your review data and get personalized insights from Claude AI
        </p>
        <InteractiveButton
          variant="primary"
          size="md"
          onClick={exportForClaude}
          className="flex items-center gap-2 mb-6"
        >
          <Download size={16} />
          Export Review Logs (JSON)
        </InteractiveButton>
        <div className="p-4 bg-[var(--bg)] rounded-lg border-l-4 border-blue-500 space-y-3">
          <p className="label text-[var(--text)]">💡 What to ask Claude:</p>
          <p className="text-sm text-[var(--text-secondary)]">
            "Here are my last 200 word reviews. Find patterns: which categories am I weakest in? Any spelling patterns? Mongolian L1 interference? Give me a personalized study plan."
          </p>
        </div>
      </SurfaceCard>
    </div>
  )
}

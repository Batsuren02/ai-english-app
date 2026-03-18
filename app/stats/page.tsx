'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, addDays, startOfDay, formatDistanceToNow } from 'date-fns'
import { Download, TrendingUp, Target, Flame, BookMarked, AlertTriangle, BookOpen, Clock, CalendarDays } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import LoadingSpinner from '@/components/design/LoadingSpinner'
import EmptyState from '@/components/design/EmptyState'
import Link from 'next/link'

export default function StatsPage() {
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [quizTypeData, setQuizTypeData] = useState<any[]>([])
  const [calendarData, setCalendarData] = useState<Record<string, number>>({})
  const [wordsPerLevel, setWordsPerLevel] = useState<any[]>([])
  const [weakWords, setWeakWords] = useState<any[]>([])
  const [totalReviews, setTotalReviews] = useState(0)
  const [avgAccuracy, setAvgAccuracy] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [profile, setProfile] = useState<any>(null)
  const [forecastData, setForecastData] = useState<{ day: string; count: number }[]>([])
  const [avgStudyMinutes, setAvgStudyMinutes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const todayStart = startOfDay(new Date())
    const next7 = addDays(todayStart, 7)

    try {
    const [logsRes, wordsRes, reviewsRes, profileRes, forecastRes] = await Promise.all([
      supabase.from('review_logs').select('*').gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString()),
      supabase.from('words').select('id, cefr_level, category'),
      supabase.from('reviews').select('word_id, ease_factor, words(word, definition)').order('ease_factor', { ascending: true }).limit(10),
      supabase.from('user_profile').select('*').single(),
      supabase.from('reviews').select('next_review').gte('next_review', todayStart.toISOString().split('T')[0]).lte('next_review', next7.toISOString().split('T')[0]),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (wordsRes.count !== undefined) setTotalWords(wordsRes.data?.length || 0)

    // Build 7-day review forecast
    if (forecastRes.data) {
      const forecast = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(todayStart, i)
        const dayStr = day.toISOString().split('T')[0]
        const count = forecastRes.data!.filter((r: any) => {
          const reviewDay = typeof r.next_review === 'string' ? r.next_review.split('T')[0] : r.next_review
          return reviewDay === dayStr
        }).length
        return { day: i === 0 ? 'Today' : format(day, 'EEE'), count }
      })
      setForecastData(forecast)
    }

    if (logsRes.data) {
      const logs = logsRes.data
      setTotalReviews(logs.length)
      const correct = logs.filter((l: any) => l.result >= 3).length
      setAvgAccuracy(logs.length ? Math.round(correct / logs.length * 100) : 0)

      // 7-day chart
      const days: Record<string, { total: number; correct: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
        days[d] = { total: 0, correct: 0 }
      }
      logs.forEach((l: any) => {
        const d = l.created_at.split('T')[0]
        if (days[d]) { days[d].total++; if (l.result >= 3) days[d].correct++ }
      })
      setWeeklyData(Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v })))

      // Calendar: last 12 weeks
      const cal: Record<string, number> = {}
      logs.forEach((l: any) => { const d = l.created_at.split('T')[0]; cal[d] = (cal[d] || 0) + 1 })
      setCalendarData(cal)

      // Avg daily study time from response_time_ms
      const dayTotals = new Map<string, number>()
      logs.forEach((l: any) => {
        if (l.response_time_ms > 0) {
          const day = l.created_at.split('T')[0]
          dayTotals.set(day, (dayTotals.get(day) ?? 0) + l.response_time_ms)
        }
      })
      const activeDays = dayTotals.size
      const totalMs = [...dayTotals.values()].reduce((a, b) => a + b, 0)
      setAvgStudyMinutes(activeDays > 0 ? Math.max(1, Math.round(totalMs / activeDays / 1000 / 60)) : 0)

      // Quiz type accuracy
      const types: Record<string, { total: number; correct: number }> = {}
      logs.forEach((l: any) => {
        if (!types[l.quiz_type]) types[l.quiz_type] = { total: 0, correct: 0 }
        types[l.quiz_type].total++; if (l.result >= 3) types[l.quiz_type].correct++
      })
      setQuizTypeData(Object.entries(types).map(([type, v]) => ({ type, accuracy: v.total > 0 ? Math.round(v.correct / v.total * 100) : 0, count: v.total })))
    }

    if (wordsRes.data) {
      const lvls: Record<string, number> = {}
      wordsRes.data.forEach((w: any) => { if (w.cefr_level) lvls[w.cefr_level] = (lvls[w.cefr_level] || 0) + 1 })
      setWordsPerLevel(Object.entries(lvls).map(([level, count]) => ({ level, count })))
    }

    if (reviewsRes.data) {
      setWeakWords(reviewsRes.data.filter((r: any) => r.words).map((r: any) => ({ ...r.words, ease_factor: r.ease_factor })))
    }

    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('Failed to load statistics. Please refresh the page.')
    }
    setLoading(false)
  }

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

  const COLORS = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2']

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <LoadingSpinner size="md" label="Loading your stats..." />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <p className="body text-[var(--error)]">{error}</p>
      <button onClick={() => { setError(null); setLoading(true); loadStats() }} className="text-sm text-[var(--accent)] underline">
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
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            <Bar dataKey="total" fill="rgba(251, 146, 60, 0.2)" radius={[8, 8, 0, 0]} name="Total" />
            <Bar dataKey="correct" fill="var(--accent)" radius={[8, 8, 0, 0]} name="Correct" />
          </BarChart>
        </ResponsiveContainer>
      </SurfaceCard>

      {/* Upcoming Reviews Forecast */}
      {forecastData.length > 0 && (
        <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays size={18} className="text-[var(--accent)]" />
            <h3 className="h4 text-[var(--text)]">Upcoming Reviews (Next 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={forecastData}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(v) => [v, 'Due']} />
              <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} name="Due" />
            </BarChart>
          </ResponsiveContainer>
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
            <div className="flex flex-col items-center gap-6">
              <PieChart width={150} height={150}>
                <Pie data={wordsPerLevel} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
                  {wordsPerLevel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              </PieChart>
              <div className="flex flex-wrap gap-3 justify-center">
                {wordsPerLevel.map((item, i) => (
                  <div key={item.level} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-[var(--text)]">{item.level}: {item.count}</span>
                  </div>
                ))}
              </div>
            </div>
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
            {weakWords.slice(0, 7).map((w: any, i: number) => (
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

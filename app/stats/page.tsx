'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Download, TrendingUp, Target, Zap, Flame, BookMarked } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [logsRes, wordsRes, reviewsRes, profileRes] = await Promise.all([
      supabase.from('review_logs').select('*').gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString()),
      supabase.from('words').select('id, cefr_level, category'),
      supabase.from('reviews').select('word_id, ease_factor, words(word, definition)').order('ease_factor').limit(10),
      supabase.from('user_profile').select('*').single(),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (wordsRes.count !== undefined) setTotalWords(wordsRes.data?.length || 0)

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

      // Quiz type accuracy
      const types: Record<string, { total: number; correct: number }> = {}
      logs.forEach((l: any) => {
        if (!types[l.quiz_type]) types[l.quiz_type] = { total: 0, correct: 0 }
        types[l.quiz_type].total++; if (l.result >= 3) types[l.quiz_type].correct++
      })
      setQuizTypeData(Object.entries(types).map(([type, v]) => ({ type, accuracy: Math.round(v.correct / v.total * 100), count: v.total })))
    }

    if (wordsRes.data) {
      const lvls: Record<string, number> = {}
      wordsRes.data.forEach((w: any) => { if (w.cefr_level) lvls[w.cefr_level] = (lvls[w.cefr_level] || 0) + 1 })
      setWordsPerLevel(Object.entries(lvls).map(([level, count]) => ({ level, count })))
    }

    if (reviewsRes.data) {
      setWeakWords(reviewsRes.data.filter((r: any) => r.words).map((r: any) => ({ ...r.words, ease_factor: r.ease_factor })))
    }

    setLoading(false)
  }

  async function exportForClaude() {
    const { data: logs } = await supabase.from('review_logs').select('*, words(word, category, cefr_level)').order('created_at', { ascending: false }).limit(200)
    const blob = new Blob([JSON.stringify({ generated_at: new Date().toISOString(), total_reviews: totalReviews, accuracy: avgAccuracy, logs }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'review-logs.json'; a.click()
  }

  // Calendar rendering: last 16 weeks
  function renderCalendar() {
    const today = new Date()
    const weeks: string[][] = []
    // Start from 16 weeks ago, align to Sunday
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
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map(date => {
                const count = calendarData[date] || 0
                const intensity = count === 0 ? 0 : Math.min(4, Math.ceil(count / maxCount * 4))
                const colors = ['var(--border)', '#bbf7d0', '#4ade80', '#16a34a', '#14532d']
                return (
                  <div key={date} title={`${date}: ${count} reviews`} style={{
                    width: 13, height: 13, borderRadius: 3,
                    background: colors[intensity],
                    cursor: count > 0 ? 'default' : 'default',
                  }} />
                )
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--ink-light)' }}>
          <span>Less</span>
          {['var(--border)', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>
    )
  }

  const COLORS = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2']

  if (loading) return <div style={{ color: 'var(--ink-light)', padding: 40 }}>Loading stats...</div>

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 26 }}>Progress & Stats</h2>
        <button className="btn-ghost" onClick={exportForClaude} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px' }}>
          <Download size={14} /> Export for Claude
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: BookMarked, label: 'Total Words', value: totalWords, color: '#2563eb' },
          { icon: TrendingUp, label: 'Reviews (30d)', value: totalReviews, color: '#7c3aed' },
          { icon: Target, label: 'Accuracy', value: `${avgAccuracy}%`, color: avgAccuracy >= 80 ? '#16a34a' : '#d97706' },
          { icon: Flame, label: 'Streak', value: `${profile?.current_streak || 0}d`, color: '#dc2626' },
          { icon: Zap, label: 'Total XP', value: profile?.total_xp || 0, color: '#d97706' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <Icon size={20} style={{ color, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Streak Calendar */}
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={16} color="#d97706" /> Review Activity (16 weeks)
        </h3>
        {renderCalendar()}
      </div>

      {/* 7-day chart */}
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>7-Day Reviews</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total" fill="#d9770640" radius={3} name="Total" />
            <Bar dataKey="correct" fill="#d97706" radius={3} name="Correct" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Accuracy by quiz type */}
        {quizTypeData.length > 0 && (
          <div className="card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>By Quiz Type</h3>
            {quizTypeData.sort((a, b) => a.accuracy - b.accuracy).map(({ type, accuracy }) => (
              <div key={type} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 700, color: accuracy >= 80 ? '#16a34a' : accuracy >= 60 ? '#d97706' : '#dc2626' }}>{accuracy}%</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 3, height: 5 }}>
                  <div style={{ background: accuracy >= 80 ? '#16a34a' : accuracy >= 60 ? '#d97706' : '#dc2626', width: `${accuracy}%`, height: 5, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Words by CEFR */}
        {wordsPerLevel.length > 0 && (
          <div className="card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>CEFR Levels</h3>
            <PieChart width={150} height={150} style={{ margin: '0 auto' }}>
              <Pie data={wordsPerLevel} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
                {wordsPerLevel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
              {wordsPerLevel.map((item, i) => (
                <span key={item.level} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                  {item.level}: {item.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weak words */}
      {weakWords.length > 0 && (
        <div className="card" style={{ padding: '18px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>⚠️ Weakest Words (by ease factor)</h3>
          {weakWords.slice(0, 7).map((w: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{w.word}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-light)', marginLeft: 8 }}>{w.definition?.slice(0, 48)}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginLeft: 12, flexShrink: 0 }}>EF {w.ease_factor?.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Claude prompts */}
      <div className="card" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>🤖 Claude Analysis</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 12 }}>Export your data then paste to Claude.ai for AI-powered analysis.</p>
        <button className="btn-ghost" onClick={exportForClaude} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Download size={14} /> Export Review Logs (JSON)
        </button>
        <div style={{ marginTop: 12, background: 'var(--bg)', borderRadius: 8, padding: '12px', fontSize: 12, color: 'var(--ink-light)', lineHeight: 1.7 }}>
          <strong>After exporting, paste this to Claude:</strong><br />
          "Here are my last 200 word reviews. Find patterns: which categories am I weakest in? Any spelling patterns? Mongolian L1 interference? Give me a study plan."
        </div>
      </div>
    </div>
  )
}

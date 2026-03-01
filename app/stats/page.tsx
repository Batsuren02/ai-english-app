'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp, Target, Zap } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

export default function StatsPage() {
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [quizTypeData, setQuizTypeData] = useState<any[]>([])
  const [totalReviews, setTotalReviews] = useState(0)
  const [avgAccuracy, setAvgAccuracy] = useState(0)
  const [wordsPerLevel, setWordsPerLevel] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [logsRes, wordsRes] = await Promise.all([
      supabase.from('review_logs').select('*').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('words').select('cefr_level, category'),
    ])

    if (logsRes.data) {
      const logs = logsRes.data
      setTotalReviews(logs.length)
      const correct = logs.filter((l: any) => l.result >= 3).length
      setAvgAccuracy(logs.length ? Math.round((correct / logs.length) * 100) : 0)

      // Weekly data
      const days: Record<string, { total: number; correct: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
        days[d] = { total: 0, correct: 0 }
      }
      logs.forEach((l: any) => {
        const d = l.created_at.split('T')[0]
        if (days[d]) { days[d].total++; if (l.result >= 3) days[d].correct++ }
      })
      setWeeklyData(Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v, accuracy: v.total ? Math.round(v.correct / v.total * 100) : 0 })))

      // Quiz type breakdown
      const types: Record<string, { total: number; correct: number }> = {}
      logs.forEach((l: any) => {
        if (!types[l.quiz_type]) types[l.quiz_type] = { total: 0, correct: 0 }
        types[l.quiz_type].total++
        if (l.result >= 3) types[l.quiz_type].correct++
      })
      setQuizTypeData(Object.entries(types).map(([type, v]) => ({ type, accuracy: Math.round(v.correct / v.total * 100), total: v.total })))
    }

    if (wordsRes.data) {
      const levels: Record<string, number> = {}
      wordsRes.data.forEach((w: any) => { if (w.cefr_level) levels[w.cefr_level] = (levels[w.cefr_level] || 0) + 1 })
      setWordsPerLevel(Object.entries(levels).map(([level, count]) => ({ level, count })))
    }

    setLoading(false)
  }

  async function exportForClaude() {
    const { data: logs } = await supabase.from('review_logs').select('*, words(word, category, cefr_level)').order('created_at', { ascending: false }).limit(200)
    const exportData = { generated_at: new Date().toISOString(), total_reviews: totalReviews, accuracy: avgAccuracy, logs }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'review-logs.json'; a.click()
  }

  const COLORS = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2']

  if (loading) return <div style={{ color: 'var(--ink-light)' }}>Loading stats...</div>

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 26 }}>Progress & Stats</h2>
        <button className="btn-ghost" onClick={exportForClaude} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px' }}>
          <Download size={14} /> Export for Claude
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { icon: TrendingUp, label: 'Reviews (30d)', value: totalReviews, color: '#2563eb' },
          { icon: Target, label: 'Avg Accuracy', value: `${avgAccuracy}%`, color: '#16a34a' },
          { icon: Zap, label: 'Word Levels', value: wordsPerLevel.length, color: '#9333ea' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '18px', textAlign: 'center' }}>
            <Icon size={22} style={{ color, margin: '0 auto 8px' }} />
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-light)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly reviews chart */}
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 17, marginBottom: 16 }}>7-Day Review Activity</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="total" fill="#d97706" radius={4} name="Total" />
            <Bar dataKey="correct" fill="#16a34a" radius={4} name="Correct" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accuracy by quiz type */}
      {quizTypeData.length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>Accuracy by Quiz Type</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={quizTypeData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="accuracy" radius={4} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Words by CEFR level */}
      {wordsPerLevel.length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>Words by CEFR Level</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PieChart width={160} height={160}>
              <Pie data={wordsPerLevel} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={70}>
                {wordsPerLevel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
            <div style={{ flex: 1 }}>
              {wordsPerLevel.map((item, i) => (
                <div key={item.level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{item.level}</span>
                  <span style={{ color: 'var(--ink-light)' }}>{item.count} words</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Claude prompt templates */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Claude Analysis Prompts</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 16 }}>Export your data and use these prompts in Claude Chat for AI analysis.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Error Pattern Analysis', hint: 'Export logs first, then paste with prompt' },
            { label: 'Weekly Progress Review', hint: 'Export stats and get a personalized plan' },
          ].map(({ label, hint }) => (
            <div key={label} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{label}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-light)' }}>{hint}</p>
              </div>
              <button className="btn-ghost" onClick={exportForClaude} style={{ fontSize: 12, padding: '6px 12px' }}>Export & Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

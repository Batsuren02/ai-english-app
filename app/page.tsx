'use client'
import { useEffect, useState } from 'react'
import { supabase, UserProfile, Word, Review } from '@/lib/supabase'
import Link from 'next/link'
import { Brain, BookMarked, Flame, Star, TrendingUp, Zap, ChevronRight, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [weakWords, setWeakWords] = useState<(Word & { ease_factor: number })[]>([])
  const [recentActivity, setRecentActivity] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]

    const [profileRes, wordsRes, dueRes, weakRes, logsRes] = await Promise.all([
      supabase.from('user_profile').select('*').single(),
      supabase.from('words').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).lte('next_review', today),
      supabase.from('reviews').select('word_id, ease_factor, words(id, word, definition)').order('ease_factor').limit(5),
      supabase.from('review_logs').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (wordsRes.count !== null) setTotalWords(wordsRes.count)
    if (dueRes.count !== null) setDueCount(dueRes.count)

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

  const xpForNextLevel = (profile?.level || 1) * 100
  const xpProgress = profile ? (profile.total_xp % xpForNextLevel) / xpForNextLevel * 100 : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ color: 'var(--ink-light)', fontStyle: 'italic' }}>Loading your progress...</div>
    </div>
  )

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, marginBottom: 4 }}>Good day! 👋</h2>
        <p style={{ color: 'var(--ink-light)' }}>
          {dueCount > 0 ? `You have ${dueCount} words to review today.` : 'All caught up! Great work.'}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { icon: Brain, label: 'Due Today', value: dueCount, color: dueCount > 0 ? '#d97706' : '#16a34a' },
          { icon: BookMarked, label: 'Total Words', value: totalWords, color: '#2563eb' },
          { icon: Flame, label: 'Streak', value: `${profile?.current_streak || 0}d`, color: '#dc2626' },
          { icon: Star, label: 'XP', value: profile?.total_xp || 0, color: '#9333ea' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <Icon size={24} style={{ color, margin: '0 auto 8px' }} />
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* XP Progress */}
      {profile && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>Level {profile.level}</span>
            <span style={{ color: 'var(--ink-light)' }}>{profile.total_xp % xpForNextLevel} / {xpForNextLevel} XP</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 4, height: 8 }}>
            <div style={{ background: '#9333ea', borderRadius: 4, height: 8, width: `${xpProgress}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {dueCount > 0 && (
          <Link href="/learn" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--accent)', color: 'white', borderRadius: 12,
              padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>Start Review</div>
                <div style={{ opacity: 0.85, fontSize: 13 }}>{dueCount} words due</div>
              </div>
              <ChevronRight size={20} />
            </div>
          </Link>
        )}
        <Link href="/words" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Add Word</div>
              <div style={{ color: 'var(--ink-light)', fontSize: 13 }}>Paste from Claude</div>
            </div>
            <ChevronRight size={18} color="var(--ink-light)" />
          </div>
        </Link>
        <Link href="/quiz" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Practice Quiz</div>
              <div style={{ color: 'var(--ink-light)', fontSize: 13 }}>6 quiz types</div>
            </div>
            <ChevronRight size={18} color="var(--ink-light)" />
          </div>
        </Link>
      </div>

      {/* Activity chart */}
      <div className="card" style={{ padding: '20px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 17, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} /> 7-Day Activity
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
          {recentActivity.map(({ date, count }) => {
            const maxC = Math.max(...recentActivity.map(r => r.count), 1)
            const h = count ? (count / maxC) * 64 + 4 : 4
            return (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: h, background: count ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 4, transition: 'height 0.3s',
                }} title={`${count} reviews`} />
                <span style={{ fontSize: 10, color: 'var(--ink-light)' }}>{date}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weak words */}
      {weakWords.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 17, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#f59e0b" /> Words Needing Attention
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {weakWords.map((w: any) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{w.word}</span>
                  <span style={{ color: 'var(--ink-light)', fontSize: 13, marginLeft: 8 }}>{w.definition?.slice(0, 50)}...</span>
                </div>
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>EF: {w.ease_factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalWords === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center', marginTop: 24 }}>
          <Zap size={40} style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
          <h3 style={{ marginBottom: 8 }}>Start your journey!</h3>
          <p style={{ color: 'var(--ink-light)', marginBottom: 16 }}>Add your first words to get started.</p>
          <Link href="/words"><button className="btn-primary">Add Words</button></Link>
        </div>
      )}
    </div>
  )
}

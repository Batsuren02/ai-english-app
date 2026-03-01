'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, Word, Review } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { CheckCircle, XCircle, Volume2, RotateCcw, ArrowRight, Award } from 'lucide-react'

type WordWithReview = Word & { review: Review }

type SessionResult = {
  word: Word
  quality: number
  correct: boolean
}

export default function LearnPage() {
  const [dueWords, setDueWords] = useState<WordWithReview[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(Date.now())

  useEffect(() => { loadDueWords() }, [])

  async function loadDueWords() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('reviews')
      .select('*, words(*)')
      .lte('next_review', today)
      .limit(20)

    if (data) {
      const items = data.map((r: any) => ({ ...r.words, review: r }))
      setDueWords(items)
    }
    setLoading(false)
    setStartTime(Date.now())
  }

  const current = dueWords[currentIdx]

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'en-US'
      utt.rate = 0.85
      window.speechSynthesis.speak(utt)
    }
  }

  async function rateWord(quality: number) {
    if (!current) return

    const sm2 = calculateSM2(
      quality,
      current.review.ease_factor,
      current.review.interval_days,
      current.review.repetitions
    )

    const timeMs = Date.now() - startTime

    await Promise.all([
      supabase.from('reviews').update({
        ease_factor: sm2.ease_factor,
        interval_days: sm2.interval_days,
        repetitions: sm2.repetitions,
        next_review: sm2.next_review.toISOString().split('T')[0],
        last_reviewed: new Date().toISOString(),
        total_reviews: (current.review.total_reviews || 0) + 1,
        correct_count: quality >= 3 ? (current.review.correct_count || 0) + 1 : current.review.correct_count,
        streak: quality >= 3 ? (current.review.streak || 0) + 1 : 0,
      }).eq('word_id', current.id),
      supabase.from('review_logs').insert({
        word_id: current.id,
        quiz_type: 'mcq',
        result: quality,
        response_time_ms: timeMs,
        user_answer: quality >= 3 ? current.word : '',
      }),
    ])

    // Update XP
    if (quality >= 3) {
      const { data: prof } = await supabase.from('user_profile').select('total_xp').single()
      if (prof) {
        const newXp = (prof.total_xp || 0) + (quality >= 4 ? 10 : 5)
        await supabase.from('user_profile').update({ total_xp: newXp }).eq('id', (prof as any).id)
      }
    }

    setResults(prev => [...prev, { word: current, quality, correct: quality >= 3 }])

    if (currentIdx + 1 >= dueWords.length) {
      setSessionDone(true)
    } else {
      setCurrentIdx(prev => prev + 1)
      setShowAnswer(false)
      setStartTime(Date.now())
    }
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--ink-light)' }}>Loading review session...</div>

  if (dueWords.length === 0) return (
    <div className="fade-in" style={{ textAlign: 'center', marginTop: 60 }}>
      <CheckCircle size={48} style={{ color: '#16a34a', margin: '0 auto 16px' }} />
      <h2 style={{ marginBottom: 8 }}>All caught up! 🎉</h2>
      <p style={{ color: 'var(--ink-light)' }}>No words due for review today. Come back tomorrow!</p>
    </div>
  )

  if (sessionDone) {
    const correct = results.filter(r => r.correct).length
    const accuracy = Math.round((correct / results.length) * 100)
    return (
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
        <Award size={56} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Session Complete!</h2>
        <p style={{ color: 'var(--ink-light)', marginBottom: 32 }}>Great work on your review session.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Words', value: results.length },
            { label: 'Correct', value: correct },
            { label: 'Accuracy', value: `${accuracy}%` },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Word Results</h3>
          {results.map(({ word, correct }) => (
            <div key={word.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              {correct
                ? <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                : <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />}
              <span style={{ fontWeight: 600 }}>{word.word}</span>
              <span style={{ color: 'var(--ink-light)', fontSize: 13 }}>{word.definition?.slice(0, 50)}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => { setDueWords([]); setResults([]); setCurrentIdx(0); setSessionDone(false); loadDueWords() }}>
          <RotateCcw size={14} style={{ display: 'inline', marginRight: 6 }} />
          New Session
        </button>
      </div>
    )
  }

  const examples = current.examples as string[] || []

  return (
    <div className="fade-in" style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-light)', marginBottom: 6 }}>
          <span>{currentIdx + 1} / {dueWords.length}</span>
          <span>{Math.round((currentIdx / dueWords.length) * 100)}% done</span>
        </div>
        <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
          <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${(currentIdx / dueWords.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Word card */}
      <div className="card" style={{ padding: '36px 32px', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontSize: 40, fontFamily: 'var(--font-display)' }}>{current.word}</h2>
          <button onClick={() => speak(current.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
            <Volume2 size={22} />
          </button>
        </div>
        {current.ipa && <p style={{ color: 'var(--ink-light)', marginBottom: 24, fontSize: 15 }}>{current.ipa}</p>}

        {!showAnswer ? (
          <button className="btn-primary" onClick={() => { setShowAnswer(true); speak(current.word) }} style={{ fontSize: 16, padding: '12px 32px' }}>
            Show Answer
          </button>
        ) : (
          <div className="fade-in">
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '20px', marginBottom: 16, textAlign: 'left' }}>
              {current.part_of_speech && <span className="badge" style={{ marginBottom: 8 }}>{current.part_of_speech}</span>}
              <p style={{ marginTop: 8, fontSize: 17, fontWeight: 500 }}>{current.definition}</p>
              {current.mongolian && <p style={{ color: 'var(--ink-light)', marginTop: 6, fontSize: 15 }}>{current.mongolian}</p>}
            </div>
            {examples.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 4, fontStyle: 'italic' }}>Example:</p>
                <p style={{ fontSize: 15 }}>{examples[0]}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {showAnswer && (
        <div className="fade-in">
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-light)', marginBottom: 12 }}>How well did you remember?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { q: 0, label: 'Again', color: '#dc2626', bg: '#fee2e2' },
              { q: 2, label: 'Hard', color: '#d97706', bg: '#fef3c7' },
              { q: 4, label: 'Good', color: '#2563eb', bg: '#dbeafe' },
              { q: 5, label: 'Easy', color: '#16a34a', bg: '#dcfce7' },
            ].map(({ q, label, color, bg }) => (
              <button key={q} onClick={() => rateWord(q)} style={{
                padding: '14px 8px', borderRadius: 10, border: `2px solid ${color}`,
                background: bg, color, fontWeight: 700, cursor: 'pointer', fontSize: 15,
                transition: 'transform 0.1s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

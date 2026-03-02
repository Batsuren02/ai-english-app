'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { interleaveWords, parseInterleaveConfig } from '@/lib/interleaving'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, BookOpen, Flame } from 'lucide-react'

type WordWithReview = Word & { review: Review; isNew?: boolean }
type SessionResult = { word: Word; quality: number; correct: boolean }

export default function LearnPage() {
  const [dueWords, setDueWords] = useState<WordWithReview[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const startTimeRef = useRef(Date.now())

  useEffect(() => { loadDueWords() }, [])

  async function loadDueWords() {
    const today = new Date().toISOString().split('T')[0]

    // Get due words (SRS scheduled)
    const { data: due } = await supabase
      .from('reviews')
      .select('*, words(*)')
      .lte('next_review', today)
      .limit(15)

    // Get new words (no review yet = never reviewed)
    const { data: allWords } = await supabase.from('words').select('id').limit(200)
    const { data: reviewedIds } = await supabase.from('reviews').select('word_id').gt('total_reviews', 0)
    const reviewedSet = new Set((reviewedIds || []).map((r: any) => r.word_id))
    const newWordIds = (allWords || []).filter((w: any) => !reviewedSet.has(w.id)).map((w: any) => w.id).slice(0, 5)

    let newWordsFull: WordWithReview[] = []
    if (newWordIds.length > 0) {
      const { data: newWords } = await supabase.from('words').select('*').in('id', newWordIds)
      if (newWords) {
        newWordsFull = newWords.map((w: any) => ({
          ...w,
          isNew: true,
          review: { id: '', word_id: w.id, ease_factor: 2.5, interval_days: 1, repetitions: 0, next_review: today, last_reviewed: null, total_reviews: 0, correct_count: 0, streak: 0 }
        }))
      }
    }

    const dueItems: WordWithReview[] = (due || []).map((r: any) => ({ ...r.words, review: r }))
    setDueCount(dueItems.length)
    setNewCount(newWordsFull.length)

    // Load user profile for interleaving config
    const { data: profile } = await supabase.from('user_profile').select('*').single()
    const interleaveConfig = parseInterleaveConfig(profile)

    // Interleave using new algorithm
    const interleaved: WordWithReview[] = interleaveWords(dueItems, newWordsFull, interleaveConfig)

    setDueWords(interleaved)
    setLoading(false)
    startTimeRef.current = Date.now()
  }

  const current = dueWords[currentIdx]

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'; u.rate = 0.85
      window.speechSynthesis.speak(u)
    }
  }

  async function rateWord(quality: number) {
    if (!current) return
    const sm2 = calculateSM2(quality, current.review.ease_factor, current.review.interval_days, current.review.repetitions)
    const timeMs = Date.now() - startTimeRef.current

    if (current.isNew) {
      // First time: insert review row
      await supabase.from('reviews').upsert({
        word_id: current.id,
        ease_factor: sm2.ease_factor,
        interval_days: sm2.interval_days,
        repetitions: sm2.repetitions,
        next_review: sm2.next_review.toISOString().split('T')[0],
        last_reviewed: new Date().toISOString(),
        total_reviews: 1,
        correct_count: quality >= 3 ? 1 : 0,
        streak: quality >= 3 ? 1 : 0,
      }, { onConflict: 'word_id' })
    } else {
      await supabase.from('reviews').update({
        ease_factor: sm2.ease_factor,
        interval_days: sm2.interval_days,
        repetitions: sm2.repetitions,
        next_review: sm2.next_review.toISOString().split('T')[0],
        last_reviewed: new Date().toISOString(),
        total_reviews: (current.review.total_reviews || 0) + 1,
        correct_count: quality >= 3 ? (current.review.correct_count || 0) + 1 : current.review.correct_count,
        streak: quality >= 3 ? (current.review.streak || 0) + 1 : 0,
      }).eq('word_id', current.id)
    }

    await supabase.from('review_logs').insert({
      word_id: current.id, quiz_type: 'mcq', result: quality,
      response_time_ms: timeMs, user_answer: quality >= 3 ? current.word : '',
      source: 'quiz'
    })

    // XP
    if (quality >= 3) {
      const { data: prof } = await supabase.from('user_profile').select('id, total_xp').single()
      if (prof) await supabase.from('user_profile').update({ total_xp: (prof.total_xp || 0) + (quality >= 4 ? 10 : 5) }).eq('id', prof.id)
    }

    setResults(prev => [...prev, { word: current, quality, correct: quality >= 3 }])

    if (currentIdx + 1 >= dueWords.length) {
      setSessionDone(true)
    } else {
      setCurrentIdx(p => p + 1)
      setShowAnswer(false)
      startTimeRef.current = Date.now()
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-light)' }}>Loading review session...</div>

  if (dueWords.length === 0) return (
    <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
      <CheckCircle size={52} style={{ color: '#16a34a', margin: '0 auto 16px' }} />
      <h2 style={{ marginBottom: 8 }}>All caught up! 🎉</h2>
      <p style={{ color: 'var(--ink-light)' }}>No words due for review. Come back tomorrow!</p>
    </div>
  )

  if (sessionDone) {
    const correct = results.filter(r => r.correct).length
    const accuracy = Math.round(correct / results.length * 100)
    const xpEarned = results.filter(r => r.correct).reduce((a, r) => a + (r.quality >= 4 ? 10 : 5), 0)
    return (
      <div className="fade-in" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <Award size={56} style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 28, marginBottom: 4 }}>Session Complete!</h2>
        <p style={{ color: 'var(--ink-light)', marginBottom: 28 }}>Great work on your review.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Words', value: results.length },
            { label: 'Correct', value: correct },
            { label: 'Accuracy', value: `${accuracy}%` },
            { label: 'XP', value: `+${xpEarned}` },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          {results.map(({ word, correct }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              {correct ? <CheckCircle size={15} color="#16a34a" /> : <XCircle size={15} color="#dc2626" />}
              <span style={{ fontWeight: 600, fontSize: 15 }}>{word.word}</span>
              <span style={{ color: 'var(--ink-light)', fontSize: 13 }}>{word.definition?.slice(0, 48)}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={() => { setDueWords([]); setResults([]); setCurrentIdx(0); setSessionDone(false); setLoading(true); loadDueWords() }} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
          <RotateCcw size={14} /> New Session
        </button>
      </div>
    )
  }

  const examples = current.examples as string[] || []
  const totalLeft = dueWords.length - currentIdx

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 13, color: 'var(--ink-light)', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={13} /> {dueCount} due</span>
        {newCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2563eb' }}>✨ {newCount} new</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}><Flame size={13} color="#d97706" /> {results.filter(r => r.correct).length} streak</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-light)', marginBottom: 5 }}>
          <span>{currentIdx + 1} / {dueWords.length}</span>
          <span>{Math.round((currentIdx / dueWords.length) * 100)}%</span>
        </div>
        <div style={{ background: 'var(--border)', borderRadius: 4, height: 7 }}>
          <div style={{ background: 'var(--accent)', borderRadius: 4, height: 7, width: `${(currentIdx / dueWords.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Word card */}
      <div className="card" style={{ padding: '36px 32px', marginBottom: 16, textAlign: 'center', position: 'relative' }}>
        {current.isNew && (
          <span style={{ position: 'absolute', top: 14, right: 16, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>NEW WORD</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 4 }}>
          <h2 style={{ fontSize: 44, fontFamily: 'var(--font-display)' }}>{current.word}</h2>
          <button onClick={() => speak(current.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
            <Volume2 size={24} />
          </button>
        </div>
        {current.ipa && <p style={{ color: 'var(--ink-light)', marginBottom: 20, fontSize: 16 }}>{current.ipa}</p>}

        {!showAnswer ? (
          <button className="btn-primary" onClick={() => { setShowAnswer(true); speak(current.word) }} style={{ fontSize: 16, padding: '13px 36px' }}>
            Show Answer
          </button>
        ) : (
          <div className="fade-in">
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '18px 20px', marginBottom: 14, textAlign: 'left' }}>
              {current.part_of_speech && <span className="badge" style={{ marginBottom: 8, display: 'inline-block' }}>{current.part_of_speech}</span>}
              {current.cefr_level && <span className="badge" style={{ marginBottom: 8, marginLeft: 6, display: 'inline-block', background: '#e0e7ff', color: '#4338ca' }}>{current.cefr_level}</span>}
              <p style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>{current.definition}</p>
              {current.mongolian && <p style={{ color: 'var(--ink-light)', marginTop: 6, fontSize: 15, fontStyle: 'italic' }}>{current.mongolian}</p>}
            </div>
            {examples.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: 6, padding: '0 4px' }}>
                <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 3 }}>Example:</p>
                <p style={{ fontStyle: 'italic', fontSize: 15 }}>"{examples[0]}"</p>
              </div>
            )}
            {current.etymology_hint && (
              <div style={{ textAlign: 'left', padding: '10px 14px', background: '#fef3c7', borderRadius: 8, marginTop: 10, fontSize: 13 }}>
                💡 {current.etymology_hint}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating */}
      {showAnswer && (
        <div className="fade-in">
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-light)', marginBottom: 10 }}>How well did you remember?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { q: 0, label: 'Again', sub: '< 1d', color: '#dc2626', bg: '#fee2e2' },
              { q: 2, label: 'Hard', sub: '~1d', color: '#d97706', bg: '#fef3c7' },
              { q: 4, label: 'Good', sub: `~${current.review.interval_days}d`, color: '#2563eb', bg: '#dbeafe' },
              { q: 5, label: 'Easy', sub: `~${Math.max(1, current.review.interval_days * 2)}d`, color: '#16a34a', bg: '#dcfce7' },
            ].map(({ q, label, sub, color, bg }) => (
              <button key={q} onClick={() => rateWord(q)} style={{
                padding: '14px 6px', borderRadius: 10, border: `2px solid ${color}`,
                background: bg, color, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'transform 0.1s',
              }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={e => (e.currentTarget.style.transform = '')}>
                <span>{label}</span>
                <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

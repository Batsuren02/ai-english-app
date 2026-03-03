'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { interleaveWords, parseInterleaveConfig } from '@/lib/interleaving'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, BookOpen, Flame } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import { TextPrimary, TextSecondary } from '@/components/design/Text'

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

  if (loading) return <div className="py-16 text-center"><TextSecondary>Loading review session...</TextSecondary></div>

  if (dueWords.length === 0) return (
    <div className="fade-in text-center py-16">
      <div className="flex justify-center mb-4">
        <CheckCircle size={52} className="text-green-600" />
      </div>
      <TextPrimary className="text-xl font-bold mb-2">All caught up! 🎉</TextPrimary>
      <TextSecondary className="text-sm">No words due for review. Come back tomorrow!</TextSecondary>
    </div>
  )

  if (sessionDone) {
    const correct = results.filter(r => r.correct).length
    const accuracy = Math.round(correct / results.length * 100)
    const xpEarned = results.filter(r => r.correct).reduce((a, r) => a + (r.quality >= 4 ? 10 : 5), 0)
    return (
      <div className="fade-in max-w-md mx-auto text-center">
        <div className="flex justify-center mb-3">
          <Award size={56} className="text-[var(--accent)]" />
        </div>
        <TextPrimary className="text-3xl font-bold mb-1">Session Complete!</TextPrimary>
        <TextSecondary className="text-sm mb-7">Great work on your review.</TextSecondary>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Words', value: results.length },
            { label: 'Correct', value: correct },
            { label: 'Accuracy', value: `${accuracy}%` },
            { label: 'XP', value: `+${xpEarned}` },
          ].map(({ label, value }) => (
            <SurfaceCard key={label} padding="sm" className="text-center">
              <TextPrimary className="text-xl font-bold text-[var(--accent)]">{value}</TextPrimary>
              <TextSecondary className="text-[10px]">{label}</TextSecondary>
            </SurfaceCard>
          ))}
        </div>
        <div className="text-left mb-6">
          {results.map(({ word, correct }, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[var(--border)]">
              {correct ? <CheckCircle size={15} className="text-green-600 flex-shrink-0" /> : <XCircle size={15} className="text-red-600 flex-shrink-0" />}
              <TextPrimary className="font-semibold text-sm">{word.word}</TextPrimary>
              <TextSecondary className="text-xs line-clamp-1">{word.definition?.slice(0, 48)}</TextSecondary>
            </div>
          ))}
        </div>
        <button className="btn-primary mx-auto flex items-center gap-1.5" onClick={() => { setDueWords([]); setResults([]); setCurrentIdx(0); setSessionDone(false); setLoading(true); loadDueWords() }}>
          <RotateCcw size={14} /> New Session
        </button>
      </div>
    )
  }

  const examples = current.examples as string[] || []
  const totalLeft = dueWords.length - currentIdx

  return (
    <div className="fade-in max-w-xl mx-auto">
      {/* Header stats */}
      <div className="flex gap-4 mb-5 text-xs items-center">
        <span className="flex items-center gap-1"><BookOpen size={13} className="text-[var(--text-secondary)]" /> <TextSecondary>{dueCount} due</TextSecondary></span>
        {newCount > 0 && <span className="flex items-center gap-1 text-blue-500">✨ <TextSecondary className="text-blue-500">{newCount} new</TextSecondary></span>}
        <span className="ml-auto flex items-center gap-1"><Flame size={13} className="text-amber-600" /> <TextSecondary>{results.filter(r => r.correct).length} streak</TextSecondary></span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1">
          <TextSecondary>{currentIdx + 1} / {dueWords.length}</TextSecondary>
          <TextSecondary>{Math.round((currentIdx / dueWords.length) * 100)}%</TextSecondary>
        </div>
        <div className="w-full h-1.5 bg-[var(--border)] rounded overflow-hidden">
          <div className="h-full bg-[var(--accent)] rounded transition-all duration-300" style={{ width: `${(currentIdx / dueWords.length) * 100}%` }} />
        </div>
      </div>

      {/* Word card */}
      <SurfaceCard padding="lg" className="text-center relative mb-4">
        {current.isNew && (
          <span className="absolute top-3.5 right-4 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">NEW WORD</span>
        )}
        <div className="flex items-center justify-center gap-3 mb-1">
          <TextPrimary className="text-5xl font-display font-bold">{current.word}</TextPrimary>
          <button onClick={() => speak(current.word)} className="bg-none border-none cursor-pointer text-[var(--accent)] hover:opacity-70">
            <Volume2 size={24} />
          </button>
        </div>
        {current.ipa && <TextSecondary className="text-base mb-5">{current.ipa}</TextSecondary>}

        {!showAnswer ? (
          <button className="btn-primary text-base py-3 px-9" onClick={() => { setShowAnswer(true); speak(current.word) }}>
            Show Answer
          </button>
        ) : (
          <div className="fade-in">
            <SurfaceCard padding="md" className="text-left mb-3 bg-[var(--bg)]">
              <div className="flex gap-1.5 mb-2">
                {current.part_of_speech && <span className="badge text-xs">{current.part_of_speech}</span>}
                {current.cefr_level && <span className="badge text-xs bg-indigo-100 text-indigo-700">{current.cefr_level}</span>}
              </div>
              <TextPrimary className="text-base font-semibold mt-1.5">{current.definition}</TextPrimary>
              {current.mongolian && <TextSecondary className="mt-1.5 text-sm italic">{current.mongolian}</TextSecondary>}
            </SurfaceCard>
            {examples.length > 0 && (
              <div className="text-left mb-2">
                <TextSecondary className="text-xs mb-1">Example:</TextSecondary>
                <TextPrimary className="text-sm italic">"{examples[0]}"</TextPrimary>
              </div>
            )}
            {current.etymology_hint && (
              <div className="text-left p-3 bg-amber-50 rounded-lg mt-2.5 text-xs text-[var(--text)]">
                💡 {current.etymology_hint}
              </div>
            )}
          </div>
        )}
      </SurfaceCard>

      {/* Rating */}
      {showAnswer && (
        <div className="fade-in">
          <TextSecondary className="text-center text-xs mb-2.5 block">How well did you remember?</TextSecondary>
          <div className="grid grid-cols-4 gap-2">
            {[
              { q: 0, label: 'Again', sub: '< 1d', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
              { q: 2, label: 'Hard', sub: '~1d', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
              { q: 4, label: 'Good', sub: `~${current.review.interval_days}d`, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
              { q: 5, label: 'Easy', sub: `~${Math.max(1, current.review.interval_days * 2)}d`, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
            ].map(({ q, label, sub, color, bg }) => (
              <button
                key={q}
                onClick={() => rateWord(q)}
                className="py-2.5 px-1.5 rounded-lg border-2 font-bold cursor-pointer text-xs flex flex-col items-center gap-0.5 hover:shadow-md transition-all active:scale-95"
                style={{
                  borderColor: color,
                  background: bg,
                  color,
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={e => (e.currentTarget.style.transform = '')}
              >
                <span>{label}</span>
                <span className="text-[9px] opacity-75 font-normal">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

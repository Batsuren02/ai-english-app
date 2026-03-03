'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { interleaveWords, parseInterleaveConfig } from '@/lib/interleaving'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, BookOpen, Flame, Zap } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
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

    setResults(prev => [...prev, { word: current, quality, correct: quality >= 3 }])

    if (currentIdx + 1 >= dueWords.length) {
      setSessionDone(true)
    } else {
      setCurrentIdx(p => p + 1)
      setShowAnswer(false)
      startTimeRef.current = Date.now()
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <TextSecondary className="italic">Loading your review session...</TextSecondary>
    </div>
  )

  if (dueWords.length === 0) return (
    <EmptyState
      icon={<CheckCircle size={56} className="text-green-600" />}
      title="All caught up! 🎉"
      description="No words due for review today. You're doing great! Come back tomorrow."
      animated={false}
    />
  )

  if (sessionDone) {
    const correct = results.filter(r => r.correct).length
    const accuracy = Math.round(correct / results.length * 100)
    return (
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Award size={64} className="text-[var(--accent)]" />
          </div>
          <h1 className="h2 text-[var(--text)] mb-2">Session Complete! 🎉</h1>
          <p className="body text-[var(--text-secondary)]">Great work on your review session.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Reviewed"
            value={results.length}
            color="var(--accent)"
          />
          <StatCard
            label="Correct"
            value={correct}
            color="var(--success)"
            trend={{ direction: 'up', percent: correct }}
          />
          <StatCard
            label="Accuracy"
            value={`${accuracy}%`}
            color="var(--accent)"
          />
        </div>

        <SurfaceCard padding="lg">
          <h3 className="h4 text-[var(--text)] mb-4">Review History</h3>
          <div className="space-y-2">
            {results.map(({ word, correct }, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex-shrink-0">
                  {correct ? (
                    <CheckCircle size={18} className="text-[var(--success)]" />
                  ) : (
                    <XCircle size={18} className="text-[var(--error)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text)] text-sm">{word.word}</p>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{word.definition?.slice(0, 60)}</p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="text-center">
          <InteractiveButton
            variant="primary"
            size="lg"
            onClick={() => {
              setDueWords([])
              setResults([])
              setCurrentIdx(0)
              setSessionDone(false)
              setLoading(true)
              loadDueWords()
            }}
          >
            <RotateCcw size={16} className="inline mr-2" />
            Start New Session
          </InteractiveButton>
        </div>
      </div>
    )
  }

  const examples = current.examples as string[] || []
  const totalLeft = dueWords.length - currentIdx

  const progressPercent = (currentIdx / dueWords.length) * 100
  const ratingOptions = [
    { q: 0, label: 'Again', sub: '< 1d', color: 'error', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
    { q: 2, label: 'Hard', sub: '~1d', color: 'warning', bg: 'rgba(217, 119, 6, 0.1)', border: '#d97706' },
    { q: 4, label: 'Good', sub: `~${current.review.interval_days}d`, color: 'info', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
    { q: 5, label: 'Easy', sub: `~${Math.max(1, current.review.interval_days * 2)}d`, color: 'success', bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e' },
  ]

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      {/* Session Stats Header */}
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <BookOpen size={16} className="text-[var(--text-secondary)]" />
            <span className="body text-[var(--text-secondary)]">{dueCount} due</span>
          </div>
          {newCount > 0 && (
            <div className="flex items-center gap-1.5 text-blue-500">
              <span>✨</span>
              <span className="body">{newCount} new</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Flame size={16} className="text-amber-600" />
          <span className="body font-semibold text-amber-600">{results.filter(r => r.correct).length} correct</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="label text-[var(--text-secondary)]">{currentIdx + 1} of {dueWords.length}</span>
          <span className="label font-semibold text-[var(--accent)]">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/60 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Word Card */}
      <SurfaceCard padding="lg" hover elevation="md" className="text-center relative">
        {current.isNew && (
          <span className="absolute top-4 right-4 badge bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1">NEW</span>
        )}

        <div className="flex items-center justify-center gap-4 mb-3">
          <h1 className="text-6xl font-display font-bold text-[var(--text)]">{current.word}</h1>
          <button
            onClick={() => speak(current.word)}
            className="p-2 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-all"
            title="Pronounce"
          >
            <Volume2 size={24} />
          </button>
        </div>

        {current.ipa && <p className="body text-[var(--text-secondary)] mb-6">{current.ipa}</p>}

        {!showAnswer ? (
          <InteractiveButton
            variant="primary"
            size="lg"
            onClick={() => {
              setShowAnswer(true)
              speak(current.word)
            }}
          >
            Show Answer
          </InteractiveButton>
        ) : (
          <div className="fade-in space-y-4">
            {/* Definition Card */}
            <SurfaceCard padding="md" className="text-left bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
              <div className="flex flex-wrap gap-2 mb-3">
                {current.part_of_speech && (
                  <span className="label bg-[var(--accent)]/15 text-[var(--accent)] px-2.5 py-1 rounded">{current.part_of_speech}</span>
                )}
                {current.cefr_level && (
                  <span className="label bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded">{current.cefr_level}</span>
                )}
              </div>
              <p className="font-semibold text-[var(--text)] mb-2">{current.definition}</p>
              {current.mongolian && (
                <p className="text-sm text-[var(--text-secondary)] italic">{current.mongolian}</p>
              )}
            </SurfaceCard>

            {/* Example */}
            {examples.length > 0 && (
              <div className="text-left">
                <p className="label text-[var(--text-secondary)] mb-2">Example:</p>
                <p className="body text-[var(--text)] italic">"{examples[0]}"</p>
              </div>
            )}

            {/* Etymology */}
            {current.etymology_hint && (
              <div className="text-left p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <p className="text-sm text-amber-900 dark:text-amber-100">💡 {current.etymology_hint}</p>
              </div>
            )}
          </div>
        )}
      </SurfaceCard>

      {/* Rating Buttons */}
      {showAnswer && (
        <div className="fade-in space-y-3">
          <p className="label text-center text-[var(--text-secondary)]">How well did you remember?</p>
          <div className="grid grid-cols-4 gap-2">
            {ratingOptions.map(({ q, label, sub, bg, border }) => (
              <button
                key={q}
                onClick={() => rateWord(q)}
                className="py-3 px-2 rounded-lg border-2 font-semibold cursor-pointer text-xs flex flex-col items-center gap-1 transition-all duration-150 hover:shadow-md active:scale-95"
                style={{
                  borderColor: border,
                  backgroundColor: bg,
                  color: border,
                }}
              >
                <span className="font-bold">{label}</span>
                <span className="text-[10px] opacity-70 font-normal">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

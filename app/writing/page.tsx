'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { usePageCache } from '@/lib/hooks/usePageCache'
import { CheckCircle, XCircle, RotateCcw, ChevronRight, PenLine, Volume2, Loader2 } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { TextSecondary } from '@/components/design/Text'
import { speakWord } from '@/lib/speech-utils'
import { useToastContext } from '@/components/ToastProvider'

interface WritingWord {
  word: Word
  ease_factor: number
  repetitions: number
}

interface WritingData {
  words: WritingWord[]
}

interface FeedbackResult {
  correct: boolean
  score: number
  improved: string
  explanation: string
}

async function fetchWritingData(): Promise<WritingData> {
  const [wordsRes, reviewsRes] = await Promise.all([
    supabase.from('words').select('id, word, definition, examples, mongolian, part_of_speech, cefr_level'),
    supabase.from('reviews').select('word_id, ease_factor, repetitions'),
  ])

  const reviewMap: Record<string, { ease_factor: number; repetitions: number }> = {}
  ;(reviewsRes.data ?? []).forEach((r: Pick<import('@/lib/types').Review, 'word_id' | 'ease_factor' | 'repetitions'>) => {
    reviewMap[r.word_id] = { ease_factor: r.ease_factor, repetitions: r.repetitions }
  })

  const words: WritingWord[] = ((wordsRes.data ?? []) as unknown as Word[])
    .map((w: Word) => ({
      word: w,
      ease_factor: reviewMap[w.id]?.ease_factor ?? 2.5,
      repetitions: reviewMap[w.id]?.repetitions ?? 0,
    }))
    // Prioritize words with low ease factor (harder words) and some repetitions (partially learned)
    .sort((a: WritingWord, b: WritingWord) => {
      const scoreA = a.ease_factor + (a.repetitions === 0 ? 2 : 0)
      const scoreB = b.ease_factor + (b.repetitions === 0 ? 2 : 0)
      return scoreA - scoreB
    })

  return { words }
}

export default function WritingPage() {
  const toast = useToastContext()
  const { data, loading } = usePageCache<WritingData>('writing-data', fetchWritingData, 60_000)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sentence, setSentence] = useState('')
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [sessionResults, setSessionResults] = useState<{ word: string; score: number; correct: boolean }[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef(Date.now())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const SESSION_LENGTH = 5
  const words = data?.words ?? []
  const current = words[currentIdx]

  // Focus textarea when new word loads
  useEffect(() => {
    if (!feedback && textareaRef.current && !loading) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [currentIdx, feedback, loading])

  const checkSentence = useCallback(async () => {
    if (!current || !sentence.trim() || checking) return
    setChecking(true)
    setError(null)
    const timeMs = Date.now() - startTimeRef.current

    try {
      const res = await fetch('/api/writing-check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          word: current.word.word,
          partOfSpeech: current.word.part_of_speech,
          definition: current.word.definition,
          userSentence: sentence.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to check sentence')
      }

      const result: FeedbackResult = await res.json()
      setFeedback(result)
      setSessionResults(prev => [...prev, { word: current.word.word, score: result.score, correct: result.correct }])

      // Log to review_logs
      await supabase.from('review_logs').insert({
        word_id: current.word.id,
        quiz_type: 'writing',
        result: result.score >= 3 ? 4 : 0,
        response_time_ms: timeMs,
        user_answer: sentence.trim(),
        source: 'writing',
      })

      if (result.correct) toast.success('+20 XP — Great sentence!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check sentence')
    } finally {
      setChecking(false)
    }
  }, [current, sentence, checking, toast])

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (feedback) nextWord()
        else if (sentence.trim()) checkSentence()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [feedback, sentence, checkSentence])

  function nextWord() {
    if (sessionResults.length >= SESSION_LENGTH) {
      setSessionDone(true)
      return
    }
    setCurrentIdx(prev => prev + 1)
    setSentence('')
    setFeedback(null)
    setError(null)
    startTimeRef.current = Date.now()
  }

  function restartSession() {
    setCurrentIdx(0)
    setSentence('')
    setFeedback(null)
    setSessionResults([])
    setSessionDone(false)
    setError(null)
    startTimeRef.current = Date.now()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <TextSecondary className="italic">Loading writing practice...</TextSecondary>
    </div>
  )

  if (words.length === 0) return (
    <EmptyState
      icon={<PenLine size={48} className="text-[var(--accent)]" />}
      title="No words yet"
      description="Add vocabulary words first, then come back to practice writing sentences."
      action={<a href="/words"><InteractiveButton variant="primary" size="md">Add Words</InteractiveButton></a>}
    />
  )

  if (sessionDone) {
    const avgScore = sessionResults.length > 0
      ? Math.round(sessionResults.reduce((a, r) => a + r.score, 0) / sessionResults.length * 20)
      : 0
    const correct = sessionResults.filter(r => r.correct).length
    return (
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        <div className="text-center scale-in">
          <div className="text-5xl mb-4">✍️</div>
          <h1 className="h2 text-[var(--text)] mb-2">Writing Session Complete!</h1>
          <p className="body text-[var(--text-secondary)]">Great job practicing sentence construction.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Sentences" value={sessionResults.length} color="var(--accent)" />
          <StatCard label="Correct Use" value={correct} color="var(--success)" />
          <StatCard label="Avg Score" value={`${avgScore}%`} color="var(--accent)" />
        </div>
        <SurfaceCard padding="lg">
          <h3 className="h4 text-[var(--text)] mb-4">Session Summary</h3>
          <div className="space-y-2">
            {sessionResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                {r.correct
                  ? <CheckCircle size={16} className="text-[var(--success)] flex-shrink-0" />
                  : <XCircle size={16} className="text-[var(--error)] flex-shrink-0" />}
                <span className="text-sm font-semibold text-[var(--text)]">{r.word}</span>
                <span className="ml-auto text-xs text-[var(--text-secondary)]">Score: {r.score}/5</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
        <div className="text-center">
          <InteractiveButton variant="primary" size="lg" onClick={restartSession}>
            <RotateCcw size={16} className="inline mr-2" />
            New Session
          </InteractiveButton>
        </div>
      </div>
    )
  }

  if (!current) return null

  const scoreColor = !feedback ? 'var(--accent)'
    : feedback.score >= 4 ? 'var(--success)'
    : feedback.score >= 3 ? 'var(--warning)'
    : 'var(--error)'

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h3 text-[var(--text)]">Writing Practice</h1>
          <p className="body text-[var(--text-secondary)] text-sm mt-1">
            Use the word in a sentence — AI will check your usage
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-secondary)]">{sessionResults.length}/{SESSION_LENGTH}</p>
          <div className="w-20 h-1.5 bg-[var(--border)] rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${(sessionResults.length / SESSION_LENGTH) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Word Card */}
      <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-[28px] font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {current.word.word}
              </h2>
              <button
                onClick={() => speakWord(current.word.word)}
                className="p-2 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
              >
                <Volume2 size={18} />
              </button>
            </div>
            {current.word.ipa && (
              <p className="text-sm text-[var(--text-secondary)] mb-2" style={{ fontFamily: 'var(--font-monospace)' }}>{current.word.ipa}</p>
            )}
            {current.word.part_of_speech && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                {current.word.part_of_speech}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Definition</p>
            <p className="text-sm text-[var(--text)]">{current.word.definition}</p>
          </div>
          {current.word.mongolian && (
            <p className="text-xs text-[var(--text-secondary)] italic">{current.word.mongolian}</p>
          )}
          {(current.word.examples as string[] || [])[0] && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Example</p>
              <p className="text-xs text-[var(--text-secondary)] italic">&ldquo;{(current.word.examples as string[])[0]}&rdquo;</p>
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* Writing Area */}
      <div className="space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          Write a sentence using &ldquo;{current.word.word}&rdquo;
        </label>
        <textarea
          ref={textareaRef}
          value={sentence}
          onChange={e => setSentence(e.target.value)}
          disabled={!!feedback || checking}
          placeholder={`Write a meaningful sentence that uses "${current.word.word}"...`}
          rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
          style={{ lineHeight: '1.6' }}
        />
        {error && <p className="text-sm text-[var(--error)]">{error}</p>}
        {!feedback && (
          <div className="flex items-center gap-3">
            <InteractiveButton
              variant="primary"
              size="md"
              onClick={checkSentence}
              disabled={!sentence.trim() || checking}
              className="flex-1"
            >
              {checking ? (
                <><Loader2 size={16} className="inline mr-2 animate-spin" />Checking...</>
              ) : (
                <>Check Sentence</>
              )}
            </InteractiveButton>
            <p className="text-[10px] text-[var(--text-secondary)] hidden md:block">Ctrl+Enter to submit</p>
          </div>
        )}
      </div>

      {/* Feedback Panel */}
      {feedback && (
        <div className={`fade-in card border-2 space-y-4 ${feedback.correct ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'}`}>
          {/* Score header */}
          <div className="flex items-center gap-3">
            {feedback.correct
              ? <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
              : <XCircle size={24} className="text-amber-600 flex-shrink-0" />}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[16px]" style={{ color: scoreColor }}>
                  {feedback.correct ? 'Correct usage! 🎉' : 'Needs improvement'}
                </span>
                {/* Score dots */}
                <div className="flex gap-0.5 ml-1">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{ background: i <= feedback.score ? scoreColor : 'var(--border)' }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{feedback.explanation}</p>
            </div>
          </div>

          {/* Improved version */}
          {feedback.improved && feedback.improved !== sentence && (
            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5">Suggested improvement</p>
              <p className="text-sm text-[var(--text)] italic">&ldquo;{feedback.improved}&rdquo;</p>
            </div>
          )}

          <InteractiveButton
            variant="primary"
            size="md"
            onClick={nextWord}
            className="w-full"
          >
            {sessionResults.length >= SESSION_LENGTH - 1
              ? 'Finish Session'
              : <>Next Word <ChevronRight size={16} className="inline ml-1" /></>}
          </InteractiveButton>
        </div>
      )}
    </div>
  )
}

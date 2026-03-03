'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { interleaveWords, parseInterleaveConfig } from '@/lib/interleaving'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, BookOpen, Flame } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { TextPrimary, TextSecondary } from '@/components/design/Text'

type WordWithReview = Word & { review: Review; isNew?: boolean }
type SessionResult = { word: Word; quality: number; correct: boolean }
type SwipeState = 'idle' | 'left' | 'right'

export default function LearnPage() {
  const [dueWords, setDueWords] = useState<WordWithReview[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [swipeState, setSwipeState] = useState<SwipeState>('idle')

  const startTimeRef = useRef(Date.now())
  const touchStartX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

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

  async function autoRateWord(direction: 'left' | 'right') {
    if (!current) return

    // Quality based on swipe direction: left (✗) = 1 (fail), right (✓) = 4 (good)
    const quality = direction === 'right' ? 4 : 1
    const sm2 = calculateSM2(quality, current.review.ease_factor, current.review.interval_days, current.review.repetitions)
    const timeMs = Date.now() - startTimeRef.current

    if (current.isNew) {
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
      word_id: current.id, quiz_type: 'swipe', result: quality,
      response_time_ms: timeMs, user_answer: direction,
      source: 'learn'
    })

    setResults(prev => [...prev, { word: current, quality, correct: quality >= 3 }])
    setSwipeState('idle')

    if (currentIdx + 1 >= dueWords.length) {
      setSessionDone(true)
    } else {
      setCurrentIdx(p => p + 1)
      setShowDetails(false)
      startTimeRef.current = Date.now()
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (showDetails) return
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (showDetails || !touchStartX.current) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartX.current

    if (Math.abs(diff) > 30) {
      if (diff < 0) {
        setSwipeState('left')
      } else {
        setSwipeState('right')
      }
    } else {
      setSwipeState('idle')
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (showDetails || !touchStartX.current) return

    const currentX = e.changedTouches[0].clientX
    const diff = currentX - touchStartX.current

    if (diff < -50) {
      autoRateWord('left')
    } else if (diff > 50) {
      autoRateWord('right')
    }

    setSwipeState('idle')
    touchStartX.current = 0
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
  const progressPercent = (currentIdx / dueWords.length) * 100

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      {/* Session Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h3 text-[var(--text)]">Learning Session</h1>
          <p className="body text-[var(--text-secondary)] text-sm mt-1">{dueCount} due • {newCount > 0 ? `${newCount} new` : 'No new words'}</p>
        </div>
        <div className="flex items-center gap-2 text-center">
          <Flame size={20} className="text-amber-600" />
          <div>
            <p className="h4 text-amber-600">{results.filter(r => r.correct).length}</p>
            <p className="label text-[var(--text-secondary)]">Correct</p>
          </div>
        </div>
      </div>

      {/* Progress Bar - Detailed */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="label text-[var(--text-secondary)]">Progress</span>
          <span className="h4 text-[var(--accent)]">{currentIdx + 1}/{dueWords.length}</span>
        </div>
        <div className="w-full h-3 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/50 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Swipeable Word Card - 3D Flip */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-[500px] cursor-grab active:cursor-grabbing transition-all duration-300 rounded-2xl select-none ${
          swipeState === 'left' ? '-translate-x-full opacity-0' : swipeState === 'right' ? 'translate-x-full opacity-0' : ''
        }`}
        style={{ perspective: '1000px', touchAction: 'none' }}
      >
        {/* Card Flip Container */}
        <div
          className="relative w-full h-full transition-transform duration-500 select-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: showDetails ? 'rotateY(180deg)' : 'rotateY(0deg)',
            touchAction: 'none',
          }}
          onClick={() => setShowDetails(!showDetails)}
        >
          {/* Front of Card - Word Display */}
          <div
            className="absolute w-full h-full select-none"
            style={{ backfaceVisibility: 'hidden', touchAction: 'none' }}
          >
            <SurfaceCard padding="lg" className="text-center relative h-full flex flex-col justify-between bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
          {/* Top Right Badge */}
          {current.isNew && (
            <div className="absolute top-4 right-4">
              <span className="inline-block bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">NEW</span>
            </div>
          )}

          {/* Word Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-7xl font-display font-bold text-[var(--text)]">{current.word}</h1>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  speak(current.word)
                }}
                className="flex-shrink-0 p-3 rounded-xl bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-all duration-150 hover:shadow-md"
                title="Pronounce word"
              >
                <Volume2 size={28} />
              </button>
            </div>

            {current.ipa && (
              <p className="text-lg text-[var(--text-secondary)] font-light">{current.ipa}</p>
            )}
          </div>

          {/* Swipe Instructions and Visual Indicators */}
          <div className="space-y-4 mt-auto pt-6 border-t border-[var(--border)]">
            {/* Visual Swipe Indicators */}
            <div className="flex justify-between items-center px-4">
              <div className={`flex items-center gap-2 transition-all duration-150 ${swipeState === 'left' ? 'opacity-100 text-red-500' : 'opacity-50 text-[var(--text-secondary)]'}`}>
                <XCircle size={24} />
                <span className="font-semibold text-sm">Not Yet</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-medium">Swipe to rate</div>
              <div className={`flex items-center gap-2 transition-all duration-150 ${swipeState === 'right' ? 'opacity-100 text-green-500' : 'opacity-50 text-[var(--text-secondary)]'}`}>
                <span className="font-semibold text-sm">Got It!</span>
                <CheckCircle size={24} />
              </div>
            </div>

            {/* Hint Text */}
            <p className="label text-[var(--text-secondary)] text-center text-sm cursor-pointer hover:text-[var(--accent)] transition-colors">
              Tap card to flip
            </p>
          </div>
            </SurfaceCard>
          </div>

          {/* Back of Card - Details */}
          <div
            className="absolute w-full h-full select-none"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', touchAction: 'none' }}
          >
            <SurfaceCard padding="lg" className="text-center relative h-full flex flex-col bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
              {/* Back Card Header */}
              <div className="text-center mb-4">
                <h2 className="h4 text-[var(--text)]">{current.word}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Tap to flip back</p>
              </div>

              {/* Details Content */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {current.part_of_speech && (
                    <span className="label bg-[var(--accent)]/15 text-[var(--accent)] px-3 py-1.5 rounded-lg">{current.part_of_speech}</span>
                  )}
                  {current.cefr_level && (
                    <span className="label bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg">{current.cefr_level}</span>
                  )}
                </div>

                {/* Definition */}
                <div className="text-left">
                  <p className="label text-[var(--text-secondary)] mb-1.5 text-xs">Definition</p>
                  <p className="body text-[var(--text)] text-sm">{current.definition}</p>
                  {current.mongolian && (
                    <p className="text-xs text-[var(--text-secondary)] italic mt-2">{current.mongolian}</p>
                  )}
                </div>

                {/* Example */}
                {examples.length > 0 && (
                  <div className="text-left">
                    <p className="label text-[var(--text-secondary)] mb-1.5 text-xs">Example</p>
                    <p className="body text-[var(--text)] text-sm italic">"{examples[0]}"</p>
                  </div>
                )}

                {/* Etymology */}
                {current.etymology_hint && (
                  <div className="text-left p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <p className="text-xs text-amber-700 dark:text-amber-300">💡 {current.etymology_hint}</p>
                  </div>
                )}
              </div>

              {/* Flip Hint */}
              <p className="label text-[var(--text-secondary)] text-center text-xs mt-4 cursor-pointer hover:text-[var(--accent)] transition-colors">
                Tap to flip back & swipe
              </p>
            </SurfaceCard>
          </div>
        </div>
      </div>

      {/* Session Results Summary Card */}
      {results.length > 0 && (
        <SurfaceCard padding="md" className="bg-gradient-to-r from-green-500/10 to-green-400/5 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="label text-[var(--text)]">Session Progress</p>
              <p className="text-sm text-[var(--text-secondary)]">{results.filter(r => r.correct).length} correct out of {results.length}</p>
            </div>
            <div className="text-right">
              <p className="h4 text-green-600">{Math.round((results.filter(r => r.correct).length / results.length) * 100)}%</p>
              <p className="text-xs text-[var(--text-secondary)]">Accuracy</p>
            </div>
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}

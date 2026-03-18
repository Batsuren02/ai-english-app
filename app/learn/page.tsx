'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { speakWord } from '@/lib/speech-utils'
import { interleaveWords, parseInterleaveConfig } from '@/lib/interleaving'
import { formatDistanceToNow, format } from 'date-fns'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, BookOpen, Flame, ThumbsUp, ThumbsDown, Calendar } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { TextPrimary, TextSecondary } from '@/components/design/Text'
import { useToastContext } from '@/components/ToastProvider'

type WordWithReview = Word & { review: Review; isNew?: boolean }
type SessionResult = { word: Word; quality: number; correct: boolean }

const SWIPE_THRESHOLD = 80  // px to commit a swipe
const DISMISS_DISTANCE = 600 // px to fly off-screen

export default function LearnPage() {
  const toast = useToastContext()
  const [dueWords, setDueWords] = useState<WordWithReview[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [nextReviewDate, setNextReviewDate] = useState<string | null>(null)

  // Real-time drag state
  const [dragX, setDragX] = useState(0)
  const isDraggingRef = useRef(false)

  // Undo state
  const [undoVisible, setUndoVisible] = useState(false)
  const undoDataRef = useRef<{ word: WordWithReview; prevIdx: number; prevReview: Review } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mongolian hint preference
  const [showMongolianHint, setShowMongolianHint] = useState(false)

  const startTimeRef = useRef(Date.now())
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isSwiping = useRef(false)

  useEffect(() => {
    loadDueWords()
    try { setShowMongolianHint(localStorage.getItem('showMongolianHint') === 'true') } catch {}
  }, [])

  // Keyboard shortcuts: Space/Enter to flip, 1-4 to rate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!dueWords[currentIdx] || sessionDone) return

      if (!showDetails) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          setShowDetails(true)
        }
      } else {
        if (e.key === '1') { e.preventDefault(); rateWithQuality(0) }
        if (e.key === '2') { e.preventDefault(); rateWithQuality(2) }
        if (e.key === '3') { e.preventDefault(); rateWithQuality(3) }
        if (e.key === '4') { e.preventDefault(); rateWithQuality(5) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dueWords, currentIdx, showDetails, sessionDone])

  async function loadDueWords() {
    const today = new Date().toISOString().split('T')[0]
    try {
    const { data: due } = await supabase
      .from('reviews')
      .select('*, words(*)')
      .lte('next_review', today)
      .limit(15)

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

    const { data: profile } = await supabase.from('user_profile').select('*').single()
    const interleaveConfig = parseInterleaveConfig(profile)
    const interleaved: WordWithReview[] = interleaveWords(dueItems, newWordsFull, interleaveConfig)

    setDueWords(interleaved)

    // If nothing is due, find the next upcoming review date
    if (interleaved.length === 0) {
      const { data: upcoming } = await supabase
        .from('reviews')
        .select('next_review')
        .gt('next_review', new Date().toISOString().split('T')[0])
        .order('next_review', { ascending: true })
        .limit(1)
        .single()
      if (upcoming?.next_review) setNextReviewDate(upcoming.next_review)
    }

    setLoading(false)
    startTimeRef.current = Date.now()
    } catch (err) {
      console.error('Failed to load due words:', err)
      toast.error('Failed to load review session. Please refresh.')
      setLoading(false)
    }
  }

  const current = dueWords[currentIdx]



  async function submitRating(quality: number, direction: string = 'button') {
    if (!current) return

    // Save undo snapshot before mutating
    undoDataRef.current = { word: current, prevIdx: currentIdx, prevReview: current.review }

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

    // Show undo pill for 5 seconds
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoVisible(true)
    undoTimerRef.current = setTimeout(() => setUndoVisible(false), 5000)

    if (currentIdx + 1 >= dueWords.length) {
      setSessionDone(true)
    } else {
      setCurrentIdx(p => p + 1)
      setShowDetails(false)
      startTimeRef.current = Date.now()
    }
  }

  async function handleUndo() {
    const snap = undoDataRef.current
    if (!snap) return
    setUndoVisible(false)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)

    // Restore DB to previous review state
    const r = snap.prevReview
    if (r.id) {
      await supabase.from('reviews').update({
        ease_factor: r.ease_factor,
        interval_days: r.interval_days,
        repetitions: r.repetitions,
        next_review: r.next_review,
        last_reviewed: r.last_reviewed,
        total_reviews: r.total_reviews,
        correct_count: r.correct_count,
        streak: r.streak,
      }).eq('word_id', snap.word.id)
    }

    // Remove last result and go back to that word
    setResults(prev => prev.slice(0, -1))
    setCurrentIdx(snap.prevIdx)
    setSessionDone(false)
    setShowDetails(false)
    setDragX(0)
    startTimeRef.current = Date.now()
    undoDataRef.current = null
  }

  async function autoRateWord(direction: 'left' | 'right') {
    const quality = direction === 'right' ? 4 : 1
    await submitRating(quality, direction)
  }

  async function rateWithQuality(quality: number) {
    // Animate card off screen before rating
    isDraggingRef.current = false
    setDragX(quality >= 3 ? DISMISS_DISTANCE : -DISMISS_DISTANCE)
    await new Promise(r => setTimeout(r, 280))
    setDragX(0)
    await submitRating(quality, `rate_${quality}`)
  }

  // ─── Swipe Handlers ───────────────────────────────────────────────────────

  function handleCardDown(e: React.MouseEvent | React.TouchEvent) {
    if (showDetails) return
    const x = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX
    const y = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY
    swipeStartX.current = x ?? null
    swipeStartY.current = y ?? null
    isSwiping.current = false
    isDraggingRef.current = false
  }

  function handleCardMove(e: React.MouseEvent | React.TouchEvent) {
    if (showDetails || !swipeStartX.current) return

    const x = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX
    const y = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY
    if (!x || !y) return

    const deltaX = x - swipeStartX.current
    const deltaY = y - (swipeStartY.current || 0)

    if (!isSwiping.current) {
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping.current = true
      } else {
        return
      }
    }

    isDraggingRef.current = true
    setDragX(deltaX)
  }

  async function handleCardUp(e: React.MouseEvent | React.TouchEvent) {
    const currentDragX = dragX

    if (isSwiping.current && Math.abs(currentDragX) > SWIPE_THRESHOLD) {
      const direction = currentDragX > 0 ? 'right' : 'left'
      // Fly off screen
      isDraggingRef.current = false
      setDragX(direction === 'right' ? DISMISS_DISTANCE : -DISMISS_DISTANCE)
      await new Promise(r => setTimeout(r, 280))
      // Reset position instantly before next card
      setDragX(0)
      await autoRateWord(direction)
    } else {
      // Snap back
      isDraggingRef.current = false
      setDragX(0)
    }

    swipeStartX.current = null
    isSwiping.current = false
  }

  function handleCardLeave() {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setDragX(0)
      swipeStartX.current = null
      isSwiping.current = false
    }
  }

  // ─── Button Controls ──────────────────────────────────────────────────────

  async function handleButtonRate(direction: 'left' | 'right') {
    isDraggingRef.current = false
    setDragX(direction === 'right' ? DISMISS_DISTANCE : -DISMISS_DISTANCE)
    await new Promise(r => setTimeout(r, 280))
    setDragX(0)
    await autoRateWord(direction)
  }

  // ─── Derived Values ───────────────────────────────────────────────────────

  const rotation = dragX * 0.06
  const cardOpacity = Math.max(0, 1 - Math.abs(dragX) / 400)
  const rightProgress = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1.2)
  const leftProgress = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1.2)
  const overlayOpacity = Math.min(Math.abs(dragX) / 180, 0.4)
  const isSwipingRight = dragX > 0
  const overlayColor = isSwipingRight
    ? `rgba(34, 197, 94, ${overlayOpacity})`
    : `rgba(239, 68, 68, ${overlayOpacity})`

  const cardTransition = isDraggingRef.current
    ? 'none'
    : dragX === 0
      ? 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 450ms ease'
      : 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease'

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <TextSecondary className="italic">Loading your review session...</TextSecondary>
    </div>
  )

  if (dueWords.length === 0) return (
    <EmptyState
      icon={<CheckCircle size={56} className="text-green-600" />}
      title="All caught up! 🎉"
      description={
        nextReviewDate
          ? `Your next review is in ${formatDistanceToNow(new Date(nextReviewDate))} — ${format(new Date(nextReviewDate), 'EEEE, MMM d')}`
          : "No words due for review today. You're doing great! Come back tomorrow."
      }
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
          <StatCard label="Reviewed" value={results.length} color="var(--accent)" />
          <StatCard label="Correct" value={correct} color="var(--success)" trend={{ direction: 'up', percent: correct }} />
          <StatCard label="Accuracy" value={`${accuracy}%`} color="var(--accent)" />
        </div>

        <SurfaceCard padding="lg">
          <h3 className="h4 text-[var(--text)] mb-4">Review History</h3>
          <div className="space-y-2">
            {results.map(({ word, correct }, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex-shrink-0">
                  {correct
                    ? <CheckCircle size={18} className="text-[var(--success)]" />
                    : <XCircle size={18} className="text-[var(--error)]" />}
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

  if (!current) return null
  const examples = Array.isArray(current.examples) ? current.examples : []
  const progressPercent = (currentIdx / dueWords.length) * 100

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      {/* Session Header */}
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

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="label text-[var(--text-secondary)]">Progress</span>
          <span className="h4 text-[var(--accent)]">{currentIdx + 1}/{dueWords.length}</span>
        </div>
        <div className="w-full h-3 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/50 rounded-full"
            style={{ width: `${progressPercent}%`, transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </div>
      </div>

      {/* Swipeable Word Card */}
      <div
        ref={cardRef}
        onTouchStart={handleCardDown}
        onTouchMove={handleCardMove}
        onTouchEnd={handleCardUp}
        onMouseDown={handleCardDown}
        onMouseMove={handleCardMove}
        onMouseUp={handleCardUp}
        onMouseLeave={handleCardLeave}
        className="relative w-full h-[500px] cursor-grab active:cursor-grabbing rounded-2xl select-none"
        style={{
          perspective: '1000px',
          touchAction: 'none',
          userSelect: 'none',
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          opacity: cardOpacity,
          transition: cardTransition,
          transformOrigin: 'center bottom',
        }}
      >
        {/* Card Flip Container */}
        <div
          className="relative w-full h-full select-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: showDetails ? 'rotateY(180deg)' : 'rotateY(0deg)',
            touchAction: 'none',
            transition: 'transform 700ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (!isSwiping.current && Math.abs(dragX) < 5) {
              setShowDetails(!showDetails)
            }
          }}
        >
          {/* ── Front of Card ────────────────────────────────────── */}
          <div
            className="absolute w-full h-full select-none"
            style={{ backfaceVisibility: 'hidden', touchAction: 'none' }}
          >
            <SurfaceCard padding="lg" className="text-center relative h-full flex flex-col justify-between bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] overflow-hidden">

              {/* Progressive color overlay */}
              {dragX !== 0 && (
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                    background: overlayColor,
                    pointerEvents: 'none',
                    transition: 'none',
                    zIndex: 1,
                  }}
                />
              )}

              {/* GOT IT stamp (right swipe) */}
              <div
                style={{
                  position: 'absolute', top: 28, left: 24, zIndex: 10,
                  opacity: rightProgress,
                  transform: `rotate(-18deg) scale(${0.7 + rightProgress * 0.35})`,
                  pointerEvents: 'none',
                  transition: isDraggingRef.current ? 'none' : 'all 150ms ease',
                }}
              >
                <div style={{
                  border: '3px solid var(--success)',
                  color: 'var(--success)',
                  padding: '4px 14px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '22px',
                  fontFamily: 'var(--font-display, serif)',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  textShadow: '0 0 12px color-mix(in srgb, var(--success) 40%, transparent)',
                  boxShadow: '0 0 0 1px color-mix(in srgb, var(--success) 20%, transparent)',
                }}>
                  GOT IT ✓
                </div>
              </div>

              {/* NOT YET stamp (left swipe) */}
              <div
                style={{
                  position: 'absolute', top: 28, right: 24, zIndex: 10,
                  opacity: leftProgress,
                  transform: `rotate(18deg) scale(${0.7 + leftProgress * 0.35})`,
                  pointerEvents: 'none',
                  transition: isDraggingRef.current ? 'none' : 'all 150ms ease',
                }}
              >
                <div style={{
                  border: '3px solid var(--error)',
                  color: 'var(--error)',
                  padding: '4px 14px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '22px',
                  fontFamily: 'var(--font-display, serif)',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  textShadow: '0 0 12px color-mix(in srgb, var(--error) 40%, transparent)',
                  boxShadow: '0 0 0 1px color-mix(in srgb, var(--error) 20%, transparent)',
                }}>
                  ✗ NOPE
                </div>
              </div>

              {/* NEW badge */}
              {current.isNew && (
                <div className="absolute top-4 right-4 z-20">
                  <span className="inline-block bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">NEW</span>
                </div>
              )}

              {/* Word Display */}
              <div className="space-y-3 relative z-0">
                <h1 className="word-hero text-center">{current.word}</h1>
                <div className="flex items-center justify-center gap-3">
                  {current.ipa && (
                    <p className="text-[15px] text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-monospace)' }}>
                      {current.ipa}
                    </p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); speakWord(current.word) }}
                    className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all duration-150"
                    title="Pronounce word"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                {current.part_of_speech && (
                  <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                    {current.part_of_speech}
                  </p>
                )}
                {showMongolianHint && current.mongolian && (
                  <p className="text-center text-sm text-[var(--text-secondary)] italic opacity-70 mt-1">
                    {current.mongolian}
                  </p>
                )}
              </div>

              {/* Swipe Indicators + Instructions */}
              <div className="space-y-4 mt-auto pt-6 border-t border-[var(--border)] relative z-0">
                <div className="flex justify-between items-center px-4">
                  {/* Left indicator */}
                  <div
                    className="flex items-center gap-2"
                    style={{
                      opacity: 0.3 + leftProgress * 0.7,
                      transform: `translateX(${-leftProgress * 8}px) scale(${0.9 + leftProgress * 0.15})`,
                      color: leftProgress > 0.1 ? `rgba(239, 68, 68, ${0.5 + leftProgress * 0.5})` : 'var(--text-secondary)',
                      transition: isDraggingRef.current ? 'none' : 'all 200ms ease',
                    }}
                  >
                    <XCircle size={24} />
                    <span className="font-semibold text-sm">Not Yet</span>
                  </div>

                  <div className="text-xs text-[var(--text-secondary)] font-medium">
                    {showDetails ? 'Flip to swipe' : 'Swipe to rate'}
                  </div>

                  {/* Right indicator */}
                  <div
                    className="flex items-center gap-2"
                    style={{
                      opacity: 0.3 + rightProgress * 0.7,
                      transform: `translateX(${rightProgress * 8}px) scale(${0.9 + rightProgress * 0.15})`,
                      color: rightProgress > 0.1 ? `rgba(34, 197, 94, ${0.5 + rightProgress * 0.5})` : 'var(--text-secondary)',
                      transition: isDraggingRef.current ? 'none' : 'all 200ms ease',
                    }}
                  >
                    <span className="font-semibold text-sm">Got It!</span>
                    <CheckCircle size={24} />
                  </div>
                </div>

                <p className="label text-[var(--text-secondary)] text-center text-sm cursor-pointer hover:text-[var(--accent)] transition-colors">
                  Tap card to flip
                </p>
                <p className="hidden md:block text-xs text-center text-[var(--text-secondary)] opacity-40 mt-1">
                  Space to flip
                </p>
              </div>
            </SurfaceCard>
          </div>

          {/* ── Back of Card ─────────────────────────────────────── */}
          <div
            className="absolute w-full h-full select-none"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', touchAction: 'none' }}
          >
            <SurfaceCard padding="lg" className="text-center relative h-full flex flex-col bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
              <div className="text-center mb-4">
                <h2 className="text-[22px] font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{current.word}</h2>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 uppercase tracking-widest">Tap to flip back & swipe</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {current.part_of_speech && (
                    <span className="label bg-[var(--accent)]/15 text-[var(--accent)] px-3 py-1.5 rounded-lg">{current.part_of_speech}</span>
                  )}
                  {current.cefr_level && (
                    <span className="label bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg">{current.cefr_level}</span>
                  )}
                </div>

                <div className="text-left">
                  <p className="label text-[var(--text-secondary)] mb-1.5 text-xs">Definition</p>
                  <p className="body text-[var(--text)] text-sm">{current.definition}</p>
                  {current.mongolian && (
                    <p className="text-xs text-[var(--text-secondary)] italic mt-2">{current.mongolian}</p>
                  )}
                </div>

                {examples.length > 0 && (
                  <div className="text-left">
                    <p className="label text-[var(--text-secondary)] mb-1.5 text-xs">Example</p>
                    <p className="body text-[var(--text)] text-sm italic">"{examples[0]}"</p>
                  </div>
                )}

                {current.etymology_hint && (
                  <div className="text-left p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <p className="text-xs text-amber-700 dark:text-amber-300">💡 {current.etymology_hint}</p>
                  </div>
                )}
              </div>

              {/* 4-Level Rating Buttons */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
                <p className="text-xs text-[var(--text-secondary)] text-center mb-3 uppercase tracking-widest font-semibold">How well did you know it?</p>
                <div className="flex gap-2 justify-center">
                  {[
                    { label: 'Again', q: 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', hover: 'rgba(239,68,68,0.2)' },
                    { label: 'Hard',  q: 2, color: '#f97316', bg: 'rgba(249,115,22,0.1)', hover: 'rgba(249,115,22,0.2)' },
                    { label: 'Good',  q: 3, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', hover: 'rgba(59,130,246,0.2)' },
                    { label: 'Easy',  q: 5, color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  hover: 'rgba(34,197,94,0.2)' },
                  ].map(({ label, q, color, bg }) => (
                    <button
                      key={q}
                      onClick={() => rateWithQuality(q)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 hover:opacity-90"
                      style={{ background: bg, color, border: `1.5px solid ${color}40` }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="label text-[var(--text-secondary)] text-center text-xs mt-3 cursor-pointer hover:text-[var(--accent)] transition-colors">
                Tap card to flip back
              </p>
              <p className="hidden md:block text-xs text-center text-[var(--text-secondary)] opacity-50 mt-1">
                1 Again · 2 Hard · 3 Good · 4 Easy
              </p>
            </SurfaceCard>
          </div>
        </div>
      </div>

      {/* Button Controls (desktop-friendly) */}
      {!showDetails && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleButtonRate('left')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1.5px solid rgba(239,68,68,0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          >
            <ThumbsDown size={18} />
            Not Yet
          </button>
          <button
            onClick={() => handleButtonRate('right')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(34,197,94,0.1)',
              color: '#22c55e',
              border: '1.5px solid rgba(34,197,94,0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.1)')}
          >
            Got It!
            <ThumbsUp size={18} />
          </button>
        </div>
      )}

      {/* Session Results Summary */}
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

      {/* Undo Pill */}
      {undoVisible && undoDataRef.current && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-lg border border-[var(--border)] bg-[var(--surface)]"
          style={{ animation: 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <span className="text-sm text-[var(--text)]">Swiped &ldquo;{undoDataRef.current.word.word}&rdquo;</span>
          <button
            onClick={handleUndo}
            className="text-sm font-bold text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, Word, Review } from '@/lib/supabase'
import { calculateSM2 } from '@/lib/srs'
import { interleaveWords, parseInterleaveConfig } from '@/lib/interleaving'

type WordWithReview = Word & { review: Review; isNew?: boolean }
type SessionResult = { word: Word; quality: number; correct: boolean }

const SWIPE_THRESHOLD = 80   // px to commit a swipe
const DISMISS_DISTANCE = 600 // px to fly off-screen

export interface LearningSession {
  // State
  dueWords: WordWithReview[]
  currentIdx: number
  showDetails: boolean
  results: SessionResult[]
  sessionDone: boolean
  loading: boolean
  newCount: number
  dueCount: number
  nextReviewDate: string | null
  dragX: number
  undoVisible: boolean

  // Setters needed by component
  setShowDetails: (v: boolean) => void

  // Refs
  cardRef: React.RefObject<HTMLDivElement>

  // Event handlers
  handleCardDown: (e: React.MouseEvent | React.TouchEvent) => void
  handleCardMove: (e: React.MouseEvent | React.TouchEvent) => void
  handleCardUp: (e: React.MouseEvent | React.TouchEvent) => Promise<void>
  handleCardLeave: () => void
  handleButtonRate: (direction: 'left' | 'right') => Promise<void>

  // Core actions
  loadDueWords: () => Promise<void>
  submitRating: (quality: number, direction?: string) => Promise<void>
  rateWithQuality: (quality: number) => Promise<void>
  handleUndo: () => Promise<void>
  restartSession: () => void

  // Derived values
  current: WordWithReview | undefined
  rotation: number
  cardOpacity: number
  rightProgress: number
  leftProgress: number
  overlayOpacity: number
  isSwipingRight: boolean
  overlayColor: string
  cardTransition: string
  isDragging: boolean

  // Undo word exposed for JSX
  undoWord: WordWithReview | null
}

export function useLearningSession(toast: {
  success: (msg: string) => void
  error: (msg: string) => void
}): LearningSession {
  const [dueWords, setDueWords] = useState<WordWithReview[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [nextReviewDate, setNextReviewDate] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [undoVisible, setUndoVisible] = useState(false)

  const isDraggingRef = useRef(false)
  const undoDataRef = useRef<{ word: WordWithReview; prevIdx: number; prevReview: Review } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef(Date.now())
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isSwiping = useRef(false)

  const loadDueWords = useCallback(async () => {
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
      const newWordIds = (allWords || [])
        .filter((w: any) => !reviewedSet.has(w.id))
        .map((w: any) => w.id)
        .slice(0, 5)

      let newWordsFull: WordWithReview[] = []
      if (newWordIds.length > 0) {
        const { data: newWords } = await supabase.from('words').select('*').in('id', newWordIds)
        if (newWords) {
          newWordsFull = newWords.map((w: any) => ({
            ...w,
            isNew: true,
            review: {
              id: '',
              word_id: w.id,
              ease_factor: 2.5,
              interval_days: 1,
              repetitions: 0,
              next_review: today,
              last_reviewed: null,
              total_reviews: 0,
              correct_count: 0,
              streak: 0,
            },
          }))
        }
      }

      const dueItems: WordWithReview[] = (due || []).map((r: any) => ({ ...r.words, review: r }))
      setDueCount(dueItems.length)
      setNewCount(newWordsFull.length)

      const { data: profile } = await supabase.from('user_profile').select('*').limit(1).maybeSingle()
      const interleaveConfig = parseInterleaveConfig(profile)
      const interleaved: WordWithReview[] = interleaveWords(dueItems, newWordsFull, interleaveConfig)

      setDueWords(interleaved)

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
  }, [toast])

  useEffect(() => {
    loadDueWords()
  }, [loadDueWords])

  // Use a ref to access current dueWords inside submitRating without stale closure
  const dueWordsRef = useRef(dueWords)
  useEffect(() => { dueWordsRef.current = dueWords }, [dueWords])

  const currentIdxRef = useRef(currentIdx)
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])

  const submitRating = useCallback(async (quality: number, direction: string = 'button') => {
    const current = dueWordsRef.current[currentIdxRef.current]
    if (!current) return

    undoDataRef.current = { word: current, prevIdx: currentIdxRef.current, prevReview: current.review }

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
        correct_count:
          quality >= 3
            ? (current.review.correct_count || 0) + 1
            : current.review.correct_count,
        streak: quality >= 3 ? (current.review.streak || 0) + 1 : 0,
      }).eq('word_id', current.id)
    }

    await supabase.from('review_logs').insert({
      word_id: current.id,
      quiz_type: 'swipe',
      result: quality,
      response_time_ms: timeMs,
      user_answer: direction,
      source: 'learn',
    })

    setResults(prev => [...prev, { word: current, quality, correct: quality >= 3 }])

    if (quality >= 3) toast.success('+10 XP')

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoVisible(true)
    undoTimerRef.current = setTimeout(() => setUndoVisible(false), 5000)

    if (currentIdxRef.current + 1 >= dueWordsRef.current.length) {
      setSessionDone(true)
    } else {
      setCurrentIdx(p => p + 1)
      setShowDetails(false)
      startTimeRef.current = Date.now()
    }
  }, [toast])

  const handleUndo = useCallback(async () => {
    const snap = undoDataRef.current
    if (!snap) return
    setUndoVisible(false)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)

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

    setResults(prev => prev.slice(0, -1))
    setCurrentIdx(snap.prevIdx)
    setSessionDone(false)
    setShowDetails(false)
    setDragX(0)
    startTimeRef.current = Date.now()
    undoDataRef.current = null
  }, [])

  const autoRateWord = useCallback(async (direction: 'left' | 'right') => {
    const quality = direction === 'right' ? 4 : 1
    await submitRating(quality, direction)
  }, [submitRating])

  const rateWithQuality = useCallback(async (quality: number) => {
    isDraggingRef.current = false
    setDragX(quality >= 3 ? DISMISS_DISTANCE : -DISMISS_DISTANCE)
    await new Promise(r => setTimeout(r, 280))
    setDragX(0)
    await submitRating(quality, `rate_${quality}`)
  }, [submitRating])

  // ─── Swipe Handlers ────────────────────────────────────────────────────────

  const showDetailsRef = useRef(showDetails)
  useEffect(() => { showDetailsRef.current = showDetails }, [showDetails])

  const dragXRef = useRef(dragX)
  useEffect(() => { dragXRef.current = dragX }, [dragX])

  const handleCardDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (showDetailsRef.current) return
    const x = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX
    const y = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY
    swipeStartX.current = x ?? null
    swipeStartY.current = y ?? null
    isSwiping.current = false
    isDraggingRef.current = false
  }, [])

  const handleCardMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (showDetailsRef.current || !swipeStartX.current) return

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
  }, [])

  const handleCardUp = useCallback(async (_e: React.MouseEvent | React.TouchEvent) => {
    const currentDragX = dragXRef.current

    if (isSwiping.current && Math.abs(currentDragX) > SWIPE_THRESHOLD) {
      const direction = currentDragX > 0 ? 'right' : 'left'
      isDraggingRef.current = false
      setDragX(direction === 'right' ? DISMISS_DISTANCE : -DISMISS_DISTANCE)
      await new Promise(r => setTimeout(r, 280))
      setDragX(0)
      await autoRateWord(direction)
    } else {
      isDraggingRef.current = false
      setDragX(0)
    }

    swipeStartX.current = null
    isSwiping.current = false
  }, [autoRateWord])

  const handleCardLeave = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setDragX(0)
      swipeStartX.current = null
      isSwiping.current = false
    }
  }, [])

  const handleButtonRate = useCallback(async (direction: 'left' | 'right') => {
    isDraggingRef.current = false
    setDragX(direction === 'right' ? DISMISS_DISTANCE : -DISMISS_DISTANCE)
    await new Promise(r => setTimeout(r, 280))
    setDragX(0)
    await autoRateWord(direction)
  }, [autoRateWord])

  const restartSession = useCallback(() => {
    setDueWords([])
    setResults([])
    setCurrentIdx(0)
    setSessionDone(false)
    setLoading(true)
    loadDueWords()
  }, [loadDueWords])

  // ─── Derived Values ────────────────────────────────────────────────────────

  const current = dueWords[currentIdx]
  const rotation = dragX * 0.06
  const cardOpacity = Math.max(0, 1 - Math.abs(dragX) / 400)
  const rightProgress = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1.2)
  const leftProgress = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1.2)
  const overlayOpacity = Math.min(Math.abs(dragX) / 180, 0.4)
  const isSwipingRight = dragX > 0
  const overlayColor = isSwipingRight
    ? `rgba(34, 197, 94, ${overlayOpacity})`
    : `rgba(239, 68, 68, ${overlayOpacity})`

  const isDragging = isDraggingRef.current
  const cardTransition = isDragging
    ? 'none'
    : dragX === 0
      ? 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 450ms ease'
      : 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease'

  return {
    // State
    dueWords,
    currentIdx,
    showDetails,
    results,
    sessionDone,
    loading,
    newCount,
    dueCount,
    nextReviewDate,
    dragX,
    undoVisible,

    // Setters
    setShowDetails,

    // Refs
    cardRef,

    // Event handlers
    handleCardDown,
    handleCardMove,
    handleCardUp,
    handleCardLeave,
    handleButtonRate,

    // Core actions
    loadDueWords,
    submitRating,
    rateWithQuality,
    handleUndo,
    restartSession,

    // Derived values
    current,
    rotation,
    cardOpacity,
    rightProgress,
    leftProgress,
    overlayOpacity,
    isSwipingRight,
    overlayColor,
    cardTransition,
    isDragging,

    // Undo word for JSX
    undoWord: undoDataRef.current?.word ?? null,
  }
}

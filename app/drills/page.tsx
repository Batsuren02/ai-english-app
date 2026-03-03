'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { getWeakWords, calculateDrillStats, generateDrillQuiz, DEFAULT_DRILL_CONFIG, DrillConfig } from '@/lib/drill-generator'
import { calculateSM2 } from '@/lib/srs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Quiz } from '@/lib/quiz-generator'
import { AlertCircle, Brain, RotateCw, CheckCircle, XCircle } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import { TextPrimary, TextSecondary } from '@/components/design/Text'

type SessionState = 'setup' | 'drilling' | 'complete'

export default function DrillsPage() {
  const [state, setState] = useState<SessionState>('setup')
  const [words, setWords] = useState<Word[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [weakWords, setWeakWords] = useState<Word[]>([])
  const [config, setConfig] = useState<DrillConfig>(DEFAULT_DRILL_CONFIG)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Drill session state
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [results, setResults] = useState<Array<{ word: string; correct: boolean; beforeEase: number; afterEase: number }>>([])
  const currentIndexRef = useRef(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [wordsRes, reviewsRes, profileRes] = await Promise.all([
        supabase.from('words').select('*'),
        supabase.from('reviews').select('*'),
        supabase.from('user_profile').select('*').single(),
      ])

      if (wordsRes.data) setWords(wordsRes.data)
      if (reviewsRes.data) setReviews(reviewsRes.data)
      if (profileRes.data) {
        setProfile(profileRes.data)
        // Load saved drill config
        const newConfig = { ...DEFAULT_DRILL_CONFIG }
        if ((profileRes.data as any).drill_ease_threshold) {
          newConfig.easeFactorThreshold = (profileRes.data as any).drill_ease_threshold
        }
        if ((profileRes.data as any).drill_session_length) {
          newConfig.sessionLength = (profileRes.data as any).drill_session_length
        }
        setConfig(newConfig)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const startDrill = () => {
    const weak = getWeakWords(words, reviews, config)
    if (weak.length === 0) {
      alert('No weak words found. Great job!')
      return
    }

    setWeakWords(weak)
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setResults([])
    setFeedback(null)
    setState('drilling')
    generateNextQuiz(weak, 0)
  }

  const generateNextQuiz = (wordList: Word[], index: number) => {
    if (index >= Math.min(config.sessionLength, wordList.length)) {
      setState('complete')
      return
    }

    const word = wordList[index]
    const quiz = generateDrillQuiz(word, words, index, config.sessionLength, config.difficultyProgression)

    if (quiz) {
      setCurrentQuiz(quiz)
      setUserAnswer('')
      setFeedback(null)
    } else {
      // Skip if no quiz can be generated
      const nextIdx = index + 1
      currentIndexRef.current = nextIdx
      setCurrentIndex(nextIdx)
      generateNextQuiz(wordList, nextIdx)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!currentQuiz || !userAnswer.trim() || feedback) return

    const correct = userAnswer.trim().toLowerCase().includes(currentQuiz.answer.toLowerCase())

    // Show feedback immediately
    setFeedback(correct ? 'correct' : 'wrong')

    // Calculate SM-2
    const review = reviews.find((r) => r.word_id === currentQuiz.word.id)
    const beforeEase = review?.ease_factor ?? 2.5

    const sm2Result = calculateSM2(correct ? 4 : 0, beforeEase, review?.interval_days ?? 1, review?.repetitions ?? 0)

    // Store result for summary
    setResults(prev => [
      ...prev,
      {
        word: currentQuiz.word.word,
        correct,
        beforeEase,
        afterEase: sm2Result.ease_factor,
      },
    ])

    // Update review in database with proper date format
    if (review) {
      await supabase
        .from('reviews')
        .update({
          ease_factor: sm2Result.ease_factor,
          interval_days: sm2Result.interval_days,
          repetitions: sm2Result.repetitions,
          next_review: new Date(Date.now() + sm2Result.interval_days * 86400000).toISOString().split('T')[0],
          total_reviews: (review.total_reviews ?? 0) + 1,
          correct_count: (review.correct_count ?? 0) + (correct ? 1 : 0),
        })
        .eq('id', review.id)
    }

    // Log result
    await supabase.from('review_logs').insert({
      word_id: currentQuiz.word.id,
      quiz_type: currentQuiz.type,
      result: correct ? 4 : 0,
      response_time_ms: 0,
      user_answer: userAnswer,
      source: 'drill',
    })

    // Award XP for correct answers
    if (correct) {
      const { data: prof } = await supabase.from('user_profile').select('id, total_xp').single()
      if (prof) {
        await supabase.from('user_profile').update({ total_xp: (prof.total_xp || 0) + 10 }).eq('id', prof.id)
      }
    }
  }

  const handleNextQuestion = () => {
    // Use ref to avoid stale closure
    const nextIdx = currentIndexRef.current + 1
    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    generateNextQuiz(weakWords, nextIdx)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (feedback) {
        handleNextQuestion()
      } else {
        handleSubmitAnswer()
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <SurfaceCard padding="lg" className="text-center"><TextSecondary>Loading...</TextSecondary></SurfaceCard>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <TextPrimary className="font-display text-3xl mb-1">Weak Word Drills</TextPrimary>
        <TextSecondary className="text-sm">Intensive practice on your hardest words</TextSecondary>
      </div>

      {state === 'setup' && (
        <SurfaceCard padding="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <TextPrimary>Ease factor threshold (words below this value)</TextPrimary>
              </label>
              <Input
                type="number"
                min="1.3"
                max="2.5"
                step="0.1"
                value={config.easeFactorThreshold}
                onChange={(e) => {
                  const newConfig = { ...config, easeFactorThreshold: parseFloat(e.target.value) }
                  setConfig(newConfig)
                  // Save to user_profile
                  void supabase.from('user_profile').update({ drill_ease_threshold: newConfig.easeFactorThreshold }).eq('id', (profile as any)?.id)
                }}
              />
              <TextSecondary className="text-xs mt-1">Lower = harder words. Default 2.8 includes your hardest words.</TextSecondary>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <TextPrimary>Questions per session</TextPrimary>
              </label>
              <Input
                type="number"
                min="5"
                max="20"
                value={config.sessionLength}
                onChange={(e) => {
                  const newConfig = { ...config, sessionLength: parseInt(e.target.value) }
                  setConfig(newConfig)
                  // Save to user_profile
                  void supabase.from('user_profile').update({ drill_session_length: newConfig.sessionLength }).eq('id', (profile as any)?.id)
                }}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.difficultyProgression}
                onChange={(e) => setConfig({ ...config, difficultyProgression: e.target.checked })}
              />
              <TextPrimary className="text-sm font-medium">Increase difficulty as session progresses</TextPrimary>
            </label>
          </div>

          <Button onClick={startDrill} className="w-full">
            Start Drill Session
          </Button>

          {words.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-100 flex items-start gap-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>No words in your vocabulary yet. Add words first!</span>
            </div>
          )}
        </SurfaceCard>
      )}

      {state === 'drilling' && currentQuiz && (
        <SurfaceCard padding="lg">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <TextSecondary className="text-xs">
                Question {currentIndex + 1} of {Math.min(config.sessionLength, weakWords.length)}
              </TextSecondary>
              <TextSecondary className="text-xs">
                {results.filter((r) => r.correct).length} correct
              </TextSecondary>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / Math.min(config.sessionLength, weakWords.length)) * 100}%` }}
              />
            </div>
          </div>

          {/* Quiz */}
          <div>
            <TextSecondary className="text-sm mb-3 block">{currentQuiz.question}</TextSecondary>

            {currentQuiz.type === 'mcq' && currentQuiz.options && (
              <div className="space-y-2">
                {currentQuiz.options.map((option) => {
                  let btnClass = 'w-full p-3 rounded border text-left transition-all '
                  if (feedback) {
                    if (option === currentQuiz.answer) {
                      btnClass += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    } else if (option === userAnswer && feedback === 'wrong') {
                      btnClass += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    } else {
                      btnClass += 'border-[var(--border)] opacity-50'
                    }
                  } else if (userAnswer === option) {
                    btnClass += 'border-[var(--accent)] bg-[var(--accent-light)]'
                  } else {
                    btnClass += 'border-[var(--border)] hover:border-[var(--accent)]'
                  }
                  return (
                    <button
                      key={option}
                      onClick={() => !feedback && setUserAnswer(option)}
                      disabled={!!feedback}
                      className={btnClass}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {(currentQuiz.type === 'fill_blank' || currentQuiz.type === 'translation' || currentQuiz.type === 'spelling') && (
              <Input
                autoFocus
                value={userAnswer}
                onChange={(e) => !feedback && setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your answer"
                className="text-lg"
                disabled={!!feedback}
              />
            )}
          </div>

          {/* Feedback panel */}
          {feedback && (
            <div className={`p-4 rounded-lg border ${
              feedback === 'correct'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {feedback === 'correct' ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <XCircle size={20} className="text-red-600" />
                )}
                <span className={`font-semibold ${
                  feedback === 'correct' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {feedback === 'correct' ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              {feedback === 'wrong' && (
                <p className="text-sm text-[var(--text-secondary)]">
                  The correct answer is: <strong className="text-[var(--text)]">{currentQuiz.answer}</strong>
                </p>
              )}
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                <strong>{currentQuiz.word.word}</strong>
                {currentQuiz.word.definition && ` — ${currentQuiz.word.definition}`}
              </p>
            </div>
          )}

          {/* Action button */}
          {!feedback ? (
            <Button onClick={handleSubmitAnswer} disabled={!userAnswer.trim()} className="w-full">
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} className="w-full">
              {currentIndex + 1 >= Math.min(config.sessionLength, weakWords.length)
                ? 'Finish Session'
                : 'Next Question'}
            </Button>
          )}
        </SurfaceCard>
      )}

      {state === 'complete' && results.length > 0 && (
        <SurfaceCard padding="lg">
          <div className="text-center mb-6">
            <div className="text-5xl font-display text-[var(--accent)] mb-2">
              {Math.round((results.filter((r) => r.correct).length / results.length) * 100)}%
            </div>
            <TextSecondary className="text-sm">
              {results.filter((r) => r.correct).length} of {results.length} correct
            </TextSecondary>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto mb-6">
            {results.map((result, i) => (
              <div key={i} className="p-3 bg-[var(--surface)] rounded border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1">
                  <TextPrimary className="font-medium text-sm">{result.word}</TextPrimary>
                  <span className={result.correct ? 'text-green-600' : 'text-red-600'}>
                    {result.correct ? '✓' : '✗'}
                  </span>
                </div>
                <TextSecondary className="text-xs">Ease: {result.beforeEase.toFixed(1)} → {result.afterEase.toFixed(1)}</TextSecondary>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setState('setup')
                currentIndexRef.current = 0
                setCurrentIndex(0)
                setResults([])
                setFeedback(null)
              }}
              variant="ghost"
              className="flex-1"
            >
              <RotateCw size={16} className="mr-2" />
              Another Session
            </Button>
            <Button onClick={() => (window.location.href = '/learn')} className="flex-1">
              Go to Learn
            </Button>
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}

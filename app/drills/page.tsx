'use client'

import { useEffect, useState } from 'react'
import { supabase, Word, Review } from '@/lib/supabase'
import { getWeakWords, calculateDrillStats, generateDrillQuiz, DEFAULT_DRILL_CONFIG, DrillConfig } from '@/lib/drill-generator'
import { calculateSM2 } from '@/lib/srs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Quiz } from '@/lib/quiz-generator'
import { AlertCircle, Brain, RotateCw } from 'lucide-react'

type SessionState = 'setup' | 'drilling' | 'complete'

export default function DrillsPage() {
  const [state, setState] = useState<SessionState>('setup')
  const [words, setWords] = useState<Word[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [weakWords, setWeakWords] = useState<Word[]>([])
  const [config, setConfig] = useState<DrillConfig>(DEFAULT_DRILL_CONFIG)
  const [loading, setLoading] = useState(true)

  // Drill session state
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [results, setResults] = useState<Array<{ word: string; correct: boolean; beforeEase: number; afterEase: number }>>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [wordsRes, reviewsRes] = await Promise.all([
        supabase.from('words').select('*'),
        supabase.from('reviews').select('*'),
      ])

      if (wordsRes.data) setWords(wordsRes.data)
      if (reviewsRes.data) setReviews(reviewsRes.data)
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
    setCurrentIndex(0)
    setResults([])
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
    } else {
      // Skip if no quiz can be generated
      setCurrentIndex(index + 1)
      generateNextQuiz(wordList, index + 1)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!currentQuiz || !userAnswer.trim()) return

    const correct = userAnswer.trim().toLowerCase().includes(currentQuiz.answer.toLowerCase())

    // Calculate SM-2
    const review = reviews.find((r) => r.word_id === currentQuiz.word.id)
    const beforeEase = review?.ease_factor ?? 2.5

    const sm2Result = calculateSM2(correct ? 4 : 0, beforeEase, review?.interval_days ?? 1, review?.repetitions ?? 0)

    // Store result for summary
    setResults([
      ...results,
      {
        word: currentQuiz.word.word,
        correct,
        beforeEase,
        afterEase: sm2Result.ease_factor,
      },
    ])

    // Update review in database
    if (review) {
      await supabase
        .from('reviews')
        .update({
          ease_factor: sm2Result.ease_factor,
          interval_days: sm2Result.interval_days,
          repetitions: sm2Result.repetitions,
          next_review: new Date(Date.now() + sm2Result.interval_days * 86400000).toISOString(),
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

    // Move to next
    setCurrentIndex(currentIndex + 1)
    generateNextQuiz(weakWords, currentIndex + 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitAnswer()
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center text-[var(--ink-light)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--ink)] mb-2">Weak Word Drills</h1>
        <p className="text-[var(--ink-light)]">Intensive practice on your hardest words</p>
      </div>

      {state === 'setup' && (
        <div className="card p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                Ease factor threshold (words below this value)
              </label>
              <Input
                type="number"
                min="1.3"
                max="2.5"
                step="0.1"
                value={config.easeFactorThreshold}
                onChange={(e) => setConfig({ ...config, easeFactorThreshold: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-[var(--ink-light)] mt-1">
                Lower = harder words. Default 2.8 includes your hardest words.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                Questions per session
              </label>
              <Input
                type="number"
                min="5"
                max="20"
                value={config.sessionLength}
                onChange={(e) => setConfig({ ...config, sessionLength: parseInt(e.target.value) })}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.difficultyProgression}
                onChange={(e) => setConfig({ ...config, difficultyProgression: e.target.checked })}
              />
              <span className="text-sm font-medium text-[var(--ink)]">
                Increase difficulty as session progresses
              </span>
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
        </div>
      )}

      {state === 'drilling' && currentQuiz && (
        <div className="card p-6 space-y-6">
          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[var(--ink-light)]">
                Question {currentIndex + 1} of {Math.min(config.sessionLength, weakWords.length)}
              </span>
              <span className="text-sm text-[var(--ink-light)]">
                {results.filter((r) => r.correct).length} correct
              </span>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all"
                style={{ width: `${((currentIndex + 1) / Math.min(config.sessionLength, weakWords.length)) * 100}%` }}
              />
            </div>
          </div>

          {/* Quiz */}
          <div>
            <p className="text-sm text-[var(--ink-light)] mb-2">{currentQuiz.question}</p>

            {currentQuiz.type === 'mcq' && currentQuiz.options && (
              <div className="space-y-2">
                {currentQuiz.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setUserAnswer(option)}
                    className={`w-full p-3 rounded border text-left transition-all ${
                      userAnswer === option
                        ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {(currentQuiz.type === 'fill_blank' || currentQuiz.type === 'translation' || currentQuiz.type === 'spelling') && (
              <Input
                autoFocus
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your answer"
                className="text-lg"
              />
            )}
          </div>

          <Button onClick={handleSubmitAnswer} disabled={!userAnswer.trim()} className="w-full">
            Check Answer
          </Button>
        </div>
      )}

      {state === 'complete' && (
        <div className="card p-6 space-y-6">
          <div className="text-center">
            <div className="text-4xl font-display text-[var(--accent)] mb-2">
              {Math.round((results.filter((r) => r.correct).length / results.length) * 100)}%
            </div>
            <p className="text-[var(--ink-light)]">
              {results.filter((r) => r.correct).length} of {results.length} correct
            </p>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((result, i) => (
              <div key={i} className="p-3 bg-[var(--bg)] rounded border border-[var(--border)] text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--ink)]">{result.word}</span>
                  <span className={result.correct ? 'text-green-600' : 'text-red-600'}>
                    {result.correct ? '✓' : '✗'}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-light)] mt-1">
                  Ease: {result.beforeEase.toFixed(1)} → {result.afterEase.toFixed(1)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setState('setup')
                setCurrentIndex(0)
                setResults([])
              }}
              variant="outline"
              className="flex-1"
            >
              <RotateCw size={16} className="mr-2" />
              Another Session
            </Button>
            <Button onClick={() => (window.location.href = '/learn')} className="flex-1">
              Go to Learn
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

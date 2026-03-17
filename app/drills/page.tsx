'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, Review, UserProfile } from '@/lib/supabase'
import { getWeakWords, calculateDrillStats, generateDrillQuiz, DEFAULT_DRILL_CONFIG, DrillConfig } from '@/lib/drill-generator'
import { calculateSM2 } from '@/lib/srs'
import { cn } from '@/lib/utils'
import { Quiz } from '@/lib/quiz-generator'
import { AlertCircle, Brain, RotateCw, CheckCircle, XCircle, ChevronRight, Zap, Volume2 } from 'lucide-react'
import { speakWord } from '@/lib/speech-utils'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'

type SessionState = 'setup' | 'drilling' | 'complete'

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function isAnswerCorrect(userAnswer: string, correct: string): boolean {
  const u = userAnswer.trim().toLowerCase()
  const c = correct.trim().toLowerCase()
  if (u === c) return true
  // Allow 1 typo for longer words
  return c.length > 4 && levenshtein(u, c) <= 1
}

export default function DrillsPage() {
  const [state, setState] = useState<SessionState>('setup')
  const [words, setWords] = useState<Word[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [weakWords, setWeakWords] = useState<Word[]>([])
  const [config, setConfig] = useState<DrillConfig>(DEFAULT_DRILL_CONFIG)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [noWeakWords, setNoWeakWords] = useState(false)

  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [results, setResults] = useState<Array<{ word: string; correct: boolean; beforeEase: number; afterEase: number }>>([])
  const currentIndexRef = useRef(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const questionStartRef = useRef(Date.now())

  useEffect(() => { loadData() }, [])

  async function loadData() {
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
        const newConfig = { ...DEFAULT_DRILL_CONFIG }
        if ((profileRes.data as any).drill_ease_threshold) newConfig.easeFactorThreshold = (profileRes.data as any).drill_ease_threshold
        if ((profileRes.data as any).drill_session_length) newConfig.sessionLength = (profileRes.data as any).drill_session_length
        setConfig(newConfig)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  function startDrill() {
    const weak = getWeakWords(words, reviews, config)
    if (weak.length === 0) { setNoWeakWords(true); return }
    setNoWeakWords(false)
    setWeakWords(weak)
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setResults([])
    setFeedback(null)
    setState('drilling')
    generateNextQuiz(weak, 0)
  }

  function generateNextQuiz(wordList: Word[], index: number) {
    if (index >= Math.min(config.sessionLength, wordList.length)) { setState('complete'); return }
    const word = wordList[index]
    const quiz = generateDrillQuiz(word, words, index, config.sessionLength, config.difficultyProgression)
    if (quiz) {
      setCurrentQuiz(quiz); setUserAnswer(''); setFeedback(null)
      questionStartRef.current = Date.now()
    } else {
      const nextIdx = index + 1
      currentIndexRef.current = nextIdx; setCurrentIndex(nextIdx)
      generateNextQuiz(wordList, nextIdx)
    }
  }

  async function handleSubmitAnswer() {
    if (!currentQuiz || !userAnswer.trim() || feedback) return
    const correct = currentQuiz.type === 'mcq'
      ? userAnswer.trim().toLowerCase() === currentQuiz.answer.toLowerCase()
      : isAnswerCorrect(userAnswer, currentQuiz.answer)
    const responseTimeMs = Date.now() - questionStartRef.current
    setFeedback(correct ? 'correct' : 'wrong')
    const review = reviews.find(r => r.word_id === currentQuiz.word.id)
    const beforeEase = review?.ease_factor ?? 2.5
    const sm2Result = calculateSM2(correct ? 4 : 0, beforeEase, review?.interval_days ?? 1, review?.repetitions ?? 0)
    setResults(prev => [...prev, { word: currentQuiz.word.word, correct, beforeEase, afterEase: sm2Result.ease_factor }])
    if (review) {
      await supabase.from('reviews').update({
        ease_factor: sm2Result.ease_factor, interval_days: sm2Result.interval_days,
        repetitions: sm2Result.repetitions,
        next_review: new Date(Date.now() + sm2Result.interval_days * 86400000).toISOString().split('T')[0],
        total_reviews: (review.total_reviews ?? 0) + 1,
        correct_count: (review.correct_count ?? 0) + (correct ? 1 : 0),
      }).eq('id', review.id)
    }
    await supabase.from('review_logs').insert({
      word_id: currentQuiz.word.id, quiz_type: currentQuiz.type,
      result: correct ? 4 : 0, response_time_ms: responseTimeMs, user_answer: userAnswer, source: 'drill',
    })
  }

  function handleNextQuestion() {
    const nextIdx = currentIndexRef.current + 1
    currentIndexRef.current = nextIdx; setCurrentIndex(nextIdx)
    generateNextQuiz(weakWords, nextIdx)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      feedback ? handleNextQuestion() : handleSubmitAnswer()
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <p className="text-[13px] text-[var(--text-secondary)]">Loading drill data…</p>
    </div>
  )

  const totalQuestions = Math.min(config.sessionLength, weakWords.length)
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0

  return (
    <div className="max-w-[600px] mx-auto space-y-5 fade-in">

      {/* Header */}
      <div>
        <h1 className="h2 text-[var(--text)]">Weak Word Drills</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">Intensive practice on your hardest words</p>
      </div>

      {/* ── SETUP ── */}
      {state === 'setup' && (
        <div className="space-y-4">
          {words.length === 0 ? (
            <EmptyState
              icon={<Zap size={44} className="text-[var(--accent)]" />}
              title="No words yet"
              description="Add words to your vocabulary before starting drills."
            />
          ) : (
            <SurfaceCard padding="lg">
              <h3 className="h4 text-[var(--text)] mb-5">Session Configuration</h3>
              <div className="space-y-5">

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label text-[var(--text)]">Ease Factor Threshold</label>
                    <span className="text-[14px] font-bold text-[var(--accent)]">{config.easeFactorThreshold.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min="1.3" max="2.8" step="0.1"
                    value={config.easeFactorThreshold}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      setConfig(c => ({ ...c, easeFactorThreshold: val }))
                      void supabase.from('user_profile').update({ drill_ease_threshold: val }).eq('id', (profile as any)?.id)
                    }}
                  />
                  <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1.5">
                    <span>Hardest words</span><span>More words</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label text-[var(--text)]">Questions per Session</label>
                    <span className="text-[14px] font-bold text-[var(--accent)]">{config.sessionLength}</span>
                  </div>
                  <input
                    type="range" min="5" max="20" step="1"
                    value={config.sessionLength}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      setConfig(c => ({ ...c, sessionLength: val }))
                      void supabase.from('user_profile').update({ drill_session_length: val }).eq('id', (profile as any)?.id)
                    }}
                  />
                  <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1.5">
                    <span>5 questions</span><span>20 questions</span>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    'w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
                    config.difficultyProgression ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  )}>
                    <div className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      config.difficultyProgression ? 'translate-x-5' : 'translate-x-1'
                    )} />
                    <input
                      type="checkbox" className="sr-only"
                      checked={config.difficultyProgression}
                      onChange={e => setConfig(c => ({ ...c, difficultyProgression: e.target.checked }))}
                    />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text)]">Progressive difficulty</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Questions get harder as session progresses</p>
                  </div>
                </label>

                {noWeakWords && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <AlertCircle size={16} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[var(--warning)]">No words match this threshold. Try raising the ease factor.</p>
                  </div>
                )}

                <InteractiveButton variant="primary" size="md" onClick={startDrill} className="w-full">
                  <Zap size={15} className="mr-1.5" /> Start Drill Session
                </InteractiveButton>
              </div>
            </SurfaceCard>
          )}
        </div>
      )}

      {/* ── DRILLING ── */}
      {state === 'drilling' && currentQuiz && (
        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] text-[var(--text-secondary)]">Question {currentIndex + 1} of {totalQuestions}</span>
              <span className="text-[12px] font-bold text-[var(--success)]">{results.filter(r => r.correct).length} correct</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Quiz card */}
          <div className="card" style={{ padding: '24px 22px' }}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                {currentQuiz.type.replace('_', ' ')}
              </span>
              <button
                onClick={() => speakWord(currentQuiz.word.word)}
                className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-1.5 rounded-lg hover:bg-[var(--accent)]/10"
                title="Hear pronunciation"
              >
                <Volume2 size={14} />
              </button>
            </div>

            <p className="text-[var(--text)] text-[17px] font-semibold leading-relaxed mb-5">{currentQuiz.question}</p>

            {/* MCQ options */}
            {currentQuiz.type === 'mcq' && currentQuiz.options && (
              <div className="space-y-2">
                {currentQuiz.options.map(option => (
                  <button
                    key={option}
                    onClick={() => !feedback && setUserAnswer(option)}
                    disabled={!!feedback}
                    className={cn(
                      'w-full p-3.5 rounded-xl border-2 text-left text-[13px] font-semibold transition-all duration-150 leading-snug',
                      feedback
                        ? option === currentQuiz.answer
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                          : option === userAnswer && feedback === 'wrong'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                          : 'border-[var(--border)] text-[var(--text-secondary)] opacity-50'
                        : userAnswer === option
                        ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--text)] cursor-pointer'
                        : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] cursor-pointer'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            {(currentQuiz.type === 'fill_blank' || currentQuiz.type === 'translation' || currentQuiz.type === 'spelling') && (
              <input
                autoFocus
                className={cn(
                  'input',
                  feedback === 'correct' && 'border-green-500',
                  feedback === 'wrong' && 'border-red-500'
                )}
                value={userAnswer}
                onChange={e => !feedback && setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…"
                disabled={!!feedback}
              />
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={cn(
              'fade-in card',
              feedback === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'
            )}>
              <div className="flex items-center gap-2.5 mb-2">
                {feedback === 'correct'
                  ? <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  : <XCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                <span className={cn('font-bold text-[15px]', feedback === 'correct' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                  {feedback === 'correct' ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              {feedback === 'wrong' && (
                <p className="text-[13px] text-[var(--text-secondary)] mb-1">
                  Answer: <strong className="text-[var(--text)]">{currentQuiz.answer}</strong>
                </p>
              )}
              <p className="text-[12px] text-[var(--text-secondary)]">
                <strong className="text-[var(--text)]">{currentQuiz.word.word}</strong>
                {currentQuiz.word.definition && ` — ${currentQuiz.word.definition?.slice(0, 80)}`}
              </p>
            </div>
          )}

          {/* Action */}
          {!feedback ? (
            <button className="btn-primary w-full py-2.5" onClick={handleSubmitAnswer} disabled={!userAnswer.trim()}>
              Check Answer
            </button>
          ) : (
            <button className="btn-primary w-full py-2.5 flex items-center justify-center gap-2" onClick={handleNextQuestion}>
              {currentIndex + 1 >= totalQuestions ? 'Finish Session' : <>Next Question <ChevronRight size={15} /></>}
            </button>
          )}
        </div>
      )}

      {/* ── COMPLETE ── */}
      {state === 'complete' && results.length > 0 && (
        <div className="space-y-5 fade-in">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Score</p>
            <div className="stat-number text-[var(--text)]">
              {Math.round((results.filter(r => r.correct).length / results.length) * 100)}
              <span className="text-[24px] font-normal text-[var(--text-secondary)]">%</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] mt-2">
              {results.filter(r => r.correct).length} of {results.length} correct
            </p>
          </div>

          <SurfaceCard padding="lg">
            <h3 className="h4 text-[var(--text)] mb-4">Results</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.map((result, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2.5">
                    {result.correct
                      ? <CheckCircle size={15} className="text-[var(--success)] flex-shrink-0" />
                      : <XCircle size={15} className="text-[var(--error)] flex-shrink-0" />}
                    <span className="text-[13px] font-semibold text-[var(--text)]">{result.word}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                    {result.beforeEase.toFixed(1)} → {result.afterEase.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <div className="flex gap-3">
            <InteractiveButton variant="secondary" size="md" className="flex-1" onClick={() => {
              setState('setup'); currentIndexRef.current = 0; setCurrentIndex(0); setResults([]); setFeedback(null)
            }}>
              <RotateCw size={14} className="mr-1.5" /> New Session
            </InteractiveButton>
            <InteractiveButton variant="primary" size="md" className="flex-1" onClick={() => window.location.href = '/learn'}>
              Go to Learn
            </InteractiveButton>
          </div>
        </div>
      )}
    </div>
  )
}

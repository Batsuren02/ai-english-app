'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, UserProfile } from '@/lib/supabase'
import {
  generateMCQ, generateFillBlank, generateTranslation,
  generateSpelling, generateSentence, generateMatching,
  generateListenAndChoose, generateCollocationMatch,
  getWeightedQuizType, pickWeightedWord, shuffleArray,
  Quiz, QuizType
} from '@/lib/quiz-generator'
import { pickInterleavedWord, parseInterleaveConfig } from '@/lib/interleaving'
import { speakWord } from '@/lib/speech-utils'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, ChevronRight, Shuffle, Target, Zap, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import { TextPrimary, TextSecondary } from '@/components/design/Text'
import { useToastContext } from '@/components/ToastProvider'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import { usePageCache } from '@/lib/hooks/usePageCache'
import dynamic from 'next/dynamic'
import { showXPPopup } from '@/components/XPPopup'
import { calculateQuizXP, calculateReviewXP, awardXP, getUserStreak } from '@/lib/xp-system'
import { incrementChallengeProgress } from '@/lib/challenge-tracker'
const LottiePlayer = dynamic(() => import('@/components/LottiePlayer'), { ssr: false })
const LevelUpModal = dynamic(() => import('@/components/LevelUpModal'), { ssr: false })

const QUIZ_META: Record<string, { label: string; icon: string; desc: string; color: string }> = {
  mcq:                 { label: 'Multiple Choice',    icon: '🔤', desc: 'Choose the correct word from 4 options',              color: '#2563eb' },
  fill_blank:          { label: 'Fill in the Blank',  icon: '✏️', desc: 'Complete the sentence with the missing word',         color: '#7c3aed' },
  spelling:            { label: 'Spelling',           icon: '🔊', desc: 'Hear the word and spell it correctly',                color: '#0891b2' },
  matching:            { label: 'Matching',           icon: '🔗', desc: 'Match 5 words to their definitions',                  color: '#d97706' },
  translation:         { label: 'Translation',        icon: '🌏', desc: 'Translate from Mongolian to English',                 color: '#16a34a' },
  sentence:            { label: 'Sentence Writing',   icon: '📝', desc: 'Use the word in your own sentence',                   color: '#dc2626' },
  listen_and_choose:   { label: 'Listen & Choose',    icon: '🎧', desc: 'Hear the definition, pick the correct word',          color: '#7c3aed' },
  collocation_match:   { label: 'Collocation Match',  icon: '🔀', desc: 'Complete the word collocation (e.g. make a decision)', color: '#059669' },
}

type SessionResult = { word: Word; type: QuizType; correct: boolean; timeMs: number }
type MatchState = { wordOrder: string[]; defOrder: string[]; selected: string | null; matched: Record<string, string>; wrong: string[] }

interface QuizData {
  words: Word[]
  easeMap: Record<string, number>
  weakTypeMap: Partial<Record<QuizType, number>>
  interleaveConfig: { newWordRatio: number; categoryPenalty: number }
}

async function fetchQuizData(): Promise<QuizData> {
  const [wordsRes, reviewsRes, logsRes, profileRes] = await Promise.all([
    supabase.from('words').select('id, word, definition, part_of_speech, mongolian, examples, category, cefr_level, collocations, word_family, confused_with'),
    supabase.from('reviews').select('word_id, ease_factor'),
    supabase.from('review_logs').select('quiz_type, result').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('user_profile').select('interleave_ratio, interleave_category_penalty').limit(1).maybeSingle(),
  ])

  const easeMap: Record<string, number> = {}
  ;(reviewsRes.data ?? []).forEach((r: { word_id: string; ease_factor: number }) => { easeMap[r.word_id] = r.ease_factor })

  const byType: Record<string, { correct: number; total: number }> = {}
  ;(logsRes.data ?? []).forEach((l: { quiz_type: string; result: number }) => {
    if (!byType[l.quiz_type]) byType[l.quiz_type] = { correct: 0, total: 0 }
    byType[l.quiz_type].total++
    if (l.result >= 3) byType[l.quiz_type].correct++
  })
  const weakTypeMap: Partial<Record<QuizType, number>> = {}
  for (const [type, { correct, total }] of Object.entries(byType)) {
    weakTypeMap[type as QuizType] = total ? Math.round(correct / total * 100) : 50
  }

  const interleaveConfig = profileRes.data ? parseInterleaveConfig(profileRes.data) : { newWordRatio: 0.25, categoryPenalty: 0.6 }

  return { words: (wordsRes.data ?? []) as Word[], easeMap, weakTypeMap, interleaveConfig }
}

export default function QuizPage() {
  const [recentCategories, setRecentCategories] = useState<string[]>([])
  const [mode, setMode] = useState<QuizType | 'auto' | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [sessionLength] = useState(() => {
    try { return parseInt(localStorage.getItem('quiz_session_length') ?? '10') } catch { return 10 }
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [matchState, setMatchState] = useState<MatchState | null>(null)
  const [matchDone, setMatchDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number; totalXp: number } | null>(null)
  const sessionXPRef = useRef(0)
  const startTimeRef = useRef(Date.now())
  const [userStreak, setUserStreak] = useState(0)
  const toast = useToastContext()
  const { data: quizData, loading, reload: reloadQuizData } = usePageCache<QuizData>('quiz-data', fetchQuizData, 60_000)
  const words = quizData?.words ?? []
  const easeMap = quizData?.easeMap ?? {}
  const weakTypeMap = quizData?.weakTypeMap ?? {}
  const interleaveConfig = quizData?.interleaveConfig ?? { newWordRatio: 0.25, categoryPenalty: 0.6 }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fetch user streak once on mount so XP multiplier is accurate
  useEffect(() => {
    getUserStreak().then(setUserStreak).catch(err => console.error('[quiz] getUserStreak:', err))
  }, [])

  // Auto-speak definition when listen_and_choose question is shown
  useEffect(() => {
    if (quiz?.type === 'listen_and_choose' && quiz.question) {
      const timer = setTimeout(() => speakWord(quiz.question), 400)
      return () => clearTimeout(timer)
    }
  }, [quiz?.type, quiz?.question])

  function buildQuiz(type: QuizType): Quiz | null {
    if (type === 'matching') return generateMatching(words)
    const word = pickInterleavedWord(words, easeMap, recentCategories, interleaveConfig.categoryPenalty)
    // Track recent category for next word
    setRecentCategories(prev => {
      const updated = [word.category, ...prev.slice(0, 2)]
      return updated
    })
    if (type === 'mcq') return generateMCQ(word, words, Math.random() > 0.5)
    if (type === 'fill_blank') { const q = generateFillBlank(word); return q || generateMCQ(word, words) }
    if (type === 'translation') return generateTranslation(word)
    if (type === 'spelling') return generateSpelling(word)
    if (type === 'sentence') return generateSentence(word)
    if (type === 'listen_and_choose') {
      const q = generateListenAndChoose(word, words)
      return q || generateMCQ(word, words, true) // fallback to reverse MCQ if not enough words
    }
    if (type === 'collocation_match') {
      const q = generateCollocationMatch(word)
      return q || generateMCQ(word, words) // fallback to MCQ if no collocations data
    }
    return null
  }

  function nextQuiz() {
    if (score.total >= sessionLength) {
      setSessionDone(true)
      const correct = results.filter(r => r.correct).length + (feedback === 'correct' ? 1 : 0)
      const accuracy = Math.round((correct / sessionLength) * 100)
      toast.success(`Session complete! ${accuracy}% accuracy 🎉`)

      // Award accumulated session XP and trigger celebration
      const totalXP = sessionXPRef.current
      sessionXPRef.current = 0
      if (totalXP > 0) {
        awardXP(totalXP).then(result => {
          if (result?.didLevelUp) {
            setShowLevelUp(true)
            setShowConfetti(true)
            setLevelUpData({ oldLevel: result.oldLevel, newLevel: result.newLevel, totalXp: result.totalXp })
            // Fallback: hide confetti after 8s if modal not dismissed
            setTimeout(() => { setShowLevelUp(false); setShowConfetti(false) }, 8000)
          } else if (accuracy >= 80) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 6000)
          }
        }).catch(err => console.error('[quiz] awardXP:', err))
      } else if (accuracy >= 80) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 6000)
      }

      // Track perfect quiz challenge
      if (accuracy === 100) {
        incrementChallengeProgress('perfect_streak').catch(err => console.error('[quiz] challenge:', err))
      }
      return
    }
    const type = mode === 'auto' ? getWeightedQuizType(weakTypeMap) : mode as QuizType
    const q = buildQuiz(type)
    if (!q) return
    setQuiz(q)
    setUserAnswer('')
    setFeedback(null)
    setMatchDone(false)
    startTimeRef.current = Date.now()

    if (type === 'matching' && q.pairs) {
      setMatchState({
        wordOrder: shuffleArray(q.pairs.map(p => p.word)),
        defOrder: shuffleArray(q.pairs.map(p => p.definition)),
        selected: null, matched: {}, wrong: [],
      })
    } else {
      setMatchState(null)
      if (type === 'spelling') setTimeout(() => speakWord(q.word.word), 300)
    }
  }

  function startMode(m: QuizType | 'auto') {
    sessionXPRef.current = 0
    setShowConfetti(false); setShowLevelUp(false); setLevelUpData(null)
    setMode(m); setScore({ correct: 0, total: 0 }); setResults([])
    setSessionDone(false); setQuiz(null)
    const type = m === 'auto' ? getWeightedQuizType(weakTypeMap) : m as QuizType
    const q = buildQuiz(type)
    if (!q) return
    setQuiz(q); setUserAnswer(''); setFeedback(null); setMatchDone(false)
    startTimeRef.current = Date.now()
    if (type === 'matching' && q.pairs) {
      setMatchState({ wordOrder: shuffleArray(q.pairs.map(p => p.word)), defOrder: shuffleArray(q.pairs.map(p => p.definition)), selected: null, matched: {}, wrong: [] })
    } else {
      setMatchState(null)
      if (type === 'spelling') setTimeout(() => speakWord(q.word.word), 300)
    }
  }

  function recordResult(correct: boolean, answer: string) {
    const timeMs = Date.now() - startTimeRef.current
    const type = quiz!.type
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }))
    setResults(prev => [...prev, { word: quiz!.word, type, correct, timeMs }])
    supabase.from('review_logs').insert({ word_id: quiz!.word.id, quiz_type: type, result: correct ? 4 : 0, response_time_ms: timeMs, user_answer: answer, source: 'quiz' })
    if (correct) {
      const easeFactor = easeMap[quiz!.word.id] ?? 2.5
      const xp = calculateReviewXP(easeFactor, userStreak)
      sessionXPRef.current += xp
      showXPPopup(xp)
      incrementChallengeProgress('flashcard_sprint').catch(err => console.error('[quiz] challenge:', err))
    }
  }

  function checkTextAnswer() {
    if (!quiz) return
    const correct = quiz.type === 'sentence'
      ? userAnswer.toLowerCase().includes(quiz.answer.toLowerCase())
      : userAnswer.trim().toLowerCase() === quiz.answer.toLowerCase()
    setFeedback(correct ? 'correct' : 'wrong')
    recordResult(correct, userAnswer)
  }

  function selectMCQ(opt: string) {
    if (feedback) return
    const correct = opt === quiz?.answer
    setUserAnswer(opt)
    setFeedback(correct ? 'correct' : 'wrong')
    recordResult(correct, opt)
  }

  // Matching logic
  function handleMatchClick(item: string, isWord: boolean) {
    if (!matchState || matchDone) return
    const { selected, matched, wrong } = matchState

    if (isWord) {
      setMatchState(prev => prev ? { ...prev, selected: item, wrong: [] } : prev)
    } else {
      // item is a definition — find if selected word matches
      if (!selected) return
      const pair = quiz?.pairs?.find(p => p.word === selected)
      const correct = pair?.definition === item
      if (correct) {
        const newMatched = { ...matched, [selected]: item }
        const newState = { ...matchState, matched: newMatched, selected: null, wrong: [] }
        setMatchState(newState)
        if (Object.keys(newMatched).length === quiz?.pairs?.length) {
          setMatchDone(true)
          setFeedback('correct')
          recordResult(true, JSON.stringify(newMatched))
        }
      } else {
        setMatchState(prev => prev ? { ...prev, wrong: [selected, item], selected: null } : prev)
        setTimeout(() => setMatchState(prev => prev ? { ...prev, wrong: [] } : prev), 600)
      }
    }
  }

  // --- RENDER ---
  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <TextSecondary className="italic">Loading quiz data...</TextSecondary>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <p className="body text-[var(--error)]">{error}</p>
      <button onClick={() => { setError(null); reloadQuizData() }} className="text-sm text-[var(--accent)] underline">
        Try again
      </button>
    </div>
  )

  // MCQ and Matching need 4+ words; other types work with 1 word
  const needsMoreWords = words.length < 1

  // Lottie celebration overlays
  const LottieOverlays = (
    <>
      {showConfetti && (
        <LottiePlayer
          src="/animations/confetti.json"
          variant="cover"
          fallbackMs={5000}
          onComplete={() => setShowConfetti(false)}
        />
      )}
      <LevelUpModal
        isOpen={!!levelUpData}
        oldLevel={levelUpData?.oldLevel ?? 1}
        newLevel={levelUpData?.newLevel ?? 2}
        totalXp={levelUpData?.totalXp ?? 0}
        onClose={() => { setLevelUpData(null); setShowLevelUp(false); setShowConfetti(false) }}
      />
    </>
  )

  // SESSION DONE
  if (sessionDone) {
    const accuracy = results.length > 0 ? Math.round(results.filter(r => r.correct).length / results.length * 100) : 0
    const byType: Record<string, { correct: number; total: number }> = {}
    results.forEach(r => { if (!byType[r.type]) byType[r.type] = { correct: 0, total: 0 }; byType[r.type].total++; if (r.correct) byType[r.type].correct++ })
    const avgTime = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.timeMs, 0) / results.length / 1000) : 0

    return (
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        {LottieOverlays}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Award size={64} className="text-[var(--accent)]" />
          </div>
          <h1 className="h2 text-[var(--text)] mb-2">Quiz Session Complete! 🎉</h1>
          <p className="body text-[var(--text-secondary)]">Great job! Here's your performance breakdown.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Score"
            value={`${results.filter(r => r.correct).length}/${results.length}`}
            color="var(--accent)"
          />
          <StatCard
            label="Accuracy"
            value={`${accuracy}%`}
            color={accuracy >= 80 ? 'var(--success)' : accuracy >= 60 ? 'var(--warning)' : 'var(--error)'}
            trend={{ direction: accuracy >= 60 ? 'up' : 'down', percent: accuracy }}
          />
          <StatCard
            label="Avg Time"
            value={`${avgTime}s`}
            color="var(--accent)"
          />
        </div>

        {/* Accuracy by Type */}
        <SurfaceCard padding="lg">
          <h3 className="h4 text-[var(--text)] mb-4">Accuracy by Quiz Type</h3>
          <div className="space-y-3">
            {Object.entries(byType).map(([type, { correct, total }]) => {
              const pct = Math.round(correct / total * 100)
              const meta = QUIZ_META[type]
              return (
                <div key={type}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="label text-[var(--text)]">{meta?.icon} {meta?.label}</span>
                    <span className="label font-semibold" style={{ color: pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ background: pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)', width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        {/* Wrong Words */}
        {results.filter(r => !r.correct).length > 0 && (
          <SurfaceCard padding="lg">
            <h3 className="h4 text-[var(--text)] mb-3">Words to Review</h3>
            <div className="space-y-2">
              {results.filter(r => !r.correct).map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <XCircle size={16} className="text-[var(--error)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text)] text-sm">{r.word.word}</p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{r.word.definition?.slice(0, 60)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}

        <div className="flex gap-3">
          <InteractiveButton variant="primary" size="lg" className="flex-1" onClick={() => startMode(mode!)}>
            <RotateCcw size={16} className="inline mr-2" />
            Play Again
          </InteractiveButton>
          <InteractiveButton variant="secondary" size="lg" className="flex-1" onClick={() => setMode(null)}>
            Change Mode
          </InteractiveButton>
        </div>
      </div>
    )
  }

  // MODE SELECT
  if (!mode) return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="h2 text-[var(--text)] mb-2">Practice Modes</h1>
        <p className="body text-[var(--text-secondary)]">Choose how you want to practice — {sessionLength} questions per session</p>
      </div>

      {/* Smart Mix - Recommended */}
      <SurfaceCard
        hover
        gradient
        elevation="md"
        className="scale-in cursor-pointer"
        style={{ background: 'var(--gradient-accent-bold)', color: 'white' }}
        onClick={() => startMode('auto')}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shuffle size={20} className="text-white" />
              <h3 className="h4 text-white">Smart Mix</h3>
              <span className="badge bg-white/25 text-white text-xs font-semibold px-2 py-1">RECOMMENDED</span>
            </div>
            <p className="text-sm text-white/90">Auto-weighted: focuses on your weakest areas and challenging words</p>
          </div>
          <ChevronRight size={24} className="text-white" />
        </div>
      </SurfaceCard>

      {/* Quiz Type Cards */}
      {needsMoreWords && (
        <div className="text-center py-8 space-y-4">
          <Target size={48} className="mx-auto text-[var(--accent)]" />
          <h2 className="h3 text-[var(--text)]">No words yet</h2>
          <p className="body text-[var(--text-secondary)]">Add at least one word to start quizzing.</p>
          <a href="/words"><InteractiveButton variant="primary" size="md">Add Words</InteractiveButton></a>
        </div>
      )}
      {!needsMoreWords && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(QUIZ_META).map(([type, { label, icon, desc, color }], idx) => {
          const accuracy = weakTypeMap[type as QuizType]
          const requiresFour = type === 'mcq' || type === 'matching'
          const disabled = requiresFour && words.length < 4
          const stagger = `stagger-${Math.min(idx + 1, 6)}` as string
          return (
            <SurfaceCard
              key={type}
              hover={!disabled}
              elevation="sm"
              className={`scale-in ${stagger} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transition-transform'}`}
              onClick={() => { if (!disabled) startMode(type as QuizType) }}
            >
              <div className="space-y-3">
                <div>
                  <div className="text-3xl mb-2">{icon}</div>
                  <h3 className="h4 text-[var(--text)]" style={{ color }}>{label}</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
                {disabled && <p className="text-xs font-semibold text-[var(--warning)]">⚠ Needs 4+ words</p>}

                {accuracy !== undefined && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="label text-[var(--text-secondary)]">Your accuracy</span>
                      <span className="label font-semibold" style={{ color: accuracy >= 80 ? 'var(--success)' : accuracy >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                        {accuracy}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ background: accuracy >= 80 ? 'var(--success)' : accuracy >= 60 ? 'var(--warning)' : 'var(--error)', width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SurfaceCard>
          )
        })}
      </div>}
    </div>
  )

  const meta = quiz ? QUIZ_META[quiz.type] : null
  const progress = (score.total / sessionLength) * 100

  return (
    <div className="fade-in max-w-[600px] mx-auto">
      {/* Progress header */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => setMode(null)}
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors flex items-center gap-1"
          >
            ← Change Mode
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--text-secondary)]">{score.total}/{sessionLength}</span>
            <span className="text-[13px] font-bold text-[var(--success)]">{score.correct} ✓</span>
            {score.total - score.correct > 0 && (
              <span className="text-[13px] font-bold text-[var(--error)]">{score.total - score.correct} ✗</span>
            )}
          </div>
        </div>
        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ background: 'var(--accent)', width: `${progress}%` }}
          />
        </div>
      </div>

      {quiz && (
        <>
          {/* Quiz card */}
          <div className="card mb-4" style={{ padding: '24px 22px' }}>
            {/* Type badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-semibold" style={{ color: meta?.color }}>
                {meta?.icon} {meta?.label}
              </span>
              {mode === 'auto' && (
                <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                  Smart Mix
                </span>
              )}
            </div>

            {/* SPELLING: big audio button */}
            {quiz.type === 'spelling' && (
              <div className="text-center mb-5">
                <button
                  onClick={() => speakWord(quiz.word.word)}
                  className="w-20 h-20 rounded-full bg-[var(--accent)] text-white border-none cursor-pointer flex items-center justify-center mx-auto mb-2.5 transition-transform hover:scale-105 active:scale-95"
                >
                  <Volume2 size={30} />
                </button>
                <p className="text-[13px] text-[var(--text-secondary)]">Click to hear the word, then spell it below</p>
              </div>
            )}

            {/* LISTEN & CHOOSE: auto-plays TTS, replay button */}
            {quiz.type === 'listen_and_choose' && (
              <div className="text-center mb-5">
                <button
                  onClick={() => speakWord(quiz.question)}
                  className="w-20 h-20 rounded-full bg-[var(--accent)] text-white border-none cursor-pointer flex items-center justify-center mx-auto mb-2.5 transition-transform hover:scale-105 active:scale-95"
                >
                  <Headphones size={30} />
                </button>
                <p className="text-[13px] text-[var(--text-secondary)]">Click to hear the definition again, then choose the word</p>
              </div>
            )}

            {quiz.type !== 'listen_and_choose' && (
              <h3
                className="text-[var(--text)] leading-relaxed mb-5"
                style={{ fontSize: quiz.type === 'matching' ? 17 : 19, fontWeight: 600 }}
              >
                {quiz.question}
              </h3>
            )}
            {quiz.type === 'listen_and_choose' && (
              <h3 className="text-[var(--text)] leading-relaxed mb-5 text-center" style={{ fontSize: 17, fontWeight: 600 }}>
                🎧 What word matches this definition?
              </h3>
            )}

            {/* MCQ */}
            {(quiz.type === 'mcq' || quiz.type === 'listen_and_choose' || quiz.type === 'collocation_match') && (
              <div className="grid grid-cols-2 gap-2.5">
                {quiz.options?.map(opt => {
                  const isCorrect = feedback && opt === quiz.answer
                  const isWrong = feedback === 'wrong' && opt === userAnswer
                  return (
                    <button
                      key={opt}
                      onClick={() => selectMCQ(opt)}
                      disabled={!!feedback}
                      aria-label={`Option: ${opt}`}
                      className={cn(
                        'p-3.5 rounded-xl border-2 text-left text-[13px] font-semibold transition-all duration-150 leading-snug',
                        isCorrect
                          ? 'correct-flash border-[var(--success)] text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]'
                          : isWrong
                          ? 'shake border-[var(--error)] text-[var(--error)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)]'
                          : feedback
                          ? 'border-[var(--border)] text-[var(--text-secondary)] opacity-60'
                          : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] cursor-pointer'
                      )}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* MATCHING */}
            {quiz.type === 'matching' && matchState && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold mb-0.5">Words</p>
                  {matchState.wordOrder.map(word => {
                    const isMatched = matchState.matched[word]
                    const isSelected = matchState.selected === word
                    const isWrong = matchState.wrong.includes(word)
                    return (
                      <button
                        key={word}
                        onClick={() => !isMatched && handleMatchClick(word, true)}
                        disabled={!!isMatched || matchDone}
                        className={cn(
                          'p-2.5 rounded-lg border-2 text-left text-[13px] font-bold transition-all duration-150',
                          isMatched
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-400 cursor-default'
                            : isSelected
                            ? 'border-[var(--accent)] bg-amber-50 dark:bg-amber-950/20 text-[var(--text)] cursor-pointer'
                            : isWrong
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)] cursor-pointer hover:border-[var(--accent)]'
                        )}
                      >
                        {word} {isMatched && '✓'}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold mb-0.5">Definitions</p>
                  {matchState.defOrder.map(def => {
                    const matchedWord = Object.entries(matchState.matched).find(([, d]) => d === def)?.[0]
                    const isMatched = !!matchedWord
                    const isWrong = matchState.wrong.includes(def)
                    return (
                      <button
                        key={def}
                        onClick={() => !isMatched && matchState.selected && handleMatchClick(def, false)}
                        disabled={isMatched || matchDone || !matchState.selected}
                        className={cn(
                          'p-2.5 rounded-lg border-2 text-left text-[12px] transition-all duration-150 leading-snug',
                          isMatched
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-400 cursor-default'
                            : isWrong
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                            : matchState.selected
                            ? 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)] cursor-pointer hover:border-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] cursor-default'
                        )}
                      >
                        {def?.slice(0, 60)}{(def?.length || 0) > 60 ? '...' : ''} {isMatched && '✓'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TEXT INPUT types */}
            {(quiz.type === 'fill_blank' || quiz.type === 'translation' || quiz.type === 'spelling' || quiz.type === 'sentence') && (
              <div className="space-y-2">
                <input
                  className={cn(
                    'input',
                    feedback === 'correct' && 'border-green-500',
                    feedback === 'wrong' && 'border-red-500'
                  )}
                  autoFocus
                  placeholder={quiz.type === 'sentence' ? `Write a sentence with "${quiz.word.word}"...` : 'Type your answer...'}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (feedback || matchDone) { nextQuiz(); return }
                      if (!feedback && userAnswer.trim()) checkTextAnswer()
                    }
                  }}
                  disabled={!!feedback}
                />
                {quiz.hint && !feedback && (
                  <p className="text-[12px] text-[var(--text-secondary)] italic">Hint: {quiz.hint}</p>
                )}
                {!feedback && (
                  <button
                    className="btn-primary w-full py-2.5 mt-1"
                    onClick={checkTextAnswer}
                    disabled={!userAnswer.trim()}
                  >
                    Check Answer
                  </button>
                )}
                {quiz.type === 'spelling' && !feedback && (
                  <button
                    onClick={() => speakWord(quiz.word.word)}
                    className="w-full py-2 bg-transparent border border-[var(--border)] rounded-lg cursor-pointer text-[var(--text-secondary)] text-[13px] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Volume2 size={14} /> Hear again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Feedback panel */}
          {(feedback || matchDone) && (
            <div className={cn(
              'fade-in card mb-3',
              feedback === 'correct'
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                : 'border-red-500 bg-red-50 dark:bg-red-950/20'
            )}>
              <div className="flex items-center gap-2.5 mb-3">
                {feedback === 'correct'
                  ? <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  : <XCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                <span className={cn(
                  'font-bold text-[16px]',
                  feedback === 'correct' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                )}>
                  {feedback === 'correct'
                    ? (matchDone ? 'All matched! 🎉' : 'Correct! 🎉')
                    : `Wrong — answer: ${quiz.type !== 'matching' ? quiz.answer : ''}`}
                </span>
              </div>

              {quiz.type !== 'matching' && (
                <div className="mb-3 space-y-1.5">
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    <strong className="text-[var(--text)]">{quiz.word.word}</strong>
                    {quiz.word.part_of_speech && (
                      <span className="text-[var(--accent)] ml-1.5">({quiz.word.part_of_speech})</span>
                    )}
                  </p>
                  <p className="text-[13px] text-[var(--text)]">{quiz.word.definition}</p>
                  {quiz.word.mongolian && (
                    <p className="text-[12px] text-[var(--text-secondary)] italic">{quiz.word.mongolian}</p>
                  )}
                  {(quiz.word.examples as string[] || [])[0] && (
                    <p className="text-[12px] italic bg-[var(--bg)] px-3 py-2 rounded-lg text-[var(--text-secondary)]">
                      &ldquo;{(quiz.word.examples as string[])[0]}&rdquo;
                    </p>
                  )}
                </div>
              )}

              <button
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                onClick={nextQuiz}
              >
                {score.total >= sessionLength - 1
                  ? <><Award size={15} /> Finish Session</>
                  : <>Next Question <ChevronRight size={15} /></>}
              </button>
            </div>
          )}

          {/* Skip button when no feedback */}
          {!feedback && !matchDone && (
            <div className="text-right">
              <button
                onClick={() => { if (submitting) return; setSubmitting(true); nextQuiz(); setSubmitting(false) }}
                disabled={submitting}
                className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw size={11} /> Skip
              </button>
            </div>
          )}
        </>
      )}

      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} page="quiz" />
    </div>
  )
}

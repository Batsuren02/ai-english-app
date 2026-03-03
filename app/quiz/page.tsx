'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase, Word, UserProfile } from '@/lib/supabase'
import {
  generateMCQ, generateFillBlank, generateTranslation,
  generateSpelling, generateSentence, generateMatching,
  getWeightedQuizType, pickWeightedWord, shuffleArray,
  Quiz, QuizType
} from '@/lib/quiz-generator'
import { pickInterleavedWord, parseInterleaveConfig } from '@/lib/interleaving'
import { CheckCircle, XCircle, Volume2, RotateCcw, Award, ChevronRight, Shuffle, Target, Zap } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import { TextPrimary, TextSecondary } from '@/components/design/Text'

const QUIZ_META: Record<string, { label: string; icon: string; desc: string; color: string }> = {
  mcq:         { label: 'Multiple Choice', icon: '🔤', desc: 'Choose the correct word from 4 options', color: '#2563eb' },
  fill_blank:  { label: 'Fill in the Blank', icon: '✏️', desc: 'Complete the sentence with the missing word', color: '#7c3aed' },
  spelling:    { label: 'Spelling', icon: '🔊', desc: 'Hear the word and spell it correctly', color: '#0891b2' },
  matching:    { label: 'Matching', icon: '🔗', desc: 'Match 5 words to their definitions', color: '#d97706' },
  translation: { label: 'Translation', icon: '🌏', desc: 'Translate from Mongolian to English', color: '#16a34a' },
  sentence:    { label: 'Sentence Writing', icon: '📝', desc: 'Use the word in your own sentence', color: '#dc2626' },
}

type SessionResult = { word: Word; type: QuizType; correct: boolean; timeMs: number }
type MatchState = { wordOrder: string[]; defOrder: string[]; selected: string | null; matched: Record<string, string>; wrong: string[] }

export default function QuizPage() {
  const [words, setWords] = useState<Word[]>([])
  const [easeMap, setEaseMap] = useState<Record<string, number>>({})
  const [weakTypeMap, setWeakTypeMap] = useState<Partial<Record<QuizType, number>>>({})
  const [interleaveConfig, setInterleaveConfig] = useState({ newWordRatio: 0.25, categoryPenalty: 0.6 })
  const [recentCategories, setRecentCategories] = useState<string[]>([])
  const [mode, setMode] = useState<QuizType | 'auto' | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [results, setResults] = useState<SessionResult[]>([])
  const [sessionDone, setSessionDone] = useState(false)
  const [sessionLength] = useState(10)
  const [loading, setLoading] = useState(true)
  const [matchState, setMatchState] = useState<MatchState | null>(null)
  const [matchDone, setMatchDone] = useState(false)
  const startTimeRef = useRef(Date.now())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [wordsRes, reviewsRes, logsRes, profileRes] = await Promise.all([
      supabase.from('words').select('*'),
      supabase.from('reviews').select('word_id, ease_factor'),
      supabase.from('review_logs').select('quiz_type, result').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('user_profile').select('interleave_ratio, interleave_category_penalty').single(),
    ])
    if (wordsRes.data) setWords(wordsRes.data)
    if (reviewsRes.data) {
      const em: Record<string, number> = {}
      reviewsRes.data.forEach((r: any) => em[r.word_id] = r.ease_factor)
      setEaseMap(em)
    }
    if (logsRes.data) {
      const byType: Record<string, { correct: number; total: number }> = {}
      logsRes.data.forEach((l: any) => {
        if (!byType[l.quiz_type]) byType[l.quiz_type] = { correct: 0, total: 0 }
        byType[l.quiz_type].total++
        if (l.result >= 3) byType[l.quiz_type].correct++
      })
      const wm: Partial<Record<QuizType, number>> = {}
      for (const [type, { correct, total }] of Object.entries(byType)) {
        wm[type as QuizType] = total ? Math.round(correct / total * 100) : 50
      }
      setWeakTypeMap(wm)
    }
    if (profileRes.data) {
      const config = parseInterleaveConfig(profileRes.data)
      setInterleaveConfig(config)
    }
    setLoading(false)
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'; u.rate = 0.82
      window.speechSynthesis.speak(u)
    }
  }

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
    return null
  }

  function nextQuiz() {
    if (score.total >= sessionLength) { setSessionDone(true); return }
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
      if (type === 'spelling') setTimeout(() => speak(q.word.word), 300)
    }
  }

  function startMode(m: QuizType | 'auto') {
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
      if (type === 'spelling') setTimeout(() => speak(q.word.word), 300)
    }
  }

  function recordResult(correct: boolean, answer: string) {
    const timeMs = Date.now() - startTimeRef.current
    const type = quiz!.type
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }))
    setResults(prev => [...prev, { word: quiz!.word, type, correct, timeMs }])
    supabase.from('review_logs').insert({ word_id: quiz!.word.id, quiz_type: type, result: correct ? 4 : 0, response_time_ms: timeMs, user_answer: answer, source: 'quiz' })
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

  if (words.length < 4) return (
    <div className="text-center py-20 space-y-4">
      <Target size={48} className="mx-auto text-[var(--accent)]" />
      <h2 className="h3 text-[var(--text)]">Not enough words yet</h2>
      <p className="body text-[var(--text-secondary)]">You need at least 4 words to start quizzing.</p>
      <a href="/words">
        <InteractiveButton variant="primary" size="md">
          Add Words to Quiz
        </InteractiveButton>
      </a>
    </div>
  )

  // SESSION DONE
  if (sessionDone) {
    const accuracy = Math.round(results.filter(r => r.correct).length / results.length * 100)
    const byType: Record<string, { correct: number; total: number }> = {}
    results.forEach(r => { if (!byType[r.type]) byType[r.type] = { correct: 0, total: 0 }; byType[r.type].total++; if (r.correct) byType[r.type].correct++ })
    const avgTime = Math.round(results.reduce((a, r) => a + r.timeMs, 0) / results.length / 1000)

    return (
      <div className="fade-in max-w-2xl mx-auto space-y-6">
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
            color={accuracy >= 80 ? 'var(--success)' : accuracy >= 60 ? '#d97706' : 'var(--error)'}
            trend={{ direction: accuracy >= 60 ? 'up' : 'down', percent: accuracy }}
          />
          <StatCard
            label="Avg Time"
            value={`${avgTime}s`}
            color="#2563eb"
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
                    <span className="label font-semibold" style={{ color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ background: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626', width: `${pct}%` }}
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
        className="bg-gradient-to-br from-amber-600 to-amber-700 text-white cursor-pointer"
        onClick={() => startMode('auto')}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shuffle size={20} />
              <h3 className="h4 text-white">Smart Mix</h3>
              <span className="badge bg-white/25 text-white text-xs font-semibold px-2 py-1">RECOMMENDED</span>
            </div>
            <p className="text-sm opacity-90">Auto-weighted: focuses on your weakest areas and challenging words</p>
          </div>
          <ChevronRight size={24} />
        </div>
      </SurfaceCard>

      {/* Quiz Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(QUIZ_META).map(([type, { label, icon, desc, color }]) => {
          const accuracy = weakTypeMap[type as QuizType]
          return (
            <SurfaceCard
              key={type}
              hover
              elevation="sm"
              className="cursor-pointer transition-transform"
              onClick={() => startMode(type as QuizType)}
            >
              <div className="space-y-3">
                <div>
                  <div className="text-3xl mb-2">{icon}</div>
                  <h3 className="h4 text-[var(--text)]" style={{ color }}>{label}</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{desc}</p>

                {accuracy !== undefined && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="label text-[var(--text-secondary)]">Your accuracy</span>
                      <span className="label font-semibold" style={{ color: accuracy >= 80 ? '#16a34a' : accuracy >= 60 ? '#d97706' : '#dc2626' }}>
                        {accuracy}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ background: accuracy >= 80 ? '#16a34a' : accuracy >= 60 ? '#d97706' : '#dc2626', width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SurfaceCard>
          )
        })}
      </div>
    </div>
  )

  const meta = quiz ? QUIZ_META[quiz.type] : null
  const progress = (score.total / sessionLength) * 100

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Progress header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)', fontSize: 14, padding: 0 }}>← Change Mode</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-light)' }}>{score.total}/{sessionLength}</span>
            <span style={{ fontWeight: 700, color: '#16a34a' }}>{score.correct} ✓</span>
            {score.total - score.correct > 0 && <span style={{ fontWeight: 700, color: '#dc2626' }}>{score.total - score.correct} ✗</span>}
          </div>
        </div>
        <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
          <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {quiz && (
        <>
          {/* Quiz card */}
          <div className="card" style={{ padding: '28px 24px', marginBottom: 16 }}>
            {/* Type badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: meta?.color }}>
                {meta?.icon} {meta?.label}
              </span>
              {mode === 'auto' && <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>Smart Mix</span>}
            </div>

            {/* SPELLING: big audio button */}
            {quiz.type === 'spelling' && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <button onClick={() => speak(quiz.word.word)} style={{
                  width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', color: 'white',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', transition: 'transform 0.1s'
                }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')} onMouseUp={e => (e.currentTarget.style.transform = '')}>
                  <Volume2 size={32} />
                </button>
                <p style={{ fontSize: 13, color: 'var(--ink-light)' }}>Click the button to hear the word, then spell it below</p>
              </div>
            )}

            <h3 style={{ fontSize: quiz.type === 'matching' ? 18 : 20, lineHeight: 1.55, marginBottom: 20 }}>{quiz.question}</h3>

            {/* MCQ */}
            {quiz.type === 'mcq' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {quiz.options?.map(opt => {
                  let bg = 'var(--bg)', border = 'var(--border)', color = 'var(--ink)'
                  if (feedback) {
                    if (opt === quiz.answer) { bg = 'rgba(22, 163, 74, 0.1)'; border = '#16a34a'; color = '#16a34a' }
                    else if (opt === userAnswer && feedback === 'wrong') { bg = 'rgba(220, 38, 38, 0.1)'; border = '#dc2626'; color = '#dc2626' }
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => selectMCQ(opt)}
                      disabled={!!feedback}
                      aria-label={`Option: ${opt}${feedback === 'correct' && opt === quiz.answer ? ' (correct)' : ''}`}
                      role="radio"
                      aria-checked={userAnswer === opt}
                      style={{
                        padding: '14px 10px', background: bg, border: `2px solid ${border}`, borderRadius: 10,
                        cursor: feedback ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14,
                        color, fontWeight: 600, transition: 'all 0.18s', textAlign: 'left', lineHeight: 1.4,
                      }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* MATCHING */}
            {quiz.type === 'matching' && matchState && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Words</p>
                  {matchState.wordOrder.map(word => {
                    const isMatched = matchState.matched[word]
                    const isSelected = matchState.selected === word
                    const isWrong = matchState.wrong.includes(word)
                    return (
                      <button
                        key={word}
                        onClick={() => !isMatched && handleMatchClick(word, true)}
                        disabled={!!isMatched || matchDone}
                        aria-label={`Word: ${word}${isMatched ? ' (matched)' : isSelected ? ' (selected)' : ''}`}
                        aria-pressed={isSelected}
                        style={{
                          padding: '10px 12px', borderRadius: 8, border: `2px solid ${isMatched ? '#16a34a' : isSelected ? 'var(--accent)' : isWrong ? '#dc2626' : 'var(--border)'}`,
                          background: isMatched ? 'rgba(22, 163, 74, 0.1)' : isSelected ? 'rgba(var(--accent-rgb), 0.1)' : isWrong ? 'rgba(220, 38, 38, 0.1)' : 'var(--bg)',
                          color: isMatched ? '#16a34a' : 'var(--ink)', fontWeight: 700, cursor: isMatched ? 'default' : 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: 14, textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        {word} {isMatched && '✓'}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Definitions</p>
                  {matchState.defOrder.map(def => {
                    const matchedWord = Object.entries(matchState.matched).find(([, d]) => d === def)?.[0]
                    const isMatched = !!matchedWord
                    const isWrong = matchState.wrong.includes(def)
                    return (
                      <button key={def} onClick={() => !isMatched && matchState.selected && handleMatchClick(def, false)}
                        disabled={isMatched || matchDone || !matchState.selected} style={{
                          padding: '10px 12px', borderRadius: 8, border: `2px solid ${isMatched ? '#16a34a' : isWrong ? '#dc2626' : matchState.selected ? 'var(--accent)' : 'var(--border)'}`,
                          background: isMatched ? 'rgba(22, 163, 74, 0.1)' : isWrong ? 'rgba(220, 38, 38, 0.1)' : 'var(--bg)',
                          color: isMatched ? '#16a34a' : 'var(--ink)', cursor: isMatched ? 'default' : matchState.selected ? 'pointer' : 'default',
                          fontFamily: 'var(--font-body)', fontSize: 12, textAlign: 'left', lineHeight: 1.4, transition: 'all 0.15s',
                        }}>
                        {def?.slice(0, 60)}{(def?.length || 0) > 60 ? '...' : ''} {isMatched && '✓'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TEXT INPUT types */}
            {(quiz.type === 'fill_blank' || quiz.type === 'translation' || quiz.type === 'spelling' || quiz.type === 'sentence') && (
              <div>
                <input
                  className="input"
                  autoFocus
                  placeholder={quiz.type === 'sentence' ? `Write a sentence with "${quiz.word.word}"...` : 'Type your answer...'}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !feedback && userAnswer.trim()) checkTextAnswer() }}
                  disabled={!!feedback}
                  style={{
                    fontSize: 16, marginBottom: quiz.hint && !feedback ? 0 : 12,
                    border: feedback ? `2px solid ${feedback === 'correct' ? '#16a34a' : '#dc2626'}` : undefined,
                  }}
                />
                {quiz.hint && !feedback && (
                  <p style={{ fontSize: 12, color: 'var(--ink-light)', margin: '6px 0 12px', fontStyle: 'italic' }}>Hint: {quiz.hint}</p>
                )}
                {!feedback && (
                  <button className="btn-primary" onClick={checkTextAnswer} disabled={!userAnswer.trim()} style={{ width: '100%', marginTop: 8 }}>
                    Check Answer
                  </button>
                )}
                {quiz.type === 'spelling' && !feedback && (
                  <button onClick={() => speak(quiz.word.word)} style={{ marginTop: 8, width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'var(--ink-light)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Volume2 size={14} /> Hear again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Feedback panel */}
          {(feedback || matchDone) && (
            <div className="fade-in card" style={{
              padding: '20px 24px', marginBottom: 12,
              background: feedback === 'correct' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
              borderColor: feedback === 'correct' ? '#16a34a' : '#dc2626',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {feedback === 'correct'
                  ? <CheckCircle size={22} style={{ color: '#16a34a' }} />
                  : <XCircle size={22} style={{ color: '#dc2626' }} />}
                <span style={{ fontWeight: 700, fontSize: 17, color: feedback === 'correct' ? '#16a34a' : '#dc2626' }}>
                  {feedback === 'correct'
                    ? (matchDone ? 'All matched! 🎉' : 'Correct! 🎉')
                    : `Wrong — answer: ${quiz.type !== 'matching' ? quiz.answer : ''}`}
                </span>
              </div>

              {quiz.type !== 'matching' && (
                <>
                  <p style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 4 }}>
                    <strong>{quiz.word.word}</strong>
                    {quiz.word.part_of_speech && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>({quiz.word.part_of_speech})</span>}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--ink)' }}>{quiz.word.definition}</p>
                  {quiz.word.mongolian && <p style={{ fontSize: 13, color: 'var(--ink-light)', fontStyle: 'italic', marginTop: 2 }}>{quiz.word.mongolian}</p>}
                  {(quiz.word.examples as string[] || [])[0] && (
                    <p style={{ fontSize: 13, marginTop: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontStyle: 'italic' }}>
                      "{(quiz.word.examples as string[])[0]}"
                    </p>
                  )}
                </>
              )}

              <button className="btn-primary" onClick={nextQuiz} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {score.total >= sessionLength - 1 ? <><Award size={16} /> Finish Session</> : <>Next Question <ChevronRight size={16} /></>}
              </button>
            </div>
          )}

          {/* Skip button when no feedback */}
          {!feedback && !matchDone && (
            <div style={{ textAlign: 'right' }}>
              <button onClick={nextQuiz} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={12} /> Skip
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

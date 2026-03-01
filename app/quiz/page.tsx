'use client'
import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { generateMCQ, generateFillBlank, generateTranslation, generateSpelling, generateSentence, Quiz } from '@/lib/quiz-generator'
import { CheckCircle, XCircle, Volume2, RotateCcw } from 'lucide-react'

const QUIZ_TYPES = [
  { type: 'mcq', label: 'Multiple Choice', desc: 'Choose the correct word', icon: '🔤' },
  { type: 'fill_blank', label: 'Fill in Blank', desc: 'Complete the sentence', icon: '✏️' },
  { type: 'spelling', label: 'Spelling', desc: 'Type what you hear', icon: '🔊' },
  { type: 'translation', label: 'Translation', desc: 'Mongolian → English', icon: '🌏' },
  { type: 'sentence', label: 'Sentence Writing', desc: 'Use the word in a sentence', icon: '📝' },
]

export default function QuizPage() {
  const [words, setWords] = useState<Word[]>([])
  const [mode, setMode] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('words').select('*').then(({ data }) => {
      if (data) setWords(data)
      setLoading(false)
    })
  }, [])

  function generateQuiz(type: string) {
    const available = words.filter(w => !usedWords.has(w.id))
    const pool = available.length > 0 ? available : words
    if (pool.length === 0) return

    const word = pool[Math.floor(Math.random() * pool.length)]
    let q: Quiz | null = null

    if (type === 'mcq') q = generateMCQ(word, words)
    else if (type === 'fill_blank') { q = generateFillBlank(word); if (!q) return generateQuiz(type) }
    else if (type === 'translation') q = generateTranslation(word)
    else if (type === 'spelling') q = generateSpelling(word)
    else if (type === 'sentence') q = generateSentence(word)

    if (q) { setQuiz(q); setUserAnswer(''); setFeedback(null) }
  }

  function startMode(type: string) {
    setMode(type)
    setScore({ correct: 0, total: 0 })
    setUsedWords(new Set())
    generateQuiz(type)
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85
      window.speechSynthesis.speak(u)
    }
  }

  function checkAnswer() {
    if (!quiz) return
    const correct = quiz.type === 'sentence'
      ? userAnswer.toLowerCase().includes(quiz.answer)
      : userAnswer.trim().toLowerCase() === quiz.answer.toLowerCase()
    setFeedback(correct ? 'correct' : 'wrong')
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }))
    if (quiz.word) setUsedWords(prev => new Set(Array.from(prev).concat([quiz.word.id])))

    // Log to DB
    supabase.from('review_logs').insert({
      word_id: quiz.word.id,
      quiz_type: quiz.type,
      result: correct ? 4 : 0,
      user_answer: userAnswer,
    })
  }

  function nextQuestion() {
    if (mode) generateQuiz(mode)
  }

  function selectMCQ(option: string) {
    if (feedback) return
    setUserAnswer(option)
    const correct = option === quiz?.answer
    setFeedback(correct ? 'correct' : 'wrong')
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }))
    if (quiz?.word) setUsedWords(prev => new Set(Array.from(prev).concat([quiz.word.id])))
    supabase.from('review_logs').insert({
      word_id: quiz?.word.id,
      quiz_type: 'mcq',
      result: correct ? 4 : 0,
      user_answer: option,
    })
  }

  if (loading) return <div style={{ color: 'var(--ink-light)' }}>Loading...</div>

  if (words.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-light)' }}>
      <p style={{ marginBottom: 16 }}>Add some words first to start quizzing!</p>
      <a href="/words" style={{ color: 'var(--accent)' }}>Go to Words →</a>
    </div>
  )

  if (!mode) return (
    <div className="fade-in">
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Quiz Mode</h2>
      <p style={{ color: 'var(--ink-light)', marginBottom: 28 }}>Choose a quiz type to practice</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {QUIZ_TYPES.map(({ type, label, desc, icon }) => (
          <div key={type} className="card" onClick={() => startMode(type)}
            style={{ padding: '24px 20px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>{label}</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-light)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 580, margin: '0 auto' }}>
      {/* Score & nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={() => setMode(null)} className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }}>← Back</button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{score.correct}</span>
          <span style={{ color: 'var(--ink-light)' }}> / {score.total} correct</span>
        </div>
        <button onClick={nextQuestion} className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RotateCcw size={13} /> Skip
        </button>
      </div>

      {quiz && (
        <div>
          <div className="card" style={{ padding: '28px 24px', marginBottom: 20 }}>
            {/* Quiz type label */}
            <span className="badge" style={{ marginBottom: 16 }}>{QUIZ_TYPES.find(q => q.type === mode)?.label}</span>

            {quiz.type === 'spelling' && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <button onClick={() => speak(quiz.word.word)} style={{
                  background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%',
                  width: 64, height: 64, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                }}>
                  <Volume2 size={26} />
                </button>
                <p style={{ color: 'var(--ink-light)', fontSize: 14 }}>Click to hear the word, then spell it</p>
              </div>
            )}

            <h3 style={{ fontSize: 20, marginBottom: quiz.type === 'mcq' ? 24 : 16, lineHeight: 1.5 }}>{quiz.question}</h3>

            {quiz.type === 'mcq' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {quiz.options?.map(opt => {
                  let bg = 'var(--bg)', border = 'var(--border)', color = 'var(--ink)'
                  if (feedback) {
                    if (opt === quiz.answer) { bg = '#dcfce7'; border = '#16a34a'; color = '#166534' }
                    else if (opt === userAnswer && opt !== quiz.answer) { bg = '#fee2e2'; border = '#dc2626'; color = '#991b1b' }
                  }
                  return (
                    <button key={opt} onClick={() => selectMCQ(opt)} disabled={!!feedback}
                      style={{ padding: '14px', background: bg, border: `2px solid ${border}`, borderRadius: 10, cursor: feedback ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, color, fontWeight: 600, transition: 'all 0.2s' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div>
                <input
                  className="input"
                  placeholder={quiz.type === 'sentence' ? `Write a sentence using "${quiz.word.word}"...` : 'Type your answer...'}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !feedback && userAnswer && checkAnswer()}
                  disabled={!!feedback}
                  style={{ fontSize: 16, marginBottom: 12, border: feedback ? (feedback === 'correct' ? '2px solid #16a34a' : '2px solid #dc2626') : undefined }}
                />
                {quiz.hint && !feedback && <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 12, fontStyle: 'italic' }}>Hint: {quiz.hint}</p>}
                {!feedback && (
                  <button className="btn-primary" onClick={checkAnswer} disabled={!userAnswer} style={{ width: '100%' }}>
                    Check Answer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="fade-in card" style={{ padding: '20px 24px', background: feedback === 'correct' ? '#f0fdf4' : '#fff1f2', borderColor: feedback === 'correct' ? '#16a34a' : '#dc2626', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {feedback === 'correct'
                  ? <CheckCircle size={22} style={{ color: '#16a34a' }} />
                  : <XCircle size={22} style={{ color: '#dc2626' }} />}
                <span style={{ fontWeight: 700, color: feedback === 'correct' ? '#166534' : '#991b1b', fontSize: 16 }}>
                  {feedback === 'correct' ? 'Correct! 🎉' : `Wrong. Answer: ${quiz.answer}`}
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-light)' }}>{quiz.word.definition}</p>
              {(quiz.word.examples as string[] || [])[0] && (
                <p style={{ fontSize: 13, fontStyle: 'italic', marginTop: 6, color: 'var(--ink-light)' }}>"{(quiz.word.examples as string[])[0]}"</p>
              )}
              <button className="btn-primary" onClick={nextQuestion} style={{ marginTop: 14, width: '100%' }}>
                Next Question →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { tokenizeText, getUniqueWords, markKnownTokens, calculateComprehension, getUnknownWords, Token, buildHighlightedTokens } from '@/lib/text-tokenizer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, BookOpen, Plus, X } from 'lucide-react'

type Phase = 'input' | 'analyze' | 'reading'

interface HighlightedSegment {
  text: string
  isHighlighted: boolean
  isKnown?: boolean
}

export default function ReadingPage() {
  const [phase, setPhase] = useState<Phase>('input')
  const [textInput, setTextInput] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [comprehension, setComprehension] = useState<{ percentage: number; knownCount: number; totalCount: number } | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [unknownWords, setUnknownWords] = useState<string[]>([])
  const [sessionsAdded, setSessionsAdded] = useState<string[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  // Load all words on mount
  useEffect(() => {
    loadWords()
  }, [])

  const loadWords = async () => {
    try {
      const { data } = await supabase.from('words').select('*')
      if (data) setWords(data)
    } catch (err) {
      console.error('Failed to load words:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!textInput.trim()) return

    setAnalyzing(true)
    try {
      // Tokenize the text
      const parsedTokens = tokenizeText(textInput)

      // Get unique words for vocabulary check
      const uniqueWords = getUniqueWords(parsedTokens)
      const knownWordSet = new Set(words.map((w) => w.word.toLowerCase()))

      // Mark tokens as known/unknown
      const markedTokens = markKnownTokens(parsedTokens, knownWordSet)

      // Calculate comprehension
      const comp = calculateComprehension(markedTokens)

      // Get unknown words
      const unknown = getUnknownWords(markedTokens)

      // Create reading session
      const { data: sessionData } = await supabase
        .from('reading_sessions')
        .insert({
          text_content: textInput,
          word_count: textInput.split(/\s+/).length,
          unknown_count: unknown.length,
          comprehension_level: comp.percentage,
        })
        .select()
        .single()

      if (sessionData) {
        setSessionId(sessionData.id)

        // Create reading_session_words entries for unknown words
        const wordIds = unknown
          .map(w => words.find(word => word.word.toLowerCase() === w.toLowerCase())?.id)
          .filter(Boolean)

        if (wordIds.length > 0) {
          await supabase.from('reading_session_words').insert(
            wordIds.map(wordId => ({
              session_id: sessionData.id,
              word_id: wordId,
            }))
          )
        }
      }

      setTokens(markedTokens)
      setComprehension(comp)
      setUnknownWords(unknown)
      setPhase('reading')
    } catch (err) {
      console.error('Failed to analyze text:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAddWord = async (word: string) => {
    if (sessionsAdded.includes(word)) return

    try {
      // Create minimal word entry
      const { data } = await supabase
        .from('words')
        .insert({
          word: word.toLowerCase(),
          definition: '',
          mongolian: '',
          part_of_speech: '',
          ipa: '',
          examples: [],
          word_family: [],
          collocations: [],
          confused_with: [],
          etymology_hint: '',
          category: 'daily',
          cefr_level: 'B1',
          goal_tag: 'general',
          notes: `Added from reading mode`,
          audio_url: '',
        })
        .select()
        .single()

      if (data) {
        // Create review entry
        await supabase.from('reviews').insert({ word_id: data.id })

        // Award XP for adding word from reading
        const { data: prof } = await supabase.from('user_profile').select('id, total_xp').single()
        if (prof) {
          await supabase.from('user_profile').update({ total_xp: (prof.total_xp || 0) + 5 }).eq('id', prof.id)
        }

        // Update local state
        setWords([...words, data])
        setSessionsAdded([...sessionsAdded, word])
      }
    } catch (err) {
      console.error('Failed to add word:', err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center text-[var(--text-secondary)]">Loading your vocabulary...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--text)] mb-2">Reading Mode</h1>
        <p className="text-[var(--text-secondary)]">Paste text and learn unknown words instantly</p>
      </div>

      {phase === 'input' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Paste your text</label>
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste an article, book excerpt, or any English text here..."
              className="min-h-64"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {textInput.length} characters · ~{Math.ceil(textInput.split(/\s+/).length)} words
            </p>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!textInput.trim() || analyzing}
            className="w-full"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Text'}
          </Button>
        </div>
      )}

      {phase === 'reading' && tokens.length > 0 && (
        <div className="space-y-6">
          {/* Comprehension Card */}
          <div className="card p-6">
            <div className="text-center">
              <div className="text-4xl font-display text-[var(--accent)] mb-2">{comprehension?.percentage}%</div>
              <p className="text-[var(--text-secondary)] text-sm">
                You know {comprehension?.knownCount} of {comprehension?.totalCount} words
              </p>
              <div className="mt-4 w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[var(--accent)] h-full transition-all"
                  style={{ width: `${comprehension?.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reading Text */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[var(--text)]">Your Text</h2>
            <div className="leading-relaxed text-[var(--text)] text-sm p-4 bg-[var(--surface)] rounded border border-[var(--border)]">
              {buildHighlightedTokens(textInput, tokens).map((segment, i) => (
                <span
                  key={i}
                  className={segment.isHighlighted ? 'cursor-pointer font-medium' : ''}
                  style={{
                    backgroundColor: segment.isHighlighted && !segment.isKnown ? 'var(--accent-light)' : undefined,
                    color: segment.isHighlighted && !segment.isKnown ? 'var(--accent)' : undefined,
                  }}
                  onClick={() => {
                    if (segment.isHighlighted && !segment.isKnown) {
                      setSelectedWord(segment.text.toLowerCase().replace(/[^\w']/g, ''))
                    }
                  }}
                >
                  {segment.text}
                </span>
              ))}
            </div>
          </div>

          {/* Unknown Words */}
          {unknownWords.length > 0 && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-[var(--text)]">
                Unknown Words ({unknownWords.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {unknownWords.map((word) => (
                  <div
                    key={word}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  >
                    <span className="text-sm">{word}</span>
                    {!sessionsAdded.includes(word) ? (
                      <button
                        onClick={() => handleAddWord(word)}
                        className="text-[var(--accent)] hover:text-[var(--accent)] p-0.5"
                        title="Add to vocabulary"
                      >
                        <Plus size={16} />
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓ Added</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setPhase('input')
                setTextInput('')
                setTokens([])
                setComprehension(null)
                setUnknownWords([])
                setSessionsAdded([])
              }}
              variant="ghost"
              className="flex-1"
            >
              Load New Text
            </Button>
            {sessionsAdded.length > 0 && (
              <Button className="flex-1" disabled>
                ✓ {sessionsAdded.length} word{sessionsAdded.length > 1 ? 's' : ''} added
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Word Detail Dialog */}
      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{selectedWord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              This word is not in your vocabulary yet.
            </p>
            <Button
              onClick={() => {
                if (selectedWord) {
                  handleAddWord(selectedWord)
                  setSelectedWord(null)
                }
              }}
              className="w-full"
            >
              Add to Vocabulary
            </Button>
            <p className="text-xs text-[var(--text-secondary)] text-center">
              You can edit the definition later in the Words page.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

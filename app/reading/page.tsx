'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { tokenizeText, getUniqueWords, markKnownTokens, calculateComprehension, getUnknownWords, Token, buildHighlightedTokens } from '@/lib/text-tokenizer'
import { BookOpen, Plus, Check } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import StatCard from '@/components/design/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
      <div className="flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-secondary)]">Loading your vocabulary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="h2 text-[var(--text)] mb-2">Reading Mode</h1>
        <p className="body text-[var(--text-secondary)]">Paste text and instantly learn unknown words</p>
      </div>

      {phase === 'input' && (
        <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
          <div className="space-y-6">
            <div>
              <label className="label text-[var(--text)] block mb-3">Paste your text</label>
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste an article, book excerpt, or any English text here..."
                className="min-h-64 resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  {textInput.length} characters · ~{Math.ceil(textInput.split(/\s+/).length)} words
                </p>
                {textInput.trim() && (
                  <p className="text-xs text-[var(--accent)] font-medium">Ready to analyze</p>
                )}
              </div>
            </div>

            <InteractiveButton
              variant="primary"
              size="lg"
              onClick={handleAnalyze}
              isLoading={analyzing}
              className="w-full"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Text'}
            </InteractiveButton>
          </div>
        </SurfaceCard>
      )}

      {phase === 'reading' && tokens.length > 0 && (
        <div className="space-y-6">
          {/* Comprehension Stats */}
          <StatCard
            icon={<BookOpen size={28} className="text-[var(--accent)]" />}
            label="Comprehension"
            value={`${comprehension?.percentage}%`}
            color="var(--accent)"
            trend={comprehension && comprehension.percentage >= 80 ? { direction: 'up', percent: Math.round((comprehension.knownCount / comprehension.totalCount) * 100) } : undefined}
          />

          {/* Reading Text */}
          <SurfaceCard padding="lg">
            <h3 className="h4 text-[var(--text)] mb-4">Your Text</h3>
            <div className="leading-relaxed text-[var(--text)] text-base p-5 bg-[var(--bg)] rounded-lg border border-[var(--border)] space-y-3">
              {buildHighlightedTokens(textInput, tokens).map((segment, i) => (
                <span
                  key={i}
                  className={segment.isHighlighted && !segment.isKnown ? 'cursor-pointer font-medium px-1 rounded transition-colors hover:opacity-70' : ''}
                  style={{
                    backgroundColor: segment.isHighlighted && !segment.isKnown ? 'rgba(var(--accent-rgb), 0.15)' : undefined,
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
            <p className="text-xs text-[var(--text-secondary)] mt-3">💡 Click on highlighted words to add them to your vocabulary</p>
          </SurfaceCard>

          {/* Unknown Words */}
          {unknownWords.length > 0 && (
            <SurfaceCard padding="lg">
              <h3 className="h4 text-[var(--text)] mb-4">
                Unknown Words · {unknownWords.length}
              </h3>
              <div className="flex flex-wrap gap-2">
                {unknownWords.map((word) => (
                  <button
                    key={word}
                    onClick={() => !sessionsAdded.includes(word) && handleAddWord(word)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      sessionsAdded.includes(word)
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'
                    }`}
                  >
                    <span className="font-medium">{word}</span>
                    {sessionsAdded.includes(word) ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={14} className="opacity-60" />
                    )}
                  </button>
                ))}
              </div>
            </SurfaceCard>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <InteractiveButton
              variant="secondary"
              size="md"
              onClick={() => {
                setPhase('input')
                setTextInput('')
                setTokens([])
                setComprehension(null)
                setUnknownWords([])
                setSessionsAdded([])
              }}
              className="flex-1"
            >
              Load New Text
            </InteractiveButton>
            {sessionsAdded.length > 0 && (
              <InteractiveButton
                variant="primary"
                size="md"
                disabled
                className="flex-1"
              >
                <Check size={16} className="mr-2" />
                {sessionsAdded.length} word{sessionsAdded.length > 1 ? 's' : ''} added
              </InteractiveButton>
            )}
          </div>
        </div>
      )}

      {/* Word Detail Dialog */}
      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="h3 capitalize text-[var(--text)]">{selectedWord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <p className="body text-[var(--text-secondary)]">
              This word is not in your vocabulary yet.
            </p>
            <InteractiveButton
              variant="primary"
              size="md"
              onClick={() => {
                if (selectedWord) {
                  handleAddWord(selectedWord)
                  setSelectedWord(null)
                }
              }}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add to Vocabulary
            </InteractiveButton>
            <p className="text-xs text-[var(--text-secondary)] text-center">
              You can edit the definition later in the Words page.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

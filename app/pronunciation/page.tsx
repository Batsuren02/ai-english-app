'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { buildWaveformData, downloadRecording, speakWord } from '@/lib/speech-utils'
import { Volume2, Download, Copy, Check, Mic } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AudioRecorder from '@/components/AudioRecorder'
import WaveformDisplay from '@/components/WaveformDisplay'

export default function PronunciationPage() {
  const [words, setWords] = useState<Word[]>([])
  const [search, setSearch] = useState('')
  const [filteredWords, setFilteredWords] = useState<Word[]>([])
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [userBlob, setUserBlob] = useState<Blob | null>(null)
  const [userSamples, setUserSamples] = useState<Float32Array | null>(null)
  const [isPlaying, setIsPlaying] = useState<'user' | 'ref' | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadWords()
  }, [])

  useEffect(() => {
    let filtered = words
    if (search) {
      filtered = filtered.filter(
        (w) =>
          w.word.toLowerCase().includes(search.toLowerCase()) ||
          w.definition?.toLowerCase().includes(search.toLowerCase())
      )
    }
    setFilteredWords(filtered)
  }, [words, search])

  const loadWords = async () => {
    try {
      const { data } = await supabase.from('words').select('*').order('created_at', { ascending: false }).limit(200)
      if (data) setWords(data)
    } catch (err) {
      console.error('Failed to load words:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordingComplete = async (blob: Blob) => {
    setUserBlob(blob)
    // Build waveform and save pronunciation attempt
    try {
      const samples = await buildWaveformData(blob, 200)
      setUserSamples(samples)

      // Save pronunciation attempt to database
      if (selectedWord) {
        // Convert blob to base64 for storage (if needed for playback)
        const arrayBuffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const hex = bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')

        await supabase.from('pronunciation_attempts').insert({
          word_id: selectedWord.id,
          audio_url: '', // Could be cloud URL if integrated with storage
          feedback: null,
          similarity_score: null,
        })
      }
    } catch (err) {
      console.error('Failed to complete recording:', err)
    }
  }

  const playAudio = async (type: 'user' | 'ref') => {
    if (type === 'user' && userBlob) {
      const url = URL.createObjectURL(userBlob)
      const audio = new Audio(url)
      setIsPlaying('user')
      audio.onended = () => setIsPlaying(null)
      audio.play()
    } else if (type === 'ref' && selectedWord) {
      setIsPlaying('ref')
      speakWord(selectedWord.word)
      setTimeout(() => setIsPlaying(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-secondary)]">Loading words...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="h2 text-[var(--text)] mb-2">Pronunciation Practice</h1>
        <p className="body text-[var(--text-secondary)]">Record yourself and compare with native pronunciation</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Word Selector */}
        <SurfaceCard padding="lg" className="md:col-span-1 h-[500px] flex flex-col">
          <h3 className="h4 text-[var(--text)] mb-4">Select Word</h3>
          <Input
            placeholder="Search words…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-4">
              {filteredWords.map((word) => (
                <button
                  key={word.id}
                  onClick={() => {
                    setSelectedWord(word)
                    setUserBlob(null)
                    setUserSamples(null)
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all text-sm mb-1 border ${
                    selectedWord?.id === word.id
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent hover:bg-[var(--surface)] text-[var(--text)]'
                  }`}
                >
                  <div className="font-semibold">{word.word}</div>
                  <div className="text-xs opacity-75 truncate">{word.definition}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </SurfaceCard>

        {/* Practice Area */}
        <div className="md:col-span-2 space-y-6">
          {selectedWord ? (
            <>
              {/* Word Header */}
              <SurfaceCard padding="lg" elevation="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="h3 text-[var(--text)] mb-2">{selectedWord.word}</h2>
                    <p className="body text-[var(--text-secondary)] mb-3">{selectedWord.definition}</p>
                    {selectedWord.ipa && (
                      <p className="label text-[var(--accent)] font-mono">/{selectedWord.ipa}/</p>
                    )}
                  </div>
                  <InteractiveButton
                    variant="primary"
                    size="md"
                    onClick={() => playAudio('ref')}
                    isLoading={isPlaying === 'ref'}
                    className="flex-shrink-0 flex items-center gap-2"
                  >
                    <Volume2 size={16} />
                    {isPlaying === 'ref' ? 'Playing...' : 'Hear'}
                  </InteractiveButton>
                </div>
              </SurfaceCard>

              {/* Reference Waveform */}
              <SurfaceCard padding="lg">
                <WaveformDisplay
                  samples={null}
                  label="Reference (native speaker)"
                  color="var(--accent)"
                  height={64}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-4 italic">
                  Shown using browser text-to-speech
                </p>
              </SurfaceCard>

              {/* Recording */}
              <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
                <h3 className="h4 text-[var(--text)] mb-6 flex items-center gap-2 justify-center">
                  <Mic size={20} />
                  Your Recording
                </h3>
                <AudioRecorder word={selectedWord} onRecordingComplete={handleRecordingComplete} />
              </SurfaceCard>

              {/* Your Waveform */}
              {userSamples && (
                <>
                  <SurfaceCard padding="lg">
                    <WaveformDisplay samples={userSamples} label="Your recording" color="var(--accent)" height={64} />
                    {userBlob && (
                      <div className="flex gap-3 mt-6">
                        <InteractiveButton
                          variant="secondary"
                          size="md"
                          onClick={() => playAudio('user')}
                          isLoading={isPlaying === 'user'}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <Volume2 size={16} />
                          {isPlaying === 'user' ? 'Playing...' : 'Play'}
                        </InteractiveButton>
                        <InteractiveButton
                          variant="secondary"
                          size="md"
                          onClick={() => downloadRecording(userBlob, `${selectedWord.word}-practice.webm`)}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Download
                        </InteractiveButton>
                      </div>
                    )}
                  </SurfaceCard>

                  {/* Score Placeholder */}
                  <SurfaceCard padding="lg" className="bg-gradient-to-br from-[var(--accent)]/10 to-[var(--surface)]">
                    <div className="text-center space-y-3">
                      <p className="label text-[var(--text-secondary)]">Similarity Score</p>
                      <div className="text-4xl font-bold text-[var(--accent)]">--</div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Use Claude AI for detailed pronunciation feedback
                      </p>
                    </div>
                  </SurfaceCard>

                  {/* Claude Feedback Prompt */}
                  <SurfaceCard padding="lg">
                    <h3 className="h4 text-[var(--text)] mb-3">🤖 Get AI Feedback</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Copy the prompt below and paste into Claude.ai with a description of your recording to get detailed feedback.
                    </p>
                    <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)] text-sm font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto mb-4 text-[var(--text-secondary)]">
                      I recorded myself saying the word "{selectedWord.word}". Can you analyze my pronunciation and suggest improvements? The reference pronunciation is /{selectedWord.ipa}/.
                    </div>
                    <InteractiveButton
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        const text = `I recorded myself saying the word "${selectedWord.word}". Can you analyze my pronunciation and suggest improvements? The reference pronunciation is /${selectedWord.ipa}/.`
                        navigator.clipboard.writeText(text)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy Prompt'}
                    </InteractiveButton>
                  </SurfaceCard>
                </>
              )}
            </>
          ) : (
            <SurfaceCard padding="lg" className="text-center py-16">
              <Mic size={48} className="mx-auto mb-4 text-[var(--text-secondary)] opacity-40" />
              <p className="body text-[var(--text-secondary)]">Select a word to start practicing pronunciation</p>
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  )
}

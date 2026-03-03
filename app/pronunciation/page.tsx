'use client'

import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { buildWaveformData, downloadRecording, speakWord } from '@/lib/speech-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AudioRecorder from '@/components/AudioRecorder'
import WaveformDisplay from '@/components/WaveformDisplay'
import { Volume2, Download, Copy, Check } from 'lucide-react'

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

        // Award XP for practicing pronunciation
        const { data: prof } = await supabase.from('user_profile').select('id, total_xp').single()
        if (prof) {
          await supabase.from('user_profile').update({ total_xp: (prof.total_xp || 0) + 5 }).eq('id', prof.id)
        }
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
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center text-[var(--ink-light)]">Loading words...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--ink)] mb-2">Pronunciation Practice</h1>
        <p className="text-[var(--ink-light)]">Record yourself and compare with native pronunciation</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Word Selector */}
        <div className="md:col-span-1">
          <div className="card p-4 space-y-3 h-full flex flex-col">
            <h2 className="font-semibold text-[var(--ink)] text-sm">Select Word</h2>
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredWords.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => {
                      setSelectedWord(word)
                      setUserBlob(null)
                      setUserSamples(null)
                    }}
                    className={`w-full text-left p-2 rounded text-sm transition-all ${
                      selectedWord?.id === word.id
                        ? 'bg-[var(--accent)] text-white'
                        : 'hover:bg-[var(--border)] text-[var(--ink)]'
                    }`}
                  >
                    <div className="font-medium">{word.word}</div>
                    <div className="text-xs opacity-75 truncate">{word.definition}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Practice Area */}
        <div className="md:col-span-2 space-y-6">
          {selectedWord ? (
            <>
              {/* Word Header */}
              <div className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--ink)] mb-1">{selectedWord.word}</h2>
                    <p className="text-sm text-[var(--ink-light)]">{selectedWord.definition}</p>
                    {selectedWord.ipa && (
                      <p className="text-xs text-[var(--accent)] mt-2">/{selectedWord.ipa}/</p>
                    )}
                  </div>
                  <Button
                    onClick={() => playAudio('ref')}
                    disabled={isPlaying === 'ref'}
                    variant="ghost"
                    size="sm"
                  >
                    <Volume2 size={16} className="mr-2" />
                    {isPlaying === 'ref' ? 'Playing...' : 'Hear'}
                  </Button>
                </div>
              </div>

              {/* Reference Waveform */}
              <div className="card p-6">
                <WaveformDisplay
                  samples={null}
                  label="Reference (native speaker)"
                  color="var(--accent)"
                  height={64}
                />
                <p className="text-xs text-[var(--ink-light)] mt-3 italic">
                  Shown using browser text-to-speech
                </p>
              </div>

              {/* Recording */}
              <div className="card p-6">
                <h3 className="font-semibold text-[var(--ink)] mb-4 text-center">Your Recording</h3>
                <AudioRecorder word={selectedWord} onRecordingComplete={handleRecordingComplete} />
              </div>

              {/* Your Waveform */}
              {userSamples && (
                <>
                  <div className="card p-6">
                    <WaveformDisplay samples={userSamples} label="Your recording" color="var(--accent)" height={64} />
                    {userBlob && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => playAudio('user')}
                          disabled={isPlaying === 'user'}
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                        >
                          <Volume2 size={16} className="mr-2" />
                          {isPlaying === 'user' ? 'Playing...' : 'Play'}
                        </Button>
                        <Button
                          onClick={() => downloadRecording(userBlob, `${selectedWord.word}-practice.webm`)}
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                        >
                          <Download size={16} className="mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Score Placeholder */}
                  <div className="card p-6 bg-gradient-to-br from-[var(--accent-light)] to-[var(--bg)]">
                    <div className="text-center">
                      <p className="text-sm text-[var(--ink-light)] mb-2">Similarity Score</p>
                      <div className="text-3xl font-display text-[var(--accent)] mb-2">--</div>
                      <p className="text-xs text-[var(--ink-light)]">
                        Claude AI feedback available (copy prompt below)
                      </p>
                    </div>
                  </div>

                  {/* Claude Feedback Prompt */}
                  <div className="card p-6 space-y-3">
                    <h3 className="font-semibold text-[var(--ink)] text-sm">Get AI Feedback</h3>
                    <p className="text-xs text-[var(--ink-light)]">
                      Copy the prompt below, paste into Claude.ai with your recording description, and get detailed pronunciation feedback.
                    </p>
                    <div className="bg-[var(--bg)] p-3 rounded border border-[var(--border)] text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                      I recorded myself saying the word "{selectedWord.word}". Can you analyze my pronunciation and
                      suggest improvements? The reference pronunciation is /{selectedWord.ipa}/. My recording sounds [describe
                      your sound here].
                    </div>
                    <Button
                      onClick={() => {
                        const text = `I recorded myself saying the word "${selectedWord.word}". Can you analyze my pronunciation and suggest improvements? The reference pronunciation is /${selectedWord.ipa}/.`
                        navigator.clipboard.writeText(text)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                      {copied ? 'Copied!' : 'Copy Prompt'}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="card p-12 text-center text-[var(--ink-light)]">
              <p>Select a word to start practicing pronunciation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

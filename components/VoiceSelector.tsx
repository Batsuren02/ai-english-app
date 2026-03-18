'use client'

import { useEffect, useState, useCallback } from 'react'
import { Volume2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEnglishVoices,
  getVoiceQuality,
  getPreferredVoiceName,
  getSpeechRate,
  speakWord,
} from '@/lib/speech-utils'

const PREVIEW_TEXT = 'The quick brown fox jumps over the lazy dog.'

interface VoiceSelectorProps {
  /** Called when the user picks a voice or changes speed */
  onChange?: (voiceName: string, rate: number) => void
}

export default function VoiceSelector({ onChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selected, setSelected] = useState<string>('')
  const [rate, setRate] = useState<number>(0.85)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  // Load voices — Chrome fires voiceschanged async; Safari/Firefox may be sync
  const loadVoices = useCallback(() => {
    const list = getEnglishVoices()
    setVoices(list)

    // Auto-select: preferred → best available
    const pref = getPreferredVoiceName()
    const match = pref ? list.find(v => v.name === pref) : null
    setSelected(match?.name ?? list[0]?.name ?? '')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSupported(false)
      return
    }

    setRate(getSpeechRate())
    loadVoices()

    // Chrome needs this event to populate voices
    const synth = window.speechSynthesis
    synth.addEventListener('voiceschanged', loadVoices)
    return () => synth.removeEventListener('voiceschanged', loadVoices)
  }, [loadVoices])

  function selectVoice(name: string) {
    setSelected(name)
    try { localStorage.setItem('preferred_voice_name', name) } catch {}
    onChange?.(name, rate)
  }

  function changeRate(newRate: number) {
    setRate(newRate)
    try { localStorage.setItem('speech_rate', String(newRate)) } catch {}
    onChange?.(selected, newRate)
  }

  function preview(voice: SpeechSynthesisVoice) {
    if (previewing === voice.name) return
    setPreviewing(voice.name)

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = rate
    utterance.onend = () => setPreviewing(null)
    utterance.onerror = () => setPreviewing(null)
    window.speechSynthesis.speak(utterance)
  }

  if (!supported) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Speech synthesis is not supported in your browser.
      </p>
    )
  }

  if (voices.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <RefreshCw size={14} className="animate-spin" />
        Loading available voices...
      </div>
    )
  }

  const neuralVoices = voices.filter(v => getVoiceQuality(v) === 'neural')
  const standardVoices = voices.filter(v => getVoiceQuality(v) === 'standard')

  return (
    <div className="space-y-5">
      {/* Speed slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label text-[var(--text)]">Speech Speed</label>
          <span className="text-[13px] font-bold text-[var(--accent)] tabular-nums">
            {rate === 1 ? 'Normal' : rate < 1 ? `${Math.round((1 - rate) * 100)}% slower` : `${Math.round((rate - 1) * 100)}% faster`}
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="1.2"
          step="0.05"
          value={rate}
          onChange={e => changeRate(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1">
          <span>Slower</span>
          <span>Normal</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Preview current voice */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="label text-[var(--text)]">Voice</label>
          {selected && (
            <button
              onClick={() => {
                const v = voices.find(v => v.name === selected)
                if (v) preview(v)
              }}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              <Volume2 size={13} />
              Preview selected
            </button>
          )}
        </div>

        {/* Neural voices (high quality) */}
        {neuralVoices.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
              ✨ Natural voices (recommended)
            </p>
            <div className="space-y-1.5">
              {neuralVoices.map(voice => (
                <VoiceRow
                  key={voice.name}
                  voice={voice}
                  isSelected={selected === voice.name}
                  isPreviewing={previewing === voice.name}
                  onSelect={() => selectVoice(voice.name)}
                  onPreview={() => preview(voice)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Standard voices */}
        {standardVoices.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
              Standard voices
            </p>
            <div className="space-y-1.5">
              {standardVoices.map(voice => (
                <VoiceRow
                  key={voice.name}
                  voice={voice}
                  isSelected={selected === voice.name}
                  isPreviewing={previewing === voice.name}
                  onSelect={() => selectVoice(voice.name)}
                  onPreview={() => preview(voice)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {neuralVoices.length === 0 && (
        <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2">
          💡 For more natural voices, use Chrome or Microsoft Edge — they include Google and Microsoft Neural voices.
        </p>
      )}
    </div>
  )
}

// ── Row component ────────────────────────────────────────────────────────────

interface VoiceRowProps {
  voice: SpeechSynthesisVoice
  isSelected: boolean
  isPreviewing: boolean
  onSelect: () => void
  onPreview: () => void
}

function VoiceRow({ voice, isSelected, isPreviewing, onSelect, onPreview }: VoiceRowProps) {
  // Shorten overly long Microsoft names: "Microsoft Aria Online (Natural) - English (United States)"
  const displayName = voice.name
    .replace(/ Online \(Natural\)/i, '')
    .replace(/ - English.*$/i, '')
    .replace(/^Microsoft /, '')

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150',
        isSelected
          ? 'border-[var(--accent)] bg-[var(--accent)]/8 shadow-sm'
          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]'
      )}
    >
      {/* Selection indicator */}
      <div className={cn(
        'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
        isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
      )}>
        {isSelected && (
          <div className="w-full h-full rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        )}
      </div>

      {/* Voice info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text)] truncate">{displayName}</p>
        <p className="text-[10px] text-[var(--text-secondary)]">{voice.lang}</p>
      </div>

      {/* Preview button */}
      <button
        onClick={e => { e.stopPropagation(); onPreview() }}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
          isPreviewing
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--accent)]'
        )}
        title="Preview this voice"
      >
        {isPreviewing ? (
          <span className="flex gap-0.5 items-center">
            <span className="w-0.5 h-2.5 bg-white rounded-full animate-[voiceBar_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-[voiceBar_0.6s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 h-2 bg-white rounded-full animate-[voiceBar_0.6s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
          </span>
        ) : (
          <><Volume2 size={11} /> Play</>
        )}
      </button>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, UserProfile } from '@/lib/supabase'
import { Save, Copy, Check, AlertCircle, Eye, Palette, LayoutList, Volume2 } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'
import NotificationSettings from '@/components/NotificationSettings'
import VoiceSelector from '@/components/VoiceSelector'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import FormInput from '@/components/design/FormInput'
import { useToastContext } from '@/components/ToastProvider'
import { usePageCache } from '@/lib/hooks/usePageCache'
import { invalidateCache } from '@/lib/data-cache'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

async function fetchSettingsProfile() {
  const { data } = await supabase.from('user_profile').select('*').limit(1).maybeSingle()
  return data
}

export default function SettingsPage() {
  const toast = useToastContext()
  const { data: cachedProfile } = usePageCache('settings-profile', fetchSettingsProfile, 60_000)
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    cefr_level: 'B1', goal: 'general', daily_target_minutes: 20
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [singleWord, setSingleWord] = useState('')
  const [batchWords, setBatchWords] = useState('')
  const [showMongolianHint, setShowMongolianHint] = useState(false)
  const [quizSessionLength, setQuizSessionLength] = useState('10')

  useEffect(() => {
    try {
      setShowMongolianHint(localStorage.getItem('showMongolianHint') === 'true')
      setQuizSessionLength(localStorage.getItem('quiz_session_length') ?? '10')
    } catch {}
  }, [])

  const profileSyncedRef = useRef(false)
  useEffect(() => {
    if (cachedProfile && !profileSyncedRef.current) {
      profileSyncedRef.current = true
      setProfile(cachedProfile)
    }
  }, [cachedProfile])

  async function save(): Promise<void> {
    if (!profile.id) {
      setError('Profile not loaded yet. Please wait and try again.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const clampedMinutes = Math.min(120, Math.max(5, profile.daily_target_minutes ?? 20))
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ ...profile, daily_target_minutes: clampedMinutes, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (updateError) {
        setError(`Failed to save settings: ${updateError.message}`)
        toast.error('Failed to save settings')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        toast.success('Settings saved!')
        invalidateCache('settings-profile')
      }
    } catch (err) {
      setError(`Error saving settings: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  function copyPrompt(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedPrompt(key)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const promptSections = [
    {
      key: 'single',
      title: 'Add Single Word',
      desc: 'Generate a complete word card for Claude to return as JSON',
      prompt: singleWord ? PROMPTS.addWord(singleWord) : '',
      input: <input className="input" placeholder="Enter word..." value={singleWord} onChange={e => setSingleWord(e.target.value)} style={{ marginBottom: 8 }} />
    },
    {
      key: 'batch',
      title: 'Add Multiple Words',
      desc: 'Generate word cards for multiple words at once',
      prompt: batchWords ? PROMPTS.batchWords(batchWords.split(',').map(s => s.trim()).filter(Boolean)) : '',
      input: <input className="input" placeholder="word1, word2, word3..." value={batchWords} onChange={e => setBatchWords(e.target.value)} style={{ marginBottom: 8 }} />
    },
    {
      key: 'sentence',
      title: 'Evaluate a Sentence',
      desc: 'Get AI feedback on your English writing',
      prompt: PROMPTS.evaluateSentence('[paste your sentence here]', profile.cefr_level),
    },
    {
      key: 'convo',
      title: 'Conversation Practice',
      desc: 'Start a conversation practice session',
      prompt: PROMPTS.conversationPractice('[topic]', profile.cefr_level),
    },
  ]

  return (
    <div className="fade-in max-w-2xl space-y-6">
      <div>
        <h1 className="h2 text-[var(--text)] mb-2">Settings</h1>
        <p className="body text-[var(--text-secondary)]">Personalize your learning experience</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Appearance */}
      <SurfaceCard padding="lg">
        <div className="flex items-center gap-2 mb-5">
          <Palette size={18} className="text-[var(--accent)]" />
          <h3 className="h3 text-[var(--text)]">Appearance</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="label text-[var(--text)] block">Theme</label>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">Choose your preferred color scheme</p>
          </div>
          <ThemeSwitcher />
        </div>
      </SurfaceCard>

      {/* Profile Settings */}
      <SurfaceCard padding="lg">
        <h3 className="h3 text-[var(--text)] mb-5">Learning Profile</h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label text-[var(--text)] block mb-2">CEFR Level</label>
              <select
                className="input w-full"
                value={profile.cefr_level}
                onChange={e => setProfile(p => ({ ...p, cefr_level: e.target.value as UserProfile['cefr_level'] }))}
              >
                {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l}>{l}</option>)}
              </select>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Your current English proficiency level</p>
            </div>

            <div>
              <label className="label text-[var(--text)] block mb-2">Learning Goal</label>
              <select
                className="input w-full"
                value={profile.goal}
                onChange={e => setProfile(p => ({ ...p, goal: e.target.value as UserProfile['goal'] }))}
              >
                {['general','ielts','business','travel'].map(g => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">What are you learning English for?</p>
            </div>
          </div>

          <div>
            <label className="label text-[var(--text)] block mb-2">Daily Target (minutes)</label>
            <input
              className="input w-full"
              type="number"
              min={5}
              max={120}
              value={profile.daily_target_minutes}
              onChange={e => setProfile(p => ({ ...p, daily_target_minutes: parseInt(e.target.value) }))}
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Ideal daily practice time</p>
          </div>

          <div>
            <label className="label text-[var(--text)] block mb-2">
              <LayoutList size={14} className="inline mr-1.5 mb-0.5" />Quiz Session Length
            </label>
            <Select
              value={quizSessionLength}
              onValueChange={(v) => {
                setQuizSessionLength(v)
                try { localStorage.setItem('quiz_session_length', v) } catch {}
                toast.info(`Quiz length set to ${v} questions`)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} questions per session</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Number of questions in each quiz session</p>
          </div>

          {/* Mongolian Hint Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-[var(--border)]">
            <div>
              <label className="label text-[var(--text)] flex items-center gap-2">
                <Eye size={14} /> Show Mongolian hint on front of card
              </label>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Display Mongolian translation on the front (before flipping)</p>
            </div>
            <button
              onClick={() => {
                const next = !showMongolianHint
                setShowMongolianHint(next)
                try { localStorage.setItem('showMongolianHint', String(next)) } catch {}
                toast.info(next ? 'Mongolian hint enabled' : 'Mongolian hint disabled')
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showMongolianHint ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showMongolianHint ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>
      </SurfaceCard>

      {/* Voice & Speech */}
      <SurfaceCard padding="lg">
        <div className="flex items-center gap-2 mb-5">
          <Volume2 size={18} className="text-[var(--accent)]" />
          <h3 className="h3 text-[var(--text)]">Voice & Speech</h3>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mb-5">
          Choose a voice for pronunciation playback. Natural voices sound much more human.
        </p>
        <VoiceSelector />
      </SurfaceCard>

      {/* Interleaving Settings */}
      <SurfaceCard padding="lg">
        <h3 className="h3 text-[var(--text)] mb-1">Session Interleaving</h3>
        <p className="text-[13px] text-[var(--text-secondary)] mb-5">Control how new and review words are mixed in your sessions.</p>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="label text-[var(--text)]">New Word Ratio</label>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Mix new words with reviews</p>
              </div>
              <span className="text-[15px] font-bold text-[var(--accent)] tabular-nums">
                {Math.round((profile.interleave_ratio || 0.25) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={profile.interleave_ratio || 0.25}
              onChange={e => setProfile(p => ({ ...p, interleave_ratio: parseFloat(e.target.value) }))}
            />
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1.5">
              <span>Fewer new words</span>
              <span>More new words</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="label text-[var(--text)]">Category Mixing</label>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Avoid repeating same category</p>
              </div>
              <span className="text-[15px] font-bold text-[var(--accent)] tabular-nums">
                {Math.round((profile.interleave_category_penalty || 0.6) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={profile.interleave_category_penalty || 0.6}
              onChange={e => setProfile(p => ({ ...p, interleave_category_penalty: parseFloat(e.target.value) }))}
            />
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1.5">
              <span>Less variety</span>
              <span>More variety</span>
            </div>
          </div>

        </div>
      </SurfaceCard>

      {/* Notifications Settings */}
      <NotificationSettings />

      {/* Unified sticky save bar */}
      <div className="sticky bottom-0 bg-[var(--bg)]/90 border-t border-[var(--border)] py-4 -mx-5 px-5"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <InteractiveButton
          variant="primary"
          size="lg"
          onClick={save}
          isLoading={loading}
          className="w-full"
        >
          {saved ? <><Check size={15} className="inline mr-1.5" />Saved!</> : <><Save size={15} className="inline mr-1.5" />Save All Settings</>}
        </InteractiveButton>
      </div>

      {/* Claude Prompts */}
      <SurfaceCard padding="lg">
        <h3 className="h3 text-[var(--text)] mb-2">Claude Chat Prompts</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">Copy these prompts to use in Claude.ai chat — your free AI helper!</p>
        <div className="space-y-3">
          {promptSections.map(({ key, title, desc, prompt, input }) => (
            <SurfaceCard key={key} padding="md" className="bg-[var(--bg)]">
              <h4 className="font-semibold text-[var(--text)] mb-1">{title}</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">{desc}</p>
              {input}
              {prompt && (
                <div className="relative">
                  <pre className="text-xs bg-[var(--surface)] p-3 rounded border border-[var(--border)] whitespace-pre-wrap word-break-break-word max-h-24 overflow-hidden text-[var(--text-secondary)]">
                    {prompt.slice(0, 200)}...
                  </pre>
                  <button
                    onClick={() => copyPrompt(prompt, key)}
                    className="absolute top-2 right-2 px-2 py-1 bg-[var(--accent)] text-white rounded text-xs flex items-center gap-1 hover:opacity-90 transition-opacity"
                  >
                    {copiedPrompt === key ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              )}
              {!prompt && !input && (
                <button
                  onClick={() => copyPrompt(prompt, key)}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent)]/80 flex items-center gap-1"
                >
                  <Copy size={12} /> Copy Prompt
                </button>
              )}
            </SurfaceCard>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}

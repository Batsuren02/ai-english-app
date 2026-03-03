'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, UserProfile } from '@/lib/supabase'
import { Save, Copy, Check, AlertCircle } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'
import NotificationSettings from '@/components/NotificationSettings'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import FormInput from '@/components/design/FormInput'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    cefr_level: 'B1', goal: 'general', daily_target_minutes: 20
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [singleWord, setSingleWord] = useState('')
  const [batchWords, setBatchWords] = useState('')

  useEffect(() => {
    supabase.from('user_profile').select('*').single().then(({ data }) => {
      if (data) setProfile(data)
    })
  }, [])

  async function save() {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ ...profile, updated_at: new Date().toISOString() })
        .eq('id', (profile as any).id)

      if (updateError) {
        setError(`Failed to save settings: ${updateError.message}`)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
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

      {/* Profile Settings */}
      <SurfaceCard padding="lg">
        <h3 className="h3 text-[var(--text)] mb-5">Learning Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="label text-[var(--text)] block mb-2">CEFR Level</label>
            <select
              className="input w-full"
              value={profile.cefr_level}
              onChange={e => setProfile(p => ({ ...p, cefr_level: e.target.value }))}
            >
              {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l}>{l}</option>)}
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Your current English proficiency level</p>
          </div>

          <div>
            <label className="label text-[var(--text)] block mb-2">Learning Goal</label>
            <select
              className="input w-full"
              value={profile.goal}
              onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}
            >
              {['general','ielts','business','travel'].map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">What are you learning English for?</p>
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
            <p className="text-xs text-[var(--text-secondary)] mt-1">Ideal daily practice time</p>
          </div>

          <InteractiveButton
            variant="primary"
            size="md"
            onClick={save}
            isLoading={loading}
            className="mt-2"
          >
            {saved ? <><Check size={16} className="inline mr-2" />Saved!</> : <><Save size={16} className="inline mr-2" />Save Settings</>}
          </InteractiveButton>
        </div>
      </SurfaceCard>

      {/* Interleaving Settings */}
      <SurfaceCard padding="lg">
        <h3 className="h3 text-[var(--text)] mb-5">Session Interleaving</h3>
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label text-[var(--text)]">New Word Ratio</label>
              <span className="label font-semibold text-[var(--accent)]">{Math.round((profile.interleave_ratio || 0.25) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={profile.interleave_ratio || 0.25}
              onChange={e => setProfile(p => ({ ...p, interleave_ratio: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-2">How many new words to mix with review words. Higher = more new words per session.</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label text-[var(--text)]">Category Mixing</label>
              <span className="label font-semibold text-[var(--accent)]">{Math.round((profile.interleave_category_penalty || 0.6) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={profile.interleave_category_penalty || 0.6}
              onChange={e => setProfile(p => ({ ...p, interleave_category_penalty: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-2">Avoid repeating the same word category. Higher = better variety in sessions.</p>
          </div>

          <InteractiveButton
            variant="primary"
            size="md"
            onClick={save}
            isLoading={loading}
            className="mt-2"
          >
            {saved ? <><Check size={16} className="inline mr-2" />Saved!</> : <><Save size={16} className="inline mr-2" />Save Settings</>}
          </InteractiveButton>
        </div>
      </SurfaceCard>

      {/* Notifications Settings */}
      <NotificationSettings />

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

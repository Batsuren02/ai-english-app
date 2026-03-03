'use client'
import { useEffect, useState } from 'react'
import { supabase, UserProfile } from '@/lib/supabase'
import { Save, Copy, Check } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'
import NotificationSettings from '@/components/NotificationSettings'

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
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Settings</h2>
      <p style={{ color: 'var(--ink-light)', marginBottom: 28 }}>Personalize your learning experience</p>

      {/* Error message */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Profile settings */}
      <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 18 }}>Learning Profile</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>CEFR Level</label>
            <select className="input" value={profile.cefr_level} onChange={e => setProfile(p => ({ ...p, cefr_level: e.target.value }))}>
              {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Learning Goal</label>
            <select className="input" value={profile.goal} onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}>
              {['general','ielts','business','travel'].map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Daily Target (minutes)</label>
            <input className="input" type="number" min={5} max={120} value={profile.daily_target_minutes} onChange={e => setProfile(p => ({ ...p, daily_target_minutes: parseInt(e.target.value) }))} />
          </div>
          <button className="btn-primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : saved ? <Check size={16} /> : <Save size={16} />}
            {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Session Interleaving Settings */}
      <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 18 }}>Session Interleaving</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              New Word Ratio: {Math.round((profile.interleave_ratio || 0.25) * 100)}%
            </label>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={profile.interleave_ratio || 0.25}
              onChange={e => setProfile(p => ({ ...p, interleave_ratio: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: 12, color: 'var(--ink-light)', marginTop: 6 }}>How many new words to mix in with due words. Higher = more new words per session.</p>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Category Mixing: {Math.round((profile.interleave_category_penalty || 0.6) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={profile.interleave_category_penalty || 0.6}
              onChange={e => setProfile(p => ({ ...p, interleave_category_penalty: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: 12, color: 'var(--ink-light)', marginTop: 6 }}>How strongly to avoid repeating the same word category. Higher = better variety.</p>
          </div>

          <button className="btn-primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : saved ? <Check size={16} /> : <Save size={16} />}
            {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Notifications Settings */}
      <NotificationSettings />

      {/* Claude prompts */}
      <div className="card" style={{ padding: '24px', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 6 }}>Claude Chat Prompts</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 20 }}>Copy these prompts to use in Claude.ai chat — your free AI engine!</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {promptSections.map(({ key, title, desc, prompt, input }) => (
            <div key={key} style={{ background: 'var(--bg)', borderRadius: 10, padding: '16px' }}>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>{title}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-light)', marginBottom: 10 }}>{desc}</p>
              {input}
              {prompt && (
                <div style={{ position: 'relative' }}>
                  <pre style={{ fontSize: 12, background: 'var(--bg-card)', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 100, overflow: 'hidden', color: 'var(--ink-light)' }}>{prompt.slice(0, 200)}...</pre>
                  <button onClick={() => copyPrompt(prompt, key)} style={{
                    position: 'absolute', top: 8, right: 8, background: 'var(--accent)', color: 'white',
                    border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    {copiedPrompt === key ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              )}
              {!prompt && !input && (
                <button onClick={() => copyPrompt(prompt, key)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Copy size={12} /> Copy Prompt
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

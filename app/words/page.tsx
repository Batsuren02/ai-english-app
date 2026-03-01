'use client'
import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { Plus, Search, Upload, Download, X, ChevronDown, Volume2, Copy, Check } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([])
  const [filtered, setFiltered] = useState<Word[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  // Add word form state
  const [jsonInput, setJsonInput] = useState('')
  const [manualWord, setManualWord] = useState({ word: '', definition: '', mongolian: '', part_of_speech: '', ipa: '', cefr_level: 'B1', category: 'daily' })
  const [addMode, setAddMode] = useState<'json' | 'manual'>('json')
  const [saving, setSaving] = useState(false)
  const [importWord, setImportWord] = useState('')

  useEffect(() => { loadWords() }, [])
  useEffect(() => {
    let f = words
    if (search) f = f.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.definition?.toLowerCase().includes(search.toLowerCase()))
    if (filterCat) f = f.filter(w => w.category === filterCat)
    if (filterLevel) f = f.filter(w => w.cefr_level === filterLevel)
    setFiltered(f)
  }, [words, search, filterCat, filterLevel])

  async function loadWords() {
    const { data } = await supabase.from('words').select('*').order('created_at', { ascending: false })
    if (data) { setWords(data); setFiltered(data) }
    setLoading(false)
  }

  async function saveWordFromJSON() {
    setSaving(true)
    try {
      const parsed = JSON.parse(jsonInput)
      const wordData = Array.isArray(parsed) ? parsed : [parsed]
      for (const w of wordData) {
        const { data: wordRow } = await supabase.from('words').insert({ ...w }).select().single()
        if (wordRow) {
          await supabase.from('reviews').insert({ word_id: wordRow.id })
        }
      }
      setJsonInput('')
      setShowAdd(false)
      await loadWords()
    } catch (e) {
      alert('Invalid JSON. Please check the format.')
    }
    setSaving(false)
  }

  async function saveManualWord() {
    if (!manualWord.word || !manualWord.definition) return
    setSaving(true)
    const { data } = await supabase.from('words').insert({ ...manualWord, examples: [], word_family: [], collocations: [], confused_with: [] }).select().single()
    if (data) await supabase.from('reviews').insert({ word_id: data.id })
    setManualWord({ word: '', definition: '', mongolian: '', part_of_speech: '', ipa: '', cefr_level: 'B1', category: 'daily' })
    setShowAdd(false)
    await loadWords()
    setSaving(false)
  }

  async function deleteWord(id: string) {
    if (!confirm('Delete this word?')) return
    await supabase.from('words').delete().eq('id', id)
    setSelectedWord(null)
    await loadWords()
  }

  function copyPrompt(word: string) {
    navigator.clipboard.writeText(PROMPTS.addWord(word))
    setCopied(word)
    setTimeout(() => setCopied(null), 2000)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'words.json'; a.click()
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85
      window.speechSynthesis.speak(u)
    }
  }

  if (loading) return <div style={{ color: 'var(--ink-light)', marginTop: 40 }}>Loading words...</div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 26 }}>Word Library</h2>
          <p style={{ color: 'var(--ink-light)', fontSize: 14 }}>{words.length} words total</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={exportJSON} style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add Word
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-light)' }} />
          <input className="input" placeholder="Search words..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {['academic', 'business', 'daily', 'idiom', 'phrasal_verb'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" style={{ width: 'auto' }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">All Levels</option>
          {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Word list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-light)' }}>
          {words.length === 0 ? 'No words yet. Add your first word!' : 'No words match your filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(w => (
            <div key={w.id} className="card" style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setSelectedWord(selectedWord?.id === w.id ? null : w)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{w.word}</span>
                  {w.ipa && <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>{w.ipa}</span>}
                  {w.cefr_level && <span className="badge">{w.cefr_level}</span>}
                  {w.category && <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>{w.category}</span>}
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink-light)', marginTop: 2 }}>{w.definition?.slice(0, 80)}{(w.definition?.length || 0) > 80 ? '...' : ''}</p>
              </div>
              <ChevronDown size={16} style={{ color: 'var(--ink-light)', transform: selectedWord?.id === w.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }} />
            </div>
          ))}
        </div>
      )}

      {/* Word detail panel */}
      {selectedWord && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: '24px 20px', overflowY: 'auto', zIndex: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 28, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedWord.word}
                <button onClick={() => speak(selectedWord.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
                  <Volume2 size={18} />
                </button>
              </h2>
              {selectedWord.ipa && <p style={{ color: 'var(--ink-light)' }}>{selectedWord.ipa}</p>}
            </div>
            <button onClick={() => setSelectedWord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)' }}><X size={20} /></button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {selectedWord.part_of_speech && <span className="badge">{selectedWord.part_of_speech}</span>}
            {selectedWord.cefr_level && <span className="badge">{selectedWord.cefr_level}</span>}
            {selectedWord.category && <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>{selectedWord.category}</span>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 16, marginBottom: 6 }}>{selectedWord.definition}</p>
            {selectedWord.mongolian && <p style={{ color: 'var(--ink-light)', fontStyle: 'italic' }}>{selectedWord.mongolian}</p>}
          </div>

          {(selectedWord.examples as string[] || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Examples</h4>
              {(selectedWord.examples as string[]).map((ex, i) => (
                <p key={i} style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--border)', fontStyle: 'italic' }}>"{ex}"</p>
              ))}
            </div>
          )}

          {(selectedWord.collocations as string[] || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Collocations</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(selectedWord.collocations as string[]).map(c => <span key={c} className="badge">{c}</span>)}
              </div>
            </div>
          )}

          {selectedWord.etymology_hint && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Memory Hint</h4>
              <p style={{ fontSize: 14, background: 'var(--bg)', padding: '10px', borderRadius: 8 }}>{selectedWord.etymology_hint}</p>
            </div>
          )}

          <button onClick={() => deleteWord(selectedWord.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', width: '100%' }}>
            Delete Word
          </button>
        </div>
      )}

      {/* Add Word Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20 }}>Add New Word</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)' }}><X size={20} /></button>
            </div>

            {/* Tab */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['json', 'manual'] as const).map(m => (
                <button key={m} onClick={() => setAddMode(m)} style={{ flex: 1, padding: '10px', background: addMode === m ? 'var(--accent)' : 'transparent', color: addMode === m ? 'white' : 'var(--ink-light)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {m === 'json' ? 'Paste Claude JSON' : 'Manual Entry'}
                </button>
              ))}
            </div>

            {addMode === 'json' ? (
              <div>
                {/* Get prompt helper */}
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 8 }}>Generate a word card prompt for Claude:</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" placeholder="Enter a word..." value={importWord} onChange={e => setImportWord(e.target.value)} />
                    <button onClick={() => copyPrompt(importWord)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 13, padding: '8px 12px' }}>
                      {copied === importWord ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      {copied === importWord ? 'Copied!' : 'Copy Prompt'}
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 8 }}>Paste Claude's JSON response:</p>
                <textarea
                  className="input"
                  rows={10}
                  placeholder='{"word": "example", "definition": "...", ...}'
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
                <button className="btn-primary" onClick={saveWordFromJSON} disabled={!jsonInput || saving} style={{ width: '100%', marginTop: 12 }}>
                  {saving ? 'Saving...' : 'Save Word(s)'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'word', label: 'Word *', placeholder: 'e.g. eloquent' },
                  { key: 'definition', label: 'Definition *', placeholder: 'English definition...' },
                  { key: 'mongolian', label: 'Mongolian', placeholder: 'Mongolian translation...' },
                  { key: 'part_of_speech', label: 'Part of Speech', placeholder: 'noun, verb, adjective...' },
                  { key: 'ipa', label: 'IPA', placeholder: '/ɛləkwənt/' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
                    <input className="input" placeholder={placeholder} value={(manualWord as any)[key]} onChange={e => setManualWord(prev => ({ ...prev, [key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>CEFR Level</label>
                    <select className="input" value={manualWord.cefr_level} onChange={e => setManualWord(prev => ({ ...prev, cefr_level: e.target.value }))}>
                      {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Category</label>
                    <select className="input" value={manualWord.category} onChange={e => setManualWord(prev => ({ ...prev, category: e.target.value }))}>
                      {['academic','business','daily','idiom','phrasal_verb'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn-primary" onClick={saveManualWord} disabled={!manualWord.word || !manualWord.definition || saving} style={{ marginTop: 4 }}>
                  {saving ? 'Saving...' : 'Save Word'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

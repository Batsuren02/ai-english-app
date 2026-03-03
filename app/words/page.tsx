'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { Plus, Search, Download, X, ChevronDown, Volume2, Copy, Check } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

// shadcn components
import { Button }                                          from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input }                                           from '@/components/ui/input'
import { Textarea }                                        from '@/components/ui/textarea'
import { Badge }                                           from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger }        from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea }                                      from '@/components/ui/scroll-area'
import { cn }                                              from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
const CATEGORIES = ['academic', 'business', 'daily', 'idiom', 'phrasal_verb'] as const
const LEVELS     = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WordsPage() {
  const [words,       setWords]       = useState<Word[]>([])
  const [filtered,    setFiltered]    = useState<Word[]>([])
  const [search,      setSearch]      = useState('')
  const [filterCat,   setFilterCat]   = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [showAdd,     setShowAdd]     = useState(false)
  const [selectedWord,setSelectedWord]= useState<Word | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [copied,      setCopied]      = useState<string | null>(null)

  // Add-word form
  const [jsonInput,  setJsonInput]  = useState('')
  const [importWord, setImportWord] = useState('')
  const [manualWord, setManualWord] = useState({
    word: '', definition: '', mongolian: '',
    part_of_speech: '', ipa: '', cefr_level: 'B1', category: 'daily',
  })
  const [saving, setSaving] = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => { loadWords() }, [])

  useEffect(() => {
    let f = words
    if (search)      f = f.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.definition?.toLowerCase().includes(search.toLowerCase()))
    if (filterCat   !== 'all') f = f.filter(w => w.category    === filterCat)
    if (filterLevel !== 'all') f = f.filter(w => w.cefr_level  === filterLevel)
    setFiltered(f)
  }, [words, search, filterCat, filterLevel])

  async function loadWords() {
    const { data } = await supabase.from('words').select('*').order('created_at', { ascending: false })
    if (data) { setWords(data); setFiltered(data) }
    setLoading(false)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async function saveWordFromJSON() {
    setSaving(true)
    try {
      const parsed   = JSON.parse(jsonInput)
      const wordData = Array.isArray(parsed) ? parsed : [parsed]
      for (const w of wordData) {
        const { data: row } = await supabase.from('words').insert({ ...w }).select().single()
        if (row) await supabase.from('reviews').insert({ word_id: row.id })
      }
      setJsonInput(''); setShowAdd(false); await loadWords()
    } catch { alert('Invalid JSON. Please check the format.') }
    setSaving(false)
  }

  async function saveManualWord() {
    if (!manualWord.word || !manualWord.definition) return
    setSaving(true)
    const { data } = await supabase
      .from('words')
      .insert({ ...manualWord, examples: [], word_family: [], collocations: [], confused_with: [] })
      .select().single()
    if (data) await supabase.from('reviews').insert({ word_id: data.id })
    setManualWord({ word: '', definition: '', mongolian: '', part_of_speech: '', ipa: '', cefr_level: 'B1', category: 'daily' })
    setShowAdd(false); await loadWords(); setSaving(false)
  }

  async function deleteWord(id: string) {
    if (!confirm('Delete this word?')) return
    await supabase.from('words').delete().eq('id', id)
    setSelectedWord(null); await loadWords()
  }

  function copyPrompt(word: string) {
    navigator.clipboard.writeText(PROMPTS.addWord(word))
    setCopied(word); setTimeout(() => setCopied(null), 2000)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'words.json' }).click()
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85
      window.speechSynthesis.speak(u)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
      Loading words…
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-[var(--text)]">Word Library</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{words.length} words total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={exportJSON}>
            <Download size={14} /> Export
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Word
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
          <Input
            placeholder="Search words…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Level filter */}
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-auto min-w-[120px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Word list ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-secondary)]">
          {words.length === 0 ? 'No words yet. Add your first word!' : 'No words match your filters.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(w => (
            <button
              key={w.id}
              className={cn(
                'card w-full text-left px-4 py-3 cursor-pointer transition-shadow',
                'flex items-center gap-3 hover:shadow-md',
                selectedWord?.id === w.id && 'ring-2 ring-[var(--accent)] ring-inset'
              )}
              onClick={() => setSelectedWord(selectedWord?.id === w.id ? null : w)}
            >
              {/* Word info — min-w-0 prevents flex child overflow */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[var(--text)] text-base">{w.word}</span>
                  {w.ipa && (
                    <span className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">{w.ipa}</span>
                  )}
                  {w.cefr_level && <Badge>{w.cefr_level}</Badge>}
                  {w.category   && <Badge variant="purple">{w.category}</Badge>}
                </div>
                {/* Definition: single line, truncated — never overflows */}
                <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">
                  {w.definition}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={cn(
                  'text-[var(--text-secondary)] transition-transform flex-shrink-0',
                  selectedWord?.id === w.id && 'rotate-180'
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Word detail panel (right-side sheet on desktop, full on mobile) ─ */}
      {selectedWord && (
        <>
          {/* Backdrop — closes panel, sits below the panel */}
          <div
            className="fixed inset-0 z-40 bg-black/20 md:bg-black/10"
            onClick={() => setSelectedWord(null)}
          />

          {/* Panel */}
          <aside className={cn(
            'fixed inset-y-0 right-0 z-50 flex flex-col',
            // Mobile: full width; Desktop: 360px
            'w-full md:w-[360px]',
            'bg-[var(--bg-card)] border-l border-[var(--border)] shadow-xl',
          )}>
            {/* Panel header */}
            <div className="flex items-start justify-between p-5 pb-3 border-b border-[var(--border)]">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="font-display text-2xl text-[var(--text)] flex items-center gap-2 flex-wrap">
                  <span className="truncate">{selectedWord.word}</span>
                  <button
                    onClick={() => speak(selectedWord.word)}
                    className="text-[var(--accent)] hover:opacity-70 transition-opacity flex-shrink-0"
                  >
                    <Volume2 size={18} />
                  </button>
                </h2>
                {selectedWord.ipa && (
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">{selectedWord.ipa}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedWord(null)}>
                <X size={18} />
              </Button>
            </div>

            {/* Scrollable body */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedWord.part_of_speech && <Badge>{selectedWord.part_of_speech}</Badge>}
                  {selectedWord.cefr_level     && <Badge>{selectedWord.cefr_level}</Badge>}
                  {selectedWord.category        && <Badge variant="purple">{selectedWord.category}</Badge>}
                </div>

                {/* Definition */}
                <div>
                  <p className="text-base text-[var(--text)] leading-relaxed">{selectedWord.definition}</p>
                  {selectedWord.mongolian && (
                    <p className="text-sm text-[var(--text-secondary)] italic mt-1">{selectedWord.mongolian}</p>
                  )}
                </div>

                {/* Examples */}
                {(selectedWord.examples as string[] || []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Examples
                    </h4>
                    <div className="space-y-1">
                      {(selectedWord.examples as string[]).map((ex, i) => (
                        <p key={i} className="text-sm text-[var(--text)] italic border-b border-[var(--border)] pb-1">
                          "{ex}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collocations */}
                {(selectedWord.collocations as string[] || []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Collocations
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedWord.collocations as string[]).map(c => <Badge key={c}>{c}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Memory hint */}
                {selectedWord.etymology_hint && (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Memory Hint
                    </h4>
                    <p className="text-sm text-[var(--text)] bg-[var(--surface)] rounded-lg p-3 leading-relaxed">
                      {selectedWord.etymology_hint}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Panel footer */}
            <div className="p-4 border-t border-[var(--border)]">
              <Button variant="danger" className="w-full" onClick={() => deleteWord(selectedWord.id)}>
                Delete Word
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* ── Add Word Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Word</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="json">
            <TabsList>
              <TabsTrigger value="json">Paste Claude JSON</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {/* ── JSON tab ── */}
            <TabsContent value="json" className="space-y-4">
              {/* Prompt helper */}
              <div className="rounded-lg bg-[var(--surface)] p-4 space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">Generate a word card prompt for Claude:</p>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Enter a word…"
                    value={importWord}
                    onChange={e => setImportWord(e.target.value)}
                    className="flex-1 min-w-[120px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPrompt(importWord)}
                    className="flex-shrink-0"
                  >
                    {copied === importWord ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    {copied === importWord ? 'Copied!' : 'Copy Prompt'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-[var(--text-secondary)]">Paste Claude's JSON response:</p>
                <Textarea
                  rows={8}
                  placeholder={'{"word": "example", "definition": "...", ...}'}
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={saveWordFromJSON}
                disabled={!jsonInput || saving}
              >
                {saving ? 'Saving…' : 'Save Word(s)'}
              </Button>
            </TabsContent>

            {/* ── Manual tab ── */}
            <TabsContent value="manual" className="space-y-3">
              {([
                { key: 'word',          label: 'Word *',         placeholder: 'e.g. eloquent'           },
                { key: 'definition',    label: 'Definition *',   placeholder: 'English definition…'     },
                { key: 'mongolian',     label: 'Mongolian',      placeholder: 'Mongolian translation…'  },
                { key: 'part_of_speech',label: 'Part of Speech', placeholder: 'noun, verb, adjective…'  },
                { key: 'ipa',           label: 'IPA',            placeholder: '/ɛləkwənt/'               },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)]">{label}</label>
                  <Input
                    placeholder={placeholder}
                    value={(manualWord as any)[key]}
                    onChange={e => setManualWord(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)]">CEFR Level</label>
                  <Select value={manualWord.cefr_level} onValueChange={v => setManualWord(p => ({ ...p, cefr_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)]">Category</label>
                  <Select value={manualWord.category} onValueChange={v => setManualWord(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full mt-1"
                onClick={saveManualWord}
                disabled={!manualWord.word || !manualWord.definition || saving}
              >
                {saving ? 'Saving…' : 'Save Word'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Word } from '@/lib/supabase'
import { Plus, Search, Download, X, ChevronDown, Volume2, Copy, Check, Trash2 } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

// V2.0 Components
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'

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
    <div className="flex items-center justify-center h-72">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent" />
        <p className="text-sm text-[var(--text-secondary)]">Loading words…</p>
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in max-w-6xl space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="h2 text-[var(--text)] mb-2">Word Library</h1>
          <p className="body text-[var(--text-secondary)]">{words.length} words • Master your vocabulary</p>
        </div>
        <div className="flex items-center gap-2">
          <InteractiveButton
            variant="secondary"
            size="md"
            onClick={exportJSON}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </InteractiveButton>
          <InteractiveButton
            variant="primary"
            size="md"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Word
          </InteractiveButton>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <SurfaceCard padding="md" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
            <Input
              placeholder="Search words…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filter */}
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-auto min-w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Level filter */}
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-auto min-w-[130px]">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </SurfaceCard>

      {/* ── Word list ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <SurfaceCard padding="lg" className="text-center py-12">
          <p className="text-lg text-[var(--text-secondary)] mb-4">
            {words.length === 0 ? '📚 No words yet' : '🔍 No words match your filters'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {words.length === 0 ? 'Add your first word to start building your vocabulary!' : 'Try adjusting your search or filters.'}
          </p>
          {words.length === 0 && (
            <InteractiveButton
              variant="primary"
              size="md"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add Your First Word
            </InteractiveButton>
          )}
        </SurfaceCard>
      ) : (
        <div className="flex flex-col gap-2 space-y-2">
          {filtered.map(w => (
            <button
              key={w.id}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg transition-all',
                'flex items-center gap-3 hover:shadow-md',
                'border border-[var(--border)] bg-[var(--surface)]',
                'hover:bg-[var(--surface)] hover:border-[var(--accent)]/50',
                selectedWord?.id === w.id && 'ring-2 ring-[var(--accent)] ring-inset bg-[var(--accent)]/5'
              )}
              onClick={() => setSelectedWord(selectedWord?.id === w.id ? null : w)}
            >
              {/* Word info — min-w-0 prevents flex child overflow */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-[var(--text)] text-base">{w.word}</span>
                  {w.ipa && (
                    <span className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">{w.ipa}</span>
                  )}
                  {w.cefr_level && <Badge variant="outline" className="text-xs">{w.cefr_level}</Badge>}
                  {w.category   && <Badge variant="purple" className="text-xs">{w.category.replace('_', ' ')}</Badge>}
                </div>
                {/* Definition: single line, truncated — never overflows */}
                <p className="text-sm text-[var(--text-secondary)] truncate">
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
            <div className="flex items-start justify-between p-6 pb-4 border-b border-[var(--border)]">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="h3 text-[var(--text)] flex items-center gap-2 flex-wrap">
                  <span className="truncate">{selectedWord.word}</span>
                  <button
                    onClick={() => speak(selectedWord.word)}
                    className="p-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-all flex-shrink-0"
                    title="Pronounce"
                  >
                    <Volume2 size={16} />
                  </button>
                </h2>
                {selectedWord.ipa && (
                  <p className="label text-[var(--text-secondary)] mt-2">{selectedWord.ipa}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedWord(null)}>
                <X size={18} />
              </Button>
            </div>

            {/* Scrollable body */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedWord.part_of_speech && <Badge variant="outline" className="text-xs">{selectedWord.part_of_speech}</Badge>}
                  {selectedWord.cefr_level     && <Badge className="text-xs bg-blue-100 text-blue-700">{selectedWord.cefr_level}</Badge>}
                  {selectedWord.category        && <Badge variant="purple" className="text-xs">{selectedWord.category.replace('_', ' ')}</Badge>}
                </div>

                {/* Definition */}
                <div>
                  <p className="body text-[var(--text)] leading-relaxed">{selectedWord.definition}</p>
                  {selectedWord.mongolian && (
                    <p className="text-sm text-[var(--text-secondary)] italic mt-3">{selectedWord.mongolian}</p>
                  )}
                </div>

                {/* Examples */}
                {(selectedWord.examples as string[] || []).length > 0 && (
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                      Examples
                    </p>
                    <div className="space-y-2">
                      {(selectedWord.examples as string[]).map((ex, i) => (
                        <p key={i} className="text-sm text-[var(--text)] italic px-3 py-2 bg-[var(--bg)] rounded border-l-2 border-[var(--accent)]">
                          "{ex}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collocations */}
                {(selectedWord.collocations as string[] || []).length > 0 && (
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                      Collocations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedWord.collocations as string[]).map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Memory hint */}
                {selectedWord.etymology_hint && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                      💡 {selectedWord.etymology_hint}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Panel footer */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]">
              <InteractiveButton
                variant="danger"
                size="md"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => deleteWord(selectedWord.id)}
              >
                <Trash2 size={16} />
                Delete Word
              </InteractiveButton>
            </div>
          </aside>
        </>
      )}

      {/* ── Add Word Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="h3 text-[var(--text)]">Add New Word</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="json" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="json">Paste Claude JSON</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {/* ── JSON tab ── */}
            <TabsContent value="json" className="space-y-4 mt-4">
              {/* Prompt helper */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3 border border-blue-200 dark:border-blue-900">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Generate a word card prompt for Claude:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a word…"
                    value={importWord}
                    onChange={e => setImportWord(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPrompt(importWord)}
                    className="flex-shrink-0"
                  >
                    {copied === importWord ? (
                      <><Check size={14} className="text-green-600" /></>
                    ) : (
                      <><Copy size={14} /></>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="label text-[var(--text)]">Paste Claude's JSON response:</label>
                <Textarea
                  rows={8}
                  placeholder={'{"word": "example", "definition": "...", ...}'}
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <InteractiveButton
                variant="primary"
                size="md"
                className="w-full"
                onClick={saveWordFromJSON}
                isLoading={saving}
              >
                {saving ? 'Saving...' : 'Save Word(s)'}
              </InteractiveButton>
            </TabsContent>

            {/* ── Manual tab ── */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              {([
                { key: 'word',          label: 'Word *',         placeholder: 'e.g. eloquent'           },
                { key: 'definition',    label: 'Definition *',   placeholder: 'English definition…'     },
                { key: 'mongolian',     label: 'Mongolian',      placeholder: 'Mongolian translation…'  },
                { key: 'part_of_speech',label: 'Part of Speech', placeholder: 'noun, verb, adjective…'  },
                { key: 'ipa',           label: 'IPA',            placeholder: '/ɛləkwənt/'               },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <label className="label text-[var(--text)]">{label}</label>
                  <Input
                    placeholder={placeholder}
                    value={(manualWord as any)[key]}
                    onChange={e => setManualWord(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label text-[var(--text)]">CEFR Level</label>
                  <Select value={manualWord.cefr_level} onValueChange={v => setManualWord(p => ({ ...p, cefr_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="label text-[var(--text)]">Category</label>
                  <Select value={manualWord.category} onValueChange={v => setManualWord(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <InteractiveButton
                variant="primary"
                size="md"
                className="w-full"
                onClick={saveManualWord}
                isLoading={saving}
              >
                {saving ? 'Saving...' : 'Save Word'}
              </InteractiveButton>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  )
}

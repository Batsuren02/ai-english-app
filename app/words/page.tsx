'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Word, Review } from '@/lib/supabase'
import { Plus, Search, Download, X, Volume2, Copy, Check, Trash2, Star, Eye } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

// V2.0 Components
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'

// shadcn components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
const CATEGORIES = ['academic', 'business', 'daily', 'idiom', 'phrasal_verb'] as const
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

interface WordWithReview extends Word {
  review?: Review
  masteryLevel?: 'mastered' | 'learning' | 'needs_review'
  progressPercent?: number
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WordsPage() {
  const [words, setWords] = useState<WordWithReview[]>([])
  const [filtered, setFiltered] = useState<WordWithReview[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterMastery, setFilterMastery] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedWord, setSelectedWord] = useState<WordWithReview | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  // Add-word form
  const [jsonInput, setJsonInput] = useState('')
  const [importWord, setImportWord] = useState('')
  const [manualWord, setManualWord] = useState({
    word: '',
    definition: '',
    mongolian: '',
    part_of_speech: '',
    ipa: '',
    cefr_level: 'B1',
    category: 'daily',
  })
  const [saving, setSaving] = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadWords()
  }, [])

  useEffect(() => {
    let f = words
    if (search)
      f = f.filter(
        (w) =>
          w.word.toLowerCase().includes(search.toLowerCase()) ||
          w.definition?.toLowerCase().includes(search.toLowerCase())
      )
    if (filterCat !== 'all') f = f.filter((w) => w.category === filterCat)
    if (filterLevel !== 'all') f = f.filter((w) => w.cefr_level === filterLevel)
    if (filterMastery !== 'all') f = f.filter((w) => w.masteryLevel === filterMastery)

    // Sort: needs_review first, then learning, then mastered
    f.sort((a, b) => {
      const masteryOrder = { needs_review: 0, learning: 1, mastered: 2 }
      const orderA = masteryOrder[a.masteryLevel as keyof typeof masteryOrder] ?? 3
      const orderB = masteryOrder[b.masteryLevel as keyof typeof masteryOrder] ?? 3
      return orderA - orderB
    })

    setFiltered(f)
  }, [words, search, filterCat, filterLevel, filterMastery])

  async function loadWords() {
    try {
      const { data: wordsData } = await supabase.from('words').select('*').order('created_at', { ascending: false })
      const { data: reviewsData } = await supabase.from('reviews').select('*')

      if (wordsData && reviewsData) {
        const reviewMap = new Map(reviewsData.map((r: Review) => [r.word_id, r]))
        const enriched: WordWithReview[] = wordsData.map((word) => {
          const review = reviewMap.get(word.id)
          const reps = review?.repetitions || 0

          let masteryLevel: 'mastered' | 'learning' | 'needs_review'
          let progressPercent = 0
          if (reps === 0) {
            masteryLevel = 'needs_review'
            progressPercent = 0
          } else if (reps < 3) {
            masteryLevel = 'learning'
            progressPercent = (reps / 3) * 100
          } else {
            masteryLevel = 'mastered'
            progressPercent = 100
          }

          return { ...word, review, masteryLevel, progressPercent }
        })
        setWords(enriched)
        setFiltered(enriched)
      }
    } catch (error) {
      console.error('Failed to load words:', error)
    }
    setLoading(false)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async function saveWordFromJSON() {
    setSaving(true)
    try {
      const parsed = JSON.parse(jsonInput)
      const wordData = Array.isArray(parsed) ? parsed : [parsed]
      for (const w of wordData) {
        const { data: row } = await supabase.from('words').insert({ ...w }).select().single()
        if (row) await supabase.from('reviews').insert({ word_id: row.id })
      }
      setJsonInput('')
      setShowAdd(false)
      await loadWords()
    } catch {
      alert('Invalid JSON. Please check the format.')
    }
    setSaving(false)
  }

  async function saveManualWord() {
    if (!manualWord.word || !manualWord.definition) return
    setSaving(true)
    const { data } = await supabase
      .from('words')
      .insert({
        ...manualWord,
        examples: [],
        word_family: [],
        collocations: [],
        confused_with: [],
      })
      .select()
      .single()
    if (data) await supabase.from('reviews').insert({ word_id: data.id })
    setManualWord({
      word: '',
      definition: '',
      mongolian: '',
      part_of_speech: '',
      ipa: '',
      cefr_level: 'B1',
      category: 'daily',
    })
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
    Object.assign(document.createElement('a'), { href: url, download: 'words.json' }).click()
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = 0.85
      window.speechSynthesis.speak(u)
    }
  }

  // ── Helper functions ──────────────────────────────────────────────────────
  function getMasteryColor(level?: string): string {
    switch (level) {
      case 'mastered':
        return 'from-emerald-500/20 to-emerald-600/10 border-emerald-400/30'
      case 'learning':
        return 'from-blue-500/20 to-blue-600/10 border-blue-400/30'
      case 'needs_review':
        return 'from-amber-500/20 to-amber-600/10 border-amber-400/30'
      default:
        return 'from-slate-500/10 to-slate-600/5 border-slate-400/20'
    }
  }

  function getMasteryBadgeColor(level?: string): string {
    switch (level) {
      case 'mastered':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      case 'learning':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      case 'needs_review':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
    }
  }

  function getMasteryLabel(level?: string): string {
    switch (level) {
      case 'mastered':
        return '✓ Mastered'
      case 'learning':
        return '◐ Learning'
      case 'needs_review':
        return '○ Needs Review'
      default:
        return 'Not Reviewed'
    }
  }

  function getLevelColor(level: string): string {
    switch (level) {
      case 'A1':
      case 'A2':
        return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      case 'B1':
      case 'B2':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      case 'C1':
      case 'C2':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return <EmptyState icon="📚" title="Loading your library…" description="Fetching vocabulary from Supabase" />
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in max-w-7xl space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="h2 text-[var(--text)] mb-2">Word Library</h1>
          <p className="body text-[var(--text-secondary)]">
            {words.length} words • {words.filter((w) => w.masteryLevel === 'mastered').length} mastered
          </p>
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

      {/* ── Filters & Search ─────────────────────────────────────────────────── */}
      <SurfaceCard padding="md" className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
            <Input
              placeholder="Search words or definitions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3">
            {/* Mastery filter */}
            <Select value={filterMastery} onValueChange={setFilterMastery}>
              <SelectTrigger className="w-auto min-w-[160px]">
                <SelectValue placeholder="All Mastery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Words</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="mastered">Mastered</SelectItem>
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-auto min-w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Level filter */}
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-auto min-w-[130px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SurfaceCard>

      {/* ── Word Grid (Card-based layout) ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={words.length === 0 ? '📚' : '🔍'}
          title={words.length === 0 ? 'No words yet' : 'No words match your filters'}
          description={
            words.length === 0
              ? 'Start building your vocabulary by adding your first word'
              : 'Try adjusting your search or filters'
          }
          action={
            words.length === 0
              ? {
                  label: 'Add Your First Word',
                  onClick: () => setShowAdd(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {filtered.map((w) => (
            <div
              key={w.id}
              className={cn(
                'group relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-300',
                'bg-gradient-to-br',
                getMasteryColor(w.masteryLevel),
                'hover:shadow-lg hover:scale-105'
              )}
              onClick={() => {
                setSelectedWord(w)
                setShowDetails(true)
              }}
            >
              {/* Top section: Word + Badges */}
              <div className="space-y-3">
                {/* Word title with pronunciation */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="h4 text-[var(--text)] truncate font-semibold">{w.word}</h3>
                    {w.ipa && (
                      <p className="text-xs text-[var(--text-secondary)] truncate mt-1">{w.ipa}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      speak(w.word)
                    }}
                    className="p-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-all flex-shrink-0"
                    title="Pronounce"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>

                {/* Definition preview */}
                <p className="body text-[var(--text)] line-clamp-2 leading-relaxed">{w.definition}</p>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className={`text-xs ${getMasteryBadgeColor(w.masteryLevel)}`}>
                    {getMasteryLabel(w.masteryLevel)}
                  </Badge>
                  {w.cefr_level && (
                    <Badge variant="outline" className={`text-xs ${getLevelColor(w.cefr_level)}`}>
                      {w.cefr_level}
                    </Badge>
                  )}
                  {w.category && (
                    <Badge variant="outline" className="text-xs">
                      {w.category.replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                {/* Progress ring/bar - Visual mastery indicator */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                          w.masteryLevel === 'mastered'
                            ? 'from-emerald-400 to-emerald-500'
                            : w.masteryLevel === 'learning'
                              ? 'from-blue-400 to-blue-500'
                              : 'from-amber-400 to-amber-500'
                        )}
                        style={{ width: `${w.progressPercent || 0}%` }}
                      />
                    </div>
                    <span>{Math.round(w.progressPercent || 0)}%</span>
                  </div>
                </div>
              </div>

              {/* Review count indicator */}
              {w.review && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-[var(--bg-card)] px-2 py-1 rounded-lg text-[var(--text-secondary)]">
                  <Eye size={12} />
                  {w.review.repetitions}
                </div>
              )}

              {/* Hover action hint */}
              <div className="absolute inset-0 rounded-xl bg-[var(--accent)]/0 group-hover:bg-[var(--accent)]/5 transition-colors pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-xs font-medium text-[var(--accent)]">Click to view</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Word Detail Modal ────────────────────────────────────────────────── */}
      {selectedWord && showDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDetails(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <SurfaceCard
              padding="lg"
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto shadow-2xl animate-in"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div className="flex-1 min-w-0">
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDetails(false)}
                  className="flex-shrink-0"
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Modal body - scrollable */}
              <ScrollArea className="flex-1 overflow-hidden">
                <div className="p-6 space-y-6">
                  {/* Mastery status */}
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                      Progress
                    </p>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getMasteryBadgeColor(selectedWord.masteryLevel)}`}>
                        {getMasteryLabel(selectedWord.masteryLevel)}
                      </Badge>
                      <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full bg-gradient-to-r',
                            selectedWord.masteryLevel === 'mastered'
                              ? 'from-emerald-400 to-emerald-500'
                              : selectedWord.masteryLevel === 'learning'
                                ? 'from-blue-400 to-blue-500'
                                : 'from-amber-400 to-amber-500'
                          )}
                          style={{ width: `${selectedWord.progressPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-secondary)] min-w-[40px]">
                        {Math.round(selectedWord.progressPercent || 0)}%
                      </span>
                    </div>
                    {selectedWord.review && (
                      <p className="text-xs text-[var(--text-secondary)] mt-2">
                        Reviewed {selectedWord.review.repetitions} times
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {selectedWord.part_of_speech && (
                      <Badge variant="outline" className="text-xs">
                        {selectedWord.part_of_speech}
                      </Badge>
                    )}
                    {selectedWord.cefr_level && (
                      <Badge className={`text-xs ${getLevelColor(selectedWord.cefr_level)}`}>
                        {selectedWord.cefr_level}
                      </Badge>
                    )}
                    {selectedWord.category && (
                      <Badge variant="outline" className="text-xs">
                        {selectedWord.category.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  {/* Definition */}
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                      Definition
                    </p>
                    <p className="body text-[var(--text)] leading-relaxed">{selectedWord.definition}</p>
                    {selectedWord.mongolian && (
                      <p className="text-sm text-[var(--text-secondary)] italic mt-3">
                        {selectedWord.mongolian}
                      </p>
                    )}
                  </div>

                  {/* Examples */}
                  {(selectedWord.examples as string[] | undefined || []).length > 0 && (
                    <div>
                      <p className="label text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                        Examples
                      </p>
                      <div className="space-y-2">
                        {(selectedWord.examples as string[]).map((ex, i) => (
                          <p
                            key={i}
                            className="text-sm text-[var(--text)] italic px-3 py-2 bg-[var(--bg)] rounded border-l-2 border-[var(--accent)]"
                          >
                            "{ex}"
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collocations */}
                  {(selectedWord.collocations as string[] | undefined || []).length > 0 && (
                    <div>
                      <p className="label text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                        Collocations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedWord.collocations as string[]).map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))}
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

              {/* Modal footer */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)] flex gap-2">
                <InteractiveButton
                  variant="danger"
                  size="md"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => {
                    deleteWord(selectedWord.id)
                    setShowDetails(false)
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </InteractiveButton>
              </div>
            </SurfaceCard>
          </div>
        </>
      )}

      {/* ── Add Word Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="h3 text-[var(--text)]">Add New Word</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="json" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="json">Claude JSON</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {/* ── JSON tab ── */}
            <TabsContent value="json" className="space-y-4 mt-4">
              {/* Prompt helper */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3 border border-blue-200 dark:border-blue-900">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                  Generate a word card for Claude:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a word…"
                    value={importWord}
                    onChange={(e) => setImportWord(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPrompt(importWord)}
                    className="flex-shrink-0"
                  >
                    {copied === importWord ? (
                      <>
                        <Check size={14} className="text-green-600" />
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                      </>
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
                  onChange={(e) => setJsonInput(e.target.value)}
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
              {(
                [
                  { key: 'word', label: 'Word *', placeholder: 'e.g. eloquent' },
                  { key: 'definition', label: 'Definition *', placeholder: 'English definition…' },
                  { key: 'mongolian', label: 'Mongolian', placeholder: 'Mongolian translation…' },
                  { key: 'part_of_speech', label: 'Part of Speech', placeholder: 'noun, verb, adjective…' },
                  { key: 'ipa', label: 'IPA', placeholder: '/ɛləkwənt/' },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <label className="label text-[var(--text)]">{label}</label>
                  <Input
                    placeholder={placeholder}
                    value={(manualWord as any)[key]}
                    onChange={(e) =>
                      setManualWord((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label text-[var(--text)]">CEFR Level</label>
                  <Select
                    value={manualWord.cefr_level}
                    onValueChange={(v) => setManualWord((p) => ({ ...p, cefr_level: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="label text-[var(--text)]">Category</label>
                  <Select
                    value={manualWord.category}
                    onValueChange={(v) => setManualWord((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace('_', ' ')}
                        </SelectItem>
                      ))}
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

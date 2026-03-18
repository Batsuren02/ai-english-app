'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase, Word, Review } from '@/lib/supabase'
import Papa from 'papaparse'
import { Plus, Download, Copy, Check } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'

// V2.0 Components
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { SkeletonWordCard } from '@/components/design/Skeleton'

// shadcn components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToastContext } from '@/components/ToastProvider'

// Words feature components
import WordCard from '@/components/words/WordCard'
import WordFilters from '@/components/words/WordFilters'
import WordModal from '@/components/words/WordModal'
import { WordWithReview, CATEGORIES, LEVELS } from '@/components/words/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 30

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WordsPage() {
  const toast = useToastContext()
  const [words, setWords] = useState<WordWithReview[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterMastery, setFilterMastery] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'alpha' | 'hardest' | 'most_reviewed'>('newest')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
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
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Word>>({})
  const [lookingUp, setLookingUp] = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadWords()
  }, [])

  const filtered = useMemo(() => {
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

    return [...f].sort((a, b) => {
      if (sortBy === 'alpha') return (a.word || '').localeCompare(b.word || '')
      if (sortBy === 'hardest') return (a.review?.ease_factor ?? 2.5) - (b.review?.ease_factor ?? 2.5)
      if (sortBy === 'most_reviewed') return (b.review?.total_reviews ?? 0) - (a.review?.total_reviews ?? 0)
      const masteryOrder = { needs_review: 0, learning: 1, mastered: 2 }
      const orderA = masteryOrder[a.masteryLevel as keyof typeof masteryOrder] ?? 3
      const orderB = masteryOrder[b.masteryLevel as keyof typeof masteryOrder] ?? 3
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }, [words, search, filterCat, filterLevel, filterMastery, sortBy])

  function enrichWords(wordsData: Word[], reviewsData: Review[]): WordWithReview[] {
    const reviewMap = new Map(reviewsData.map((r: Review) => [r.word_id, r]))
    return wordsData.map((word) => {
      const review = reviewMap.get(word.id)
      const reps = review?.repetitions || 0
      let masteryLevel: 'mastered' | 'learning' | 'needs_review'
      let progressPercent = 0
      if (reps === 0) { masteryLevel = 'needs_review'; progressPercent = 0 }
      else if (reps < 3) { masteryLevel = 'learning'; progressPercent = (reps / 3) * 100 }
      else { masteryLevel = 'mastered'; progressPercent = 100 }
      return { ...word, review, masteryLevel, progressPercent }
    })
  }

  async function loadWords() {
    try {
      const { data: wordsData } = await supabase.from('words').select('*').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1)
      const { data: reviewsData } = await supabase.from('reviews').select('*')

      if (wordsData && reviewsData) {
        const enriched = enrichWords(wordsData, reviewsData)
        setWords(enriched)
        setOffset(0)
        setHasMore(wordsData.length === PAGE_SIZE)
      }
    } catch (error) {
      console.error('Failed to load words:', error)
      toast.error('Failed to load words')
    }
    setLoading(false)
  }

  async function loadMoreWords() {
    setLoadingMore(true)
    try {
      const newOffset = offset + PAGE_SIZE
      const { data: wordsData } = await supabase.from('words').select('*').order('created_at', { ascending: false }).range(newOffset, newOffset + PAGE_SIZE - 1)
      if (wordsData && wordsData.length > 0) {
        const wordIds = wordsData.map((w: Word) => w.id)
        const { data: reviewsData } = await supabase.from('reviews').select('*').in('word_id', wordIds)
        const enriched = enrichWords(wordsData, reviewsData || [])
        setWords(prev => [...prev, ...enriched])
        setOffset(newOffset)
        setHasMore(wordsData.length === PAGE_SIZE)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more words:', error)
      toast.error('Failed to load more words')
    }
    setLoadingMore(false)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async function saveWordFromJSON() {
    setSaving(true)
    try {
      const parsed = JSON.parse(jsonInput)
      const wordData: Partial<Word>[] = Array.isArray(parsed) ? parsed : [parsed]

      const invalid = wordData.filter(w => !w.word?.trim() || !w.definition?.trim())
      if (invalid.length > 0) {
        toast.error(`${invalid.length} word(s) missing required fields (word, definition)`)
        setSaving(false)
        return
      }

      const existingWords = new Set(words.map(w => w.word.toLowerCase().trim()))
      const duplicates = wordData.filter(w => existingWords.has(w.word!.toLowerCase().trim()))
      if (duplicates.length > 0) {
        toast.warning(`Skipping ${duplicates.length} duplicate(s): ${duplicates.map(w => w.word).join(', ')}`)
      }
      const toInsert = wordData.filter(w => !existingWords.has(w.word!.toLowerCase().trim()))
      if (toInsert.length === 0) {
        toast.info('All words already exist in your deck')
        setSaving(false)
        return
      }

      for (const w of toInsert) {
        const { data: row } = await supabase.from('words').insert({ ...w }).select().single()
        if (row) await supabase.from('reviews').insert({ word_id: row.id })
      }
      toast.success(`${toInsert.length} word(s) imported successfully!`)
      setJsonInput('')
      setShowAdd(false)
      await loadWords()
    } catch {
      toast.error('Invalid JSON. Please check the format and ensure it is valid JSON.')
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
    if (data) {
      await supabase.from('reviews').insert({ word_id: data.id })
      toast.success(`"${manualWord.word}" added!`)
    }
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
    const wordName = words.find(w => w.id === id)?.word || 'Word'
    await supabase.from('words').delete().eq('id', id)
    toast.success(`"${wordName}" deleted`)
    setSelectedWord(null)
    setShowDetails(false)
    setDeleteConfirmId(null)
    await loadWords()
  }

  async function updateWord() {
    if (!selectedWord) return
    if (!editForm.word?.trim() || !editForm.definition?.trim()) {
      toast.warning('Word and definition are required')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('words')
      .update({ ...editForm, updated_at: new Date().toISOString() })
      .eq('id', selectedWord.id)
    if (!error) {
      toast.success(`"${editForm.word || selectedWord.word}" updated!`)
      setEditMode(false)
      await loadWords()
      setSelectedWord(prev => prev ? { ...prev, ...editForm } as WordWithReview : null)
    } else {
      toast.error('Failed to update word')
    }
    setSaving(false)
  }

  async function lookupWord(word: string) {
    if (!word.trim()) return
    setLookingUp(true)
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`)
      if (!res.ok) { toast.warning('Word not found in dictionary'); return }
      const data = await res.json()
      const entry = data[0]
      const meaning = entry?.meanings?.[0]
      if (!meaning) { toast.warning('No definition found'); return }
      const defObj = meaning.definitions?.[0]
      const ipa = entry.phonetics?.find((p: any) => p.text)?.text || ''
      setManualWord(prev => ({
        ...prev,
        definition: defObj?.definition || prev.definition,
        part_of_speech: meaning.partOfSpeech || prev.part_of_speech,
        ipa: ipa || prev.ipa,
      }))
      toast.success('Definition auto-filled!')
    } catch {
      toast.error('Dictionary lookup failed')
    }
    setLookingUp(false)
  }

  function copyPrompt(word: string) {
    navigator.clipboard.writeText(PROMPTS.addWord(word))
    setCopied(word)
    setTimeout(() => setCopied(null), 2000)
  }

  function exportToCSV() {
    const rows = words.map(w => ({
      word: w.word,
      definition: w.definition,
      mongolian: w.mongolian,
      part_of_speech: w.part_of_speech,
      ipa: w.ipa,
      cefr_level: w.cefr_level,
      category: w.category,
      goal_tag: w.goal_tag,
      notes: w.notes,
      examples: (w.examples as string[])?.join(' | ') ?? '',
      word_family: (w.word_family as string[])?.join(', ') ?? '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocabulary-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${words.length} words`)
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fade-in max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-36 shimmer bg-[var(--border)] rounded-lg" />
            <div className="h-4 w-52 shimmer bg-[var(--border)] rounded" />
          </div>
          <div className="h-9 w-28 shimmer bg-[var(--border)] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonWordCard key={i} className={`stagger-${Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}`} />
          ))}
        </div>
      </div>
    )
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
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
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

      {/* ── Sticky Search + Filters ──────────────────────────────────────────── */}
      <WordFilters
        search={search}
        setSearch={setSearch}
        filterCat={filterCat}
        setFilterCat={setFilterCat}
        filterLevel={filterLevel}
        setFilterLevel={setFilterLevel}
        filterMastery={filterMastery}
        setFilterMastery={setFilterMastery}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

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
            words.length === 0 ? (
              <InteractiveButton
                variant="primary"
                size="md"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Add Your First Word
              </InteractiveButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {filtered.map((w) => (
            <WordCard
              key={w.id}
              word={w}
              showDetails={showDetails}
              onSelect={(word) => {
                setSelectedWord(word)
                setShowDetails(true)
              }}
            />
          ))}

          {/* Load More — only shown when no active filters (filters work on loaded words) */}
          {hasMore && !search && filterCat === 'all' && filterLevel === 'all' && filterMastery === 'all' && (
            <div className="col-span-full flex justify-center pt-2 pb-2">
              <InteractiveButton
                variant="secondary"
                size="md"
                onClick={loadMoreWords}
                isLoading={loadingMore}
                className="min-w-[160px]"
              >
                Load More Words
              </InteractiveButton>
            </div>
          )}
        </div>
      )}

      {/* ── Word Detail Modal ────────────────────────────────────────────────── */}
      {selectedWord && (
        <WordModal
          selectedWord={selectedWord}
          showDetails={showDetails}
          editMode={editMode}
          editForm={editForm}
          saving={saving}
          deleteConfirmId={deleteConfirmId}
          words={words}
          setShowDetails={(v) => { setShowDetails(v); if (!v) setEditMode(false) }}
          setEditMode={setEditMode}
          setEditForm={setEditForm}
          setDeleteConfirmId={setDeleteConfirmId}
          onUpdateWord={updateWord}
          onDeleteWord={deleteWord}
        />
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
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="label text-[var(--text)]">Paste Claude&apos;s JSON response:</label>
                <textarea
                  rows={8}
                  placeholder={'{"word": "example", "definition": "...", ...}'}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="font-mono text-xs w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
              {/* Word + Dictionary Lookup */}
              <div className="space-y-2">
                <label className="label text-[var(--text)]">Word *</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. eloquent"
                    value={manualWord.word}
                    onChange={e => setManualWord(prev => ({ ...prev, word: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => lookupWord(manualWord.word)}
                    disabled={lookingUp || !manualWord.word.trim()}
                    className="flex-shrink-0 gap-1.5 border border-[var(--border)]"
                  >
                    {lookingUp ? '…' : '🔍 Look Up'}
                  </Button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Click &ldquo;Look Up&rdquo; to auto-fill from dictionary</p>
              </div>
              {(
                [
                  { key: 'definition', label: 'Definition *', placeholder: 'English definition…' },
                  { key: 'mongolian', label: 'Mongolian', placeholder: 'Mongolian translation…' },
                  { key: 'ipa', label: 'IPA', placeholder: '/ɛləkwənt/' },
                  { key: 'part_of_speech', label: 'Part of Speech', placeholder: 'noun, verb, adjective…' },
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

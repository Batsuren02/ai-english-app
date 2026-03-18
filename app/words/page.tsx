'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase, Word, Review } from '@/lib/supabase'
import Papa from 'papaparse'
import { Plus, Search, Download, X, Volume2, Copy, Check, Trash2, Star, Eye, ArrowDownAZ, SortAsc } from 'lucide-react'
import { PROMPTS } from '@/lib/prompts'
import { speakWord } from '@/lib/speech-utils'

// V2.0 Components
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { SkeletonWordCard } from '@/components/design/Skeleton'

// shadcn components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useToastContext } from '@/components/ToastProvider'

// ─── Types ────────────────────────────────────────────────────────────────────
const CATEGORIES = ['academic', 'business', 'daily', 'idiom', 'phrasal_verb'] as const
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

interface WordWithReview extends Word {
  review?: Review
  masteryLevel?: 'mastered' | 'learning' | 'needs_review'
  progressPercent?: number
}

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
      // Update selectedWord in place so modal stays open with fresh data
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
      <div className="sticky top-[40px] z-10 bg-[var(--bg)] py-2 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
          <Input
            placeholder="Search words or definitions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mastery pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: 'all', label: 'All' },
            { value: 'needs_review', label: 'Needs Review' },
            { value: 'learning', label: 'Learning' },
            { value: 'mastered', label: 'Mastered' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterMastery(value)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0',
                filterMastery === value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/40'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Other filters row */}
        <div className="flex flex-wrap gap-2">
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

          {/* Sort */}
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-auto min-w-[150px]">
              <SortAsc size={13} className="mr-1.5 text-[var(--text-secondary)]" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Needs Review First</SelectItem>
              <SelectItem value="alpha">A → Z</SelectItem>
              <SelectItem value="hardest">Hardest First</SelectItem>
              <SelectItem value="most_reviewed">Most Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            <div
              key={w.id}
              className={cn(
                'group relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-300',
                'bg-gradient-to-br',
                getMasteryColor(w.masteryLevel),
                !showDetails && 'hover:shadow-lg hover:scale-105'
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
                      speakWord(w.word)
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
      {selectedWord && showDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm backdrop-enter"
            onClick={() => { setShowDetails(false); setEditMode(false) }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="modal-enter w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border)]" style={{ boxShadow: 'var(--shadow-2xl)' }}>
              {/* Modal header */}
              <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="h3 text-[var(--text)] flex items-center gap-2 flex-wrap">
                    <span className="truncate">{selectedWord.word}</span>
                    <button
                      onClick={() => speakWord(selectedWord.word)}
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
              <div className="flex-1 overflow-y-auto">
                {/* Edit Form */}
                {editMode && (
                  <div className="p-6 space-y-4">
                    {([
                      { key: 'word', label: 'Word', placeholder: 'e.g. eloquent' },
                      { key: 'definition', label: 'Definition', placeholder: 'English definition…' },
                      { key: 'mongolian', label: 'Mongolian', placeholder: 'Mongolian translation…' },
                      { key: 'ipa', label: 'IPA', placeholder: '/ɛləkwənt/' },
                      { key: 'part_of_speech', label: 'Part of Speech', placeholder: 'noun, verb, adjective…' },
                    ] as const).map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1.5">
                        <label className="label text-[var(--text)]">{label}</label>
                        <Input
                          placeholder={placeholder}
                          value={(editForm as any)[key] || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="label text-[var(--text)]">CEFR Level</label>
                        <Select value={editForm.cefr_level || 'B1'} onValueChange={v => setEditForm(p => ({ ...p, cefr_level: v as Word['cefr_level'] }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="label text-[var(--text)]">Category</label>
                        <Select value={editForm.category || 'daily'} onValueChange={v => setEditForm(p => ({ ...p, category: v as Word['category'] }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="label text-[var(--text)]">Personal Notes</label>
                      <Textarea
                        placeholder="Mnemonics, memory tricks, context, example sentences…"
                        rows={3}
                        value={(editForm as any).notes || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
                {/* View Mode */}
                {!editMode && <div className="p-6 space-y-6">
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

                  {/* Personal notes */}
                  {selectedWord.notes && (
                    <div>
                      <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">My Notes</p>
                      <blockquote className="text-sm text-[var(--text)] px-3 py-2 bg-[var(--bg)] rounded border-l-2 border-[var(--accent)]/50 italic leading-relaxed">
                        {selectedWord.notes}
                      </blockquote>
                    </div>
                  )}
                </div>}
              </div>

              {/* Modal footer - sticky */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex gap-2 flex-shrink-0">
                {editMode ? (
                  <>
                    <InteractiveButton
                      variant="ghost"
                      size="md"
                      className="flex-1"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </InteractiveButton>
                    <InteractiveButton
                      variant="primary"
                      size="md"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={updateWord}
                      isLoading={saving}
                    >
                      <Check size={16} />
                      Save Changes
                    </InteractiveButton>
                  </>
                ) : (
                  <>
                    <InteractiveButton
                      variant="secondary"
                      size="md"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={() => {
                        setEditForm({
                          word: selectedWord.word,
                          definition: selectedWord.definition,
                          mongolian: selectedWord.mongolian || '',
                          ipa: selectedWord.ipa || '',
                          part_of_speech: selectedWord.part_of_speech || '',
                          cefr_level: selectedWord.cefr_level || 'B1',
                          category: selectedWord.category || 'daily',
                          notes: selectedWord.notes || '',
                        })
                        setEditMode(true)
                      }}
                    >
                      <Star size={16} />
                      Edit
                    </InteractiveButton>
                    <InteractiveButton
                      variant="danger"
                      size="md"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={() => setDeleteConfirmId(selectedWord.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </InteractiveButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{words.find(w => w.id === deleteConfirmId)?.word}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the word and all its review history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteConfirmId && deleteWord(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <p className="text-[11px] text-[var(--text-secondary)]">Click "Look Up" to auto-fill from dictionary</p>
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

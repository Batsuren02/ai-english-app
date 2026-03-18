'use client'

import { Search, SortAsc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CATEGORIES, LEVELS } from './types'

interface WordFiltersProps {
  search: string
  setSearch: (v: string) => void
  filterCat: string
  setFilterCat: (v: string) => void
  filterLevel: string
  setFilterLevel: (v: string) => void
  filterMastery: string
  setFilterMastery: (v: string) => void
  sortBy: 'newest' | 'alpha' | 'hardest' | 'most_reviewed'
  setSortBy: (v: 'newest' | 'alpha' | 'hardest' | 'most_reviewed') => void
}

export default function WordFilters({
  search,
  setSearch,
  filterCat,
  setFilterCat,
  filterLevel,
  setFilterLevel,
  filterMastery,
  setFilterMastery,
  sortBy,
  setSortBy,
}: WordFiltersProps) {
  return (
    <div className="sticky top-[40px] md:top-0 z-10 bg-[var(--bg)] py-2 space-y-3">
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
  )
}

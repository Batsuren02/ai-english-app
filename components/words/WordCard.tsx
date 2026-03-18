'use client'

import React from 'react'
import { Volume2, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { speakWord } from '@/lib/speech-utils'
import { WordWithReview } from './types'

// ─── Helper functions ─────────────────────────────────────────────────────────

function getMasteryAccent(level?: string): string {
  switch (level) {
    case 'mastered':    return '#10b981'
    case 'learning':    return '#3b82f6'
    case 'needs_review': return '#f59e0b'
    default:            return 'var(--border)'
  }
}

export function getMasteryBadgeColor(level?: string): string {
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

export function getMasteryLabel(level?: string): string {
  switch (level) {
    case 'mastered':    return '✓ Mastered'
    case 'learning':    return '◐ Learning'
    case 'needs_review': return '○ Needs Review'
    default:            return 'Not Reviewed'
  }
}

export function getLevelColor(level: string): string {
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

// ─── Component ────────────────────────────────────────────────────────────────

interface WordCardProps {
  word: WordWithReview
  onSelect: (word: WordWithReview) => void
  showDetails: boolean
}

const WordCard = React.memo(function WordCard({ word: w, onSelect, showDetails }: WordCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 cursor-pointer transition-all duration-200 border-l-4',
        !showDetails && 'hover:shadow-md hover:-translate-y-0.5'
      )}
      style={{ borderLeftColor: getMasteryAccent(w.masteryLevel) }}
      onClick={() => onSelect(w)}
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
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs bg-[var(--bg)] border border-[var(--border)] px-2 py-1 rounded-lg text-[var(--text-secondary)]">
          <Eye size={11} />
          {w.review.repetitions}
        </div>
      )}

      {/* Hover action hint */}
      <div className="absolute inset-0 rounded-xl bg-[var(--accent)]/0 group-hover:bg-[var(--accent)]/5 transition-colors pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="text-xs font-medium text-[var(--accent)]">Click to view</span>
      </div>
    </div>
  )
})

export default WordCard

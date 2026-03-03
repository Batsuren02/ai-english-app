'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface QuizCardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean
  correct?: boolean
  wrong?: boolean
  disabled?: boolean
  feedback?: string
  animated?: boolean
  children: React.ReactNode
}

/**
 * QuizCard - Enhanced quiz option card with gradient states and animations
 * Features: Gradient backgrounds for states, animated feedback, smooth transitions
 */
export function QuizCard({
  selected = false,
  correct = false,
  wrong = false,
  disabled = false,
  feedback,
  animated = false,
  className,
  children,
  ...props
}: QuizCardProps) {
  let bgClass = 'bg-[var(--surface)]'
  let borderClass = 'border-[var(--border)]'
  let textClass = 'text-[var(--text)]'
  let hoverClass = 'hover:shadow-md hover:scale-102'
  let feedbackIcon = null
  let feedbackColor = 'text-[var(--text-secondary)]'

  if (correct) {
    bgClass = 'bg-gradient-to-br from-[rgba(34,197,94,0.1)] to-[rgba(34,197,94,0.05)] border-[var(--success)]'
    borderClass = 'border-[var(--success)]'
    textClass = 'text-[var(--text)]'
    hoverClass = 'hover:shadow-lg'
    feedbackIcon = <Check className="animate-scaleIn" size={20} />
    feedbackColor = 'text-[var(--success)]'
  } else if (wrong) {
    bgClass = 'bg-gradient-to-br from-[rgba(239,68,68,0.1)] to-[rgba(239,68,68,0.05)] border-[var(--error)]'
    borderClass = 'border-[var(--error)]'
    textClass = 'text-[var(--text)]'
    hoverClass = 'hover:shadow-lg'
    feedbackIcon = <X className="animate-scaleIn" size={20} />
    feedbackColor = 'text-[var(--error)]'
  } else if (selected && !disabled) {
    bgClass = 'bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 border-[var(--accent)]'
    borderClass = 'border-[var(--accent)]'
    hoverClass = 'hover:shadow-md hover:scale-102'
  } else if (disabled) {
    hoverClass = ''
    textClass = 'text-[var(--text-secondary)] opacity-60'
  } else {
    hoverClass = 'hover:shadow-md hover:scale-102 hover:border-[var(--accent)]/50'
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 cursor-pointer',
        'transition-all duration-200',
        bgClass,
        borderClass,
        textClass,
        !disabled && hoverClass,
        disabled && 'cursor-not-allowed opacity-60',
        animated && 'animate-scaleIn',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">{children}</div>
        {(correct || wrong) && (
          <div className={feedbackColor}>
            {feedbackIcon}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            'mt-3 text-xs py-2 px-3 rounded',
            'bg-[var(--surface-hover)] border-l-2',
            correct && 'border-l-[var(--success)] text-[var(--success)]',
            wrong && 'border-l-[var(--error)] text-[var(--error)]',
            'animate-slideReveal'
          )}
        >
          {feedback}
        </div>
      )}
    </div>
  )
}

export default QuizCard

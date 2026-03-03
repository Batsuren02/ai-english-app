'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface QuizCardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean
  correct?: boolean
  wrong?: boolean
  children: React.ReactNode
}

/**
 * QuizCard - Quiz option/answer card with state-aware styling
 * Displays feedback for correct/wrong answers
 */
export function QuizCard({
  selected = false,
  correct = false,
  wrong = false,
  className,
  children,
  ...props
}: QuizCardProps) {
  let bgColor = 'bg-[var(--surface)]'
  let borderColor = 'border-[var(--border)]'
  let textColor = 'text-[var(--text)]'

  if (correct) {
    bgColor = 'bg-[rgba(22,163,74,0.1)]'
    borderColor = 'border-[var(--success)]'
    textColor = 'text-[var(--success)]'
  } else if (wrong) {
    bgColor = 'bg-[rgba(220,38,38,0.1)]'
    borderColor = 'border-[var(--error)]'
    textColor = 'text-[var(--error)]'
  } else if (selected) {
    bgColor = 'bg-[var(--accent-light)]'
    borderColor = 'border-[var(--accent)]'
    textColor = 'text-[var(--text)]'
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 cursor-pointer transition-all duration-150',
        'hover:shadow-lg',
        bgColor,
        borderColor,
        textColor,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default QuizCard

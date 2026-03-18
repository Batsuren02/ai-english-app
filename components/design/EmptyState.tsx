'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  animated?: boolean
}

/**
 * EmptyState - Display empty state with animated icon placeholder
 * Features: Centered layout, animated icon with bounce, CTA support
 */
const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  animated = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        'text-center',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 text-[var(--text-secondary)]',
          animated && 'animate-bounce'
        )}
        style={{
          animationDuration: '2s',
        }}
      >
        {icon}
      </div>

      <h3 className="h4 text-[var(--text)] mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
          {description}
        </p>
      )}

      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  )
})

export default EmptyState

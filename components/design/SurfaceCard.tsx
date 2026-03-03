'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  depth?: 1 | 2 | 3
  padding?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

/**
 * SurfaceCard - Reusable card component with theme-aware styling
 * Provides consistent card styling with optional hover effects
 */
export function SurfaceCard({
  hover = true,
  depth = 1,
  padding = 'md',
  className,
  children,
  ...props
}: SurfaceCardProps) {
  const paddingClass = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }[padding]

  const depthClass = {
    1: 'depth-1',
    2: 'depth-2',
    3: 'depth-3',
  }[depth]

  const hoverClass = hover ? 'surface-hover' : ''

  return (
    <div
      className={cn(
        'surface rounded-lg border border-[var(--border)]',
        paddingClass,
        depthClass,
        hoverClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default SurfaceCard

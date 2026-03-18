'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  depth?: 1 | 2 | 3
  padding?: 'sm' | 'md' | 'lg'
  gradient?: boolean
  glow?: boolean
  elevation?: 'sm' | 'md' | 'lg'
  cornerBadge?: React.ReactNode
  children: React.ReactNode
}

/**
 * SurfaceCard - Reusable card component with theme-aware styling
 * Provides consistent card styling with optional hover effects
 */
const SurfaceCard = React.memo(function SurfaceCard({
  hover = true,
  depth = 1,
  padding = 'md',
  gradient = false,
  glow = false,
  elevation = 'sm',
  cornerBadge,
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

  const elevationHoverClass = hover ? {
    sm: 'hover:shadow-md hover:translate-y-[-2px]',
    md: 'hover:shadow-lg hover:translate-y-[-3px]',
    lg: 'hover:shadow-xl hover:translate-y-[-4px]',
  }[elevation] : ''

  const hoverClass = hover ? 'surface-hover' : ''
  const gradientClass = gradient ? 'gradient-accent' : ''
  const glowClass = glow ? 'glow' : ''

  return (
    <div
      className={cn(
        'surface rounded-lg border border-[var(--border)] relative transition-all duration-300',
        paddingClass,
        depthClass,
        hoverClass,
        elevationHoverClass,
        gradientClass,
        glowClass,
        className
      )}
      {...props}
    >
      {children}
      {cornerBadge && (
        <div className="absolute -top-3 -right-3">
          {cornerBadge}
        </div>
      )}
    </div>
  )
})

export default SurfaceCard

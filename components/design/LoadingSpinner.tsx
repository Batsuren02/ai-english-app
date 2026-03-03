'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  label?: string
  fullScreen?: boolean
  gradient?: boolean
  className?: string
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 40, height: 40 },
  lg: { width: 56, height: 56 },
}

const labelSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

/**
 * LoadingSpinner - Enhanced spinner component with size variants
 * Features: Multiple sizes, gradient option, label support, fullscreen mode
 */
export function LoadingSpinner({
  size = 'md',
  color,
  label,
  fullScreen = false,
  gradient = false,
  className,
}: LoadingSpinnerProps) {
  const dimensions = sizeMap[size]

  const spinnerContent = (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'animate-spin',
          gradient && 'drop-shadow-md'
        )}
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke={color || 'var(--accent)'}
          strokeWidth="2"
          strokeDasharray="113"
          strokeDashoffset="113"
          opacity="0.2"
        />
        <defs>
          {gradient && (
            <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor={`var(--accent)`} stopOpacity="0.3" />
            </linearGradient>
          )}
        </defs>
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke={gradient ? 'url(#spinnerGradient)' : (color || 'var(--accent)')}
          strokeWidth="2"
          strokeDasharray="113"
          strokeDashoffset="0"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[var(--bg)]/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          {spinnerContent}
          {label && (
            <p className={cn('text-[var(--text-secondary)]', labelSizeMap[size])}>
              {label}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {spinnerContent}
      {label && (
        <p className={cn('text-[var(--text-secondary)]', labelSizeMap[size])}>
          {label}
        </p>
      )}
    </div>
  )
}

export default LoadingSpinner

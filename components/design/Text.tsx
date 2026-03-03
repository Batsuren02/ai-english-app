'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * TextPrimary - Primary text color
 * Used for main content and headings
 */
export function TextPrimary({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[var(--text)]', className)}
      {...props}
    />
  )
}

/**
 * TextSecondary - Secondary text color
 * Used for helper text, descriptions, and less important content
 */
export function TextSecondary({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[var(--text-secondary)]', className)}
      {...props}
    />
  )
}

/**
 * TextAccent - Accent text color
 * Used for emphasized text and highlights
 */
export function TextAccent({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[var(--accent)]', className)}
      {...props}
    />
  )
}

/**
 * TextSuccess - Success text color
 */
export function TextSuccess({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[var(--success)]', className)}
      {...props}
    />
  )
}

/**
 * TextError - Error text color
 */
export function TextError({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[var(--error)]', className)}
      {...props}
    />
  )
}

export default {
  Primary: TextPrimary,
  Secondary: TextSecondary,
  Accent: TextAccent,
  Success: TextSuccess,
  Error: TextError,
}

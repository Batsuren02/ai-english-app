'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  pulse?: boolean
  children: React.ReactNode
}

/**
 * InteractiveButton - Button with theme-aware styling and hover effects
 * Provides consistent button styling with scale + shadow on hover (bold effect)
 */
const InteractiveButtonBase = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, isLoading = false, pulse = false, disabled, ...props }, ref) => {
    const variantClass = {
      primary: 'bg-[var(--accent)] text-white hover:brightness-105 hover:shadow-md',
      secondary: 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--text-secondary)]',
      danger: 'bg-[var(--error)] text-white hover:brightness-105 hover:shadow-md',
      ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]',
      soft: 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--border)] hover:bg-[var(--surface-hover)]',
    }[variant]

    const sizeClass = {
      sm: 'px-3 py-1.5 text-[13px]',
      md: 'px-4 py-2 text-[14px]',
      lg: 'px-6 py-2.5 text-[15px]',
    }[size]

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg font-semibold inline-flex items-center justify-center',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantClass,
          sizeClass,
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </button>
    )
  }
)

InteractiveButtonBase.displayName = 'InteractiveButton'

export const InteractiveButton = React.memo(InteractiveButtonBase)

export default InteractiveButton

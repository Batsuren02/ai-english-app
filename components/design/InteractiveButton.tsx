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
export const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, isLoading = false, pulse = false, disabled, ...props }, ref) => {
    const variantClass = {
      primary: 'bg-gradient-accent text-white shadow-md hover:shadow-lg',
      secondary: 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:shadow-sm',
      danger: 'bg-gradient-error text-white shadow-md hover:shadow-lg',
      ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]',
      soft: 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/15 hover:shadow-sm',
    }[variant]

    const sizeClass = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
    }[size]

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg font-medium',
          'interactive-button',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          pulse && !isLoading ? 'scale-pop' : '',
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

InteractiveButton.displayName = 'InteractiveButton'

export default InteractiveButton

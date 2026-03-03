'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

/**
 * InteractiveButton - Button with theme-aware styling and hover effects
 * Provides consistent button styling with scale + shadow on hover (bold effect)
 */
export const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const variantClass = {
      primary: 'bg-[var(--accent)] text-white hover:opacity-90',
      secondary: 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]',
      danger: 'bg-[var(--error)] text-white hover:opacity-90',
      ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)]',
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
          variantClass,
          sizeClass,
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

InteractiveButton.displayName = 'InteractiveButton'

export default InteractiveButton

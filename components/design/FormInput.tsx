'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

/**
 * FormInput - Enhanced input with theme styling and animations
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            className="text-sm font-medium text-[var(--text)]"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={cn(
            'px-4 py-2.5 rounded-lg',
            'bg-[var(--surface)] border border-[var(--border)]',
            'text-[var(--text)] placeholder-[var(--text-secondary)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30',
            'transition-all duration-150',
            error && 'border-[var(--error)] focus:ring-[var(--error)]/30',
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}

        {hint && !error && (
          <p className="text-xs text-[var(--text-secondary)]">{hint}</p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput

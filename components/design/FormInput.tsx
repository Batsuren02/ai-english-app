'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, Check } from 'lucide-react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  floatingLabel?: boolean
  clearable?: boolean
  success?: boolean
  showCharCount?: boolean
  icon?: React.ReactNode
  suffixIcon?: React.ReactNode
  onClear?: () => void
}

/**
 * FormInput - Enhanced input with floating labels, clear button, and validation animations
 * Features: Floating label animation, clear button, validation feedback, character count
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({
    label,
    error,
    hint,
    className,
    floatingLabel = false,
    clearable = false,
    success = false,
    showCharCount = false,
    icon,
    suffixIcon,
    value = '',
    onChange,
    maxLength,
    onClear,
    ...props
  }, ref) => {
    const [focused, setFocused] = useState(false)
    const [inputValue, setInputValue] = useState(value)

    useEffect(() => {
      setInputValue(value)
    }, [value])

    const hasValue = inputValue && String(inputValue).length > 0
    const charCount = showCharCount && maxLength ? String(inputValue).length : 0

    const handleClear = () => {
      setInputValue('')
      if (onClear) onClear()
      if (onChange) onChange({ target: { value: '' } } as any)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      if (onChange) onChange(e)
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="relative">
          {floatingLabel && label ? (
            <input
              ref={ref}
              value={inputValue}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                'peer w-full px-4 py-3 rounded-lg',
                'bg-[var(--surface)] border border-[var(--border)]',
                'text-[var(--text)] placeholder-transparent',
                'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30',
                'transition-all duration-150',
                error && 'border-[var(--error)] focus:ring-[var(--error)]/30',
                success && 'border-[var(--success)] focus:ring-[var(--success)]/30',
                icon && 'pl-10',
                (clearable || suffixIcon) && 'pr-10',
                className
              )}
              maxLength={maxLength}
              placeholder={label}
              {...props}
            />
          ) : (
            <input
              ref={ref}
              value={inputValue}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg',
                'bg-[var(--surface)] border border-[var(--border)]',
                'text-[var(--text)] placeholder-[var(--text-secondary)]',
                'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30',
                'transition-all duration-150',
                error && 'border-[var(--error)] focus:ring-[var(--error)]/30',
                success && 'border-[var(--success)] focus:ring-[var(--success)]/30',
                icon && 'pl-10',
                (clearable || suffixIcon) && 'pr-10',
                className
              )}
              maxLength={maxLength}
              {...props}
            />
          )}

          {floatingLabel && label && (
            <label
              className={cn(
                'absolute left-4 top-3 origin-left pointer-events-none',
                'transition-all duration-200 bg-[var(--surface)] px-1',
                focused || hasValue
                  ? 'scale-75 -translate-y-3 text-[var(--accent)]'
                  : 'scale-100 translate-y-0 text-[var(--text-secondary)]'
              )}
            >
              {label}
            </label>
          )}

          {!floatingLabel && label && (
            <label className="text-sm font-medium text-[var(--text)]">
              {label}
            </label>
          )}

          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
              {icon}
            </div>
          )}

          {success && !error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)] animate-scaleIn">
              <Check size={18} />
            </div>
          )}

          {clearable && hasValue && !suffixIcon && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            >
              <X size={18} />
            </button>
          )}

          {suffixIcon && !success && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
              {suffixIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-[var(--error)] animate-slideReveal">{error}</p>
        )}

        {success && !error && (
          <p className="text-xs text-[var(--success)] animate-slideReveal">Great!</p>
        )}

        {hint && !error && !success && (
          <p className="text-xs text-[var(--text-secondary)]">{hint}</p>
        )}

        {showCharCount && maxLength && (
          <div className="flex justify-between items-center">
            <div className="text-xs text-[var(--text-secondary)]">
              {charCount} / {maxLength}
            </div>
            {charCount / maxLength > 0.8 && (
              <div className="text-xs text-[var(--error)]">Almost there!</div>
            )}
          </div>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput

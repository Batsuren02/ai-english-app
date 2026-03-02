import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-[var(--border)]',
        'bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)]',
        'font-mono placeholder:text-[var(--ink-light)] placeholder:font-body',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-vertical',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }

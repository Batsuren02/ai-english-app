'use client'

import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export default function GlassCard({ padding = 'md', className, children, ...props }: GlassCardProps) {
  const paddingClass = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }[padding]
  return (
    <div className={cn('glass rounded-2xl', paddingClass, className)} {...props}>
      {children}
    </div>
  )
}
